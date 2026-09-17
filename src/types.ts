export type ModalType = 
  | 'deposit'
  | 'withdraw'
  | 'invite'
  | 'positions'
  | 'vip'
  | 'about'
  | 'bonus'
  | 'history'
  | 'profile'
  | 'language'
  | 'coinInfo'
  | 'quantifyExecution'
  | 'apiKey'
  | null;

export type NavigationTab = 'home' | 'robot' | 'assets';

export interface CandlestickPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface CreatorCoin {
  id: string;
  name: string;
  symbol: string;
  binanceSymbol: string;
  category: string;
  platform: string;
  country: string;
  flag: string;
  price: number;
  change24h: number;
  high24h?: number;
  low24h?: number;
  marketCap: string;
  volume24h: string;
  followers: string;
  description: string;
  avatarBg: string;
  avatarInitial: string;
  chartData: CandlestickPoint[];
}

export type CryptoCoin = CreatorCoin;

export interface TradeHistoryItem {
  id: string;
  timestamp: string;
  dateStr: string;
  timeStr: string;
  coinName: string;
  profitPercent: number;
  quantifyIndex: string; // e.g. "1/1"
  profitAmount: number;
  balanceAfter: number;
  type: 'quantify' | 'deposit' | 'withdraw' | 'bonus' | 'referral';
  status: 'Completed' | 'Pending' | 'Failed' | 'Rejected';
  txHash?: string;
  orderId?: string; // e.g. "TX2609150127514367"
  network?: string;
  nodeRoute?: string;
  userEmail?: string;
  userUid?: string;
  username?: string;
  adminNotes?: string;
  // Destination wallet address for withdrawals (TRC20 / BEP20)
  withdrawalAddress?: string;
  destinationAddress?: string;
  transferNetwork?: string;
  netPayoutAmount?: number;
  adminPaidTxHash?: string;
  adminPaidAt?: string;
  // Screenshot-accurate fields matching user's reference
  amount?: number;
  actualAmount?: number;
  serviceCharge?: number;
  approvalStatus?: string; // "Audit successful" | "Audit pending" | "Audit rejected"
  paymentStatus?: string;  // "Payment successful" | "Audit pending" | "Refunded"
  fullDateStr?: string;    // "2026-09-14 18:27:51"
}

export interface VipTier {
  level: number;
  name: string;
  minDeposit: number;
  minRange: number;
  maxRange: number;
  rangeLabel: string;
  dailyQuantifications: number;
  dailyProfitRate: string;
  profitRateNum: number; // 3.0, 3.5, 4.0, 4.5, 5.0, 5.5, 6.0
  features: string[];
}

export interface ReferralTier {
  level: number;
  title: string;
  percentage: number;
  members: number;
  earned: number;
}

export interface UserState {
  uid: string;
  email: string;
  username?: string;
  plainPassword?: string;
  totalBalance: number;
  bonusBalance: number;
  withdrawableBalance: number;
  lockedInvestment: number; // Principal investment locked for 40 days
  investmentLockDays: number; // 40 days duration
  investmentDaysElapsed: number; // e.g. 1
  lockStartDate: string;
  hasReceivedFirstDepositBonus: boolean; // 3% bonus on first deposit only
  canClaimFirstDepositBonus: boolean; // user made deposit, can claim 3%
  firstDepositBonusAmount: number;
  hasReceived5RefBonus: boolean;
  validReferralsCount: number; // count of referrals who made a deposit
  todayQuantifiableCount: number;
  lastQuantifyDate?: string;
  lastQuantifyTimestamp?: number; // Epoch timestamp of last quantification
  nextQuantifyAllowedAt?: number; // Epoch timestamp when next quantification unlocks (strictly +24 hours)
  updatedAt?: string;
  maxDailyQuantifiable: number; // 1 quantify available daily for all users
  dailyEarningRate: number; // VIP 1 = 3.0%, VIP 2 = 3.5%, VIP 3 = 4.0%, etc.
  minQuantifyAmount: number; // 10 USDT minimum
  minWithdrawAmount: number; // 10 USDT minimum
  withdrawFeeRate: number; // 5% fee
  vipLevel: number;
  referralCode: string;
  sponsorCode?: string;
  referralCount?: number;
  referralEarnings: number;
  l1Referrals: number;
  l2Referrals: number;
  securityPin?: string;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string;
  lastCheckinTimestamp?: number;
  checkinStreak?: number;
  registeredIp?: string;
  registeredCountry?: string;
  deviceFingerprint?: string;
  soundEnabled: boolean;
  selectedLanguage: string;
  apiKey: string;
  apiConnected: boolean;
  refreshIntervalSec: number; // 5 or 10 seconds
  lastPriceSyncTime: string;
}
