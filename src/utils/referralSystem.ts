import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { ReferralMember, ReferralCommissionLog } from '../types';

export interface TeamStats {
  totalTeamSize: number;
  l1Count: number;
  l2Count: number;
  l3Count: number;
  totalTeamRecharge: number;
  totalCommissionEarned: number;
  l1Commission: number;
  l2Commission: number;
  l3Commission: number;
}

// Commission rates per level
export const REFERRAL_RATES = {
  deposit: {
    l1: 0.10, // 10% on direct deposit
    l2: 0.03, // 3% on level 2 deposit
    l3: 0.01  // 1% on level 3 deposit
  },
  quantify: {
    l1: 0.08, // 8% on direct quantification
    l2: 0.03, // 3% on level 2 quantification
    l3: 0.01  // 1% on level 3 quantification
  }
};

/**
 * Check if a username is available in Cloud Firestore & Local registry
 */
export async function checkUsernameAvailability(username: string, currentUid?: string): Promise<{ available: boolean; message?: string }> {
  const clean = username.trim().toLowerCase();
  if (!clean || clean.length < 3) {
    return { available: false, message: 'Username must be at least 3 characters.' };
  }
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { available: false, message: 'Username can only contain letters, numbers, and underscores.' };
  }

  // Check local cache
  try {
    const rawUsers = localStorage.getItem('goldrobo_registered_usernames');
    if (rawUsers) {
      const parsed: Record<string, string> = JSON.parse(rawUsers);
      if (parsed[clean] && parsed[clean] !== currentUid) {
        return { available: false, message: `Username "${clean}" is already taken. Please choose another.` };
      }
    }
  } catch {}

  // Check Firestore
  try {
    const userDocRef = doc(db, 'usernames', clean);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      const data = snap.data();
      if (data.uid && data.uid !== currentUid) {
        return { available: false, message: `Username "${clean}" is already registered by another member.` };
      }
    }
  } catch (err: any) {
    console.warn('Username check Firestore warning:', err?.message);
  }

  return { available: true };
}

/**
 * Record a new user into the multi-tier referral tree (Level 1, Level 2, Level 3)
 * Whenever user joins using sponsorUsername, this links L1, L2, L3 sponsors.
 */
