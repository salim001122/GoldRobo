import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  ModalType,
  NavigationTab,
  CreatorCoin,
  TradeHistoryItem,
  UserState,
  VipTier
} from '../types';
import {
  REAL_CRYPTO_CURRENCIES as INITIAL_CREATOR_COINS,
  INITIAL_TRADE_HISTORY,
  INITIAL_USER_STATE,
  INITIAL_7D_EARNINGS,
  VIP_TIERS,
  getVipTierForAmount
} from '../data/constants';
import { playClickSound, playSuccessSound, playRobotScanningSound } from '../utils/audio';
import { fetchLiveCryptoPrices, fetchRealKlines } from '../utils/cryptoApi';
import { 
  auth, 
  fbSignOut, 
  syncUserProfileToFirestore, 
  recordTransactionToFirestore, 
  onAuthStateChanged,
  fetchUserProfileFromFirestore,
  fetchUserTransactionsFromFirestore,
  subscribeToUserProfile,
  registerUserIdentifiersInCloud
} from '../utils/firebase';
import { saveSystemTransaction } from '../utils/adminTransactions';
import { distributeMultiTierCommission, syncAndRefreshUserTeam } from '../utils/referralSystem';
import { getTranslation } from '../utils/translations';

interface AppContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  selectedCoin: CreatorCoin;
  setSelectedCoin: (coin: CreatorCoin) => void;
  activeModal: ModalType;
  openModal: (modal: ModalType) => void;
  closeModal: () => void;
  hideBalance: boolean;
  toggleHideBalance: () => void;
  isAuthenticated: boolean;
  loginUser: (userData: { 
    uid: string; 
    email: string; 
    username?: string;
    referralCode?: string; 
    securityPin?: string;
    sponsorCode?: string;
    totalBalance?: number;
    withdrawableBalance?: number;
    twoFactorEnabled?: boolean;
  }) => Promise<void>;
  logoutUser: () => void;
  userState: UserState;
  history: TradeHistoryItem[];
  coins: CreatorCoin[];
  sevenDayEarnings: { day: string; earnings: number }[];
  isQuantifying: boolean;
  quantifyStep: number;
  lastProfitResult: { profit: number; percent: number; coin: string } | null;
  startQuantification: (coinId?: string) => void;
  depositFunds: (amount: number, network: string, txHash?: string) => { success: boolean; message: string };
  approvePendingDeposit: (txId: string) => { success: boolean; message: string };
  withdrawFunds: (amount: number, address: string, network: string, pin: string) => { success: boolean; message: string };
  claimDailyBonus: (day: number, amount: number) => { success: boolean; message: string };
  claimTaskBonus: (taskName: string, amount: number) => void;
  claimFirstDepositBonus: () => { success: boolean; message: string };
  claim5ReferralsBonus: () => { success: boolean; message: string };
  upgradeVipLevel: (level: number) => { success: boolean; message: string };
  unlockMaturedInvestment: () => { success: boolean; message: string };
  setLanguage: (lang: string) => void;
  t: (key: string, fallback?: string) => string;
  toggleSound: () => void;
  claimedBonuses: number[];
  completedTasks: string[];
  saveApiConfig: (key: string, intervalSec: number) => { success: boolean; message: string };
  forcePriceRefresh: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'goldrobo_user_v4';
const STORAGE_KEY_HISTORY = 'goldrobo_history_v4';
const STORAGE_KEY_BONUSES = 'goldrobo_bonuses_v4';
const STORAGE_KEY_TASKS = 'goldrobo_tasks_v4';
const STORAGE_KEY_AUTH = 'goldrobo_auth_session_v4';

/**
 * Resolves authoritative username and guarantees referralCode is 100% the username!
 * Purges any legacy "GOLD..." placeholder codes so only the real username acts as referral code.
 */
