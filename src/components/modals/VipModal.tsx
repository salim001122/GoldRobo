import React, { useState } from 'react';
import { X, Star, Check, Shield, Zap, Sparkles, ChevronRight, Lock, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { VIP_TIERS } from '../../data/mockData';

export const VipModal: React.FC = () => {
  const { closeModal, userState, upgradeVipLevel, openModal } = useApp();
  const [feedback, setFeedback] = useState<string>('');

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0b1120] border border-amber-500/40 p-5 shadow-2xl shadow-amber-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Star className="w-4 h-4 fill-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">VIP Membership Tiers</h3>
              <span className="text-[11px] text-slate-400">
                {userState.vipLevel > 0 
                  ? `Current Level: VIP ${userState.vipLevel} (+${userState.dailyEarningRate.toFixed(1)}% Daily)` 
                  : 'Current Level: Unranked (Deposit $10 to unlock VIP 1)'}
              </span>
            </div>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
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
              <div className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Active Membership
              </div>
              <div className="text-base font-black text-white mt-0.5">
                VIP {userState.vipLevel} • <span className="text-emerald-400 font-mono">+{userState.dailyEarningRate.toFixed(1)}% / Day</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                Available Balance: ${userState.totalBalance.toFixed(2)} USDT
              </div>
            </div>
            <div className="px-3 py-1 rounded-xl bg-amber-500 text-slate-950 font-black text-xs font-mono shadow-md shadow-amber-500/30">
              ACTIVE
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3 text-slate-400" /> Membership Status
              </div>
              <div className="text-sm font-bold text-white mt-0.5">
                Unranked Member • <span className="text-slate-400 font-mono">0.0% Daily</span>
              </div>
              <div className="text-[11px] text-amber-400 font-medium mt-0.5">
                Deposit min $10.00 USDT to activate VIP 1 (+3.0% Daily)
              </div>
            </div>
            <button
              onClick={() => { closeModal(); openModal('deposit'); }}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 active:scale-95 transition-all"
            >
              Deposit
            </button>
          </div>
        )}

        {/* VIP Cards */}
        <div className="space-y-3">
          {VIP_TIERS.map((tier) => {
            const isCurrent = userState.vipLevel === tier.level;

            return (
              <div
                key={tier.level}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-gradient-to-br from-[#16203a] to-[#0f172a] border-amber-400/70 shadow-lg shadow-amber-500/15'
                    : 'bg-[#0e1628] border-slate-800 hover:border-slate-700'
                }`}
              >
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

                <div className="flex items-center justify-between text-xs text-slate-400 mb-2.5 pb-2 border-b border-slate-800/80">
                  <span>Minimum Deposit:</span>
                  <span className="text-white font-mono font-bold">${tier.minDeposit.toLocaleString()}.00 USDT</span>
                </div>

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
                  ) : (
                    <button
                      onClick={() => {
                        if (userState.totalBalance >= tier.minDeposit) {
                          handleUpgrade(tier.level);
                        } else {
                          closeModal();
                          openModal('deposit');
                        }
                      }}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold active:scale-95 transition-all shadow-md flex items-center justify-center gap-1.5 ${
                        userState.totalBalance >= tier.minDeposit
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black shadow-amber-500/25'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {userState.totalBalance >= tier.minDeposit ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          UPGRADE TO VIP {tier.level} (+{tier.profitRateNum.toFixed(1)}%)
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          DEPOSIT ${tier.minDeposit} TO UNLOCK
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
