import React from 'react';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  Users, 
  FileText, 
  Star, 
  CircleDot, 
  FileSpreadsheet, 
  History, 
  Zap, 
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ShieldCheck,
  Headphones,
  MessageCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CreatorCoin } from '../types';
import { formatCryptoPrice } from '../utils/cryptoApi';
import { CoinLogo } from './CoinLogo';

export const HomeScreen: React.FC = () => {
  const { 
    coins, 
    setSelectedCoin, 
    setActiveTab, 
    openModal, 
    startQuantification,
    userState,
    t
  } = useApp();

  const COOLDOWN_24H_MS = 24 * 60 * 60 * 1000;
  const lastTs = userState.lastQuantifyTimestamp || (userState.lastQuantifyDate ? new Date(userState.lastQuantifyDate).getTime() : 0);
  const nextAllowedAt = userState.nextQuantifyAllowedAt || (lastTs > 0 ? (lastTs + COOLDOWN_24H_MS) : 0);
  const isCooldownActive = lastTs > 0 && Date.now() < nextAllowedAt;

  const handleCoinClick = (coin: CreatorCoin) => {
    setSelectedCoin(coin);
    setActiveTab('robot');
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-28 pt-2 space-y-4">
      
      {/* Hero Banner: Robot earning system */}
      <div className="relative rounded-3xl bg-gradient-to-br from-[#12192e] via-[#0d1425] to-[#1a1506] p-5 border border-amber-500/30 shadow-xl text-center overflow-hidden">
        {/* Soft background ambient light */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/15 rounded-full blur-2xl pointer-events-none" />
        
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5">
          <Zap className="w-3 h-3 text-amber-400" />
          {userState.vipLevel > 0 
            ? `VIP ${userState.vipLevel} Yield: +${userState.dailyEarningRate.toFixed(1)}% Daily Profit`
            : 'Unranked Member: Deposit min $10 to unlock VIP 1 (+3.0% Daily)'}
        </div>

        <h2 className="text-2xl sm:text-[26px] font-extrabold text-white tracking-tight drop-shadow-sm flex items-center justify-center gap-2">
          <span>GOLDROBO Quantitative Engine</span>
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-300 font-normal leading-relaxed max-w-xs mx-auto">
          Daily 1 quantify quota • Real-time crypto arbitrage • 40-day locked principal • 8% L1 direct rebate.
        </p>

        {/* Highlight badge bar */}
        <div className="mt-3 flex items-center justify-center gap-2 text-[10px] font-semibold text-slate-300">
          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-amber-300">
            🔒 40-Day Lock
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-emerald-400">
            ⚡ Profit Anytime
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-900/90 border border-slate-800 text-cyan-300">
            🎁 3% 1st Bonus
          </span>
        </div>
      </div>

      {/* 8 Quick Actions Grid (2 rows x 4 columns) */}
      <div className="grid grid-cols-4 gap-2.5">
        
        {/* 1. Deposit */}
        <button
          id="quick-action-deposit"
          onClick={() => openModal('deposit')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <ArrowDownToLine className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('deposit', 'Deposit')}</span>
        </button>

        {/* 2. Withdraw */}
        <button
          id="quick-action-withdraw"
          onClick={() => openModal('withdraw')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <ArrowUpFromLine className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('withdraw', 'Withdraw')}</span>
        </button>

        {/* 3. Invite */}
        <button
          id="quick-action-invite"
          onClick={() => openModal('invite')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('invite', 'Invite')}</span>
        </button>

        {/* 4. Positions */}
        <button
          id="quick-action-positions"
          onClick={() => openModal('positions')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <FileText className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('positions', 'Positions')}</span>
        </button>

        {/* 5. VIP */}
        <button
          id="quick-action-vip"
          onClick={() => openModal('vip')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <Star className="w-5 h-5 stroke-[2.2] fill-amber-400/20 group-hover:fill-amber-400" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('vip_privilege', 'VIP')}</span>
        </button>

        {/* 6. About */}
        <button
          id="quick-action-about"
          onClick={() => openModal('about')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <div className="w-4 h-4 rounded-full bg-amber-400/90 shadow-[0_0_8px_#f59e0b]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('about', 'About')}</span>
        </button>

        {/* 7. Bonus */}
        <button
          id="quick-action-bonus"
          onClick={() => openModal('bonus')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group relative"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('bonus', 'Bonus')}</span>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </button>

        {/* 8. History */}
        <button
          id="quick-action-history"
          onClick={() => openModal('history')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-[#11192e] border border-slate-800/80 hover:border-amber-500/40 active:scale-95 transition-all shadow-md group"
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
            <History className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-[11px] font-medium text-slate-200 mt-1">{t('records', 'History')}</span>
        </button>

      </div>

      {/* 24/7 VIP Customer Support Interactive Card */}
      <div 
        id="banner-customer-support"
        onClick={() => openModal('support')}
        className="cursor-pointer p-3.5 rounded-2xl bg-gradient-to-r from-[#0d162d] via-[#132042] to-[#0d162d] border border-amber-500/40 hover:border-amber-400/80 shadow-lg shadow-amber-500/10 flex items-center justify-between transition-all active:scale-[0.99] group"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 p-0.5 shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full rounded-[10px] bg-[#090f20] flex items-center justify-center">
                <Headphones className="w-5 h-5 text-amber-400" />
              </div>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#090f20] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold text-white">24/7 VIP Customer Support</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Online
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live Chat & Instant Auto-Answers for Deposits, Quantify, Withdraw & VIP
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 transition-colors">
          <MessageCircle className="w-4 h-4" />
        </div>
      </div>

      {/* GOLDROBO Main Card */}
      <div className="rounded-3xl bg-gradient-to-b from-[#10182d] to-[#0a0f1d] border border-amber-500/30 p-4 shadow-xl relative overflow-hidden">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-white tracking-wide flex items-center gap-1.5">
              <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">GOLDROBO</span>
              <span>QUANTIFY</span>
            </span>
          </div>
          {userState.vipLevel > 0 ? (
            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono font-bold">
              VIP {userState.vipLevel} (+{userState.dailyEarningRate.toFixed(1)}% / DAY)
            </span>
          ) : (
            <button
              onClick={() => openModal('vip')}
              className="text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-mono font-bold transition-all"
            >
              VIP 0 • Deposit $10 to Unlock
            </button>
          )}
        </div>

        {/* Robot Profile & Energy Status */}
        <div className="mt-3 flex items-center gap-3">
          {/* Mascot avatar circle */}
          <div className="w-13 h-13 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/20 p-1 shrink-0">
            <svg viewBox="0 0 36 36" className="w-9 h-9 text-slate-950" fill="currentColor">
              <line x1="18" y1="8" x2="18" y2="4" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
              <circle cx="18" cy="3" r="2" fill="#fef08a" />
              <rect x="2" y="14" width="3" height="8" rx="1.5" fill="#ca8a04" />
              <rect x="31" y="14" width="3" height="8" rx="1.5" fill="#ca8a04" />
              <rect x="5" y="8" width="26" height="20" rx="6" fill="#ca8a04" />
              <rect x="8" y="11" width="20" height="13" rx="4" fill="#0f172a" />
              <circle cx="13" cy="17" r="2.2" fill="#38bdf8" />
              <circle cx="23" cy="17" r="2.2" fill="#38bdf8" />
              <path d="M15 20 Q18 22 21 20" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
          </div>

          {/* Golden battery / energy status */}
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-300 font-medium">Quantify Quota</span>
              <span className="text-amber-300 font-mono font-bold">
                {isCooldownActive || userState.todayQuantifiableCount >= userState.maxDailyQuantifiable 
                  ? '1/1 Used (24h Cooldown)' 
                  : '0/1 Available'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
              <div className={`h-2 flex-1 rounded-sm ${
                (isCooldownActive || userState.todayQuantifiableCount >= userState.maxDailyQuantifiable)
                  ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' 
                  : 'bg-slate-700/80 border border-slate-600'
              }`} />
              <div className="w-8 h-2 rounded-sm bg-slate-800" />
            </div>
          </div>
        </div>

        {/* Profit and 40-Day Lock Metrics */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="px-3 py-2.5 rounded-2xl bg-[#0b1120] border border-slate-800 text-left">
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">DAILY YIELD</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {userState.vipLevel > 0 ? `+${userState.dailyEarningRate.toFixed(1)}% / Trade` : '0.0% (Deposit $10)'}
            </div>
          </div>
          <div className="px-3 py-2.5 rounded-2xl bg-[#0b1120] border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">CAPITAL LOCK</div>
              <div className="text-sm font-bold text-amber-300 mt-0.5 font-mono">{userState.investmentDaysElapsed}/40 Days</div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {userState.vipLevel > 0 ? `VIP ${userState.vipLevel}` : 'Free'}
            </span>
          </div>
        </div>

        {/* Bottom Platform Activity & Start button */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between flex-wrap gap-2">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">
              PLATFORM ACTIVITY
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Daily Limit: 1 Quantify / 24 Hours
            </span>
          </div>

          <button
            id="btn-robot-start-home"
            onClick={() => {
              if (isCooldownActive || userState.todayQuantifiableCount >= userState.maxDailyQuantifiable) {
                setActiveTab('robot');
              } else if (userState.vipLevel === 0 || userState.totalBalance < 10) {
                openModal('vip');
              } else {
                startQuantification(coins[0]?.id || 'bitcoin');
              }
            }}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs tracking-wider transition-all shadow-lg active:scale-95 shrink-0 ${
              (isCooldownActive || userState.todayQuantifiableCount >= userState.maxDailyQuantifiable)
                ? 'bg-slate-800 text-amber-300 border border-amber-500/40'
                : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-slate-950 shadow-amber-500/25 hover:from-amber-400 hover:to-yellow-300'
            }`}
          >
            {(isCooldownActive || userState.todayQuantifiableCount >= userState.maxDailyQuantifiable) 
              ? 'Cooldown (View)' 
              : userState.vipLevel === 0
                ? 'Unlock VIP 1'
                : `Start (+${userState.dailyEarningRate.toFixed(1)}%)`}
          </button>
        </div>
      </div>

      {/* Real-Time Crypto Assets Stream */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 flex-wrap gap-1">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Live Market Cryptocurrencies
          </span>
          <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <span>Updated {userState.lastPriceSyncTime}</span>
          </div>
        </div>

        {coins.map((coin) => (
          <div
            key={coin.id}
            id={`coin-row-${coin.id}`}
            onClick={() => handleCoinClick(coin)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0f172a] border border-slate-800/80 hover:border-amber-500/40 hover:bg-[#131d36] active:scale-[0.99] cursor-pointer transition-all shadow-md group gap-2"
          >
            {/* Left: Real Coin Logo & Name */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="group-hover:scale-105 transition-transform shrink-0">
                <CoinLogo symbol={coin.symbol} size="md" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-sm font-bold text-white tracking-wide truncate">{coin.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 border border-slate-700 font-mono font-bold shrink-0">
                    {coin.symbol}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium truncate">
                  {coin.category}
                </div>
              </div>
            </div>

            {/* Right: Price & 24h Change */}
            <div className="text-right shrink-0">
              <div className="text-sm font-bold text-white font-mono">
                ${formatCryptoPrice(coin.price)}
              </div>
              <div className={`text-xs font-semibold flex items-center justify-end gap-0.5 ${
                coin.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {coin.change24h >= 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    +{coin.change24h.toFixed(2)}%
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    {coin.change24h.toFixed(2)}%
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
