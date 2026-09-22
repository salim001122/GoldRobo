import { TradeHistoryItem } from '../types';
import { db, updateUserBalanceInFirestore } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';

export const ADMIN_CREDENTIALS = {
  email: 'salim@gmail.com',
  password: 'Sanam3344'
};

const SYSTEM_TRANSACTIONS_KEY = 'goldrobo_all_system_transactions';
const ADMIN_AUTH_KEY = 'goldrobo_admin_authenticated';

export interface SystemTransaction extends TradeHistoryItem {
  userEmail: string;
  userUid: string;
  withdrawalAddress?: string;
  destinationAddress?: string;
  transferNetwork?: string;
  netPayoutAmount?: number;
  adminPaidTxHash?: string;
  adminPaidAt?: string;
}

export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true' || localStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAdminAuthenticated(val: boolean) {
  try {
    if (val) {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
      localStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } else {
      sessionStorage.removeItem(ADMIN_AUTH_KEY);
      localStorage.removeItem(ADMIN_AUTH_KEY);
    }
  } catch {}
}

/**
 * Returns cached local transactions immediately for instant rendering
 */
export function getAllSystemTransactions(): SystemTransaction[] {
  try {
    const raw = localStorage.getItem(SYSTEM_TRANSACTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Save transaction to both Local Cache and Cloud Firestore (system_transactions & withdrawals)
 */
export async function saveSystemTransaction(tx: TradeHistoryItem, userEmail?: string, userUid?: string) {
  const docKey = (tx.orderId || tx.id).replace(/\//g, '_');
  
  const record: SystemTransaction = {
    ...tx,
    userEmail: userEmail || tx.userEmail || 'user@goldrobo.io',
    userUid: userUid || tx.userUid || 'uid_default',
    withdrawalAddress: tx.withdrawalAddress || tx.destinationAddress || '',
    destinationAddress: tx.destinationAddress || tx.withdrawalAddress || '',
    transferNetwork: tx.transferNetwork || tx.network || 'TRC20',
    netPayoutAmount: tx.netPayoutAmount || tx.actualAmount || Math.abs(tx.profitAmount || 0)
  };

  // 1. Immediately update Local Storage Cache
  try {
    const all = getAllSystemTransactions();
    const existingIndex = all.findIndex(t => t.id === tx.id || (t.orderId && t.orderId === tx.orderId));

    let updated: SystemTransaction[];
    if (existingIndex >= 0) {
      updated = [...all];
      updated[existingIndex] = { ...updated[existingIndex], ...record };
    } else {
      updated = [record, ...all];
    }

    localStorage.setItem(SYSTEM_TRANSACTIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('goldrobo_system_tx_updated', { detail: record }));
  } catch (err) {
    console.warn('Local transaction cache note:', err);
  }

  // 2. Persist to Cloud Firestore: system_transactions collection
  try {
    const sysTxRef = doc(db, 'system_transactions', docKey);
    await setDoc(sysTxRef, {
      ...record,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('✅ System transaction saved to Firestore:', docKey);
  } catch (cloudErr: any) {
    console.warn('Firestore system_transactions save note:', cloudErr?.message);
  }

  // 3. If withdrawal, also persist into dedicated withdrawals collection for audit
  if (record.type === 'withdraw') {
    try {
      const wdRef = doc(db, 'withdrawals', docKey);
      await setDoc(wdRef, {
        ...record,
        requestedAt: new Date().toISOString()
      }, { merge: true });
      console.log('✅ Withdrawal request saved to Firestore /withdrawals:', docKey);
    } catch (wdErr: any) {
      console.warn('Firestore /withdrawals save note:', wdErr?.message);
    }
  }
}

/**
 * Fetch all system transactions from Cloud Firestore and merge with local cache
 */
export async function fetchSystemTransactionsFromCloud(): Promise<SystemTransaction[]> {
  try {
    const colRef = collection(db, 'system_transactions');
        
    const snap = await getDocs(query(colRef, orderBy('createdAt', 'desc'), limit(30)));

    const cloudTxs: SystemTransaction[] = [];
    snap.forEach((docSnap) => {
      cloudTxs.push({ id: docSnap.id, ...docSnap.data() } as SystemTransaction);
    });

    if (cloudTxs.length > 0) {
      // Sort newest first
      cloudTxs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
      
      // Merge with any local records
      const local = getAllSystemTransactions();
      const map = new Map<string, SystemTransaction>();
      for (const t of local) map.set(t.orderId || t.id, t);
      for (const t of cloudTxs) map.set(t.orderId || t.id, t); // Cloud takes precedence
      
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
      );

      localStorage.setItem(SYSTEM_TRANSACTIONS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err: any) {
    console.warn('Firestore system transactions fetch note:', err?.message);
  }

  return getAllSystemTransactions();
}

/**
 * Real-time listener for Firestore system_transactions
 * Updates Admin Panel instantly when any user on any device submits a deposit or withdrawal!
 */
export function subscribeToSystemTransactionsCloud(
  onUpdate: (txs: SystemTransaction[]) => void
): () => void {
  try {
    const colRef = collection(db, 'system_transactions');
    const unsubscribe = onSnapshot(colRef, (snapshot) => {
      const cloudTxs: SystemTransaction[] = [];
      snapshot.forEach((docSnap) => {
        cloudTxs.push({ id: docSnap.id, ...docSnap.data() } as SystemTransaction);
      });

      if (cloudTxs.length > 0) {
        cloudTxs.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
        
        // Merge with local
        const local = getAllSystemTransactions();
        const map = new Map<string, SystemTransaction>();
        for (const t of local) map.set(t.orderId || t.id, t);
        for (const t of cloudTxs) map.set(t.orderId || t.id, t);
        
        const merged = Array.from(map.values()).sort(
          (a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime()
        );

        localStorage.setItem(SYSTEM_TRANSACTIONS_KEY, JSON.stringify(merged));
        onUpdate(merged);
      }
    }, (err) => {
      console.warn('Firestore live system transactions listener note:', err?.message);
    });

    return unsubscribe;
  } catch (err: any) {
    console.warn('Error subscribing to system transactions:', err?.message);
    return () => {};
  }
}

/**
 * Admin Action: Approve or Reject transaction in both Local Storage & Cloud Firestore
 */
export async function updateSystemTransactionStatus(
  txId: string, 
  status: 'Completed' | 'Rejected',
  note?: string,
  adminPaidTxHash?: string
): Promise<SystemTransaction | null> {
  try {
    const all = getAllSystemTransactions();
    const index = all.findIndex(t => t.id === txId || t.orderId === txId);
    if (index === -1) return null;

    const currentTx = all[index];
    const docKey = (currentTx.orderId || currentTx.id).replace(/\//g, '_');

    const updatedTx: SystemTransaction = {
      ...currentTx,
      status,
      approvalStatus: status === 'Completed' ? 'Audit successful' : (note || 'Audit rejected by administrator'),
      paymentStatus: status === 'Completed' ? 'Payment successful' : 'Rejected',
      adminNotes: note || (status === 'Completed' ? 'Approved by Admin' : 'Rejected by Admin'),
      adminPaidTxHash: adminPaidTxHash || (status === 'Completed' ? `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}` : undefined),
      adminPaidAt: status === 'Completed' ? new Date().toISOString() : undefined
    };

    // 1. Update Local Storage & dispatch UI update event
    all[index] = updatedTx;
    localStorage.setItem(SYSTEM_TRANSACTIONS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('goldrobo_system_tx_updated', { detail: updatedTx }));

    // 2. Update Cloud Firestore system_transactions
    try {
      const txRef = doc(db, 'system_transactions', docKey);
      await setDoc(txRef, {
        ...updatedTx,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (e: any) {
      console.warn('Firestore system_transactions update note:', e?.message);
    }

    // 3. If withdrawal, update /withdrawals doc
    if (currentTx.type === 'withdraw') {
      try {
        const wdRef = doc(db, 'withdrawals', docKey);
        await setDoc(wdRef, {
          ...updatedTx,
          status,
          processedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e: any) {
        console.warn('Firestore /withdrawals update note:', e?.message);
      }
    }

    // 4. Update user's personal transaction document in Firestore
    if (currentTx.userUid) {
      try {
        const userTxRef = doc(db, 'users', currentTx.userUid, 'transactions', docKey);
        await setDoc(userTxRef, {
          ...updatedTx,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (e: any) {
        console.warn('User transaction update note:', e?.message);
      }
    }

    return updatedTx;
  } catch (err) {
    console.error('Error updating system transaction status:', err);
    return null;
  }
}
