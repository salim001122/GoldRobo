// Helper to detect client IP, country, and device fingerprint
export interface DeviceInfo {
  ip: string;
  country: string;
  city?: string;
  fingerprint: string;
  userAgent: string;
  isMultiAccount: boolean;
  registeredCount: number;
}

const DEVICE_ID_KEY = 'goldrobo_device_id';
const REGISTERED_ACCOUNTS_KEY = 'goldrobo_device_accounts';
const KNOWN_REFERRALS_KEY = 'goldrobo_registered_referrals';

// System Master Sponsor Codes that are always valid
export const MASTER_SPONSOR_CODES = [
  'GOLD888',
  'VIP777',
  'QUANT999',
  'ROBO2026',
  'ALPHA88',
  'GOLD8492'
];

export function getOrCreateDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_ID_KEY);
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
      localStorage.setItem(DEVICE_ID_KEY, id);
    }
    return id;
  } catch {
    return 'dev_' + Math.random().toString(36).substring(2, 11);
  }
}

export function getDeviceAccounts(): string[] {
  try {
    const raw = localStorage.getItem(REGISTERED_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function recordDeviceAccount(email: string) {
  try {
    const list = getDeviceAccounts();
    if (!list.includes(email.toLowerCase())) {
      list.push(email.toLowerCase());
      localStorage.setItem(REGISTERED_ACCOUNTS_KEY, JSON.stringify(list));
    }
  } catch {}
}

export function getValidReferralCodes(): string[] {
  try {
    const raw = localStorage.getItem(KNOWN_REFERRALS_KEY);
    const localCodes: string[] = raw ? JSON.parse(raw) : [];
    return Array.from(new Set([...MASTER_SPONSOR_CODES, ...localCodes]));
  } catch {
    return MASTER_SPONSOR_CODES;
  }
}

export function registerNewReferralCode(code: string) {
  if (!code) return;
  try {
    const codes = getValidReferralCodes();
    if (!codes.includes(code.toUpperCase())) {
      codes.push(code.toUpperCase());
      localStorage.setItem(KNOWN_REFERRALS_KEY, JSON.stringify(codes));
    }
  } catch {}
}

export async function fetchDeviceInfo(): Promise<DeviceInfo> {
  const fingerprint = getOrCreateDeviceId();
  const accounts = getDeviceAccounts();
  const isMultiAccount = accounts.length >= 1;

  let ip = '127.0.0.1';
  let country = 'Global';
  let city = 'Encrypted Node';

  // Fast client-side IP lookup with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    // Try ipwhois.app first
    const res = await fetch('https://ipwhois.app/json/', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data.ip) ip = data.ip;
      if (data.country) country = data.country;
      if (data.city) city = data.city;
    }
  } catch {
    // Fallback to ipify if available
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
      const res2 = await fetch('https://api.ipify.org?format=json', { signal: controller2.signal });
      clearTimeout(timeoutId2);
      if (res2.ok) {
        const data2 = await res2.json();
        if (data2.ip) ip = data2.ip;
        country = 'Active Region';
      }
    } catch {
      // Fallback
      ip = 'Encrypted Client IP';
      country = 'Global Terminal';
    }
  }

  return {
    ip,
    country,
    city,
    fingerprint,
    userAgent: navigator.userAgent,
    isMultiAccount,
    registeredCount: accounts.length
  };
}