export async function setupMultiTierReferral(
  newUser: {
    uid: string;
    email: string;
    username: string;
  },
  sponsorInput: string
) {
  if (!newUser.uid || !sponsorInput) return;
  const cleanSponsor = sponsorInput.trim().toLowerCase();

  try {
    // 1. Find Level 1 Sponsor
    let l1SponsorUid: string | null = null;
    let l1SponsorUsername: string = cleanSponsor;
    let l1SponsorEmail: string = '';
    let l1SponsorParentCode: string = '';

    // Check usernames collection
    try {
      const uSnap = await getDoc(doc(db, 'usernames', cleanSponsor));
      if (uSnap.exists()) {
        const uData = uSnap.data();
        l1SponsorUid = uData.uid || null;
        l1SponsorUsername = uData.username || cleanSponsor;
        l1SponsorEmail = uData.email || '';
      }
    } catch {}

    // Check referral_codes collection if not found
    if (!l1SponsorUid) {
      try {
        const rSnap = await getDoc(doc(db, 'referral_codes', cleanSponsor.toUpperCase()));
        if (rSnap.exists()) {
          const rData = rSnap.data();
          l1SponsorUid = rData.uid || null;
          l1SponsorUsername = rData.username || rData.code || cleanSponsor;
          l1SponsorEmail = rData.email || '';
        }
      } catch {}
    }

    // Check users collection directly if still not found
    if (!l1SponsorUid) {
      try {
        const usersRef = collection(db, 'users');
        const q1 = query(usersRef, where('username', '==', cleanSponsor));
        const qSnap = await getDocs(q1);
        if (!qSnap.empty) {
          const docData = qSnap.docs[0].data();
          l1SponsorUid = qSnap.docs[0].id;
          l1SponsorUsername = docData.username || cleanSponsor;
          l1SponsorEmail = docData.email || '';
        }
      } catch {}
    }

    // If still not found, check local users registry
    if (!l1SponsorUid) {
      try {
        const localAccounts = localStorage.getItem('goldrobo_device_accounts');
        if (localAccounts) {
          const accs = JSON.parse(localAccounts);
          if (Array.isArray(accs) && accs.length > 0) {
            // Find sponsor matching username
            const match = accs.find((a: any) => 
              (a.username && a.username.toLowerCase() === cleanSponsor) ||
              (a.email && a.email.toLowerCase().includes(cleanSponsor))
            );
            if (match) {
              l1SponsorUid = match.uid || `usr-sp-${cleanSponsor}`;
              l1SponsorUsername = match.username || cleanSponsor;
              l1SponsorEmail = match.email || '';
            }
          }
        }
      } catch {}
    }

    if (!l1SponsorUid) {
      console.log(`Sponsor "${sponsorInput}" is Genesis or unregistered. Multi-tier tracking skipped for root.`);
      return;
    }

    // Fetch Level 1 Sponsor user document to find Level 2 Sponsor
    let l2SponsorUid: string | null = null;
    let l2SponsorUsername: string = '';
    let l3SponsorUid: string | null = null;
    let l3SponsorUsername: string = '';

    try {
      const sp1Doc = await getDoc(doc(db, 'users', l1SponsorUid));
      if (sp1Doc.exists()) {
        const sp1Data = sp1Doc.data();
        l1SponsorParentCode = sp1Data.sponsorCode || '';
        if (l1SponsorParentCode) {
          // Look up L2 sponsor
          const l2Check = await getDoc(doc(db, 'usernames', l1SponsorParentCode.toLowerCase()));
          if (l2Check.exists()) {
            l2SponsorUid = l2Check.data().uid;
            l2SponsorUsername = l2Check.data().username || l1SponsorParentCode;
          }
        }
      }
    } catch {}

    // Look up Level 3 Sponsor if L2 exists
    if (l2SponsorUid) {
      try {
        const sp2Doc = await getDoc(doc(db, 'users', l2SponsorUid));
        if (sp2Doc.exists()) {
          const sp2Data = sp2Doc.data();
          const l2Parent = sp2Data.sponsorCode || '';
          if (l2Parent) {
            const l3Check = await getDoc(doc(db, 'usernames', l2Parent.toLowerCase()));
            if (l3Check.exists()) {
              l3SponsorUid = l3Check.data().uid;
              l3SponsorUsername = l3Check.data().username || l2Parent;
            }
          }
        }
      } catch {}
    }

    const now = new Date();
    const joinedAt = now.toISOString();
    const joinedTimestamp = now.getTime();

    // 2. CREATE LEVEL 1 MEMBER RECORD
    const l1Record: ReferralMember = {
      id: `${l1SponsorUid}_${newUser.uid}_L1`,
      sponsorUid: l1SponsorUid,
      sponsorUsername: l1SponsorUsername,
      memberUid: newUser.uid,
      memberUsername: newUser.username,
      memberEmail: newUser.email,
      level: 1,
      directInviterUsername: l1SponsorUsername,
      joinedAt,
      joinedTimestamp,
      totalDeposit: 0,
      commissionEarned: 0,
      status: 'Active',
      vipLevel: 1
    };

    await saveTeamMemberRecord(l1Record);

    // Update L1 sponsor counts
    await incrementSponsorCounts(l1SponsorUid, 1);

    // 3. CREATE LEVEL 2 MEMBER RECORD (if L2 exists)
    if (l2SponsorUid) {
      const l2Record: ReferralMember = {
        id: `${l2SponsorUid}_${newUser.uid}_L2`,
        sponsorUid: l2SponsorUid,
        sponsorUsername: l2SponsorUsername,
        memberUid: newUser.uid,
        memberUsername: newUser.username,
        memberEmail: newUser.email,
        level: 2,
        directInviterUsername: l1SponsorUsername,
        joinedAt,
        joinedTimestamp,
        totalDeposit: 0,
        commissionEarned: 0,
        status: 'Active',
        vipLevel: 1
      };
      await saveTeamMemberRecord(l2Record);
      await incrementSponsorCounts(l2SponsorUid, 2);
    }

    // 4. CREATE LEVEL 3 MEMBER RECORD (if L3 exists)
    if (l3SponsorUid) {
      const l3Record: ReferralMember = {
        id: `${l3SponsorUid}_${newUser.uid}_L3`,
        sponsorUid: l3SponsorUid,
        sponsorUsername: l3SponsorUsername,
        memberUid: newUser.uid,
        memberUsername: newUser.username,
        memberEmail: newUser.email,
        level: 3,
        directInviterUsername: l1SponsorUsername,
        joinedAt,
        joinedTimestamp,
        totalDeposit: 0,
        commissionEarned: 0,
        status: 'Active',
        vipLevel: 1
      };
      await saveTeamMemberRecord(l3Record);
      await incrementSponsorCounts(l3SponsorUid, 3);
    }

    console.log(`✅ Multi-tier referral recorded: ${newUser.username} -> L1:${l1SponsorUsername}, L2:${l2SponsorUsername || 'None'}, L3:${l3SponsorUsername || 'None'}`);
  } catch (err: any) {
    console.warn('Multi-tier referral setup notice:', err?.message);
  }
}

