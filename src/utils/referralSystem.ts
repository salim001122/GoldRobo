import { db } from './firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  limit,
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

export const MASTER_SPONSOR_CODES = ['GOLD888', 'ADMIN888', 'SALIM888', 'ROOT888', 'VIP888'];

/**
 * Resilient, multi-source resolution of sponsor UID and username from Firestore.
 * Handles username, referral code, email, UID, case-insensitivity, and genesis codes.
 */
export async function resolveSponsorAccount(
  sponsorInput: string,
  knownValidation?: {
    sponsorUid?: string;
    sponsorUsername?: string;
    sponsorEmail?: string;
    isMasterCode?: boolean;
  }
): Promise<{
  sponsorUid: string;
  sponsorUsername: string;
  sponsorEmail: string;
  isGenesis?: boolean;
} | null> {
  if (!sponsorInput) return null;
  const clean = sponsorInput.trim();
  const cleanLower = clean.toLowerCase();
  const cleanUpper = clean.toUpperCase();

  // 1. If pre-validated info passed from validateSponsorCode, prioritize it
  if (knownValidation?.sponsorUid) {
    return {
      sponsorUid: knownValidation.sponsorUid,
      sponsorUsername: knownValidation.sponsorUsername || clean,
      sponsorEmail: knownValidation.sponsorEmail || '',
      isGenesis: !!knownValidation.isMasterCode
    };
  }

  // 2. Check master/genesis codes
  if (MASTER_SPONSOR_CODES.includes(cleanUpper) || knownValidation?.isMasterCode) {
    return {
      sponsorUid: 'genesis_sponsor_gold888',
      sponsorUsername: cleanUpper,
      sponsorEmail: 'genesis@goldrobo.io',
      isGenesis: true
    };
  }

  // 3. Direct document ID lookup in users collection
  try {
    const directSnap = await getDoc(doc(db, 'users', clean));
    if (directSnap.exists()) {
      const data = directSnap.data();
      return {
        sponsorUid: directSnap.id,
        sponsorUsername: data.username || clean,
        sponsorEmail: data.email || ''
      };
    }
  } catch {}

  // 4. Check usernames collection registry
  try {
    const uSnap = await getDoc(doc(db, 'usernames', cleanLower));
    if (uSnap.exists()) {
      const uData = uSnap.data();
      if (uData.uid) {
        return {
          sponsorUid: uData.uid,
          sponsorUsername: uData.username || clean,
          sponsorEmail: uData.email || ''
        };
      }
    }
  } catch {}

  // 5. Check referral_codes collection registry
  try {
    const rSnap = await getDoc(doc(db, 'referral_codes', cleanUpper));
    if (rSnap.exists()) {
      const rData = rSnap.data();
      if (rData.uid) {
        return {
          sponsorUid: rData.uid,
          sponsorUsername: rData.username || rData.code || clean,
          sponsorEmail: rData.email || ''
        };
      }
    }
  } catch {}

  // 6. Query users collection in Firestore
  try {
    const usersCol = collection(db, 'users');

    // 6a. by exact username
    const qUser = query(usersCol, where('username', '==', clean), limit(1));
    const sUser = await getDocs(qUser);
    if (!sUser.empty) {
      const d = sUser.docs[0].data();
      return {
        sponsorUid: sUser.docs[0].id,
        sponsorUsername: d.username || clean,
        sponsorEmail: d.email || ''
      };
    }

    // 6b. by referralCode uppercase
    const qRefUpper = query(usersCol, where('referralCode', '==', cleanUpper), limit(1));
    const sRefUpper = await getDocs(qRefUpper);
    if (!sRefUpper.empty) {
      const d = sRefUpper.docs[0].data();
      return {
        sponsorUid: sRefUpper.docs[0].id,
        sponsorUsername: d.username || clean,
        sponsorEmail: d.email || ''
      };
    }

    // 6c. by referralCode exact
    const qRef = query(usersCol, where('referralCode', '==', clean), limit(1));
    const sRef = await getDocs(qRef);
    if (!sRef.empty) {
      const d = sRef.docs[0].data();
      return {
        sponsorUid: sRef.docs[0].id,
        sponsorUsername: d.username || clean,
        sponsorEmail: d.email || ''
      };
    }

    // 6d. Resilient scan across users in Firestore (case-insensitive)
    const allUsersSnap = await getDocs(usersCol);
    for (const d of allUsersSnap.docs) {
      const data = d.data();
      const uMatch = data.username && data.username.trim().toLowerCase() === cleanLower;
      const rMatch = data.referralCode && data.referralCode.trim().toLowerCase() === cleanLower;
      const eMatch = data.email && data.email.trim().toLowerCase() === cleanLower;
      if (uMatch || rMatch || eMatch) {
        return {
          sponsorUid: d.id,
          sponsorUsername: data.username || clean,
          sponsorEmail: data.email || ''
        };
      }
    }
  } catch (err: any) {
    console.warn('Sponsor resolution notice:', err?.message);
  }

  // 7. Fallback local device storage (for offline or initial registration)
  try {
    const rawLocal = localStorage.getItem('goldrobo_device_accounts');
    if (rawLocal) {
      const accs = JSON.parse(rawLocal);
      if (Array.isArray(accs)) {
        const found = accs.find((a: any) => 
          (a.username && a.username.toLowerCase() === cleanLower) ||
          (a.referralCode && a.referralCode.toLowerCase() === cleanLower) ||
          (a.email && a.email.toLowerCase() === cleanLower)
        );
        if (found) {
          return {
            sponsorUid: found.uid || `usr-sp-${cleanLower}`,
            sponsorUsername: found.username || clean,
            sponsorEmail: found.email || ''
          };
        }
      }
    }
  } catch {}

  return null;
}

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

  // Reserved codes check
  if (MASTER_SPONSOR_CODES.map(c => c.toLowerCase()).includes(clean)) {
    return { available: false, message: 'This username is reserved by the system.' };
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

  // Check Firestore usernames registry
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

  // Check Firestore users collection
  try {
    const usersCol = collection(db, 'users');
    const q1 = query(usersCol, where('username', '==', username.trim()), limit(1));
    const s1 = await getDocs(q1);
    if (!s1.empty && s1.docs[0].id !== currentUid) {
      return { available: false, message: `Username "${username.trim()}" is already registered.` };
    }
  } catch {}

  return { available: true };
}

