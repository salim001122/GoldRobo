import { TradeHistoryItem } from '../types';

export const ADMIN_CREDENTIALS = {
  email: 'salim@gmail.com',
  password: 'Sanam3344'
};

const SYSTEM_TRANSACTIONS_KEY = 'goldrobo_all_system_transactions';
const ADMIN_AUTH_KEY = 'goldrobo_admin_authenticated';

export interface SystemTransaction extends TradeHistoryItem {
  userEmail: string;
  userUid: string;
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

export function getAllSystemTransactions(): SystemTransaction[] {
  try {
    const raw = localStorage.getItem(SYSTEM_TRANSACTIONS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveSystemTransaction(tx: TradeHistoryItem, userEmail?: string, userUid?: string) {
  try {
    const all = getAllSystemTransactions();
    const existingIndex = all.findIndex(t => t.id === tx.id || (t.orderId && t.orderId === tx.orderId));
    
    const record: SystemTransaction = {
      ...tx,
      userEmail: userEmail || tx.userEmail || 'user@goldrobo.io',
      userUid: userUid || tx.userUid || 'uid_default'
    };

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
    console.error('Error saving system transaction:', err);
  }
}

export function updateSystemTransactionStatus(
  txId: string, 
  status: 'Completed' | 'Rejected',
  note?: string
): SystemTransaction | null {
  try {
    const all = getAllSystemTransactions();
    const index = all.findIndex(t => t.id === txId || t.orderId === txId);
    if (index === -1) return null;

    const updatedTx: SystemTransaction = {
      ...all[index],
      status,
      approvalStatus: status === 'Completed' ? 'Audit successful' : (note || 'Audit rejected by administrator'),
      paymentStatus: status === 'Completed' ? 'Payment successful' : 'Rejected',
      adminNotes: note || (status === 'Completed' ? 'Approved by Admin' : 'Rejected by Admin')
    };

    all[index] = updatedTx;
    localStorage.setItem(SYSTEM_TRANSACTIONS_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('goldrobo_system_tx_updated', { detail: updatedTx }));
    return updatedTx;
  } catch (err) {
    console.error('Error updating system transaction status:', err);
    return null;
  }
}