/**
 * Save team member record to Firestore & Local Cache
 */
async function saveTeamMemberRecord(record: ReferralMember) {
  // 1. Save to Firestore
  try {
    const docRef = doc(db, 'team_referrals', record.id);
    await setDoc(docRef, record, { merge: true });
  } catch (err: any) {
    console.warn('Firestore save team member notice:', err?.message);
  }

  // 2. Save to Local cache for sponsor
  try {
    const cacheKey = `goldrobo_team_members_${record.sponsorUid}`;
    const raw = localStorage.getItem(cacheKey);
    let list: ReferralMember[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(m => m.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.unshift(record);
    }
    localStorage.setItem(cacheKey, JSON.stringify(list));

    // Also notify active UI
    window.dispatchEvent(new CustomEvent('goldrobo_team_updated', {
      detail: { sponsorUid: record.sponsorUid, member: record }
    }));
  } catch {}
}

/**
 * Increment sponsor referral counts in Firestore & Local State
 */
async function incrementSponsorCounts(sponsorUid: string, level: 1 | 2 | 3) {
  try {
    const userRef = doc(db, 'users', sponsorUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const updates: any = {
        updatedAt: new Date().toISOString()
      };

      if (level === 1) {
        updates.l1Referrals = (data.l1Referrals || 0) + 1;
        updates.validReferralsCount = (data.validReferralsCount || 0) + 1;
        updates.referralCount = (data.referralCount || 0) + 1;
      } else if (level === 2) {
        updates.l2Referrals = (data.l2Referrals || 0) + 1;
      } else if (level === 3) {
        updates.l3Referrals = (data.l3Referrals || 0) + 1;
      }
      updates.teamSize = (updates.l1Referrals || data.l1Referrals || 0) + 
                         (updates.l2Referrals || data.l2Referrals || 0) + 
                         (updates.l3Referrals || data.l3Referrals || 0);

      await setDoc(userRef, updates, { merge: true });
    }
  } catch (err: any) {
    console.warn('Increment sponsor counts notice:', err?.message);
  }

  // If sponsor is currently open in this browser tab, update local session
  try {
    const rawUser = localStorage.getItem('goldrobo_user_state');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (u.uid === sponsorUid) {
        if (level === 1) {
          u.l1Referrals = (u.l1Referrals || 0) + 1;
          u.validReferralsCount = (u.validReferralsCount || 0) + 1;
          u.referralCount = (u.referralCount || 0) + 1;
        } else if (level === 2) {
          u.l2Referrals = (u.l2Referrals || 0) + 1;
        } else if (level === 3) {
          u.l3Referrals = (u.l3Referrals || 0) + 1;
        }
        u.teamSize = (u.l1Referrals || 0) + (u.l2Referrals || 0) + (u.l3Referrals || 0);
        localStorage.setItem('goldrobo_user_state', JSON.stringify(u));
        window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { detail: u }));
      }
    }
  } catch {}
}

