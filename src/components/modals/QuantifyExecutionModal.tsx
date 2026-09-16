import React from 'react';
import { CheckCircle2, Cpu, Zap, TrendingUp, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const QuantifyExecutionModal: React.FC = () => {
  const { 
    closeModal, 
    quantifyStep, 
    isQuantifying, 
    lastProfitResult, 
    selectedCoin, 
    userState 
  } = useApp();

  const steps = [
    { num: 1, text: 'Connecting to Global Node Network (Binance, Bybit, OKX)...' },
    { num: 2, text: `Scanning micro-spreads for ${selectedCoin.name}...` },
    { num: 3, text: 'Executing flash liquidity arbitrage...' },
    { num: 4, text: 'Arbitrage transaction finalized on-chain!' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0b1224] border border-cyan-500/40 p-6 shadow-2xl shadow-cyan-500/20 text-center space-y-5 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400 animate-spin [animation-duration:6s]" />
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              AI Quantification Engine
            </span>
          </div>
          {!isQuantifying && (
            <button
              onClick={closeModal}
              className="w-7 h-7 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Center Futuristic Radar Animation */}
        <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
          {/* Outer radar pulse rings */}
          <div className={`absolute inset-0 rounded-full border border-cyan-500/30 ${isQuantifying ? 'animate-ping' : ''} [animation-duration:2.5s]`} />
          <div className={`absolute inset-3 rounded-full border border-blue-500/40 ${isQuantifying ? 'animate-pulse' : ''}`} />
          <div className="absolute inset-6 rounded-full border border-indigo-500/50" />

          {/* Center Mascot / Avatar */}
          <div className="relative w-20 h-20 rounded-full bg-[#111936] border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_20px_rgba(56,189,248,0.5)]">
            <svg viewBox="0 0 36 36" className="w-12 h-12 text-blue-500" fill="currentColor">
              <rect x="2" y="14" width="4" height="8" rx="2" fill="#3b82f6" />
              <rect x="30" y="14" width="4" height="8" rx="2" fill="#3b82f6" />
              <rect x="5" y="8" width="26" height="20" rx="6" fill="#2563eb" />
              <rect x="8" y="11" width="20" height="13" rx="4" fill="#0f172a" />
              <circle cx="13" cy="17" r="2.2" fill="#38bdf8" className="animate-pulse" />
              <circle cx="23" cy="17" r="2.2" fill="#38bdf8" className="animate-pulse" />
              <path d="M15 20 Q18 22 21 20" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>

        {/* Step Progress indicators or Profit Result */}
        {isQuantifying ? (
          <div className="space-y-3">
            <h3 className="text-base font-extrabold text-white tracking-wide">
              Automated Trading In Progress
            </h3>

            <div className="space-y-2 text-left pt-1">
              {steps.map((s) => {
                const isPassed = quantifyStep > s.num;
                const isCurrent = quantifyStep === s.num;
                return (
                  <div
                    key={s.num}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-xs transition-all ${
                      isCurrent
                        ? 'bg-blue-600/20 text-cyan-300 border border-blue-500/40 font-semibold'
                        : isPassed
                        ? 'text-slate-400'
                        : 'text-slate-600'
                    }`}
                  >
                    {isPassed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isCurrent ? (
                      <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-700 text-[10px] flex items-center justify-center shrink-0">
                        {s.num}
                      </div>
                    )}
                    <span className="truncate">{s.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : lastProfitResult ? (
          /* Completion Win State */
          <div className="space-y-3 animate-fadeIn">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              Quantification Succeeded!
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#12213e] to-[#0d162d] border border-cyan-500/40 space-y-1">
              <div className="text-xs text-slate-400 font-medium">Profit Harvested</div>
              <div className="text-3xl font-extrabold text-emerald-400 font-mono tracking-tight glow-neon-green">
                +${lastProfitResult.profit.toFixed(2)} USDT
              </div>
              <div className="text-xs font-semibold text-cyan-300">
                Yield Rate: +{lastProfitResult.percent.toFixed(2)}%
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 block font-sans">Total Balance</span>
                <span className="font-bold text-white">${userState.totalBalance.toFixed(2)}</span>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-left">
                <span className="text-[10px] text-slate-400 block font-sans">Today's Trades</span>
                <span className="font-bold text-cyan-400">
                  {userState.todayQuantifiableCount}/{userState.maxDailyQuantifiable}
                </span>
              </div>
            </div>

            <button
              onClick={closeModal}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 text-white font-bold text-sm shadow-xl shadow-blue-500/30 hover:from-blue-500 hover:to-cyan-400 active:scale-95 transition-all"
            >
              Collect & Continue
            </button>
          </div>
        ) : null}

      </div>
    </div>
  );
};
