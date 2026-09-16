import React, { useState, useEffect } from 'react';
import { X, Lock, Unlock, Sparkles, Gift, CheckCircle2, Clock } from 'lucide-react';
import confetti from 'canvas-confetti';
import { CoinLogo } from '../CoinLogo';

interface MysteryChestModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  dayStreak?: number;
  rewardAmount: number;
  isAvailable: boolean;
  timeRemainingMs: number;
  caseType?: 'daily' | 'deposit_mission' | 'referral_mission';
  onClaimConfirmed: () => void;
}

export const MysteryChestModal: React.FC<MysteryChestModalProps> = ({
  isOpen,
  onClose,
  title = 'Daily Crypto Mystery Case',
  subtitle = 'Open your continuous 24-hour streak crate to reveal instant USDT yields',
  dayStreak = 1,
  rewardAmount,
  isAvailable,
  timeRemainingMs,
  caseType = 'daily',
  onClaimConfirmed
}) => {
  const [chestState, setChestState] = useState<'idle' | 'shaking' | 'opening' | 'opened'>('idle');
  const [countdown, setCountdown] = useState<number>(timeRemainingMs);

  // Ticking countdown timer when locked
  useEffect(() => {
    if (!isOpen) return;
    setCountdown(timeRemainingMs);
    if (isAvailable || timeRemainingMs <= 0) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isAvailable]);

  // Reset chest animation state when modal opens
  useEffect(() => {
    if (isOpen) {
      setChestState('idle');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00';
    const totalSec = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleOpenChest = () => {
    if (!isAvailable || chestState !== 'idle') return;

    // Trigger shaking animation
    setChestState('shaking');

    setTimeout(() => {
      // Trigger opening animation & lid flip
      setChestState('opening');
    }, 700);

    setTimeout(() => {
      // Fully opened with confetti burst and token reveals
      setChestState('opened');
      // Instantly confirm claim so 24-hour lock & balance are locked
      onClaimConfirmed();
      try {
        confetti({
          particleCount: 90,
          spread: 80,
          origin: { y: 0.55 },
          colors: ['#10b981', '#f59e0b', '#38bdf8', '#fbbf24']
        });
      } catch {}
    }, 1400);
  };

  const handleCollect = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#0f172a] via-[#090e1a] to-[#040711] border border-cyan-500/30 p-5 shadow-2xl shadow-cyan-500/20 text-center space-y-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle background radial glow */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 relative z-10">
          <div className="flex items-center gap-2 text-left">
            <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Gift className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">{title}</h3>
              <p className="text-[10px] text-slate-400">
                {caseType === 'daily' ? `Day ${dayStreak} of 7 Streak` : 'Mission Achievement Crate'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            id="btn-close-mystery-chest"
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crate Stage Visual Area */}
        <div className="relative py-6 flex flex-col items-center justify-center min-h-[220px]">
          
          {/* Beaming rays when opening */}
          {(chestState === 'opening' || chestState === 'opened') && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 bg-gradient-to-t from-amber-400/40 via-cyan-400/30 to-transparent rounded-full blur-2xl animate-pulse" />
              {/* Rotating light ray simulation */}
              <div className="absolute w-56 h-56 border-4 border-dashed border-amber-400/30 rounded-full animate-spin" />
            </div>
          )}

          {/* 3D Cyber Treasure Chest Representation */}
          <div 
            onClick={isAvailable && chestState === 'idle' ? handleOpenChest : undefined}
            className={`relative transition-all duration-300 cursor-pointer ${
              chestState === 'shaking' ? 'animate-bounce scale-105' : ''
            } ${chestState === 'idle' && isAvailable ? 'hover:scale-105' : ''}`}
          >
            {/* Chest Graphic */}
            <div className="relative w-36 h-32 mx-auto flex items-center justify-center">
              
              {/* Floating Tokens above open box */}
              {chestState === 'opened' && (
                <div className="absolute -top-10 flex items-center gap-2 animate-bounce z-20">
                  <div className="p-1 rounded-full bg-emerald-500/20 border border-emerald-400/50 shadow-lg">
                    <CoinLogo symbol="USDT" size={24} />
                  </div>
                  <div className="p-1 rounded-full bg-amber-500/20 border border-amber-400/50 shadow-lg">
                    <CoinLogo symbol="BTC" size={20} />
                  </div>
                  <div className="p-1 rounded-full bg-cyan-500/20 border border-cyan-400/50 shadow-lg">
                    <CoinLogo symbol="ETH" size={20} />
                  </div>
                </div>
              )}

              {/* Chest SVG Illustration */}
              <svg viewBox="0 0 160 140" className="w-36 h-32 drop-shadow-2xl">
                <defs>
                  <linearGradient id="chestGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor="#0f172a" />
                    <stop offset="100%" stopColor="#020617" />
                  </linearGradient>
                  <linearGradient id="goldTrim" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="neonGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>

                {/* Lower Chest Body */}
                <rect x="25" y="60" width="110" height="65" rx="12" fill="url(#chestGrad)" stroke="#334155" strokeWidth="2.5" />
                <rect x="35" y="68" width="90" height="48" rx="8" fill="#090e1a" stroke="url(#neonGlow)" strokeWidth="1.5" strokeOpacity="0.7" />

                {/* Chest Lid - Hinged when opened */}
                {chestState === 'opened' ? (
                  // Open Lid angled upwards
                  <g transform="translate(15, 10) rotate(-35 80 50)">
                    <path d="M 25 55 Q 80 20 135 55 L 135 62 Q 80 28 25 62 Z" fill="url(#goldTrim)" />
                    <path d="M 30 55 Q 80 26 130 55" fill="none" stroke="#fef08a" strokeWidth="2" />
                  </g>
                ) : (
                  // Closed Lid
                  <g>
                    <path d="M 25 60 Q 80 25 135 60 L 135 68 Q 80 34 25 68 Z" fill="url(#goldTrim)" />
                    <rect x="25" y="58" width="110" height="7" rx="3" fill="#fbbf24" opacity="0.8" />
                  </g>
                )}

                {/* Center Lock Badge */}
                <circle cx="80" cy="72" r="14" fill="#0f172a" stroke="url(#goldTrim)" strokeWidth="2.5" />
                
                {/* Glowing Core or Lock Icon */}
                {chestState === 'opened' ? (
                  <circle cx="80" cy="72" r="6" fill="#10b981" className="animate-ping" />
                ) : (
                  <path 
                    d="M 76 72 L 76 69 Q 76 65 80 65 Q 84 65 84 69 L 84 72 M 74 72 L 86 72 L 86 77 L 74 77 Z" 
                    fill="#f59e0b" 
                  />
                )}
              </svg>

              {/* Status Lock Pill */}
              <div className="absolute -bottom-2 bg-slate-900/90 border border-slate-700/80 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-md">
                {isAvailable ? (
                  <>
                    <Unlock className="w-3 h-3 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">UNLOCKED</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] font-bold text-rose-400">LOCKED (24H)</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Won Reward Display Banner */}
          {chestState === 'opened' && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-center animate-fadeIn space-y-1 w-full">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>Prize Unlocked!</span>
              </div>
              <div className="text-2xl font-black font-mono text-white text-emerald-300">
                +${rewardAmount.toFixed(2)} USDT
              </div>
              <p className="text-[10px] text-slate-400">
                Directly credited to your Withdrawable Assets balance!
              </p>
            </div>
          )}

          {/* Locked State 24-Hour Timer Banner */}
          {!isAvailable && chestState === 'idle' && (
            <div className="mt-4 p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center space-y-1 w-full">
              <div className="flex items-center justify-center gap-1.5 text-xs text-amber-400 font-bold">
                <Clock className="w-3.5 h-3.5" />
                <span>Next Free Case Unlocks In:</span>
              </div>
              <div className="text-lg font-black font-mono text-white tracking-widest text-amber-300">
                {formatCountdown(countdown)}
              </div>
              <p className="text-[10px] text-slate-400">
                Only 1 claim permitted every 24 hours to ensure fair rewards distribution.
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          {chestState === 'opened' ? (
            <button
              id="btn-collect-chest-reward"
              onClick={handleCollect}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-sm uppercase tracking-wide shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-slate-950" />
              <span>Collect Reward to Assets</span>
            </button>
          ) : isAvailable ? (
            <button
              id="btn-open-mystery-case"
              onClick={handleOpenChest}
              disabled={chestState !== 'idle'}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-amber-500 hover:opacity-95 text-slate-950 font-black text-sm uppercase tracking-wide shadow-lg shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-slate-950" />
              <span>
                {chestState === 'shaking' || chestState === 'opening'
                  ? 'Unlocking Mystery Case...'
                  : 'Tap to Open Mystery Case'}
              </span>
            </button>
          ) : (
            <button
              disabled
              className="w-full py-3 rounded-2xl bg-slate-800/80 text-slate-500 font-bold text-xs uppercase tracking-wide cursor-not-allowed border border-slate-700/40 flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Wait 24 Hours for Next Claim</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