/**
 * Distribute Multi-Tier Referral Commission when a user deposits or quantifies
 * Level 1 gets 10% (deposit) / 8% (quantify)
 * Level 2 gets 3%
 * Level 3 gets 1%
 */
export async function distributeMultiTierCommission(
  fromUser: {
    uid: string;
    username: string;
    email: string;
  },
  amount: number,
  type: 'deposit' | 'quantify'
): Promise<ReferralCommissionLog[]> {
  if (!fromUser.uid || amount <= 0) return [];
  const generatedLogs: ReferralCommissionLog[] = [];

  try {
    // 1. Find all upline records where memberUid == fromUser.uid
    // Read from Firestore team_referrals or local cache
    let uplines: ReferralMember[] = [];

    try {
      const q = query(
        collection(db, 'team_referrals'),
        where('memberUid', '==', fromUser.uid)
      );
      const snap = await getDocs(q);
      snap.forEach(d => uplines.push(d.data() as ReferralMember));
    } catch {}

    // Fallback to local storage if Firestore returned empty
    if (uplines.length === 0) {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('goldrobo_team_members_')) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list: ReferralMember[] = JSON.parse(raw);
              const found = list.filter(m => m.memberUid === fromUser.uid);
              uplines.push(...found);
            }
          }
        }
      } catch {}
    }

    if (uplines.length === 0) {
      console.log(`No registered upline found for ${fromUser.username} to distribute commission.`);
      return [];
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const timestamp = now.toISOString();

    const rates = REFERRAL_RATES[type];

    for (const memberRecord of uplines) {
      const level = memberRecord.level;
      let percent = 0;
      if (level === 1) percent = rates.l1;
      else if (level === 2) percent = rates.l2;
      else if (level === 3) percent = rates.l3;

      if (percent <= 0) continue;

      const commissionAmount = parseFloat((amount * percent).toFixed(4));
      if (commissionAmount <= 0) continue;

      const commLog: ReferralCommissionLog = {
        id: `COMM_${memberRecord.sponsorUid}_${fromUser.uid}_${Date.now()}_L${level}`,
        sponsorUid: memberRecord.sponsorUid,
        sponsorUsername: memberRecord.sponsorUsername,
        fromUsername: fromUser.username,
        fromUid: fromUser.uid,
        fromEmail: fromUser.email,
        level,
        percent: percent * 100,
        sourceAmount: amount,
        commissionAmount,
        type: `${type}_commission`,
        timestamp,
        dateStr,
        timeStr,
        status: 'Completed'
      };

      // 1. Save commission log to Firestore
      try {
        await setDoc(doc(db, 'referral_commissions', commLog.id), commLog);
      } catch {}

      // 2. Save commission log to local storage
      try {
        const cKey = `goldrobo_commissions_${memberRecord.sponsorUid}`;
        const rawC = localStorage.getItem(cKey);
        const cList: ReferralCommissionLog[] = rawC ? JSON.parse(rawC) : [];
        cList.unshift(commLog);
        localStorage.setItem(cKey, JSON.stringify(cList));
      } catch {}

      // 3. Credit sponsor balances in Firestore
      try {
        const spRef = doc(db, 'users', memberRecord.sponsorUid);
        const spSnap = await getDoc(spRef);
        if (spSnap.exists()) {
          const spData = spSnap.data();
          const newTot = parseFloat(((spData.totalBalance || 0) + commissionAmount).toFixed(2));
          const newWith = parseFloat(((spData.withdrawableBalance || 0) + commissionAmount).toFixed(2));
          const newRefEarn = parseFloat(((spData.referralEarnings || 0) + commissionAmount).toFixed(2));

          await setDoc(spRef, {
            totalBalance: newTot,
            withdrawableBalance: newWith,
            referralEarnings: newRefEarn,
            updatedAt: timestamp
          }, { merge: true });

          // Also record transaction in sponsor's transactions
          try {
            const txDoc = doc(db, 'users', memberRecord.sponsorUid, 'transactions', commLog.id);
            await setDoc(txDoc, {
              id: commLog.id,
              dateStr,
              timeStr,
              timestamp,
              coinName: `USDT Level ${level} Rebate`,
              profitPercent: percent * 100,
              profitAmount: commissionAmount,
              balanceAfter: newTot,
              type: 'referral',
              status: 'Completed',
              orderId: `COMM${Date.now().toString().slice(-8)}`,
              userEmail: spData.email || ''
            });
          } catch {}
        }
      } catch (err: any) {
        console.warn('Credit sponsor balance notice:', err?.message);
      }

      // 4. Update member's deposit and commission stats in team_referrals
      try {
        const teamDocRef = doc(db, 'team_referrals', memberRecord.id);
        const currentDeposit = (memberRecord.totalDeposit || 0) + (type === 'deposit' ? amount : 0);
        const currentComm = (memberRecord.commissionEarned || 0) + commissionAmount;
        await setDoc(teamDocRef, {
          totalDeposit: parseFloat(currentDeposit.toFixed(2)),
          commissionEarned: parseFloat(currentComm.toFixed(2)),
          status: 'Active'
        }, { merge: true });
      } catch {}

      // 5. If the sponsor is the current active session in this browser, update state
      try {
        const rawUser = localStorage.getItem('goldrobo_user_state');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u.uid === memberRecord.sponsorUid) {
            u.totalBalance = parseFloat(((u.totalBalance || 0) + commissionAmount).toFixed(2));
            u.withdrawableBalance = parseFloat(((u.withdrawableBalance || 0) + commissionAmount).toFixed(2));
            u.referralEarnings = parseFloat(((u.referralEarnings || 0) + commissionAmount).toFixed(2));
            if (level === 1) u.l1Earnings = (u.l1Earnings || 0) + commissionAmount;
            if (level === 2) u.l2Earnings = (u.l2Earnings || 0) + commissionAmount;
            if (level === 3) u.l3Earnings = (u.l3Earnings || 0) + commissionAmount;

            localStorage.setItem('goldrobo_user_state', JSON.stringify(u));
            window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { detail: u }));
            window.dispatchEvent(new CustomEvent('goldrobo_commission_received', { detail: commLog }));
          }
        }
      } catch {}

      generatedLogs.push(commLog);
    }

    console.log(`✅ Distributed multi-tier commission from ${fromUser.username} (${amount} USDT):`, generatedLogs);
  } catch (err: any) {
    console.warn('Distribute commission notice:', err?.message);
  }

  return generatedLogs;
}

