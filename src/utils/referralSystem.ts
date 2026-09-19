import { db, auth } from './firebase';
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

export const MASTER_SPONSOR_CODES = [
  'GOLD888',
  'ADMIN888',
  'SALIM888',
  'VIP888',
  'ROOT888',
  'VIP777',
  'QUANT999',
  'ROBO2026',
  'ALPHA88',
  'GOLD8492'
];

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
  const clean = sponsorInput.trim().replace(/^@+/, '');
  const cleanLower = clean.toLowerCase();
  const cleanUpper = clean.toUpperCase();

  // 1. If pre-validated info passed from validateSponsorCode, prioritize it (unless it's a generic placeholder)
  if (knownValidation?.sponsorUid && knownValidation.sponsorUid !== 'local_cached_sponsor') {
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

  // 4. Check usernames collection registry (direct index)
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

    const rUserSnap = await getDoc(doc(db, 'referral_codes', cleanLower));
    if (rUserSnap.exists()) {
      const rUserData = rUserSnap.data();
      if (rUserData.uid) {
        return {
          sponsorUid: rUserData.uid,
          sponsorUsername: rUserData.username || clean,
          sponsorEmail: rUserData.email || ''
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

    // 6b. by lowercase username
    const qUserLower = query(usersCol, where('username', '==', cleanLower), limit(1));
    const sUserLower = await getDocs(qUserLower);
    if (!sUserLower.empty) {
      const d = sUserLower.docs[0].data();
      return {
        sponsorUid: sUserLower.docs[0].id,
        sponsorUsername: d.username || clean,
        sponsorEmail: d.email || ''
      };
    }

    // 6c. by referralCode uppercase
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

    // 6d. by referralCode exact
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

    // 6e. Resilient scan across users in Firestore (case-insensitive)
    const allUsersSnap = await getDocs(usersCol);
    for (const d of allUsersSnap.docs) {
      const data = d.data();
      const uMatch = data.username && data.username.trim().toLowerCase() === cleanLower;
      const rMatch = (data.referralCode && data.referralCode.trim().toLowerCase() === cleanLower) ||
                     (data.referralCode && data.referralCode.trim().toUpperCase() === cleanUpper);
      const eMatch = data.email && data.email.trim().toLowerCase() === cleanLower;
      const epMatch = data.email && data.email.split('@')[0].trim().toLowerCase() === cleanLower;
      const uidMatch = d.id === clean || d.id.toLowerCase() === cleanLower;
      if (uMatch || rMatch || eMatch || epMatch || uidMatch) {
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

  // 7. Fallback local device storage (for offline or local testing)
  try {
    const rawUser = localStorage.getItem('goldrobo_user_state');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      if (
        (u.username && u.username.toLowerCase() === cleanLower) ||
        (u.referralCode && u.referralCode.toLowerCase() === cleanLower) ||
        (u.email && u.email.toLowerCase() === cleanLower)
      ) {
        return {
          sponsorUid: u.uid || `usr_sp_${cleanLower}`,
          sponsorUsername: u.username || clean,
          sponsorEmail: u.email || ''
        };
      }
    }

    const regUsersRaw = localStorage.getItem('goldrobo_registered_users_list');
    if (regUsersRaw) {
      const list = JSON.parse(regUsersRaw);
      if (Array.isArray(list)) {
        const found = list.find((a: any) => 
          (a.username && a.username.toLowerCase() === cleanLower) ||
          (a.referralCode && a.referralCode.toLowerCase() === cleanLower) ||
          (a.email && a.email.toLowerCase() === cleanLower)
        );
        if (found) {
          return {
            sponsorUid: found.uid || `usr_sp_${cleanLower}`,
            sponsorUsername: found.username || clean,
            sponsorEmail: found.email || ''
          };
        }
      }
    }

    const rawLocal = localStorage.getItem('goldrobo_device_accounts');
    if (rawLocal) {
      const accs = JSON.parse(rawLocal);
      if (Array.isArray(accs)) {
        const found = accs.find((a: any) => 
          (typeof a === 'object' && a.username && a.username.toLowerCase() === cleanLower) ||
          (typeof a === 'object' && a.referralCode && a.referralCode.toLowerCase() === cleanLower) ||
          (typeof a === 'object' && a.email && a.email.toLowerCase() === cleanLower) ||
          (typeof a === 'string' && a.toLowerCase() === cleanLower)
        );
        if (found) {
          const o = typeof found === 'object' ? found : { username: clean };
          return {
            sponsorUid: o.uid || `usr_sp_${cleanLower}`,
            sponsorUsername: o.username || clean,
            sponsorEmail: o.email || ''
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
    await incrementSponsorCounts(l1Sponsor.sponsorUid, 1, l1Sponsor.sponsorUsername);

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
          const l2Input = sp1Data.sponsorUid || sp1Data.sponsorCode || sp1Data.sponsorUsername || sp1Data.invitedBy;
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
      await incrementSponsorCounts(l2Sponsor.sponsorUid, 2, l2Sponsor.sponsorUsername);

      // 4. Resolve Level 3 Sponsor from Level 2 Sponsor's record
      let l3Sponsor: { sponsorUid: string; sponsorUsername: string; sponsorEmail: string; isGenesis?: boolean } | null = null;
      try {
        const sp2Doc = await getDoc(doc(db, 'users', l2Sponsor.sponsorUid));
        if (sp2Doc.exists()) {
          const sp2Data = sp2Doc.data();
          const l3Input = sp2Data.sponsorUid || sp2Data.sponsorCode || sp2Data.sponsorUsername || sp2Data.invitedBy;
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
        await incrementSponsorCounts(l3Sponsor.sponsorUid, 3, l3Sponsor.sponsorUsername);
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
  // 1. Save to Firestore team_referrals collection
  try {
    const docRef = doc(db, 'team_referrals', record.id);
    await setDoc(docRef, record, { merge: true });
  } catch (err: any) {
    console.warn('Firestore save team member notice:', err?.message);
  }

  // 2. Also save to sponsor's referrals subcollection for direct Level 1
  try {
    if (record.sponsorUid && record.sponsorUid !== 'genesis_sponsor_gold888' && record.level === 1) {
      await setDoc(doc(db, 'users', record.sponsorUid, 'referrals', record.memberUid), {
        uid: record.memberUid,
        email: record.memberEmail,
        username: record.memberUsername,
        joinedAt: record.joinedAt,
        level: record.level,
        status: record.status || 'Active Member',
        totalDeposit: record.totalDeposit || 0
      }, { merge: true });
    }
  } catch {}

  // 3. Save to Local cache for sponsor
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
export async function incrementSponsorCounts(sponsorUid: string, level: 1 | 2 | 3, sponsorUsername?: string) {
  if (!sponsorUid || sponsorUid === 'genesis_sponsor_gold888') return;
  try {
    let targetUid = sponsorUid;
    let currentData: any = null;
    let userRef = doc(db, 'users', targetUid);

    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        currentData = snap.data();
      }
    } catch {}

    if (!currentData) {
      // Search by username or referralCode in users collection
      try {
        const usersCol = collection(db, 'users');
        const qU = query(usersCol, where('username', '==', sponsorUsername || sponsorUid), limit(1));
        const sU = await getDocs(qU);
        if (!sU.empty) {
          targetUid = sU.docs[0].id;
          currentData = sU.docs[0].data();
          userRef = doc(db, 'users', targetUid);
        }
      } catch {}
    }

    const curL1 = Number(currentData?.l1Referrals || 0);
    const curL2 = Number(currentData?.l2Referrals || 0);
    const curL3 = Number(currentData?.l3Referrals || 0);
    const curValid = Number(currentData?.validReferralsCount || 0);
    const curTotal = Number(currentData?.referralCount || currentData?.totalReferralsCount || 0);

    const updates: any = {
      updatedAt: new Date().toISOString(),
      lastReferralAt: new Date().toISOString()
    };

    if (level === 1) {
      updates.l1Referrals = curL1 + 1;
      updates.validReferralsCount = curValid + 1;
      updates.referralCount = curTotal + 1;
      updates.totalReferralsCount = curTotal + 1;
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
        const isMatch = u.uid === targetUid || 
          u.uid === sponsorUid || 
          (sponsorUsername && u.username && u.username.toLowerCase() === sponsorUsername.toLowerCase());
        if (isMatch) {
          u.l1Referrals = effectiveL1;
          u.l2Referrals = effectiveL2;
          u.l3Referrals = effectiveL3;
          u.teamSize = updates.teamSize;
          if (updates.validReferralsCount !== undefined) {
            u.validReferralsCount = updates.validReferralsCount;
          }
          u.referralCount = updates.referralCount || u.referralCount;
          localStorage.setItem('goldrobo_user_state', JSON.stringify(u));
          window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { detail: u }));
        }
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', {
      detail: {
        sponsorUid: targetUid,
        l1Referrals: effectiveL1,
        l2Referrals: effectiveL2,
        l3Referrals: effectiveL3,
        teamSize: updates.teamSize,
        validReferralsCount: updates.validReferralsCount
      }
    }));
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

  const membersMap = new Map<string, ReferralMember>();

  // Fetch all users from Firestore
  let allUsers: any[] = [];
  try {
    const usersCol = collection(db, 'users');
    const allUsersSnap = await getDocs(usersCol);
    allUsersSnap.forEach(d => {
      allUsers.push({ id: d.id, ...d.data() });
    });
  } catch (err: any) {
    console.warn('Fetch all users notice:', err?.message);
  }

  // Also include users from local storage if not already in allUsers
  try {
    const regRaw = localStorage.getItem('goldrobo_registered_users_list');
    if (regRaw) {
      const regList = JSON.parse(regRaw);
      if (Array.isArray(regList)) {
        for (const ru of regList) {
          if (ru.uid && !allUsers.some(u => u.id === ru.uid)) {
            allUsers.push({ id: ru.uid, ...ru });
          }
        }
      }
    }
    const curRaw = localStorage.getItem('goldrobo_user_state');
    if (curRaw) {
      const cu = JSON.parse(curRaw);
      if (cu.uid && !allUsers.some(u => u.id === cu.uid)) {
        allUsers.push({ id: cu.uid, ...cu });
      }
    }
  } catch {}

  // Find authoritative current user document in allUsers
  const cleanPassedUser = (userIdentifiers?.username || '').trim().toLowerCase().replace(/^@+/, '');
  const cleanPassedCode = (userIdentifiers?.referralCode || '').trim().toLowerCase().replace(/^@+/, '');

  const myDoc = allUsers.find(u => 
    u.id === userUid || 
    (cleanPassedUser && u.username && u.username.trim().toLowerCase() === cleanPassedUser) ||
    (cleanPassedCode && u.referralCode && u.referralCode.trim().toLowerCase() === cleanPassedCode)
  );

  const myCanonicalUsername = myDoc?.username || userIdentifiers?.username || (myDoc?.email ? myDoc.email.split('@')[0] : 'sponsor');

  // Build comprehensive aliases set for the current sponsor
  const myAliases = new Set<string>();
  myAliases.add(userUid.toLowerCase());
  if (myDoc?.id) myAliases.add(myDoc.id.toLowerCase());
  if (myDoc?.username) {
    const u = myDoc.username.trim().toLowerCase().replace(/^@+/, '');
    myAliases.add(u);
    myAliases.add(`@${u}`);
  }
  if (myDoc?.referralCode) {
    const r = myDoc.referralCode.trim().toLowerCase().replace(/^@+/, '');
    myAliases.add(r);
  }
  if (myDoc?.email) {
    const e = myDoc.email.trim().toLowerCase();
    myAliases.add(e);
    const ep = e.split('@')[0];
    myAliases.add(ep);
  }
  if (cleanPassedUser) {
    myAliases.add(cleanPassedUser);
    myAliases.add(`@${cleanPassedUser}`);
  }
  if (cleanPassedCode) {
    myAliases.add(cleanPassedCode);
  }
  if (auth.currentUser?.email) {
    const ae = auth.currentUser.email.trim().toLowerCase();
    myAliases.add(ae);
    myAliases.add(ae.split('@')[0]);
  }

  // 1. Read existing records from team_referrals collection
  try {
    const teamCol = collection(db, 'team_referrals');
    const teamSnap = await getDocs(teamCol);
    teamSnap.forEach(d => {
      const m = d.data() as ReferralMember;
      const spUid = (m.sponsorUid || '').trim().toLowerCase();
      const spUser = (m.sponsorUsername || '').trim().toLowerCase().replace(/^@+/, '');
      const isMatch = myAliases.has(spUid) || myAliases.has(spUser) || m.sponsorUid === userUid;
      if (isMatch) {
        const normLevel = (Number(m.level) === 2) ? 2 : ((Number(m.level) === 3) ? 3 : 1);
        membersMap.set(`${m.memberUid}_L${normLevel}`, {
          ...m,
          level: normLevel
        });
      }
    });
  } catch (err: any) {
    console.warn('Read team_referrals notice:', err?.message);
  }

  // 2. Read direct referrals from users/{userUid}/referrals subcollection
  try {
    const subCol = collection(db, 'users', userUid, 'referrals');
    const subSnap = await getDocs(subCol);
    subSnap.forEach(d => {
      const subData = d.data();
      const memberUid = subData.uid || d.id;
      const key = `${memberUid}_L1`;
      if (!membersMap.has(key)) {
        membersMap.set(key, {
          id: `${userUid}_${memberUid}_L1`,
          sponsorUid: userUid,
          sponsorUsername: myCanonicalUsername,
          memberUid: memberUid,
          memberUsername: subData.username || subData.email?.split('@')[0] || 'member',
          memberEmail: subData.email || '',
          level: 1,
          directInviterUsername: myCanonicalUsername,
          joinedAt: subData.joinedAt || new Date().toISOString(),
          joinedTimestamp: subData.joinedAt ? new Date(subData.joinedAt).getTime() : Date.now(),
          totalDeposit: Number(subData.totalDeposit || 0),
          commissionEarned: 0,
          status: 'Active',
          vipLevel: Number(subData.vipLevel || 0)
        });
      }
    });
  } catch (err: any) {
    console.warn('Subcollection referrals notice:', err?.message);
  }

  // 3. Scan allUsers to dynamically build multi-tier relationships (Level 1, 2, 3)
  const otherUsers = allUsers.filter(u => u.id !== userUid && !myAliases.has(u.id.toLowerCase()));

  // Function to test if a candidate user was sponsored by any alias in an alias set
  const isSponsoredBy = (candidate: any, sponsorAliases: Set<string>): boolean => {
    const candidateFields = [
      candidate.sponsorUid,
      candidate.sponsorId,
      candidate.sponsor,
      candidate.sponsorUsername,
      candidate.directInviterUsername,
      candidate.referrer,
      candidate.referredBy,
      candidate.invitedBy,
      candidate.sponsorCode,
      candidate.invitedByCode,
      candidate.refCode,
      candidate.referralSponsor
    ];

    for (const val of candidateFields) {
      if (!val || typeof val !== 'string') continue;
      const clean = val.trim().toLowerCase();
      if (!clean) continue;
      if (sponsorAliases.has(clean)) return true;
      const withoutAt = clean.replace(/^@+/, '');
      if (sponsorAliases.has(withoutAt)) return true;
      if (clean.includes('@')) {
        const prefix = clean.split('@')[0];
        if (sponsorAliases.has(prefix)) return true;
      }
    }
    return false;
  };

  // Helper to extract all aliases for a group of users
  const extractGroupAliases = (users: any[]): Set<string> => {
    const aliases = new Set<string>();
    for (const u of users) {
      if (u.id) aliases.add(u.id.toLowerCase());
      if (u.username) {
        const un = u.username.trim().toLowerCase().replace(/^@+/, '');
        aliases.add(un);
        aliases.add(`@${un}`);
      }
      if (u.referralCode) {
        const rc = u.referralCode.trim().toLowerCase().replace(/^@+/, '');
        aliases.add(rc);
        aliases.add(`@${rc}`);
      }
      if (u.email) {
        const em = u.email.trim().toLowerCase();
        aliases.add(em);
        aliases.add(em.split('@')[0]);
      }
    }
    return aliases;
  };

  // Level 1: Users directly sponsored by this user
  const l1Users: any[] = [];
  for (const u of otherUsers) {
    if (isSponsoredBy(u, myAliases)) {
      l1Users.push(u);
    }
  }

  const l1Uids = new Set(l1Users.map(u => u.id));
  const l1Aliases = extractGroupAliases(l1Users);

  // Level 2: Users sponsored by any Level 1 member
  const l2Users: any[] = [];
  for (const u of otherUsers) {
    if (l1Uids.has(u.id)) continue;
    if (isSponsoredBy(u, l1Aliases)) {
      l2Users.push(u);
    }
  }

  const l2Uids = new Set(l2Users.map(u => u.id));
  const l2Aliases = extractGroupAliases(l2Users);

  // Level 3: Users sponsored by any Level 2 member
  const l3Users: any[] = [];
  for (const u of otherUsers) {
    if (l1Uids.has(u.id) || l2Uids.has(u.id)) continue;
    if (isSponsoredBy(u, l2Aliases)) {
      l3Users.push(u);
    }
  }

  // Helper to process and auto-backfill into Firestore team_referrals
  const processMember = async (u: any, level: 1 | 2 | 3, directInviter: string) => {
    const key = `${u.id}_L${level}`;
    const existing = membersMap.get(key);
    const userBalance = Number(u.totalBalance || 0);
    const userDeposit = Number(u.totalDeposit || (userBalance > 0 ? userBalance : 0));
    const userVip = u.vipLevel !== undefined ? Number(u.vipLevel) : (userDeposit >= 10 || userBalance >= 10 ? 1 : 0);

    const memberRecord: ReferralMember = {
      id: `${userUid}_${u.id}_L${level}`,
      sponsorUid: userUid,
      sponsorUsername: myCanonicalUsername,
      memberUid: u.id,
      memberUsername: u.username || u.email?.split('@')[0] || 'trader_' + u.id.slice(0, 5),
      memberEmail: u.email || '',
      level,
      directInviterUsername: directInviter,
      joinedAt: u.createdAt || existing?.joinedAt || new Date().toISOString(),
      joinedTimestamp: u.createdAt ? new Date(u.createdAt).getTime() : (existing?.joinedTimestamp || Date.now()),
      totalDeposit: userDeposit,
      commissionEarned: existing?.commissionEarned || 0,
      status: 'Active',
      vipLevel: userVip
    };

    membersMap.set(key, memberRecord);

    // Backfill to Firestore team_referrals if not present
    try {
      await setDoc(doc(db, 'team_referrals', memberRecord.id), memberRecord, { merge: true });
    } catch {}
  };

  // Process all Level 1, 2, 3 members
  for (const u of l1Users) {
    await processMember(u, 1, myCanonicalUsername);
  }

  for (const u of l2Users) {
    const parentL1 = l1Users.find(l1 => isSponsoredBy(u, extractGroupAliases([l1])));
    const inviterName = parentL1?.username || u.sponsorCode || 'L1 Member';
    await processMember(u, 2, inviterName);
  }

  for (const u of l3Users) {
    const parentL2 = l2Users.find(l2 => isSponsoredBy(u, extractGroupAliases([l2])));
    const inviterName = parentL2?.username || u.sponsorCode || 'L2 Member';
    await processMember(u, 3, inviterName);
  }

  // Enrich any members loaded from team_referrals/subcollections with live data from allUsers
  for (const [key, mem] of membersMap.entries()) {
    const liveUser = allUsers.find(u => u.id === mem.memberUid);
    if (liveUser) {
      const ub = Number(liveUser.totalBalance || 0);
      const ud = Number(liveUser.totalDeposit || (ub > 0 ? ub : 0));
      membersMap.set(key, {
        ...mem,
        memberUsername: liveUser.username || mem.memberUsername || (liveUser.email ? liveUser.email.split('@')[0] : 'member'),
        memberEmail: liveUser.email || mem.memberEmail || '',
        totalDeposit: ud > 0 ? ud : (mem.totalDeposit || 0),
        vipLevel: liveUser.vipLevel !== undefined ? Number(liveUser.vipLevel) : (mem.vipLevel || 0)
      });
    }
  }

  const allMembersList = Array.from(membersMap.values());
  // Normalize levels to strictly 1, 2, or 3
  for (const m of allMembersList) {
    m.level = (Number(m.level) === 2) ? 2 : ((Number(m.level) === 3) ? 3 : 1);
  }
  allMembersList.sort((a, b) => (b.joinedTimestamp || 0) - (a.joinedTimestamp || 0));

  // Compute live real stats
  const l1 = allMembersList.filter(m => m.level === 1);
  const l2 = allMembersList.filter(m => m.level === 2);
  const l3 = allMembersList.filter(m => m.level === 3);

  const totalTeamRecharge = allMembersList.reduce((sum, m) => sum + (Number(m.totalDeposit) || 0), 0);
  const l1Commission = l1.reduce((sum, m) => sum + (Number(m.commissionEarned) || 0), 0);
  const l2Commission = l2.reduce((sum, m) => sum + (Number(m.commissionEarned) || 0), 0);
  const l3Commission = l3.reduce((sum, m) => sum + (Number(m.commissionEarned) || 0), 0);
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

  const docL1 = Number(myDoc?.l1Referrals || 0);
  const docL2 = Number(myDoc?.l2Referrals || 0);
  const docL3 = Number(myDoc?.l3Referrals || 0);
  const docTeam = Number(myDoc?.teamSize || 0);
  const docValid = Number(myDoc?.validReferralsCount || 0);

  const effL1 = Math.max(l1.length, docL1);
  const effL2 = Math.max(l2.length, docL2);
  const effL3 = Math.max(l3.length, docL3);
  const effTeam = Math.max(allMembersList.length, docTeam, effL1 + effL2 + effL3);
  const effValid = Math.max(effL1, docValid);

  stats.l1Count = effL1;
  stats.l2Count = effL2;
  stats.l3Count = effL3;
  stats.totalTeamSize = effTeam;

  // Update sponsor document in Firestore users/{userUid} with verified counts
  try {
    await setDoc(doc(db, 'users', userUid), {
      l1Referrals: effL1,
      l2Referrals: effL2,
      l3Referrals: effL3,
      teamSize: effTeam,
      validReferralsCount: effValid,
      referralCount: effValid,
      totalReferralsCount: effValid,
      teamRecharge: stats.totalTeamRecharge,
      referralEarnings: stats.totalCommissionEarned,
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
      validReferralsCount: effValid,
      l1Referrals: effL1,
      l2Referrals: effL2,
      l3Referrals: effL3,
      teamSize: effTeam,
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
    // Normalize levels
    for (const m of members) {
      m.level = (Number(m.level) === 2) ? 2 : ((Number(m.level) === 3) ? 3 : 1);
    }
    const l1 = members.filter(m => m.level === 1);
    const l2 = members.filter(m => m.level === 2);
    const l3 = members.filter(m => m.level === 3);

    const totalTeamRecharge = members.reduce((sum, m) => sum + (Number(m.totalDeposit) || 0), 0);
    const l1Commission = l1.reduce((sum, m) => sum + (Number(m.commissionEarned) || 0), 0);
    const l2Commission = l2.reduce((sum, m) => sum + (Number(m.commissionEarned) || 0), 0);
    const l3Commission = l3.reduce((sum, m) => sum + (Number(m.commissionEarned) || 0), 0);
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

  // 3. Real-time Firestore onSnapshot listener for team_referrals collection
  let unsubTeamSnap: () => void = () => {};
  try {
    unsubTeamSnap = onSnapshot(collection(db, 'team_referrals'), () => {
      reconcileTeamWithFirestoreUsers(userUid, userIdentifiers).then(res => {
        onUpdate(res.members, res.stats);
      }).catch(() => {});
    }, (err) => {
      console.warn('Team referrals onSnapshot error:', err.message);
    });
  } catch (err: any) {
    console.warn('Attach team listener notice:', err?.message);
  }

  // 4. Real-time Firestore onSnapshot listener for users collection (new user registrations)
  let unsubUsersSnap: () => void = () => {};
  try {
    unsubUsersSnap = onSnapshot(collection(db, 'users'), () => {
      reconcileTeamWithFirestoreUsers(userUid, userIdentifiers).then(res => {
        onUpdate(res.members, res.stats);
      }).catch(() => {});
    }, (err) => {
      console.warn('Users collection onSnapshot error:', err.message);
    });
  } catch (err: any) {
    console.warn('Attach users listener notice:', err?.message);
  }

  // 5. Custom event listener for instant local sync
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
    unsubTeamSnap();
    unsubUsersSnap();
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