export function resolveUsernameAndReferralCode(raw: {
  username?: string | null;
  referralCode?: string | null;
  email?: string | null;
}): { username: string; referralCode: string } {
  const emailPrefix = (raw.email && raw.email.includes('@')) ? raw.email.split('@')[0].trim() : '';
  let finalUser = '';

  if (raw.username && raw.username.trim() && !raw.username.trim().toUpperCase().startsWith('GOLD')) {
    finalUser = raw.username.trim();
  } else if (emailPrefix) {
    finalUser = emailPrefix;
  } else if (raw.referralCode && raw.referralCode.trim() && !raw.referralCode.trim().toUpperCase().startsWith('GOLD')) {
    finalUser = raw.referralCode.trim();
  } else if (raw.username && raw.username.trim()) {
    finalUser = raw.username.trim();
  }

  return {
    username: finalUser,
    referralCode: finalUser
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<NavigationTab>('home');
  const [coins, setCoins] = useState<CreatorCoin[]>(INITIAL_CREATOR_COINS);
  const [selectedCoin, setSelectedCoinState] = useState<CreatorCoin>(INITIAL_CREATOR_COINS[0]);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [hideBalance, setHideBalance] = useState<boolean>(false);
  const [sevenDayEarnings, setSevenDayEarnings] = useState(INITIAL_7D_EARNINGS);

  // Authentication session
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const session = localStorage.getItem(STORAGE_KEY_AUTH);
      return !!session;
    } catch {
      return false;
    }
  });

  // User state with migration/defaults
  const [userState, setUserState] = useState<UserState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        const nowMs = Date.now();
        const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000; // Strict 24 hours (86,400,000 ms)

        // Strict 24-Hour Cooldown Calculation
        const lastQuantifyMs = parsed.lastQuantifyTimestamp || (parsed.lastQuantifyDate ? new Date(parsed.lastQuantifyDate).getTime() : 0);
        const nextAllowedMs = parsed.nextQuantifyAllowedAt || (lastQuantifyMs > 0 ? (lastQuantifyMs + COOLDOWN_24H_MS) : 0);

        // Cooldown is strictly active if within 24 hours of last quantify timestamp
        const isCooldownActive = lastQuantifyMs > 0 && nowMs < nextAllowedMs;
        const effectiveCount = isCooldownActive ? 1 : 0;

        const totalBal = parsed.totalBalance ?? 0.00;
        const lockedBal = parsed.lockedInvestment ?? 0.00;
        const activeCap = lockedBal > 0 ? lockedBal : totalBal;
        const rangeTier = getVipTierForAmount(activeCap);
        const vipLevel = parsed.vipLevel !== undefined ? parsed.vipLevel : (rangeTier ? rangeTier.level : (totalBal >= 10 ? 1 : 0));
        const matchingTier = VIP_TIERS.find(v => v.level === vipLevel) || rangeTier;

        // Resolve username and ensure referral code is username (never old GOLD... code)
        const { username: cleanUser, referralCode: cleanCode } = resolveUsernameAndReferralCode({
          username: parsed.username,
          referralCode: parsed.referralCode,
          email: parsed.email
        });

        return {
          ...INITIAL_USER_STATE,
          ...parsed,
          username: cleanUser || parsed.username || '',
          referralCode: cleanCode || cleanUser || '',
          maxDailyQuantifiable: 1, // 1 quantify daily for all users
          todayQuantifiableCount: effectiveCount,
          lastQuantifyTimestamp: lastQuantifyMs,
          nextQuantifyAllowedAt: isCooldownActive ? nextAllowedMs : 0,
          lastQuantifyDate: parsed.lastQuantifyDate || (lastQuantifyMs ? new Date(lastQuantifyMs).toISOString() : ''),
          totalBalance: totalBal,
          withdrawableBalance: parsed.withdrawableBalance ?? 0.00,
          lockedInvestment: lockedBal,
          vipLevel,
          dailyEarningRate: vipLevel > 0 ? (matchingTier ? matchingTier.profitRateNum : 3.0) : 0.0,
          minQuantifyAmount: 10.00,
          minWithdrawAmount: 10.00,
          withdrawFeeRate: 0.05,
          investmentLockDays: 40,
          investmentDaysElapsed: parsed.investmentDaysElapsed !== undefined ? parsed.investmentDaysElapsed : 0,
          validReferralsCount: parsed.validReferralsCount !== undefined ? parsed.validReferralsCount : 0,
          apiKey: parsed.apiKey || 'binance_live_gateway_v3_secure',
          apiConnected: true,
          refreshIntervalSec: parsed.refreshIntervalSec || 5,
          lastPriceSyncTime: 'Live Connected'
        };
      }
      return INITIAL_USER_STATE;
    } catch {
      return INITIAL_USER_STATE;
    }
  });

  const userStateRef = useRef(userState);
  userStateRef.current = userState;

  // Trade history
  const [history, setHistory] = useState<TradeHistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Daily claimed bonuses
  const [claimedBonuses, setClaimedBonuses] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BONUSES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Completed tasks (No welcome bonus required - removed per user request)
  const [completedTasks, setCompletedTasks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TASKS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Quantification execution state
  const [isQuantifying, setIsQuantifying] = useState<boolean>(false);
  const [quantifyStep, setQuantifyStep] = useState<number>(0);
  const [lastProfitResult, setLastProfitResult] = useState<{ profit: number; percent: number; coin: string } | null>(null);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(userState));
    } catch {}
  }, [userState]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BONUSES, JSON.stringify(claimedBonuses));
    } catch {}
  }, [claimedBonuses]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(completedTasks));
    } catch {}
  }, [completedTasks]);

  // Real-time listener for Cloud Firestore user profile document
  // Automatically syncs balance when adjusted directly in Firebase Console or by Admin
  useEffect(() => {
    if (!userState.uid) return;

    const unsubscribe = subscribeToUserProfile(userState.uid, (remoteProfile) => {
      if (!remoteProfile) return;

      setUserState(prev => {
        // Authoritative Firestore balances - exact values without corrupting Math.max
        const updatedTotal = remoteProfile.totalBalance !== undefined && remoteProfile.totalBalance !== null
          ? +Number(remoteProfile.totalBalance).toFixed(2)
          : prev.totalBalance;
        const updatedWithdrawable = remoteProfile.withdrawableBalance !== undefined && remoteProfile.withdrawableBalance !== null
          ? +Number(remoteProfile.withdrawableBalance).toFixed(2)
          : prev.withdrawableBalance;
        const updatedLocked = remoteProfile.lockedInvestment !== undefined && remoteProfile.lockedInvestment !== null
          ? +Number(remoteProfile.lockedInvestment).toFixed(2)
          : prev.lockedInvestment;
        const updatedBonus = remoteProfile.bonusBalance !== undefined && remoteProfile.bonusBalance !== null
          ? +Number(remoteProfile.bonusBalance).toFixed(2)
          : prev.bonusBalance;

        const effectiveCapital = updatedLocked > 0 ? updatedLocked : updatedTotal;
        const rangeTier = getVipTierForAmount(effectiveCapital);

        const effectiveVip = remoteProfile.vipLevel !== undefined 
          ? Number(remoteProfile.vipLevel) 
          : (rangeTier ? rangeTier.level : (updatedTotal >= 10 ? 1 : prev.vipLevel));
        const matchingTier = VIP_TIERS.find(v => v.level === effectiveVip) || rangeTier;
        const effectiveDailyRate = remoteProfile.dailyEarningRate !== undefined 
          ? Number(remoteProfile.dailyEarningRate) 
          : (matchingTier ? matchingTier.profitRateNum : (effectiveVip > 0 ? 3.0 : 0.0));

        const updatedReferrals = remoteProfile.validReferralsCount !== undefined 
          ? Number(remoteProfile.validReferralsCount) 
          : prev.validReferralsCount;

        // Strict 24h Cooldown State Preservation
        const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;
        const nowMs = Date.now();
        const remoteLastTs = remoteProfile.lastQuantifyTimestamp || (remoteProfile.lastQuantifyDate ? new Date(remoteProfile.lastQuantifyDate).getTime() : 0);
        const localLastTs = prev.lastQuantifyTimestamp || (prev.lastQuantifyDate ? new Date(prev.lastQuantifyDate).getTime() : 0);
        const effectiveLastTs = Math.max(remoteLastTs, localLastTs);
        const effectiveNextAllowed = Math.max(
          remoteProfile.nextQuantifyAllowedAt || 0,
          prev.nextQuantifyAllowedAt || 0,
          effectiveLastTs > 0 ? (effectiveLastTs + COOLDOWN_24H_MS) : 0
        );
        const isCooldownActive = effectiveLastTs > 0 && nowMs < effectiveNextAllowed;

        return {
          ...prev,
          totalBalance: updatedTotal,
          withdrawableBalance: updatedWithdrawable,
          lockedInvestment: updatedLocked,
          bonusBalance: updatedBonus,
          vipLevel: effectiveVip,
          dailyEarningRate: effectiveDailyRate,
          validReferralsCount: updatedReferrals,
          referralEarnings: remoteProfile.referralEarnings !== undefined ? Number(remoteProfile.referralEarnings) : prev.referralEarnings,
          l1Referrals: remoteProfile.l1Referrals !== undefined ? Number(remoteProfile.l1Referrals) : prev.l1Referrals,
          l2Referrals: remoteProfile.l2Referrals !== undefined ? Number(remoteProfile.l2Referrals) : prev.l2Referrals,
          l3Referrals: remoteProfile.l3Referrals !== undefined ? Number(remoteProfile.l3Referrals) : (prev.l3Referrals || 0),
          l1Earnings: remoteProfile.l1Earnings !== undefined ? Number(remoteProfile.l1Earnings) : (prev.l1Earnings || 0),
          l2Earnings: remoteProfile.l2Earnings !== undefined ? Number(remoteProfile.l2Earnings) : (prev.l2Earnings || 0),
          l3Earnings: remoteProfile.l3Earnings !== undefined ? Number(remoteProfile.l3Earnings) : (prev.l3Earnings || 0),
          teamSize: remoteProfile.teamSize !== undefined ? Number(remoteProfile.teamSize) : (prev.teamSize || 0),
          teamRecharge: remoteProfile.teamRecharge !== undefined ? Number(remoteProfile.teamRecharge) : (prev.teamRecharge || 0),
          lastQuantifyTimestamp: effectiveLastTs,
          nextQuantifyAllowedAt: isCooldownActive ? effectiveNextAllowed : 0,
          todayQuantifiableCount: isCooldownActive ? 1 : 0,
          lastQuantifyDate: effectiveLastTs > 0 ? new Date(effectiveLastTs).toISOString() : prev.lastQuantifyDate,
          ...(() => {
            const { username: effUser, referralCode: effCode } = resolveUsernameAndReferralCode({
              username: remoteProfile.username || prev.username,
              referralCode: remoteProfile.referralCode || prev.referralCode,
              email: prev.email || remoteProfile.email
            });

            // If remote Firestore had an old GOLD code or mismatched referral code, auto-sync and fix it
            if (userState.uid && effCode && (remoteProfile.referralCode !== effCode || !remoteProfile.username)) {
              syncUserProfileToFirestore(userState.uid, {
                username: effUser,
                referralCode: effCode
              }).catch(() => {});
              registerUserIdentifiersInCloud(userState.uid, prev.email || remoteProfile.email || '', effUser, effCode).catch(() => {});
            }

            return {
              username: effUser || prev.username,
              referralCode: effCode || effUser || prev.referralCode
            };
          })(),
          selectedLanguage: remoteProfile.selectedLanguage || prev.selectedLanguage,
          sponsorCode: remoteProfile.sponsorCode || prev.sponsorCode,
          securityPin: remoteProfile.securityPin || prev.securityPin,
          twoFactorEnabled: remoteProfile.twoFactorEnabled !== undefined ? !!remoteProfile.twoFactorEnabled : prev.twoFactorEnabled,
          hasReceivedFirstDepositBonus: remoteProfile.hasReceivedFirstDepositBonus !== undefined ? !!remoteProfile.hasReceivedFirstDepositBonus : prev.hasReceivedFirstDepositBonus,
          canClaimFirstDepositBonus: remoteProfile.canClaimFirstDepositBonus !== undefined ? !!remoteProfile.canClaimFirstDepositBonus : prev.canClaimFirstDepositBonus,
          firstDepositBonusAmount: remoteProfile.firstDepositBonusAmount !== undefined ? Number(remoteProfile.firstDepositBonusAmount) : prev.firstDepositBonusAmount,
          hasReceived5RefBonus: remoteProfile.hasReceived5RefBonus !== undefined ? !!remoteProfile.hasReceived5RefBonus : prev.hasReceived5RefBonus,
          checkinStreak: remoteProfile.checkinStreak !== undefined ? Number(remoteProfile.checkinStreak) : prev.checkinStreak,
          lastCheckinTimestamp: remoteProfile.lastCheckinTimestamp || prev.lastCheckinTimestamp
        };
      });
    });

    return () => unsubscribe();
  }, [userState.uid]);

  // Listener for real-time team referral counts and multi-tier stats
  useEffect(() => {
    const handleRefUpdated = (e: any) => {
      const detail = e.detail;
      if (!detail) return;
      setUserState(prev => ({
        ...prev,
        validReferralsCount: typeof detail.validReferralsCount === 'number' ? detail.validReferralsCount : prev.validReferralsCount,
        l1Referrals: typeof detail.l1Referrals === 'number' ? detail.l1Referrals : prev.l1Referrals,
        l2Referrals: typeof detail.l2Referrals === 'number' ? detail.l2Referrals : prev.l2Referrals,
        l3Referrals: typeof detail.l3Referrals === 'number' ? detail.l3Referrals : (prev.l3Referrals || 0),
        teamSize: typeof detail.teamSize === 'number' ? detail.teamSize : (typeof detail.totalTeamSize === 'number' ? detail.totalTeamSize : prev.teamSize),
        teamRecharge: typeof detail.teamRecharge === 'number' ? detail.teamRecharge : (typeof detail.totalTeamRecharge === 'number' ? detail.totalTeamRecharge : prev.teamRecharge),
        referralEarnings: typeof detail.referralEarnings === 'number' ? detail.referralEarnings : (typeof detail.totalCommissionEarned === 'number' ? detail.totalCommissionEarned : prev.referralEarnings),
        l1Earnings: typeof detail.l1Earnings === 'number' ? detail.l1Earnings : (typeof detail.l1Commission === 'number' ? detail.l1Commission : prev.l1Earnings),
        l2Earnings: typeof detail.l2Earnings === 'number' ? detail.l2Earnings : (typeof detail.l2Commission === 'number' ? detail.l2Commission : prev.l2Earnings),
        l3Earnings: typeof detail.l3Earnings === 'number' ? detail.l3Earnings : (typeof detail.l3Commission === 'number' ? detail.l3Commission : prev.l3Earnings)
      }));
    };
    window.addEventListener('goldrobo_referral_updated', handleRefUpdated);
    return () => window.removeEventListener('goldrobo_referral_updated', handleRefUpdated);
  }, []);

  // Live listener for Administrator approvals or rejections from /panel
  useEffect(() => {
    const handleSystemTxUpdated = (e: any) => {
      const updatedTx = e.detail;
      if (!updatedTx) return;

      let shouldCreditDeposit = false;
      let shouldRefundWithdraw = false;
      let depositAmount = 0;
      let refundAmount = 0;

      setHistory(prev => {
        const idx = prev.findIndex(t => t.id === updatedTx.id || (t.orderId && t.orderId === updatedTx.orderId));
        if (idx === -1) return prev;
        const currentItem = prev[idx];

        if (currentItem.status === 'Pending' && updatedTx.status === 'Completed' && updatedTx.type === 'deposit') {
          shouldCreditDeposit = true;
          depositAmount = updatedTx.profitAmount || updatedTx.amount || 0;
        } else if (currentItem.status === 'Pending' && updatedTx.status === 'Rejected' && updatedTx.type === 'withdraw') {
          shouldRefundWithdraw = true;
          refundAmount = Math.abs(updatedTx.profitAmount || updatedTx.amount || 0);
        }

        const newArr = [...prev];
        newArr[idx] = { ...currentItem, ...updatedTx };
        return newArr;
      });

      if (shouldCreditDeposit && depositAmount > 0) {
        setUserState(prevUser => {
          const isFirstDeposit = !prevUser.hasReceivedFirstDepositBonus && !prevUser.canClaimFirstDepositBonus;
          const bonusAmount = isFirstDeposit ? +(depositAmount * 0.03).toFixed(2) : 0;
          const newTotal = +(prevUser.totalBalance + depositAmount).toFixed(2);
          const newLocked = +(prevUser.lockedInvestment + depositAmount).toFixed(2);
          const activeCap = newLocked > 0 ? newLocked : newTotal;
          const targetTier = getVipTierForAmount(activeCap);
          const targetVip = targetTier ? targetTier.level : (newTotal >= 10 ? 1 : prevUser.vipLevel);
          // Never downgrade; upgrade forward if qualifying
          const nextVip = Math.max(prevUser.vipLevel || 0, targetVip);
          const targetTierConfig = VIP_TIERS.find(v => v.level === nextVip);
          const nextRate = targetTierConfig ? targetTierConfig.profitRateNum : (nextVip > 0 ? 3.0 : 0.0);

          const next = {
            ...prevUser,
            totalBalance: newTotal,
            lockedInvestment: newLocked,
            vipLevel: nextVip,
            dailyEarningRate: nextRate,
            canClaimFirstDepositBonus: isFirstDeposit,
            firstDepositBonusAmount: isFirstDeposit ? bonusAmount : prevUser.firstDepositBonusAmount,
            lockStartDate: prevUser.lockStartDate || new Date().toISOString().split('T')[0]
          };

          syncUserProfileToFirestore(next.uid, {
            totalBalance: newTotal,
            lockedInvestment: newLocked,
            vipLevel: next.vipLevel,
            dailyEarningRate: next.dailyEarningRate,
            canClaimFirstDepositBonus: isFirstDeposit,
            firstDepositBonusAmount: next.firstDepositBonusAmount
          });

          return next;
        });

        if (userStateRef.current.soundEnabled) playSuccessSound();
        try { confetti({ particleCount: 50, spread: 60 }); } catch {}
      }

      if (shouldRefundWithdraw && refundAmount > 0) {
        setUserState(prevUser => {
          const newTotal = +(prevUser.totalBalance + refundAmount).toFixed(2);
          const newWithdrawable = +(prevUser.withdrawableBalance + refundAmount).toFixed(2);

          const next = {
            ...prevUser,
            totalBalance: newTotal,
            withdrawableBalance: newWithdrawable
          };

          syncUserProfileToFirestore(next.uid, {
            totalBalance: newTotal,
            withdrawableBalance: newWithdrawable
          });

          return next;
        });
      }
    };

    window.addEventListener('goldrobo_system_tx_updated', handleSystemTxUpdated);
    return () => window.removeEventListener('goldrobo_system_tx_updated', handleSystemTxUpdated);
  }, []);

  // Live real-time price synchronization from Binance API
  const syncPrices = useCallback(async () => {
    try {
      const liveData = await fetchLiveCryptoPrices(userState.apiKey);
      
      setCoins(prevCoins =>
        prevCoins.map(coin => {
          const live = liveData[coin.binanceSymbol];
          if (live) {
            return {
              ...coin,
              price: live.price,
              change24h: live.change24h,
              high24h: live.high24h,
              low24h: live.low24h,
              volume24h: live.volume24h
            };
          }
          return coin;
        })
      );

      setSelectedCoinState(prevSelected => {
        const live = liveData[prevSelected.binanceSymbol];
        if (live) {
          return {
            ...prevSelected,
            price: live.price,
            change24h: live.change24h,
            high24h: live.high24h,
            low24h: live.low24h,
            volume24h: live.volume24h
          };
        }
        return prevSelected;
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setUserState(prev => ({
        ...prev,
        apiConnected: true,
        lastPriceSyncTime: timeStr
      }));
    } catch (err) {
      // Fallback micro-fluctuation so chart stays live
      setCoins(prevCoins =>
        prevCoins.map(coin => {
          const delta = (Math.random() - 0.49) * (coin.price * 0.001);
          const newPrice = Math.max(0.0001, +(coin.price + delta).toFixed(coin.price < 1 ? 4 : 2));
          return { ...coin, price: newPrice };
        })
      );
    }
  }, [userState.apiKey]);

  // Regular interval price polling (every 5 or 10 seconds as configured)
  useEffect(() => {
    syncPrices();
    const intervalSec = userState.refreshIntervalSec || 5;
    const interval = setInterval(syncPrices, intervalSec * 1000);
    return () => clearInterval(interval);
  }, [syncPrices, userState.refreshIntervalSec]);

  // Fetch real candlestick chart data when selected coin changes
  useEffect(() => {
    let isMounted = true;
    const loadKlines = async () => {
      if (!selectedCoin.binanceSymbol) return;
      try {
        const klines = await fetchRealKlines(selectedCoin.binanceSymbol, '1h');
        if (isMounted && klines && klines.length > 0) {
          setSelectedCoinState(prev => ({
            ...prev,
            chartData: klines
          }));
          setCoins(prevCoins =>
            prevCoins.map(c => c.id === selectedCoin.id ? { ...c, chartData: klines } : c)
          );
        }
      } catch {
        // Retain standard realistic baseline chartData
      }
    };
    loadKlines();
    return () => { isMounted = false; };
  }, [selectedCoin.binanceSymbol, selectedCoin.id]);

  const forcePriceRefresh = async () => {
    await syncPrices();
  };

  const saveApiConfig = (key: string, intervalSec: number) => {
    setUserState(prev => ({
      ...prev,
      apiKey: key.trim(),
      refreshIntervalSec: intervalSec,
      apiConnected: true
    }));
    return { success: true, message: `API Key saved! Real-time price stream polling set to ${intervalSec}s.` };
  };

  const setActiveTab = (tab: NavigationTab) => {
    if (userState.soundEnabled) playClickSound();
    setActiveTabState(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setSelectedCoin = (coin: CreatorCoin) => {
    if (userState.soundEnabled) playClickSound();
    setSelectedCoinState(coin);
  };

  const openModal = (modal: ModalType) => {
    if (userState.soundEnabled) playClickSound();
    setActiveModal(modal);
  };

  const closeModal = () => {
    if (userState.soundEnabled) playClickSound();
    setActiveModal(null);
  };

  const toggleHideBalance = () => {
    if (userState.soundEnabled) playClickSound();
    setHideBalance(prev => !prev);
  };

  const toggleSound = () => {
    setUserState(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
  };

  const setLanguage = (lang: string) => {
    setUserState(prev => ({ ...prev, selectedLanguage: lang }));
    try {
      localStorage.setItem('goldrobo_selected_lang', lang);
    } catch {}
    if (userState.uid) {
      syncUserProfileToFirestore(userState.uid, { selectedLanguage: lang });
    }
  };

  const t = useCallback((key: string, fallback?: string): string => {
    return getTranslation(key, userState.selectedLanguage, fallback);
  }, [userState.selectedLanguage]);

  // Run Robot Quantification with VIP-based profit rate
  const startQuantification = (coinId?: string) => {
    if (isQuantifying) return;
    
    // Strict 24-Hour Rule: Must wait 24 hours between quantifications
    const nowMs = Date.now();
    const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000; // 86,400,000 ms = strictly 24 hours
    const lastTs = userState.lastQuantifyTimestamp || (userState.lastQuantifyDate ? new Date(userState.lastQuantifyDate).getTime() : 0);
    const nextAllowedAt = userState.nextQuantifyAllowedAt || (lastTs > 0 ? (lastTs + COOLDOWN_24H_MS) : 0);

    if (lastTs > 0 && nowMs < nextAllowedAt) {
      const remainingMs = nextAllowedAt - nowMs;
      const remH = Math.floor(remainingMs / (1000 * 60 * 60));
      const remM = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const remS = Math.floor((remainingMs % (1000 * 60)) / 1000);
      alert(`Strict 24-Hour Rule: Quantification is locked for 24 hours. Your next quantification unlocks in ${remH}h ${remM}m ${remS}s.`);
      return;
    }

    // Check if daily quota reached (1 quantify per 24 hours)
    if (userState.todayQuantifiableCount >= userState.maxDailyQuantifiable) {
      alert('Daily quantification limit reached! Please wait for your 24-hour cooldown timer to complete.');
      return;
    }

    // Check minimum quantify amount of 10 USDT
    const activeCapital = userState.lockedInvestment > 0 ? userState.lockedInvestment : userState.totalBalance;
    if (activeCapital < 10) {
      alert('Minimum 10.00 USDT required to start GOLDROBO quantification. Please deposit at least 10 USDT.');
      openModal('deposit');
      return;
    }

    const targetCoin = coinId ? (coins.find(c => c.id === coinId) || selectedCoin) : selectedCoin;
    setSelectedCoinState(targetCoin);

    setIsQuantifying(true);
    setQuantifyStep(1);
    setActiveModal('quantifyExecution');
    if (userState.soundEnabled) playRobotScanningSound();

    // Step 2: Market spread analysis
    setTimeout(() => {
      setQuantifyStep(2);
      if (userState.soundEnabled) playRobotScanningSound();
    }, 1200);

    // Step 3: Executing order arbitrage
    setTimeout(() => {
      setQuantifyStep(3);
    }, 2400);

    // Step 4: Complete profit generation!
    setTimeout(() => {
      setQuantifyStep(4);
      if (userState.soundEnabled) playSuccessSound();

      // Confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });

      // Profit rate dynamically determined by VIP Level and invested capital
      // VIP 1 (10-99 USDT): 3.0%, VIP 2 (100-499 USDT): 3.5%, VIP 3 (500-1999 USDT): 4.0%, etc.
      const currentVip = VIP_TIERS.find(v => v.level === userState.vipLevel) || getVipTierForAmount(activeCapital);
      const profitRate = currentVip ? currentVip.profitRateNum : (userState.dailyEarningRate || 3.00);
      const profitAmount = +(activeCapital * (profitRate / 100)).toFixed(2);
      
      const newTotal = +(userState.totalBalance + profitAmount).toFixed(2);
      const newWithdrawable = +(userState.withdrawableBalance + profitAmount).toFixed(2);
      const completedTime = Date.now();
      const nextAllowedTime = completedTime + 24 * 60 * 60 * 1000; // Strict 24 hours cooldown
      const nowIso = new Date(completedTime).toISOString();
      const newCount = 1;

      const updatePayload = {
        totalBalance: newTotal,
        withdrawableBalance: newWithdrawable,
        todayQuantifiableCount: newCount,
        dailyEarningRate: profitRate,
        lastQuantifyDate: nowIso,
        lastQuantifyTimestamp: completedTime,
        nextQuantifyAllowedAt: nextAllowedTime,
        updatedAt: nowIso
      };

      setUserState(prev => ({
        ...prev,
        ...updatePayload
      }));

      // Immediately sync balance and quantify state with Cloud Firestore
      syncUserProfileToFirestore(userState.uid, updatePayload);

      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newHistoryItem: TradeHistoryItem = {
        id: `tx-q-${Date.now()}`,
        timestamp: now.toISOString(),
        dateStr,
        timeStr,
        coinName: `${targetCoin.symbol} / USDT Quantify (${currentVip?.name || 'VIP ' + userState.vipLevel})`,
        profitPercent: profitRate,
        quantifyIndex: `${newCount}/${userState.maxDailyQuantifiable}`,
        profitAmount,
        balanceAfter: newTotal,
        type: 'quantify',
        status: 'Completed',
        txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        orderId: `ROBO-${targetCoin.symbol}-${Date.now().toString().slice(-6)}`,
        network: 'USDT (TRC20)',
        nodeRoute: `Binance VIP Liquidity Node #${currentVip?.level || userState.vipLevel || 1}`
      };

      setHistory(prev => [newHistoryItem, ...prev]);
      recordTransactionToFirestore(userState.uid, newHistoryItem);

      // Update 7d earnings
      setSevenDayEarnings(prev => {
        const copy = [...prev];
        const lastIdx = copy.length - 1;
        copy[lastIdx] = {
          ...copy[lastIdx],
          earnings: +(copy[lastIdx].earnings + profitAmount).toFixed(2)
        };
        return copy;
      });

      setLastProfitResult({
        profit: profitAmount,
        percent: profitRate,
        coin: targetCoin.name
      });
      setIsQuantifying(false);
    }, 3600);
  };

  // Listen for Firebase Auth changes & immediately sync latest Firestore profile
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        setIsAuthenticated(true);
        try {
          const remoteProfile = await fetchUserProfileFromFirestore(fbUser.uid);
          if (remoteProfile) {
            setUserState(prev => {
              // Direct authoritative Firestore balances
              const totalBal = remoteProfile.totalBalance !== undefined && remoteProfile.totalBalance !== null
                ? +Number(remoteProfile.totalBalance).toFixed(2)
                : prev.totalBalance;
              const withdrawableBal = remoteProfile.withdrawableBalance !== undefined && remoteProfile.withdrawableBalance !== null
                ? +Number(remoteProfile.withdrawableBalance).toFixed(2)
                : prev.withdrawableBalance;
              const lockedBal = remoteProfile.lockedInvestment !== undefined && remoteProfile.lockedInvestment !== null
                ? +Number(remoteProfile.lockedInvestment).toFixed(2)
                : prev.lockedInvestment;
              const bonusBal = remoteProfile.bonusBalance !== undefined && remoteProfile.bonusBalance !== null
                ? +Number(remoteProfile.bonusBalance).toFixed(2)
                : prev.bonusBalance;

              // Strict 24-Hour Cooldown Synchronization
              const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;
              const nowMs = Date.now();
              const remoteLastTs = remoteProfile.lastQuantifyTimestamp || (remoteProfile.lastQuantifyDate ? new Date(remoteProfile.lastQuantifyDate).getTime() : 0);
              const localLastTs = prev.lastQuantifyTimestamp || (prev.lastQuantifyDate ? new Date(prev.lastQuantifyDate).getTime() : 0);
              const effectiveLastTs = Math.max(remoteLastTs, localLastTs);
              const effectiveNextAllowed = Math.max(
                remoteProfile.nextQuantifyAllowedAt || 0,
                prev.nextQuantifyAllowedAt || 0,
                effectiveLastTs > 0 ? (effectiveLastTs + COOLDOWN_24H_MS) : 0
              );
              const isCooldownActive = effectiveLastTs > 0 && nowMs < effectiveNextAllowed;

              const activeCap = lockedBal > 0 ? lockedBal : totalBal;
              const rangeTier = getVipTierForAmount(activeCap);
              const vipLvl = remoteProfile.vipLevel !== undefined 
                ? Number(remoteProfile.vipLevel) 
                : (rangeTier ? rangeTier.level : (totalBal >= 10 ? 1 : 0));
              const tier = VIP_TIERS.find(v => v.level === vipLvl) || rangeTier;

              return {
                ...prev,
                uid: fbUser.uid,
                email: fbUser.email || prev.email,
                totalBalance: totalBal,
                withdrawableBalance: withdrawableBal,
                lockedInvestment: lockedBal,
                bonusBalance: bonusBal,
                vipLevel: vipLvl,
                dailyEarningRate: remoteProfile.dailyEarningRate !== undefined ? Number(remoteProfile.dailyEarningRate) : (tier ? tier.profitRateNum : (vipLvl > 0 ? 3.0 : 0.0)),
                validReferralsCount: remoteProfile.validReferralsCount !== undefined ? Number(remoteProfile.validReferralsCount) : prev.validReferralsCount,
                referralEarnings: remoteProfile.referralEarnings !== undefined ? Number(remoteProfile.referralEarnings) : prev.referralEarnings,
                l1Referrals: remoteProfile.l1Referrals !== undefined ? Number(remoteProfile.l1Referrals) : prev.l1Referrals,
                l2Referrals: remoteProfile.l2Referrals !== undefined ? Number(remoteProfile.l2Referrals) : prev.l2Referrals,
                l3Referrals: remoteProfile.l3Referrals !== undefined ? Number(remoteProfile.l3Referrals) : (prev.l3Referrals || 0),
                l1Earnings: remoteProfile.l1Earnings !== undefined ? Number(remoteProfile.l1Earnings) : (prev.l1Earnings || 0),
                l2Earnings: remoteProfile.l2Earnings !== undefined ? Number(remoteProfile.l2Earnings) : (prev.l2Earnings || 0),
                l3Earnings: remoteProfile.l3Earnings !== undefined ? Number(remoteProfile.l3Earnings) : (prev.l3Earnings || 0),
                teamSize: remoteProfile.teamSize !== undefined ? Number(remoteProfile.teamSize) : (prev.teamSize || 0),
                teamRecharge: remoteProfile.teamRecharge !== undefined ? Number(remoteProfile.teamRecharge) : (prev.teamRecharge || 0),
                lastQuantifyTimestamp: effectiveLastTs,
                nextQuantifyAllowedAt: isCooldownActive ? effectiveNextAllowed : 0,
                todayQuantifiableCount: isCooldownActive ? 1 : 0,
                lastQuantifyDate: effectiveLastTs > 0 ? new Date(effectiveLastTs).toISOString() : prev.lastQuantifyDate,
                ...(() => {
                  const { username: effUser, referralCode: effCode } = resolveUsernameAndReferralCode({
                    username: remoteProfile.username || prev.username,
                    referralCode: remoteProfile.referralCode || prev.referralCode,
                    email: fbUser.email || prev.email
                  });
                  return {
                    username: effUser || prev.username,
                    referralCode: effCode || effUser || prev.referralCode
                  };
                })(),
                sponsorCode: remoteProfile.sponsorCode || prev.sponsorCode,
                securityPin: remoteProfile.securityPin || prev.securityPin
              };
            });
          } else {
            setUserState(prev => ({
              ...prev,
              uid: fbUser.uid,
              email: fbUser.email || prev.email
            }));
          }

          // Also trigger real-time team synchronization from Firestore
          try {
            syncAndRefreshUserTeam(fbUser.uid, {
              username: remoteProfile?.username,
              referralCode: remoteProfile?.referralCode
            }).catch(() => {});
          } catch {}
        } catch (err: any) {
          console.warn('Initial auth sync note:', err?.message);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const loginUser = async (userData: { 
    uid: string; 
    email: string; 
    username?: string;
    referralCode?: string; 
    securityPin?: string; 
    sponsorCode?: string; 
    totalBalance?: number; 
    withdrawableBalance?: number; 
    twoFactorEnabled?: boolean; 
  }) => {
    setIsAuthenticated(true);
    try {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(userData));
    } catch {}

    // Pull real persisted data from Firestore
    try {
      const remoteProfile = await fetchUserProfileFromFirestore(userData.uid);
      const remoteHistory = await fetchUserTransactionsFromFirestore(userData.uid);

      // Strict 24-Hour Cooldown Verification
      const nowMs = Date.now();
      const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;
      const remoteLastTs = remoteProfile?.lastQuantifyTimestamp || (remoteProfile?.lastQuantifyDate ? new Date(remoteProfile.lastQuantifyDate).getTime() : 0);
      const remoteNextAllowed = remoteProfile?.nextQuantifyAllowedAt || (remoteLastTs > 0 ? (remoteLastTs + COOLDOWN_24H_MS) : 0);
      const isCooldownActive = remoteLastTs > 0 && nowMs < remoteNextAllowed;
      const effectiveTodayCount = isCooldownActive ? 1 : 0;

      const effectiveTotalBalance = remoteProfile?.totalBalance ?? (userData.totalBalance ?? userState.totalBalance ?? 0.00);
      const effectiveWithdrawable = remoteProfile?.withdrawableBalance ?? (userData.withdrawableBalance ?? userState.withdrawableBalance ?? 0.00);
      const effectiveLocked = remoteProfile?.lockedInvestment ?? userState.lockedInvestment ?? 0.00;
      const activeCap = effectiveLocked > 0 ? effectiveLocked : effectiveTotalBalance;
      const rangeTier = getVipTierForAmount(activeCap);
      const effectiveVipLevel = remoteProfile?.vipLevel !== undefined 
        ? Number(remoteProfile.vipLevel) 
        : (rangeTier ? rangeTier.level : (effectiveTotalBalance >= 10 ? 1 : 0));
      const matchingTier = VIP_TIERS.find(v => v.level === effectiveVipLevel) || rangeTier;
      const effectiveDailyRate = remoteProfile?.dailyEarningRate !== undefined 
        ? Number(remoteProfile.dailyEarningRate) 
        : (matchingTier ? matchingTier.profitRateNum : (effectiveVipLevel > 0 ? 3.0 : 0.0));

      const { username: effUser, referralCode: effCode } = resolveUsernameAndReferralCode({
        username: remoteProfile?.username || userData.username,
        referralCode: remoteProfile?.referralCode || userData.referralCode,
        email: userData.email
      });

      // Auto-heal any legacy Firestore profile still storing GOLD code
      if (userData.uid && effCode && (remoteProfile?.referralCode !== effCode || !remoteProfile?.username)) {
        syncUserProfileToFirestore(userData.uid, {
          username: effUser,
          referralCode: effCode
        }).catch(() => {});
        registerUserIdentifiersInCloud(userData.uid, userData.email, effUser, effCode).catch(() => {});
      }

      const freshUserState: UserState = {
        ...INITIAL_USER_STATE,
        uid: userData.uid,
        email: userData.email,
        username: effUser,
        selectedLanguage: remoteProfile?.selectedLanguage || userState.selectedLanguage || 'en',
        referralCode: effCode, // Guaranteed to be username!
        securityPin: remoteProfile?.securityPin || userData.securityPin || '',
        sponsorCode: remoteProfile?.sponsorCode || userData.sponsorCode || '',
        totalBalance: effectiveTotalBalance,
        withdrawableBalance: effectiveWithdrawable,
        bonusBalance: remoteProfile?.bonusBalance ?? userState.bonusBalance ?? 0.00,
        lockedInvestment: effectiveLocked,
        investmentDaysElapsed: remoteProfile?.investmentDaysElapsed ?? userState.investmentDaysElapsed ?? 0,
        hasReceivedFirstDepositBonus: remoteProfile?.hasReceivedFirstDepositBonus ?? userState.hasReceivedFirstDepositBonus,
        canClaimFirstDepositBonus: remoteProfile?.canClaimFirstDepositBonus ?? userState.canClaimFirstDepositBonus,
        firstDepositBonusAmount: remoteProfile?.firstDepositBonusAmount ?? userState.firstDepositBonusAmount,
        hasReceived5RefBonus: remoteProfile?.hasReceived5RefBonus ?? userState.hasReceived5RefBonus,
        validReferralsCount: remoteProfile?.validReferralsCount ?? userState.validReferralsCount,
        todayQuantifiableCount: effectiveTodayCount,
        lastQuantifyTimestamp: remoteLastTs,
        nextQuantifyAllowedAt: isCooldownActive ? remoteNextAllowed : 0,
        lastQuantifyDate: remoteProfile?.lastQuantifyDate || userState.lastQuantifyDate || '',
        maxDailyQuantifiable: 1,
        vipLevel: effectiveVipLevel,
        dailyEarningRate: effectiveDailyRate,
        lastCheckinTimestamp: remoteProfile?.lastCheckinTimestamp ?? userState.lastCheckinTimestamp,
        checkinStreak: remoteProfile?.checkinStreak ?? userState.checkinStreak,
      };

      setUserState(freshUserState);

      if (remoteHistory && Array.isArray(remoteHistory) && remoteHistory.length > 0) {
        setHistory(remoteHistory);
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.warn('Could not sync remote Firestore profile:', e);
      const effectiveBal = userData.totalBalance ?? 0.00;
      const { username: fallbackUser, referralCode: fallbackCode } = resolveUsernameAndReferralCode({
        username: userData.username,
        referralCode: userData.referralCode,
        email: userData.email
      });
      const freshUserState: UserState = {
        ...INITIAL_USER_STATE,
        uid: userData.uid,
        email: userData.email,
        username: fallbackUser,
        referralCode: fallbackCode,
        securityPin: userData.securityPin || '',
        sponsorCode: userData.sponsorCode || '',
        totalBalance: effectiveBal,
        withdrawableBalance: userData.withdrawableBalance ?? 0.00,
        validReferralsCount: 0,
        todayQuantifiableCount: 0,
        vipLevel: effectiveBal >= 10 ? 1 : 0,
        dailyEarningRate: effectiveBal >= 10 ? 3.0 : 0.0,
      };
      setUserState(freshUserState);
      setHistory([]);
    }
  };

  const logoutUser = () => {
    setIsAuthenticated(false);
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_HISTORY);
      localStorage.removeItem(STORAGE_KEY_BONUSES);
    } catch {}
    setUserState(INITIAL_USER_STATE);
    setHistory([]);
    setClaimedBonuses([]);
    fbSignOut(auth).catch(() => {});
    if (userState.soundEnabled) playClickSound();
  };

  // Real Deposit funds: Submits a pending deposit request with TXID awaiting manual admin approval
  const depositFunds = (amount: number, network: string, txHash?: string) => {
    if (amount < 10) return { success: false, message: 'Minimum deposit is $10.00 USDT' };
    const generatedTxHash = txHash?.trim() || `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`;

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const fullDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${timeStr}`;
    const orderId = `ID:TX${now.toISOString().replace(/\D/g, '').slice(2, 18)}`;

    const newTx: TradeHistoryItem = {
      id: `dep-${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      fullDateStr,
      coinName: `USDT Deposit (${network})`,
      profitPercent: 0,
      quantifyIndex: 'Deposit',
      profitAmount: amount,
      amount: amount,
      actualAmount: amount,
      serviceCharge: 0.00,
      approvalStatus: 'Auditing in progress',
      paymentStatus: 'Pending Admin Confirmation',
      balanceAfter: userState.totalBalance,
      type: 'deposit',
      status: 'Pending',
      txHash: generatedTxHash,
      orderId,
      network: network,
      nodeRoute: `${network} Blockchain Network Verification`
    };

    setHistory(prev => [newTx, ...prev]);
    recordTransactionToFirestore(userState.uid, newTx);
    saveSystemTransaction(newTx, userState.email, userState.uid);

    if (userState.soundEnabled) playSuccessSound();

    return {
      success: true,
      message: `Deposit request of $${amount.toFixed(2)} USDT (${network}) submitted! Status is Pending awaiting Administrator audit.`
    };
  };

  // Confirm/Approve a pending deposit
  const approvePendingDeposit = (txId: string) => {
    const targetTx = history.find(t => t.id === txId);
    if (!targetTx || targetTx.status === 'Completed') {
      return { success: false, message: 'Transaction already completed or not found.' };
    }

    const amount = targetTx.profitAmount;
    const isFirstDeposit = !userState.hasReceivedFirstDepositBonus && !userState.canClaimFirstDepositBonus;
    const bonusAmount = isFirstDeposit ? +(amount * 0.03).toFixed(2) : 0;

    const newTotal = +(userState.totalBalance + amount).toFixed(2);
    const newLocked = +(userState.lockedInvestment + amount).toFixed(2);
    const activeCap = newLocked > 0 ? newLocked : newTotal;
    const targetTier = getVipTierForAmount(activeCap);
    const targetVip = targetTier ? targetTier.level : (newTotal >= 10 ? 1 : userState.vipLevel);
    // Move forward if qualifying, cannot downgrade
    const nextVip = Math.max(userState.vipLevel || 0, targetVip);
    const targetTierConfig = VIP_TIERS.find(v => v.level === nextVip);
    const nextRate = targetTierConfig ? targetTierConfig.profitRateNum : (nextVip > 0 ? 3.0 : 0.0);

    const nowIso = new Date().toISOString();
    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      lockedInvestment: newLocked,
      vipLevel: nextVip,
      dailyEarningRate: nextRate,
      canClaimFirstDepositBonus: isFirstDeposit,
      firstDepositBonusAmount: isFirstDeposit ? bonusAmount : prev.firstDepositBonusAmount,
      lockStartDate: prev.lockStartDate || nowIso.split('T')[0],
      updatedAt: nowIso
    }));

    setHistory(prev => prev.map(t => t.id === txId ? { 
      ...t, 
      status: 'Completed', 
      approvalStatus: 'Audit successful',
      paymentStatus: 'Payment successful',
      balanceAfter: newTotal 
    } : t));

    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      lockedInvestment: newLocked,
      vipLevel: nextVip,
      dailyEarningRate: nextRate,
      canClaimFirstDepositBonus: isFirstDeposit,
      firstDepositBonusAmount: isFirstDeposit ? bonusAmount : userState.firstDepositBonusAmount,
      updatedAt: nowIso
    });

    // Distribute multi-tier referral commissions to Level 1 (10%), Level 2 (3%), Level 3 (1%)
    distributeMultiTierCommission(
      { 
        uid: userState.uid, 
        username: userState.username || userState.referralCode || userState.email || 'member', 
        email: userState.email 
      },
      amount,
      'deposit'
    ).catch(err => console.warn('Commission distribution note:', err));

    if (userState.soundEnabled) playSuccessSound();
    confetti({ particleCount: 60, spread: 70 });

    return {
      success: true,
      message: `Deposit of $${amount.toFixed(2)} USDT verified and credited! ${isFirstDeposit ? '3% First Deposit Bonus is ready to claim in Bonus Center!' : ''}`
    };
  };

  // Withdraw funds: Min 10 USDT, 5% fee, 1 min - 24 hours approval
  const withdrawFunds = (amount: number, address: string, network: string, pin: string) => {
    if (!address.trim()) return { success: false, message: 'Please enter a valid wallet address' };
    if (amount < 10) return { success: false, message: 'Minimum withdrawal amount is $10.00 USDT' };
    if (amount > userState.withdrawableBalance) {
      return { 
        success: false, 
        message: `Insufficient withdrawable balance ($${userState.withdrawableBalance.toFixed(2)} USDT available). Principal investment ($${userState.lockedInvestment.toFixed(2)} USDT) is secured in the 40-day lock term.` 
      };
    }
    if (!pin || pin.length < 4) return { success: false, message: 'Please enter your 4-6 digit security PIN' };

    const feeAmount = +(amount * 0.05).toFixed(2);
    const netArrival = +(amount - feeAmount).toFixed(2);

    const newWithdrawable = +(userState.withdrawableBalance - amount).toFixed(2);
    const newTotal = +(userState.totalBalance - amount).toFixed(2);
    const withdrawNow = new Date();
    const withdrawNowIso = withdrawNow.toISOString();

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      updatedAt: withdrawNowIso
    }));

    const dateStr = `${String(withdrawNow.getDate()).padStart(2, '0')}.${String(withdrawNow.getMonth() + 1).padStart(2, '0')}.${withdrawNow.getFullYear()}`;
    const timeStr = `${String(withdrawNow.getHours()).padStart(2, '0')}:${String(withdrawNow.getMinutes()).padStart(2, '0')}:${String(withdrawNow.getSeconds()).padStart(2, '0')}`;
    const fullDateStr = `${withdrawNow.getFullYear()}-${String(withdrawNow.getMonth() + 1).padStart(2, '0')}-${String(withdrawNow.getDate()).padStart(2, '0')} ${timeStr}`;
    const orderId = `ID:TX${withdrawNowIso.replace(/\D/g, '').slice(2, 18)}`;

    const newTx: TradeHistoryItem = {
      id: `wd-${Date.now()}`,
      timestamp: withdrawNowIso,
      dateStr,
      timeStr,
      fullDateStr,
      coinName: `USDT Withdrawal (${network})`,
      profitPercent: 0,
      quantifyIndex: 'Withdrawal',
      profitAmount: -amount,
      amount: amount,
      actualAmount: netArrival,
      netPayoutAmount: netArrival,
      serviceCharge: feeAmount,
      approvalStatus: 'Auditing in progress',
      paymentStatus: 'Pending Admin Transfer',
      balanceAfter: newTotal,
      type: 'withdraw',
      status: 'Pending',
      txHash: '',
      orderId,
      network: `USDT-${network}`,
      transferNetwork: network,
      withdrawalAddress: address.trim(),
      destinationAddress: address.trim(),
      userEmail: userState.email,
      userUid: userState.uid,
      username: userState.username,
      nodeRoute: `${network} Institutional Settlement Queue (1m - 24h)`
    };

    setHistory(prev => [newTx, ...prev]);
    recordTransactionToFirestore(userState.uid, newTx);
    saveSystemTransaction(newTx, userState.email, userState.uid);
    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      updatedAt: withdrawNowIso
    });

    if (userState.soundEnabled) playSuccessSound();

    return { 
      success: true, 
      message: `Withdrawal of $${amount.toFixed(2)} USDT submitted! Net arrival: $${netArrival.toFixed(2)} USDT (5% fee). Processing time: 1 minute to 24 hours.` 
    };
  };

  // Claim Daily Sign-in bonus: Strictly once every 24 hours!
  const claimDailyBonus = (day: number, amount: number) => {
    const now = Date.now();
    const lastTime = userState.lastCheckinTimestamp || 0;
    const diff = now - lastTime;
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    if (lastTime > 0 && diff < TWENTY_FOUR_HOURS) {
      const remainingMs = TWENTY_FOUR_HOURS - diff;
      const remainingHours = Math.floor(remainingMs / (60 * 60 * 1000));
      const remainingMins = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      return { 
        success: false, 
        message: `Daily check-in is only available once every 24 hours. Next claim in ${remainingHours}h ${remainingMins}m.` 
      };
    }

    if (claimedBonuses.includes(day)) {
      return { success: false, message: `Day ${day} streak reward has already been claimed.` };
    }

    const nextStreak = ((userState.checkinStreak || 0) % 7) + 1;
    setClaimedBonuses(prev => [...prev, day]);
    const newTotal = +(userState.totalBalance + amount).toFixed(2);
    const newWithdrawable = +(userState.withdrawableBalance + amount).toFixed(2);

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      lastCheckinTimestamp: now,
      checkinStreak: nextStreak
    }));

    const nowDate = new Date();
    const dateStr = `${String(nowDate.getDate()).padStart(2, '0')}.${String(nowDate.getMonth() + 1).padStart(2, '0')}.${nowDate.getFullYear()}`;
    const timeStr = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}:${String(nowDate.getSeconds()).padStart(2, '0')}`;
    const fullDateStr = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}-${String(nowDate.getDate()).padStart(2, '0')} ${timeStr}`;
    const orderId = `ID:TX${nowDate.toISOString().replace(/\D/g, '').slice(2, 18)}`;

    const newTx: TradeHistoryItem = {
      id: `bonus-day-${day}-${Date.now()}`,
      timestamp: nowDate.toISOString(),
      dateStr,
      timeStr,
      fullDateStr,
      coinName: `Day ${day} Daily Crypto Case Claim`,
      profitPercent: 0,
      quantifyIndex: 'Streak Case',
      profitAmount: amount,
      amount: amount,
      actualAmount: amount,
      serviceCharge: 0.00,
      approvalStatus: 'Audit successful',
      paymentStatus: 'Payment successful',
      balanceAfter: newTotal,
      type: 'bonus',
      status: 'Completed',
      txHash: 'DAILY-MYSTERY-CASE-CLAIM',
      orderId,
      network: 'Rewards Vault',
      nodeRoute: 'Continuous 24-Hour Streak Settlement'
    };

    setHistory(prev => [newTx, ...prev]);
    recordTransactionToFirestore(userState.uid, newTx);
    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      lastCheckinTimestamp: now,
      checkinStreak: nextStreak
    });

    if (userState.soundEnabled) playSuccessSound();
    return {
      success: true,
      message: `Day ${day} Mystery Case Unlocked! +$${amount.toFixed(2)} USDT added to balance!`
    };
  };

  // Claim First Deposit 3% bonus once deposit transaction has completed
  const claimFirstDepositBonus = () => {
    if (!userState.canClaimFirstDepositBonus || userState.hasReceivedFirstDepositBonus) {
      return { success: false, message: 'First deposit bonus is only claimable after your deposit is successfully confirmed.' };
    }

    const bonusAmount = userState.firstDepositBonusAmount > 0 ? userState.firstDepositBonusAmount : 1.50;
    const newTotal = +(userState.totalBalance + bonusAmount).toFixed(2);
    const newWithdrawable = +(userState.withdrawableBalance + bonusAmount).toFixed(2);

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      hasReceivedFirstDepositBonus: true,
      canClaimFirstDepositBonus: false
    }));

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const bonusTx: TradeHistoryItem = {
      id: `bonus-first-dep-${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      coinName: '3% First Deposit Welcome Bonus',
      profitPercent: 3,
      quantifyIndex: 'Bonus',
      profitAmount: bonusAmount,
      balanceAfter: newTotal,
      type: 'bonus',
      status: 'Completed',
      txHash: 'GOLDROBO-BONUS-3PCT',
      orderId: `BONUS-DEP-${Date.now().toString().slice(-4)}`,
      network: 'USDT TRC20',
      nodeRoute: 'Verified Deposit Welcome Protocol'
    };

    setHistory(prev => [bonusTx, ...prev]);
    recordTransactionToFirestore(userState.uid, bonusTx);
    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      hasReceivedFirstDepositBonus: true,
      canClaimFirstDepositBonus: false
    });

    if (userState.soundEnabled) playSuccessSound();
    confetti({ particleCount: 70, spread: 80 });

    return {
      success: true,
      message: `Claimed +$${bonusAmount.toFixed(2)} USDT (3% First Deposit Bonus) to Withdrawable Balance!`
    };
  };

  // Claim 5 Valid Referrals 5 USDT Bonus
  const claim5ReferralsBonus = () => {
    if (userState.hasReceived5RefBonus) {
      return { success: false, message: '5 Referrals bonus already claimed!' };
    }
    if (userState.validReferralsCount < 5) {
      return { 
        success: false, 
        message: `You currently have ${userState.validReferralsCount}/5 valid referral members who have deposited. Complete 5 valid members to claim $5.00 USDT!` 
      };
    }

    const bonusAmount = 5.00;
    const newTotal = +(userState.totalBalance + bonusAmount).toFixed(2);
    const newWithdrawable = +(userState.withdrawableBalance + bonusAmount).toFixed(2);

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      hasReceived5RefBonus: true
    }));

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const bonusTx: TradeHistoryItem = {
      id: `bonus-5ref-${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      coinName: '5 Valid Referrals Bonus (+5 USDT)',
      profitPercent: 0,
      quantifyIndex: 'Bounty',
      profitAmount: bonusAmount,
      balanceAfter: newTotal,
      type: 'bonus',
      status: 'Completed',
      txHash: 'REF-BOUNTY-5USDT',
      orderId: `BOUNTY-${Date.now().toString().slice(-4)}`,
      network: 'USDT TRC20',
      nodeRoute: 'Affiliate Growth Milestone'
    };

    setHistory(prev => [bonusTx, ...prev]);
    recordTransactionToFirestore(userState.uid, bonusTx);
    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable,
      hasReceived5RefBonus: true
    });

    if (userState.soundEnabled) playSuccessSound();
    confetti({ particleCount: 70, spread: 80 });

    return {
      success: true,
      message: 'Congratulations! +$5.00 USDT claimed for completing 5 valid deposited referrals!'
    };
  };

  // Claim Task Bonus
  const claimTaskBonus = (taskName: string, amount: number) => {
    if (completedTasks.includes(taskName)) return;

    setCompletedTasks(prev => [...prev, taskName]);
    const newTotal = +(userState.totalBalance + amount).toFixed(2);
    const newWithdrawable = +(userState.withdrawableBalance + amount).toFixed(2);

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable
    }));

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTx: TradeHistoryItem = {
      id: `task-${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      coinName: `Task Reward: ${taskName}`,
      profitPercent: 0,
      quantifyIndex: 'Task',
      profitAmount: amount,
      balanceAfter: newTotal,
      type: 'bonus',
      status: 'Completed',
      txHash: 'TASK-REWARD-SETTLED',
      orderId: `TASK-${Date.now().toString().slice(-5)}`,
      network: 'Rewards Vault',
      nodeRoute: 'Growth Bounty System'
    };

    setHistory(prev => [newTx, ...prev]);
    recordTransactionToFirestore(userState.uid, newTx);
    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable
    });

    if (userState.soundEnabled) playSuccessSound();
    confetti({ particleCount: 50, spread: 60 });
  };

  // Upgrade VIP Level with custom profit rates
  const upgradeVipLevel = (targetLevel: number) => {
    const targetVip = VIP_TIERS.find(v => v.level === targetLevel);
    if (!targetVip) return { success: false, message: 'VIP tier not found' };

    // Forward progression constraint: user can only upgrade forward (e.g. VIP 1 -> VIP 2 -> VIP 3), cannot downgrade or re-buy current tier
    if (targetLevel <= userState.vipLevel) {
      return {
        success: false,
        message: `You cannot downgrade to a lower tier or re-purchase your current tier. You are currently at VIP ${userState.vipLevel}. You can only upgrade forward to higher VIP tiers.`
      };
    }

    const activeBalance = userState.lockedInvestment > 0 ? userState.lockedInvestment : userState.totalBalance;
    if (activeBalance < targetVip.minRange) {
      return {
        success: false,
        message: `Requires invested balance within the ${targetVip.rangeLabel} range (minimum $${targetVip.minRange} USDT). Please deposit to activate VIP ${targetLevel}.`
      };
    }

    setUserState(prev => ({
      ...prev,
      vipLevel: targetLevel,
      dailyEarningRate: targetVip.profitRateNum,
      maxDailyQuantifiable: targetVip.dailyQuantifications
    }));

    syncUserProfileToFirestore(userState.uid, {
      vipLevel: targetLevel,
      dailyEarningRate: targetVip.profitRateNum,
      maxDailyQuantifiable: targetVip.dailyQuantifications
    });

    if (userState.soundEnabled) playSuccessSound();
    confetti({ particleCount: 80, spread: 90 });

    return {
      success: true,
      message: `Upgraded to ${targetVip.name}! Your daily quantify profit is now ${targetVip.profitRateNum}%.`
    };
  };

  // Unlock investment after 40-day lock period
  const unlockMaturedInvestment = () => {
    if (userState.lockedInvestment <= 0) {
      return { success: false, message: 'No active locked investment found.' };
    }
    if (userState.investmentDaysElapsed < 40) {
      return {
        success: false,
        message: `Investment is currently on Day ${userState.investmentDaysElapsed} of 40. ${40 - userState.investmentDaysElapsed} days remaining until capital unlock.`
      };
    }

    const unlockedPrincipal = userState.lockedInvestment;
    const newWithdrawable = +(userState.withdrawableBalance + unlockedPrincipal).toFixed(2);

    setUserState(prev => ({
      ...prev,
      lockedInvestment: 0,
      withdrawableBalance: newWithdrawable
    }));

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const newTx: TradeHistoryItem = {
      id: `unlock-${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      coinName: '40-Day Investment Matured & Unlocked',
      profitPercent: 0,
      quantifyIndex: 'Capital Unlock',
      profitAmount: unlockedPrincipal,
      balanceAfter: userState.totalBalance,
      type: 'bonus',
      status: 'Completed',
      txHash: 'CAPITAL-40D-MATURED',
      orderId: `MAT-40D-${Date.now().toString().slice(-6)}`,
      network: 'Smart Vault',
      nodeRoute: '40-Day Maturity Protocol'
    };

    setHistory(prev => [newTx, ...prev]);
    recordTransactionToFirestore(userState.uid, newTx);
    syncUserProfileToFirestore(userState.uid, {
      lockedInvestment: 0,
      withdrawableBalance: newWithdrawable
    });

    if (userState.soundEnabled) playSuccessSound();
    confetti({ particleCount: 80, spread: 80 });

    return {
      success: true,
      message: `40-day investment lock completed! $${unlockedPrincipal.toFixed(2)} USDT principal unlocked and added to Withdrawable Balance.`
    };
  };

  return (
    <AppContext.Provider
      value={{
        activeTab,
        setActiveTab,
        selectedCoin,
        setSelectedCoin,
        activeModal,
        openModal,
        closeModal,
        hideBalance,
        toggleHideBalance,
        isAuthenticated,
        loginUser,
        logoutUser,
        userState,
        history,
        coins,
        sevenDayEarnings,
        isQuantifying,
        quantifyStep,
        lastProfitResult,
        startQuantification,
        depositFunds,
        approvePendingDeposit,
        withdrawFunds,
        claimDailyBonus,
        claimTaskBonus,
        claimFirstDepositBonus,
        claim5ReferralsBonus,
        upgradeVipLevel,
        unlockMaturedInvestment,
        setLanguage,
        t,
        toggleSound,
        claimedBonuses,
        completedTasks,
        saveApiConfig,
        forcePriceRefresh
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