/**
 * Real-time subscription to a user's multi-tier team members (Level 1, Level 2, Level 3)
 */
export function subscribeToUserTeam(
  userUid: string,
  onUpdate: (members: ReferralMember[], stats: TeamStats) => void
): () => void {
  if (!userUid) {
    onUpdate([], {
      totalTeamSize: 0,
      l1Count: 0,
      l2Count: 0,
      l3Count: 0,
      totalTeamRecharge: 0,
      totalCommissionEarned: 0,
      l1Commission: 0,
      l2Commission: 0,
      l3Commission: 0
    });
    return () => {};
  }

  // 1. Immediately read from local cache
  const cacheKey = `goldrobo_team_members_${userUid}`;
  let currentList: ReferralMember[] = [];
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      currentList = JSON.parse(raw);
      computeAndNotify(currentList);
    }
  } catch {}

  function computeAndNotify(members: ReferralMember[]) {
    const l1 = members.filter(m => m.level === 1);
    const l2 = members.filter(m => m.level === 2);
    const l3 = members.filter(m => m.level === 3);

    const totalTeamRecharge = members.reduce((sum, m) => sum + (m.totalDeposit || 0), 0);
    const l1Commission = l1.reduce((sum, m) => sum + (m.commissionEarned || 0), 0);
    const l2Commission = l2.reduce((sum, m) => sum + (m.commissionEarned || 0), 0);
    const l3Commission = l3.reduce((sum, m) => sum + (m.commissionEarned || 0), 0);
    const totalCommissionEarned = l1Commission + l2Commission + l3Commission;

    const stats: TeamStats = {
      totalTeamSize: members.length,
      l1Count: l1.length,
      l2Count: l2.length,
      l3Count: l3.length,
      totalTeamRecharge: parseFloat(totalTeamRecharge.toFixed(2)),
      totalCommissionEarned: parseFloat(totalCommissionEarned.toFixed(2)),
      l1Commission: parseFloat(l1Commission.toFixed(2)),
      l2Commission: parseFloat(l2Commission.toFixed(2)),
      l3Commission: parseFloat(l3Commission.toFixed(2))
    };

    onUpdate(members, stats);
  }

  // 2. Real-time Firestore onSnapshot listener
  let unsubscribeSnapshot: () => void = () => {};
  try {
    const teamQuery = query(
      collection(db, 'team_referrals'),
      where('sponsorUid', '==', userUid)
    );

    unsubscribeSnapshot = onSnapshot(teamQuery, (snap) => {
      const cloudList: ReferralMember[] = [];
      snap.forEach(docSnap => {
        cloudList.push(docSnap.data() as ReferralMember);
      });

      // Sort by joinedTimestamp descending
      cloudList.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));

      // Update cache
      localStorage.setItem(cacheKey, JSON.stringify(cloudList));
      computeAndNotify(cloudList);
    }, (err) => {
      console.warn('Team referrals onSnapshot error:', err.message);
    });
  } catch (err: any) {
    console.warn('Attach team listener notice:', err?.message);
  }

  // 3. Listen to local custom events for instant cross-component updates
  const handleLocalUpdate = (e: any) => {
    if (e.detail?.sponsorUid === userUid) {
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) computeAndNotify(JSON.parse(raw));
      } catch {}
    }
  };
  window.addEventListener('goldrobo_team_updated', handleLocalUpdate);

  return () => {
    unsubscribeSnapshot();
    window.removeEventListener('goldrobo_team_updated', handleLocalUpdate);
  };
}

