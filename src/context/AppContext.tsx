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
  INITIAL_CREATOR_COINS,
  INITIAL_TRADE_HISTORY,
  INITIAL_USER_STATE,
  INITIAL_7D_EARNINGS,
  VIP_TIERS
} from '../data/mockData';
import { playClickSound, playSuccessSound, playRobotScanningSound } from '../utils/audio';
import { fetchLiveCryptoPrices, fetchRealKlines } from '../utils/cryptoApi';
import { 
  auth, 
  fbSignOut, 
  syncUserProfileToFirestore, 
  recordTransactionToFirestore, 
  onAuthStateChanged,
  fetchUserProfileFromFirestore,
  fetchUserTransactionsFromFirestore
} from '../utils/firebase';
import { saveSystemTransaction } from '../utils/adminTransactions';

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
        const todayDateStr = new Date().toISOString().split('T')[0];
        const isNewDay = parsed.lastQuantifyDate !== todayDateStr;
        const totalBal = parsed.totalBalance ?? 0.00;
        const vipLevel = parsed.vipLevel !== undefined ? parsed.vipLevel : (totalBal >= 10 ? 1 : 0);
        const matchingTier = VIP_TIERS.find(v => v.level === vipLevel);
        return {
          ...INITIAL_USER_STATE,
          ...parsed,
          maxDailyQuantifiable: 1, // 1 quantify daily for all users
          todayQuantifiableCount: isNewDay ? 0 : (parsed.todayQuantifiableCount || 0),
          lastQuantifyDate: isNewDay ? todayDateStr : (parsed.lastQuantifyDate || todayDateStr),
          vipLevel,
          dailyEarningRate: vipLevel > 0 ? (matchingTier ? matchingTier.profitRateNum : 3.0) : 0.0,
          minQuantifyAmount: 10.00,
          minWithdrawAmount: 10.00,
          withdrawFeeRate: 0.05,
          investmentLockDays: 40,
          lockedInvestment: parsed.lockedInvestment !== undefined ? parsed.lockedInvestment : 0.00,
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

      if (shouldCreditDeposit) {
        setUserState(prevUser => {
          const isFirstDeposit = !prevUser.hasReceivedFirstDepositBonus && !prevUser.canClaimFirstDepositBonus;
          const bonusAmount = isFirstDeposit ? +(depositAmount * 0.03).toFixed(2) : 0;
          const newTotal = +(prevUser.totalBalance + depositAmount).toFixed(2);
          const newLocked = +(prevUser.lockedInvestment + depositAmount).toFixed(2);
          const shouldUnlockVip1 = (prevUser.vipLevel === 0 || !prevUser.vipLevel) && newTotal >= 10;

          const next = {
            ...prevUser,
            totalBalance: newTotal,
            lockedInvestment: newLocked,
            vipLevel: shouldUnlockVip1 ? 1 : prevUser.vipLevel,
            dailyEarningRate: shouldUnlockVip1 ? 3.0 : prevUser.dailyEarningRate,
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

      if (shouldRefundWithdraw) {
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
  };

  // Run Robot Quantification with VIP-based profit rate
  const startQuantification = (coinId?: string) => {
    if (isQuantifying) return;
    
    // Check if daily quota reached (1 quantify per day)
    if (userState.todayQuantifiableCount >= userState.maxDailyQuantifiable) {
      alert(`Daily limit reached! You have executed your daily quantification (${userState.todayQuantifiableCount}/${userState.maxDailyQuantifiable}). Next quantify quota resets at 00:00 UTC.`);
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

      // Profit rate dynamically determined by VIP Level
      // VIP 1 = 3.0%, VIP 2 = 3.5%, VIP 3 = 4.0%, VIP 4 = 4.5%, VIP 5 = 5.0%, etc.
      const currentVip = VIP_TIERS.find(v => v.level === userState.vipLevel);
      const profitRate = currentVip ? currentVip.profitRateNum : 3.00;
      const profitAmount = +(activeCapital * (profitRate / 100)).toFixed(2);
      
      const newTotal = +(userState.totalBalance + profitAmount).toFixed(2);
      const newWithdrawable = +(userState.withdrawableBalance + profitAmount).toFixed(2);
      const newCount = userState.todayQuantifiableCount + 1;

      setUserState(prev => ({
        ...prev,
        totalBalance: newTotal,
        withdrawableBalance: newWithdrawable,
        todayQuantifiableCount: newCount,
        dailyEarningRate: profitRate
      }));

      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newHistoryItem: TradeHistoryItem = {
        id: `tx-q-${Date.now()}`,
        timestamp: now.toISOString(),
        dateStr,
        timeStr,
        coinName: `${targetCoin.symbol} / USDT Quantify (VIP ${userState.vipLevel})`,
        profitPercent: profitRate,
        quantifyIndex: `${newCount}/${userState.maxDailyQuantifiable}`,
        profitAmount,
        balanceAfter: newTotal,
        type: 'quantify',
        status: 'Completed',
        txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
        orderId: `ROBO-${targetCoin.symbol}-${Date.now().toString().slice(-6)}`,
        network: 'USDT (TRC20)',
        nodeRoute: `Binance VIP Liquidity Node #${userState.vipLevel}`
      };

      setHistory(prev => [newHistoryItem, ...prev]);

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

  // Listen for Firebase Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setIsAuthenticated(true);
        setUserState(prev => ({
          ...prev,
          uid: fbUser.uid,
          email: fbUser.email || prev.email
        }));
      }
    });
    return () => unsubscribe();
  }, []);

  const loginUser = async (userData: { 
    uid: string; 
    email: string; 
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

      const todayDateStr = new Date().toISOString().split('T')[0];
      const remoteQuantifyDate = remoteProfile?.lastQuantifyDate || '';
      const isNewDay = remoteQuantifyDate !== todayDateStr;
      const effectiveTodayCount = isNewDay ? 0 : (remoteProfile?.todayQuantifiableCount ?? 0);

      const effectiveTotalBalance = remoteProfile?.totalBalance ?? (userData.totalBalance ?? 0.00);
      const effectiveVipLevel = remoteProfile?.vipLevel !== undefined 
        ? remoteProfile.vipLevel 
        : (effectiveTotalBalance >= 10 ? 1 : 0);
      const matchingTier = VIP_TIERS.find(v => v.level === effectiveVipLevel);
      const effectiveDailyRate = remoteProfile?.dailyEarningRate !== undefined 
        ? remoteProfile.dailyEarningRate 
        : (matchingTier ? matchingTier.profitRateNum : (effectiveVipLevel > 0 ? 3.0 : 0.0));

      const freshUserState: UserState = {
        ...INITIAL_USER_STATE,
        uid: userData.uid,
        email: userData.email,
        referralCode: remoteProfile?.referralCode || userData.referralCode || `GOLD${Math.floor(1000 + Math.random() * 9000)}`,
        securityPin: remoteProfile?.securityPin || userData.securityPin || '',
        sponsorCode: remoteProfile?.sponsorCode || userData.sponsorCode || '',
        totalBalance: effectiveTotalBalance,
        withdrawableBalance: remoteProfile?.withdrawableBalance ?? (userData.withdrawableBalance ?? 0.00),
        bonusBalance: remoteProfile?.bonusBalance ?? 0.00,
        lockedInvestment: remoteProfile?.lockedInvestment ?? 0.00,
        investmentDaysElapsed: remoteProfile?.investmentDaysElapsed ?? 0,
        hasReceivedFirstDepositBonus: remoteProfile?.hasReceivedFirstDepositBonus ?? false,
        canClaimFirstDepositBonus: remoteProfile?.canClaimFirstDepositBonus ?? false,
        firstDepositBonusAmount: remoteProfile?.firstDepositBonusAmount ?? 0.00,
        hasReceived5RefBonus: remoteProfile?.hasReceived5RefBonus ?? false,
        validReferralsCount: remoteProfile?.validReferralsCount ?? 0,
        todayQuantifiableCount: effectiveTodayCount,
        lastQuantifyDate: isNewDay ? todayDateStr : remoteQuantifyDate,
        maxDailyQuantifiable: 1,
        vipLevel: effectiveVipLevel,
        dailyEarningRate: effectiveDailyRate,
        lastCheckinTimestamp: remoteProfile?.lastCheckinTimestamp ?? 0,
        checkinStreak: remoteProfile?.checkinStreak ?? 0,
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
      const freshUserState: UserState = {
        ...INITIAL_USER_STATE,
        uid: userData.uid,
        email: userData.email,
        referralCode: userData.referralCode || `GOLD${Math.floor(1000 + Math.random() * 9000)}`,
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
    const shouldUnlockVip1 = (userState.vipLevel === 0 || !userState.vipLevel) && newTotal >= 10;

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      lockedInvestment: newLocked,
      vipLevel: shouldUnlockVip1 ? 1 : prev.vipLevel,
      dailyEarningRate: shouldUnlockVip1 ? 3.0 : prev.dailyEarningRate,
      canClaimFirstDepositBonus: isFirstDeposit,
      firstDepositBonusAmount: isFirstDeposit ? bonusAmount : prev.firstDepositBonusAmount,
      lockStartDate: prev.lockStartDate || new Date().toISOString().split('T')[0]
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
      vipLevel: shouldUnlockVip1 ? 1 : userState.vipLevel,
      dailyEarningRate: shouldUnlockVip1 ? 3.0 : userState.dailyEarningRate,
      canClaimFirstDepositBonus: isFirstDeposit,
      firstDepositBonusAmount: isFirstDeposit ? bonusAmount : userState.firstDepositBonusAmount
    });

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

    setUserState(prev => ({
      ...prev,
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable
    }));

    const now = new Date();
    const dateStr = `${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')}.${now.getFullYear()}`;
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    const fullDateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${timeStr}`;
    const orderId = `ID:TX${now.toISOString().replace(/\D/g, '').slice(2, 18)}`;

    const newTx: TradeHistoryItem = {
      id: `wd-${Date.now()}`,
      timestamp: now.toISOString(),
      dateStr,
      timeStr,
      fullDateStr,
      coinName: `USDT Withdrawal (${network})`,
      profitPercent: 0,
      quantifyIndex: 'Withdrawal',
      profitAmount: -amount,
      amount: amount,
      actualAmount: netArrival,
      serviceCharge: feeAmount,
      approvalStatus: 'Auditing in progress',
      paymentStatus: 'Pending Admin Transfer',
      balanceAfter: newTotal,
      type: 'withdraw',
      status: 'Pending',
      txHash: `0x${Math.random().toString(16).substring(2, 10)}${Math.random().toString(16).substring(2, 10)}`,
      orderId,
      network: network,
      nodeRoute: 'Security Audit Queue (1m - 24h)'
    };

    setHistory(prev => [newTx, ...prev]);
    recordTransactionToFirestore(userState.uid, newTx);
    saveSystemTransaction(newTx, userState.email, userState.uid);
    syncUserProfileToFirestore(userState.uid, {
      totalBalance: newTotal,
      withdrawableBalance: newWithdrawable
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

    if (userState.totalBalance < targetVip.minDeposit) {
      return {
        success: false,
        message: `Requires minimum deposit of $${targetVip.minDeposit} USDT. Please deposit to activate VIP ${targetLevel}.`
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