/**
 * Record a new user into the multi-tier referral tree (Level 1, Level 2, Level 3)
 * Links the user to their Level 1 direct sponsor, Level 2 secondary sponsor, and Level 3 indirect sponsor.
 */
export async function setupMultiTierReferral(
  newUser: {
    uid: string;
    email: string;
    username: string;
    vipLevel?: number;
  },
  sponsorInput: string,
  knownValidation?: {
    sponsorUid?: string;
    sponsorUsername?: string;
    sponsorEmail?: string;
    isMasterCode?: boolean;
  }
) {
  if (!newUser.uid || !sponsorInput) return;
  const cleanSponsor = sponsorInput.trim();

  try {
    // 1. Resolve Level 1 Sponsor
    const l1Sponsor = await resolveSponsorAccount(cleanSponsor, knownValidation);
    if (!l1Sponsor) {
      console.warn(`Could not resolve sponsor "${sponsorInput}". Multi-tier tracking skipped.`);
      return;
    }

    const now = new Date();
    const joinedAt = now.toISOString();
    const joinedTimestamp = now.getTime();

    // 2. CREATE LEVEL 1 MEMBER RECORD
    const l1Record: ReferralMember = {
      id: `${l1Sponsor.sponsorUid}_${newUser.uid}_L1`,
      sponsorUid: l1Sponsor.sponsorUid,
      sponsorUsername: l1Sponsor.sponsorUsername,
      memberUid: newUser.uid,
      memberUsername: newUser.username,
      memberEmail: newUser.email,
      level: 1,
      directInviterUsername: l1Sponsor.sponsorUsername,
      joinedAt,
      joinedTimestamp,
      totalDeposit: 0,
      commissionEarned: 0,
      status: 'Active',
      vipLevel: newUser.vipLevel || 0
    };

    await saveTeamMemberRecord(l1Record);
    await incrementSponsorCounts(l1Sponsor.sponsorUid, 1);

    // Also record in sponsor's referrals subcollection for backward-compatibility
    try {
      if (l1Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
        await setDoc(doc(db, 'users', l1Sponsor.sponsorUid, 'referrals', newUser.uid), {
          uid: newUser.uid,
          email: newUser.email,
          username: newUser.username,
          joinedAt,
          hasDeposited: false,
          totalDeposit: 0.00,
          level: 1,
          status: 'Active Member'
        }, { merge: true });
      }
    } catch {}

    // 3. Resolve Level 2 Sponsor from Level 1 Sponsor's record
    let l2Sponsor: { sponsorUid: string; sponsorUsername: string; sponsorEmail: string; isGenesis?: boolean } | null = null;
    if (!l1Sponsor.isGenesis && l1Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
      try {
        const sp1Doc = await getDoc(doc(db, 'users', l1Sponsor.sponsorUid));
        if (sp1Doc.exists()) {
          const sp1Data = sp1Doc.data();
          const l2Input = sp1Data.sponsorUid || sp1Data.sponsorCode;
          if (l2Input) {
            l2Sponsor = await resolveSponsorAccount(l2Input);
          }
        }
      } catch (err: any) {
        console.warn('L2 sponsor lookup notice:', err?.message);
      }
    }

    // CREATE LEVEL 2 MEMBER RECORD (if L2 exists and is not genesis)
    if (l2Sponsor && !l2Sponsor.isGenesis && l2Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
      const l2Record: ReferralMember = {
        id: `${l2Sponsor.sponsorUid}_${newUser.uid}_L2`,
        sponsorUid: l2Sponsor.sponsorUid,
        sponsorUsername: l2Sponsor.sponsorUsername,
        memberUid: newUser.uid,
        memberUsername: newUser.username,
        memberEmail: newUser.email,
        level: 2,
        directInviterUsername: l1Sponsor.sponsorUsername,
        joinedAt,
        joinedTimestamp,
        totalDeposit: 0,
        commissionEarned: 0,
        status: 'Active',
        vipLevel: newUser.vipLevel || 0
      };
      await saveTeamMemberRecord(l2Record);
      await incrementSponsorCounts(l2Sponsor.sponsorUid, 2);

      // 4. Resolve Level 3 Sponsor from Level 2 Sponsor's record
      let l3Sponsor: { sponsorUid: string; sponsorUsername: string; sponsorEmail: string; isGenesis?: boolean } | null = null;
      try {
        const sp2Doc = await getDoc(doc(db, 'users', l2Sponsor.sponsorUid));
        if (sp2Doc.exists()) {
          const sp2Data = sp2Doc.data();
          const l3Input = sp2Data.sponsorUid || sp2Data.sponsorCode;
          if (l3Input) {
            l3Sponsor = await resolveSponsorAccount(l3Input);
          }
        }
      } catch (err: any) {
        console.warn('L3 sponsor lookup notice:', err?.message);
      }

      // CREATE LEVEL 3 MEMBER RECORD (if L3 exists and is not genesis)
      if (l3Sponsor && !l3Sponsor.isGenesis && l3Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
        const l3Record: ReferralMember = {
          id: `${l3Sponsor.sponsorUid}_${newUser.uid}_L3`,
          sponsorUid: l3Sponsor.sponsorUid,
          sponsorUsername: l3Sponsor.sponsorUsername,
          memberUid: newUser.uid,
          memberUsername: newUser.username,
          memberEmail: newUser.email,
          level: 3,
          directInviterUsername: l2Sponsor.sponsorUsername,
          joinedAt,
          joinedTimestamp,
          totalDeposit: 0,
          commissionEarned: 0,
          status: 'Active',
          vipLevel: newUser.vipLevel || 0
        };
        await saveTeamMemberRecord(l3Record);
        await incrementSponsorCounts(l3Sponsor.sponsorUid, 3);
      }
    }

    console.log(`✅ Multi-tier referral recorded: ${newUser.username} -> L1:${l1Sponsor.sponsorUsername}, L2:${l2Sponsor?.sponsorUsername || 'None'}`);
  } catch (err: any) {
    console.warn('Multi-tier referral setup error:', err?.message);
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
  if (!sponsorUid || sponsorUid === 'genesis_sponsor_gold888') return;
  try {
    const userRef = doc(db, 'users', sponsorUid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      const curL1 = Number(data.l1Referrals || 0);
      const curL2 = Number(data.l2Referrals || 0);
      const curL3 = Number(data.l3Referrals || 0);

      const updates: any = {
        updatedAt: new Date().toISOString()
      };

      if (level === 1) {
        updates.l1Referrals = curL1 + 1;
        updates.validReferralsCount = Number(data.validReferralsCount || 0) + 1;
        updates.referralCount = Number(data.referralCount || 0) + 1;
      } else if (level === 2) {
        updates.l2Referrals = curL2 + 1;
      } else if (level === 3) {
        updates.l3Referrals = curL3 + 1;
      }

      const effectiveL1 = updates.l1Referrals !== undefined ? updates.l1Referrals : curL1;
      const effectiveL2 = updates.l2Referrals !== undefined ? updates.l2Referrals : curL2;
      const effectiveL3 = updates.l3Referrals !== undefined ? updates.l3Referrals : curL3;
      updates.teamSize = effectiveL1 + effectiveL2 + effectiveL3;

      await setDoc(userRef, updates, { merge: true });

      // If this sponsor is active in the current browser, update local state
      try {
        const rawUser = localStorage.getItem('goldrobo_user_state');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u.uid === sponsorUid) {
            u.l1Referrals = effectiveL1;
            u.l2Referrals = effectiveL2;
            u.l3Referrals = effectiveL3;
            u.teamSize = updates.teamSize;
            if (updates.validReferralsCount) u.validReferralsCount = updates.validReferralsCount;
            localStorage.setItem('goldrobo_user_state', JSON.stringify(u));
            window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { detail: u }));
          }
        }
      } catch {}
    }
  } catch (err: any) {
    console.warn('Increment sponsor counts error:', err?.message);
  }
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
    let uplines: ReferralMember[] = [];

    try {
      const q = query(
        collection(db, 'team_referrals'),
        where('memberUid', '==', fromUser.uid)
      );
      const snap = await getDocs(q);
      snap.forEach(d => uplines.push(d.data() as ReferralMember));
    } catch {}

    // Dynamic Upline Fallback: Trace upline directly from users collection in Firestore!
    if (uplines.length === 0) {
      try {
        const userDoc = await getDoc(doc(db, 'users', fromUser.uid));
        if (userDoc.exists()) {
          const uData = userDoc.data();
          const sponsorInput = uData.sponsorUid || uData.sponsorCode;
          if (sponsorInput) {
            const l1Sponsor = await resolveSponsorAccount(sponsorInput);
            if (l1Sponsor && !l1Sponsor.isGenesis && l1Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
              const l1Rec: ReferralMember = {
                id: `${l1Sponsor.sponsorUid}_${fromUser.uid}_L1`,
                sponsorUid: l1Sponsor.sponsorUid,
                sponsorUsername: l1Sponsor.sponsorUsername,
                memberUid: fromUser.uid,
                memberUsername: fromUser.username,
                memberEmail: fromUser.email,
                level: 1,
                directInviterUsername: l1Sponsor.sponsorUsername,
                joinedAt: uData.createdAt || new Date().toISOString(),
                joinedTimestamp: uData.createdAt ? new Date(uData.createdAt).getTime() : Date.now(),
                totalDeposit: Number(uData.totalDeposit || 0),
                commissionEarned: 0,
                status: 'Active',
                vipLevel: Number(uData.vipLevel || 0)
              };
              uplines.push(l1Rec);

              // Trace L2
              const sp1Doc = await getDoc(doc(db, 'users', l1Sponsor.sponsorUid));
              if (sp1Doc.exists()) {
                const sp1Data = sp1Doc.data();
                const l2Input = sp1Data.sponsorUid || sp1Data.sponsorCode;
                if (l2Input) {
                  const l2Sponsor = await resolveSponsorAccount(l2Input);
                  if (l2Sponsor && !l2Sponsor.isGenesis && l2Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
                    const l2Rec: ReferralMember = {
                      id: `${l2Sponsor.sponsorUid}_${fromUser.uid}_L2`,
                      sponsorUid: l2Sponsor.sponsorUid,
                      sponsorUsername: l2Sponsor.sponsorUsername,
                      memberUid: fromUser.uid,
                      memberUsername: fromUser.username,
                      memberEmail: fromUser.email,
                      level: 2,
                      directInviterUsername: l1Sponsor.sponsorUsername,
                      joinedAt: uData.createdAt || new Date().toISOString(),
                      joinedTimestamp: uData.createdAt ? new Date(uData.createdAt).getTime() : Date.now(),
                      totalDeposit: Number(uData.totalDeposit || 0),
                      commissionEarned: 0,
                      status: 'Active',
                      vipLevel: Number(uData.vipLevel || 0)
                    };
                    uplines.push(l2Rec);

                    // Trace L3
                    const sp2Doc = await getDoc(doc(db, 'users', l2Sponsor.sponsorUid));
                    if (sp2Doc.exists()) {
                      const sp2Data = sp2Doc.data();
                      const l3Input = sp2Data.sponsorUid || sp2Data.sponsorCode;
                      if (l3Input) {
                        const l3Sponsor = await resolveSponsorAccount(l3Input);
                        if (l3Sponsor && !l3Sponsor.isGenesis && l3Sponsor.sponsorUid !== 'genesis_sponsor_gold888') {
                          const l3Rec: ReferralMember = {
                            id: `${l3Sponsor.sponsorUid}_${fromUser.uid}_L3`,
                            sponsorUid: l3Sponsor.sponsorUid,
                            sponsorUsername: l3Sponsor.sponsorUsername,
                            memberUid: fromUser.uid,
                            memberUsername: fromUser.username,
                            memberEmail: fromUser.email,
                            level: 3,
                            directInviterUsername: l2Sponsor.sponsorUsername,
                            joinedAt: uData.createdAt || new Date().toISOString(),
                            joinedTimestamp: uData.createdAt ? new Date(uData.createdAt).getTime() : Date.now(),
                            totalDeposit: Number(uData.totalDeposit || 0),
                            commissionEarned: 0,
                            status: 'Active',
                            vipLevel: Number(uData.vipLevel || 0)
                          };
                          uplines.push(l3Rec);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (err: any) {
        console.warn('Dynamic upline trace notice:', err?.message);
      }
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

          const levelEarningsKey = level === 1 ? 'l1Earnings' : (level === 2 ? 'l2Earnings' : 'l3Earnings');
          const currentLevelEarn = Number(spData[levelEarningsKey] || 0);

          await setDoc(spRef, {
            totalBalance: newTot,
            withdrawableBalance: newWith,
            referralEarnings: newRefEarn,
            [levelEarningsKey]: parseFloat((currentLevelEarn + commissionAmount).toFixed(2)),
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
 * Reconciles the full multi-tier team directly from real Firestore users collection!
 * This guarantees 100% REAL data: scans all users, finds Level 1, 2, and 3 invitees,
 * backfills team_referrals in Firestore, updates sponsor's user doc, and returns the live team.
 */
export async function reconcileTeamWithFirestoreUsers(
  userUid: string,
  userIdentifiers?: {
    username?: string;
    referralCode?: string;
  }
): Promise<{ members: ReferralMember[]; stats: TeamStats }> {
  if (!userUid) {
    return {
      members: [],
      stats: {
        totalTeamSize: 0,
        l1Count: 0,
        l2Count: 0,
        l3Count: 0,
        totalTeamRecharge: 0,
        totalCommissionEarned: 0,
        l1Commission: 0,
        l2Commission: 0,
        l3Commission: 0
      }
    };
  }

  const cleanUser = (userIdentifiers?.username || '').trim().toLowerCase();
  const cleanCode = (userIdentifiers?.referralCode || '').trim().toLowerCase();

  const membersMap = new Map<string, ReferralMember>();

  // 1. Read existing records from team_referrals collection
  try {
    const q1 = query(collection(db, 'team_referrals'), where('sponsorUid', '==', userUid));
    const snap1 = await getDocs(q1);
    snap1.forEach(d => {
      const m = d.data() as ReferralMember;
      membersMap.set(`${m.memberUid}_L${m.level}`, m);
    });

    if (cleanUser) {
      const qUser = query(collection(db, 'team_referrals'), where('sponsorUsername', '==', cleanUser));
      const snapUser = await getDocs(qUser);
      snapUser.forEach(d => {
        const m = d.data() as ReferralMember;
        membersMap.set(`${m.memberUid}_L${m.level}`, m);
      });
    }
  } catch (err: any) {
    console.warn('Read team_referrals notice:', err?.message);
  }

  // 2. Query the real live users collection in Firestore
  try {
    const usersCol = collection(db, 'users');
    const allUsersSnap = await getDocs(usersCol);
    const allUsers: any[] = [];
    allUsersSnap.forEach(d => {
      allUsers.push({ id: d.id, ...d.data() });
    });

    // Level 1: Users who registered with this user as sponsor
    const l1Users: any[] = [];
    for (const u of allUsers) {
      if (u.id === userUid) continue; // Skip self
      const spUidMatch = u.sponsorUid && u.sponsorUid === userUid;
      const spCode = (u.sponsorCode || '').trim().toLowerCase();
      const spCodeMatch = cleanUser && spCode === cleanUser;
      const spRefMatch = cleanCode && spCode === cleanCode;

      if (spUidMatch || spCodeMatch || spRefMatch) {
        l1Users.push(u);
      }
    }

    const l1Uids = new Set(l1Users.map(u => u.id));
    const l1Names = new Set(l1Users.map(u => (u.username || '').trim().toLowerCase()).filter(Boolean));

    // Level 2: Users invited by any Level 1 member
    const l2Users: any[] = [];
    for (const u of allUsers) {
      if (u.id === userUid || l1Uids.has(u.id)) continue;
      const spUidMatch = u.sponsorUid && l1Uids.has(u.sponsorUid);
      const spCode = (u.sponsorCode || '').trim().toLowerCase();
      const spCodeMatch = spCode && l1Names.has(spCode);

      if (spUidMatch || spCodeMatch) {
        l2Users.push(u);
      }
    }

    const l2Uids = new Set(l2Users.map(u => u.id));
    const l2Names = new Set(l2Users.map(u => (u.username || '').trim().toLowerCase()).filter(Boolean));

    // Level 3: Users invited by any Level 2 member
    const l3Users: any[] = [];
    for (const u of allUsers) {
      if (u.id === userUid || l1Uids.has(u.id) || l2Uids.has(u.id)) continue;
      const spUidMatch = u.sponsorUid && l2Uids.has(u.sponsorUid);
      const spCode = (u.sponsorCode || '').trim().toLowerCase();
      const spCodeMatch = spCode && l2Names.has(spCode);

      if (spUidMatch || spCodeMatch) {
        l3Users.push(u);
      }
    }

    // Helper to process and auto-backfill into Firestore team_referrals
    const processMember = async (u: any, level: 1 | 2 | 3, directInviter: string) => {
      const key = `${u.id}_L${level}`;
      const existing = membersMap.get(key);
      const memberRecord: ReferralMember = {
        id: `${userUid}_${u.id}_L${level}`,
        sponsorUid: userUid,
        sponsorUsername: userIdentifiers?.username || 'sponsor',
        memberUid: u.id,
        memberUsername: u.username || u.email?.split('@')[0] || 'member',
        memberEmail: u.email || '',
        level,
        directInviterUsername: directInviter,
        joinedAt: u.createdAt || new Date().toISOString(),
        joinedTimestamp: u.createdAt ? new Date(u.createdAt).getTime() : Date.now(),
        totalDeposit: Number(u.totalDeposit || (u.totalBalance > 0 ? u.totalBalance : 0)),
        commissionEarned: existing?.commissionEarned || 0,
        status: 'Active',
        vipLevel: Number(u.vipLevel || 0)
      };

      membersMap.set(key, memberRecord);

      // Backfill to Firestore team_referrals if not present
      try {
        await setDoc(doc(db, 'team_referrals', memberRecord.id), memberRecord, { merge: true });
      } catch {}
    };

    // Process all verified members
    for (const u of l1Users) {
      await processMember(u, 1, userIdentifiers?.username || 'You');
    }

    for (const u of l2Users) {
      const directInviterUser = l1Users.find(l1 => l1.id === u.sponsorUid || (l1.username && l1.username.trim().toLowerCase() === (u.sponsorCode || '').trim().toLowerCase()));
      const inviterName = directInviterUser?.username || u.sponsorCode || 'L1 Member';
      await processMember(u, 2, inviterName);
    }

    for (const u of l3Users) {
      const directInviterUser = l2Users.find(l2 => l2.id === u.sponsorUid || (l2.username && l2.username.trim().toLowerCase() === (u.sponsorCode || '').trim().toLowerCase()));
      const inviterName = directInviterUser?.username || u.sponsorCode || 'L2 Member';
      await processMember(u, 3, inviterName);
    }

  } catch (err: any) {
    console.warn('Reconciliation scan notice:', err?.message);
  }

  const allMembersList = Array.from(membersMap.values());
  allMembersList.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));

  // Compute live real stats
  const l1 = allMembersList.filter(m => m.level === 1);
  const l2 = allMembersList.filter(m => m.level === 2);
  const l3 = allMembersList.filter(m => m.level === 3);

  const totalTeamRecharge = allMembersList.reduce((sum, m) => sum + (m.totalDeposit || 0), 0);
  const l1Commission = l1.reduce((sum, m) => sum + (m.commissionEarned || 0), 0);
  const l2Commission = l2.reduce((sum, m) => sum + (m.commissionEarned || 0), 0);
  const l3Commission = l3.reduce((sum, m) => sum + (m.commissionEarned || 0), 0);
  const totalCommissionEarned = l1Commission + l2Commission + l3Commission;

  const stats: TeamStats = {
    totalTeamSize: allMembersList.length,
    l1Count: l1.length,
    l2Count: l2.length,
    l3Count: l3.length,
    totalTeamRecharge: parseFloat(totalTeamRecharge.toFixed(2)),
    totalCommissionEarned: parseFloat(totalCommissionEarned.toFixed(2)),
    l1Commission: parseFloat(l1Commission.toFixed(2)),
    l2Commission: parseFloat(l2Commission.toFixed(2)),
    l3Commission: parseFloat(l3Commission.toFixed(2))
  };

  // Update sponsor document in Firestore users/{userUid} with verified counts
  try {
    await setDoc(doc(db, 'users', userUid), {
      l1Referrals: l1.length,
      l2Referrals: l2.length,
      l3Referrals: l3.length,
      teamSize: allMembersList.length,
      validReferralsCount: l1.length,
      teamRecharge: stats.totalTeamRecharge,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch {}

  // Cache in localStorage for offline / fast preview
  try {
    const cacheKey = `goldrobo_team_members_${userUid}`;
    localStorage.setItem(cacheKey, JSON.stringify(allMembersList));
  } catch {}

  // Dispatch live custom event for reactive UI update
  window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', {
    detail: {
      validReferralsCount: l1.length,
      l1Referrals: l1.length,
      l2Referrals: l2.length,
      l3Referrals: l3.length,
      teamSize: allMembersList.length,
      teamRecharge: stats.totalTeamRecharge,
      referralEarnings: totalCommissionEarned
    }
  }));

  return { members: allMembersList, stats };
}

/**
 * Public trigger to sync and refresh team stats
 */
export async function syncAndRefreshUserTeam(
  userUid: string,
  userIdentifiers?: {
    username?: string;
    referralCode?: string;
  }
): Promise<{ members: ReferralMember[]; stats: TeamStats }> {
  return reconcileTeamWithFirestoreUsers(userUid, userIdentifiers);
}

/**
 * Real-time subscription to a user's multi-tier team members (Level 1, Level 2, Level 3)
 */
export function subscribeToUserTeam(
  userUid: string,
  onUpdate: (members: ReferralMember[], stats: TeamStats) => void,
  userIdentifiers?: {
    username?: string;
    referralCode?: string;
  }
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

  const cacheKey = `goldrobo_team_members_${userUid}`;

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

  // 1. Immediately read from cache if available
  try {
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const cached = JSON.parse(raw);
      if (Array.isArray(cached) && cached.length > 0) {
        computeAndNotify(cached);
      }
    }
  } catch {}

  // 2. Perform live reconciliation with Firestore immediately
  reconcileTeamWithFirestoreUsers(userUid, userIdentifiers).then(res => {
    onUpdate(res.members, res.stats);
  }).catch(() => {});

  // 3. Real-time Firestore onSnapshot listener for changes in team_referrals
  let unsubscribeSnapshot: () => void = () => {};
  try {
    const teamQuery = query(
      collection(db, 'team_referrals'),
      where('sponsorUid', '==', userUid)
    );

    unsubscribeSnapshot = onSnapshot(teamQuery, () => {
      // Re-reconcile live team from Firestore
      reconcileTeamWithFirestoreUsers(userUid, userIdentifiers).then(res => {
        onUpdate(res.members, res.stats);
      }).catch(() => {});
    }, (err) => {
      console.warn('Team referrals onSnapshot error:', err.message);
    });
  } catch (err: any) {
    console.warn('Attach team listener notice:', err?.message);
  }

  // 4. Custom event listener for instant local sync
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
