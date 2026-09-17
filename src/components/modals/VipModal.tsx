import React, { useState } from 'react';
import { X, Star, Check, Shield, Zap, Sparkles, Lock, TrendingUp, Calculator, ArrowRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VIP_TIERS, getVipTierForAmount } from '../../data/mockData';

export const VipModal: React.FC = () => {
  const { closeModal, userState, upgradeVipLevel, openModal } = useApp();
  const [feedback, setFeedback] = useState<string>('');
  const activeCapital = userState.lockedInvestment > 0 ? userState.lockedInvestment : userState.totalBalance;
  
  // Interactive simulator balance
  const [calcAmount, setCalcAmount] = useState<number>(activeCapital > 0 ? Math.round(activeCapital) : 100);
  const simulatedTier = getVipTierForAmount(calcAmount);

  const handleUpgrade = (tierLevel: number) => {
    const res = upgradeVipLevel(tierLevel);
    setFeedback(res.message);
    if (!res.success) {
      setTimeout(() => {
        setFeedback('');
        openModal('deposit');
      }, 1800);
    } else {
      setTimeout(() => setFeedback(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-md rounded-3xl bg-[#0b1120] border border-amber-500/40 p-4 sm:p-5 shadow-2xl shadow-amber-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">VIP Range & Yield System</h3>
              <span className="text-[11px] text-slate-400 block">
                {userState.vipLevel > 0 
                  ? `Active Tier: VIP ${userState.vipLevel} (+${userState.dailyEarningRate.toFixed(1)}% Daily)` 
                  : 'Active Tier: Unranked (Min 10 USDT to unlock VIP 1)'}
              </span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div className={`p-2.5 rounded-xl text-xs font-semibold text-center animate-pulse ${
            feedback.includes('Upgraded') || feedback.includes('Congratulations')
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          }`}>
            {feedback}
          </div>
        )}

        {/* Current status header */}
        {userState.vipLevel > 0 ? (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-600/20 border border-amber-500/40 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Current Active Tier
              </div>
              <div className="text-base font-black text-white mt-0.5">
                VIP {userState.vipLevel} • <span className="text-emerald-400 font-mono">+{userState.dailyEarningRate.toFixed(1)}% / Day</span>
              </div>
              <div className="text-[11px] text-slate-300 font-mono mt-0.5 flex items-center gap-2 flex-wrap">
                <span>Active Capital: <strong className="text-white">${activeCapital.toFixed(2)} USDT</strong></span>
                <span className="text-amber-400">• Est. Daily: +${(activeCapital * (userState.dailyEarningRate / 100)).toFixed(2)} USDT</span>
              </div>
            </div>
            <div className="px-2.5 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs font-mono shadow-md shadow-amber-500/30 shrink-0">
              ACTIVE
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-400" /> Membership Status
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                Unranked Member • <span className="text-slate-400 font-mono">0.0% Daily</span>
              </div>
              <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                Deposit 10 – 99 USDT to activate VIP 1 (+3.0% Daily)
              </div>
            </div>
            <button
              onClick={() => { closeModal(); openModal('deposit'); }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all shrink-0"
            >
              Deposit
            </button>
          </div>
        )}

        {/* Interactive VIP Range & Profit Calculator */}
        <div className="p-3.5 rounded-2xl bg-[#0e1628] border border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-bold flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
              Interactive Yield Calculator
            </span>
            <span className="text-amber-400 font-mono font-bold">
              {simulatedTier ? `${simulatedTier.name} (${simulatedTier.dailyProfitRate})` : 'Below VIP 1'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-mono">$</span>
              <input
                type="number"
                min="0"
                max="100000"
                value={calcAmount || ''}
                onChange={(e) => setCalcAmount(Math.max(0, Number(e.target.value) || 0))}
                className="w-full pl-7 pr-16 py-1.5 rounded-xl bg-slate-900/90 border border-slate-700 text-white font-mono text-xs font-bold focus:outline-none focus:border-amber-500"
                placeholder="Enter USDT"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] font-mono">USDT</span>
            </div>

            {/* Quick amount presets */}
            <div className="flex items-center gap-1">
              {[50, 200, 1000, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setCalcAmount(preset)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                    calcAmount === preset 
                      ? 'bg-amber-500 text-slate-950' 
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Output */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80 text-[11px] font-mono">
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">Daily Profit ({simulatedTier?.dailyProfitRate || '0%'}):</span>
              <span className="text-emerald-400 font-bold text-xs mt-0.5 block">
                +${simulatedTier ? ((calcAmount * simulatedTier.profitRateNum) / 100).toFixed(2) : '0.00'} USDT / day
              </span>
            </div>
            <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">40-Day Total Cycle:</span>
              <span className="text-amber-300 font-bold text-xs mt-0.5 block">
                +${simulatedTier ? (((calcAmount * simulatedTier.profitRateNum) / 100) * 40).toFixed(2) : '0.00'} USDT
              </span>
            </div>
          </div>
        </div>

        {/* VIP Range Cards */}
        <div className="space-y-3">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between px-1">
            <span>VIP Range Hierarchy</span>
            <span className="text-amber-400 font-normal">Forward Upgrade Only</span>
          </div>

          {VIP_TIERS.map((tier) => {
            const isCurrent = userState.vipLevel === tier.level;
            const isPast = userState.vipLevel > tier.level;
            const meetsBalance = activeCapital >= tier.minRange;
            const estimatedDailyOnBalance = (activeCapital * (tier.profitRateNum / 100)).toFixed(2);

            return (
              <div
                key={tier.level}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-br from-[#16203a] to-[#0f172a] border-amber-400/80 shadow-lg shadow-amber-500/15'
                    : isPast
                    ? 'bg-[#090e1a]/80 border-slate-800/60 opacity-60'
                    : 'bg-[#0e1628] border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Tier Name & Profit Rate */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono ${
                      isCurrent ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}>
                      VIP {tier.level}
                    </span>
                    <span className="text-sm font-bold text-white">{tier.name}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      +{tier.profitRateNum.toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-slate-400 block font-medium">Daily Profit</span>
                  </div>
                </div>

                {/* Range Label Callout */}
                <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/90 flex items-center justify-between text-xs mb-2.5">
                  <span className="text-slate-400 font-medium">Required Balance Range:</span>
                  <span className="text-amber-300 font-mono font-black text-xs">
                    {tier.rangeLabel}
                  </span>
                </div>

                {/* Dynamic calculation on user's active capital */}
                {activeCapital > 0 && (
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mb-2 pb-2 border-b border-slate-800/60">
                    <span>Est. daily yield on ${activeCapital.toFixed(2)} USDT:</span>
                    <span className="text-emerald-400 font-bold">+${estimatedDailyOnBalance} USDT/day</span>
                  </div>
                )}

                <ul className="space-y-1 text-[11px] text-slate-300 pb-2.5">
                  {tier.features.map((feat, fidx) => (
                    <li key={fidx} className="flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-2">
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/40 text-xs font-bold text-center flex items-center justify-center gap-1.5">
                      <Check className="w-3.5 h-3.5" /> CURRENT ACTIVE VIP TIER
                    </div>
                  ) : isPast ? (
                    <div className="w-full py-2.5 rounded-xl bg-slate-900/60 text-slate-500 border border-slate-800 text-xs font-semibold text-center flex items-center justify-center gap-1.5 cursor-not-allowed select-none">
                      <Lock className="w-3.5 h-3.5 text-slate-500" /> PASSED TIER (CANNOT DOWNGRADE)
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (meetsBalance) {
                          handleUpgrade(tier.level);
                        } else {
                          closeModal();
                          openModal('deposit');
                        }
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 ${
                        meetsBalance
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-amber-500/25'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {meetsBalance ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          UPGRADE TO VIP {tier.level} (+{tier.profitRateNum.toFixed(1)}% DAILY)
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          DEPOSIT TO REACH {tier.rangeLabel}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