/**
 * Real-time subscription to a user's referral commission logs
 */
export function subscribeToUserCommissions(
  userUid: string,
  onUpdate: (logs: ReferralCommissionLog[]) => void
): () => void {
  if (!userUid) {
    onUpdate([]);
    return () => {};
  }

  const cacheKey = `goldrobo_commissions_${userUid}`;
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) onUpdate(JSON.parse(raw));
  } catch {}

  let unsubscribeSnapshot: () => void = () => {};
  try {
    const commQuery = query(
      collection(db, 'referral_commissions'),
      where('sponsorUid', '==', userUid)
    );

    unsubscribeSnapshot = onSnapshot(commQuery, (snap) => {
      const list: ReferralCommissionLog[] = [];
      snap.forEach(docSnap => {
        list.push(docSnap.data() as ReferralCommissionLog);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      localStorage.setItem(cacheKey, JSON.stringify(list));
      onUpdate(list);
    }, (err) => {
      console.warn('Commissions onSnapshot error:', err.message);
    });
  } catch (err: any) {
    console.warn('Attach commission listener notice:', err?.message);
  }

  const handleCommissionReceived = () => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) onUpdate(JSON.parse(raw));
    } catch {}
  };
  window.addEventListener('goldrobo_commission_received', handleCommissionReceived);

  return () => {
    unsubscribeSnapshot();
    window.removeEventListener('goldrobo_commission_received', handleCommissionReceived);
  };
}
