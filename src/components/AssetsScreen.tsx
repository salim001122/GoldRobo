import React from 'react';
import { Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, Users, Share2, Sparkles, ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CoinLogo } from './CoinLogo';

export const AssetsScreen: React.FC = () => {
  const { 
    userState, 
    hideBalance, 
    toggleHideBalance, 
    openModal, 
    sevenDayEarnings,
    t
  } = useApp();

  const chartWidth = 320;
  const chartHeight = 110;
  const maxVal = Math.max(...sevenDayEarnings.map(d => d.earnings), 5);
  const minVal = 0;

  const points = sevenDayEarnings.map((item, idx) => {
    const x = (idx / (sevenDayEarnings.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - ((item.earnings - minVal) / (maxVal - minVal)) * (chartHeight - 30) - 15;
    return { x, y, day: item.day, val: item.earnings };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  return (
    <div className="w-full max-w-md mx-auto px-4 pb-28 pt-2 space-y-4">
      
      {/* Top Balance Card (Screenshot 3) */}
      <div className="rounded-2xl bg-gradient-to-br from-[#1a1f3d] via-[#121933] to-[#0c1224] border border-indigo-900/50 p-5 shadow-2xl space-y-4 relative overflow-hidden">
        {/* Ambient glow accent */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Big Balance & Percentage row with Real Tether USDT Logo */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <CoinLogo symbol="USDT" size="lg" />
              <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full bg-slate-900 border border-emerald-500/40 text-[9px] font-mono font-bold text-emerald-400 shadow">
                TRC20
              </span>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5">
                <span>Tether USD Balance</span>
                <span className="text-[10px] text-emerald-400 font-mono">(TRC20 / BEP20)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black text-white font-mono tracking-tight">
                  {hideBalance ? '••••••' : `$${userState.totalBalance.toFixed(2)}`}
                </span>
                <button
                  id="btn-toggle-hide-balance"
                  onClick={toggleHideBalance}
                  className="p-1 rounded-md text-slate-400 hover:text-white transition-colors"
                  aria-label="Toggle Balance Visibility"
                >
                  {hideBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full font-mono">
            +{userState.dailyEarningRate.toFixed(2)}% / D
          </span>
        </div>

        {/* 4 Stats Rows with USDT Details */}
        <div className="space-y-2 pt-2 border-t border-slate-800/60 font-sans">
          <div className="flex items-center justify-between text-sm py-0.5">
            <div className="flex items-center gap-1.5">
              <CoinLogo symbol="USDT" size="xs" />
              <span className="text-slate-400 font-medium">{t('total_assets', 'Total Assets')}</span>
            </div>
            <span className="font-bold text-white font-mono">
              {hideBalance ? '••••' : `$${userState.totalBalance.toFixed(2)} USDT`}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-300 font-medium">{t('locked_capital', '40-Day Locked Capital')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                Day {userState.investmentDaysElapsed}/40
              </span>
            </div>
            <span className="font-bold text-amber-400 font-mono">
              {hideBalance ? '••••' : `$${userState.lockedInvestment.toFixed(2)} USDT`}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm py-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-medium">{t('withdrawable_profit', 'Withdrawable Profit')}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">
                Anytime
              </span>
            </div>
            <span className="font-bold text-emerald-400 font-mono">
              {hideBalance ? '••••' : `$${userState.withdrawableBalance.toFixed(2)} USDT`}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm py-0.5">
            <span className="text-slate-400 font-medium">{t('deposit_bonus', 'Deposit Bonus')}</span>
            <span className="font-bold text-slate-300 font-mono">
              {hideBalance ? '••••' : `$${userState.bonusBalance.toFixed(2)} USDT`}
            </span>
          </div>
        </div>

        {/* Policy notice */}
        <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between font-mono">
          <span>Min Withdraw: $10 USDT</span>
          <span className="text-amber-300">Fee: 5% (1m-24h approval)</span>
        </div>

        {/* Deposit & Withdraw Quick Buttons */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            id="assets-btn-deposit"
            onClick={() => openModal('deposit')}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <ArrowDownToLine className="w-4 h-4" />
            {t('deposit', 'Deposit')} (+3% Bonus)
          </button>
          <button
            id="assets-btn-withdraw"
            onClick={() => openModal('withdraw')}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-all"
          >
            <ArrowUpFromLine className="w-4 h-4" />
            {t('withdraw', 'Withdraw')}
          </button>
        </div>

      </div>

      {/* 7D Earnings Graph Card (Screenshot 3) */}
      <div className="rounded-2xl bg-[#10182e] border border-slate-800/80 p-4 shadow-xl space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-wide">
            7D Earnings Graph
          </h3>
          <span className="text-sm font-bold text-emerald-400 font-mono">
            +$3.92
          </span>
        </div>

        {/* Subheader dates */}
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Sep 13 - Sep 19</span>
          <span>Resets Sunday 00:01</span>
        </div>

        {/* SVG Graph Canvas */}
        <div className="relative w-full h-[120px] pt-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Shaded Area */}
            <path d={areaD} fill="url(#areaGradient)" />

            {/* Glowing line */}
            <path
              d={pathD}
              fill="none"
              stroke="#60a5fa"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]"
            />

            {/* Data Dots with glow */}
            {points.map((pt, idx) => (
              <g key={idx}>
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="4.5"
                  fill="#93c5fd"
                  stroke="#1e3a8a"
                  strokeWidth="2"
                  className="filter drop-shadow-[0_0_5px_#38bdf8]"
                />
              </g>
            ))}
          </svg>
        </div>

        {/* X-axis days */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
          {sevenDayEarnings.map(item => (
            <span key={item.day}>{item.day}</span>
          ))}
        </div>

        {/* Caption */}
        <p className="text-center text-[11px] text-slate-400 pt-1">
          Weekly earnings path refreshes every Sunday at 00:01.
        </p>

      </div>

      {/* Referral Earnings Map Card (Screenshot 3) */}
      <div className="rounded-2xl bg-[#10182e] border border-slate-800/80 p-4 shadow-xl space-y-3 relative overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white tracking-wide">
            Referral Earnings Map
          </h3>
          <div className="text-right">
            <div className="text-sm font-bold text-white font-mono">
              ${userState.referralEarnings.toFixed(2)}
            </div>
            <div className="text-[11px] text-emerald-400">
              {userState.l1Referrals + userState.l2Referrals} members in network
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          A visual breakdown of earnings from your referral network.
        </p>

        {/* Interconnected Diamonds Visual Layout */}
        <div className="relative py-4 flex flex-col items-center justify-center">
          
          {/* Top row: L1 and L2 */}
          <div className="w-full flex items-center justify-around z-10">
            
            {/* L1 Diamond */}
            <div className="relative group cursor-pointer" onClick={() => openModal('invite')}>
              <div className="w-20 h-20 bg-gradient-to-br from-[#182344] to-[#0f172a] border border-blue-500/40 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-blue-500/15 group-hover:border-cyan-400 transition-all">
                <div className="-rotate-45 text-center p-1">
                  <div className="text-xs font-bold text-white font-mono">
                    ${(userState.l1Referrals * 1.20).toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-blue-400 mt-0.5">L1</div>
                  <div className="text-[9px] text-slate-400 whitespace-nowrap">
                    {userState.l1Referrals} members
                  </div>
                </div>
              </div>
            </div>

            {/* L2 Diamond */}
            <div className="relative group cursor-pointer" onClick={() => openModal('invite')}>
              <div className="w-20 h-20 bg-gradient-to-br from-[#182344] to-[#0f172a] border border-blue-500/40 rounded-2xl rotate-45 flex items-center justify-center shadow-lg shadow-blue-500/15 group-hover:border-cyan-400 transition-all">
                <div className="-rotate-45 text-center p-1">
                  <div className="text-xs font-bold text-white font-mono">
                    ${(userState.l2Referrals * 0.60).toFixed(2)}
                  </div>
                  <div className="text-[10px] font-bold text-blue-400 mt-0.5">L2</div>
                  <div className="text-[9px] text-slate-400 whitespace-nowrap">
                    {userState.l2Referrals} members
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Connected SVG lines */}
          <svg className="w-48 h-12 my-[-10px] pointer-events-none z-0" viewBox="0 0 200 60">
            <line x1="50" y1="10" x2="100" y2="50" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
            <line x1="150" y1="10" x2="100" y2="50" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" opacity="0.6" />
          </svg>

          {/* Bottom Center Diamond: TOTAL REFERRAL */}
          <div className="relative z-10 group cursor-pointer" onClick={() => openModal('invite')}>
            <div className="w-24 h-24 bg-gradient-to-br from-blue-700 via-indigo-700 to-cyan-600 border border-cyan-400/80 rounded-2xl rotate-45 flex items-center justify-center shadow-xl shadow-cyan-500/30 group-hover:scale-105 transition-all">
              <div className="-rotate-45 text-center p-1">
                <div className="text-[10px] font-extrabold text-white tracking-wider leading-tight">
                  TOTAL<br />REFERRAL
                </div>
                <div className="text-xs font-black text-cyan-200 font-mono mt-0.5">
                  ${userState.referralEarnings.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Action button: Real Team & Invite */}
        <div className="pt-2">
          <button
            id="btn-open-invite"
            onClick={() => openModal('invite')}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-95 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            Invite Friends & Earn 8% Commission Rebate
          </button>
        </div>

      </div>

    </div>
  );
};
