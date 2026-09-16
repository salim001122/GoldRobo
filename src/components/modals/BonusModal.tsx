import React, { useState, useEffect, useCallback } from 'react';
import { X, Gift, CheckCircle2, Sparkles, Calendar, Users, ArrowUpRight, Clock, Lock, Unlock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CoinLogo } from '../CoinLogo';
import { MysteryChestModal } from './MysteryChestModal';

export const BonusModal: React.FC = () => {
  const { 
    closeModal, 
    openModal,
    claimedBonuses, 
    claimDailyBonus, 
    userState,
    claimFirstDepositBonus,
    claim5ReferralsBonus
  } = useApp();

  const [claimToast, setClaimToast] = useState<string>('');

  // Active chest state for popup animation
  const [chestModalConfig, setChestModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    subtitle: string;
    dayStreak: number;
    rewardAmount: number;
    isAvailable: boolean;
    timeRemainingMs: number;
    caseType: 'daily' | 'deposit_mission' | 'referral_mission';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    subtitle: '',
    dayStreak: 1,
    rewardAmount: 0.01,
    isAvailable: true,
    timeRemainingMs: 0,
    caseType: 'daily',
    onConfirm: () => {}
  });

  // Daily Check-in Rewards: Day 1: 0.01, Day 2: 0.02, Day 3: 0.03, ... Day 7: 0.07 USDT
  const dailyRewards = [
    { day: 1, reward: 0.01 },
    { day: 2, reward: 0.02 },
    { day: 3, reward: 0.03 },
    { day: 4, reward: 0.04 },
    { day: 5, reward: 0.05 },
    { day: 6, reward: 0.06 },
    { day: 7, reward: 0.07 }
  ];

  // 24-hour cooldown calculation based on stable lastCheckin timestamp
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  const lastCheckin = userState.lastCheckinTimestamp || 0;

  // Safe helper to compute remaining ms from immutable timestamp
  const calculateRemainingMs = useCallback(() => {
    if (!lastCheckin) return 0;
    const elapsed = Date.now() - lastCheckin;
    return Math.max(0, TWENTY_FOUR_HOURS - elapsed);
  }, [lastCheckin]);

  // Live timer countdown ticker for UI (initialized with stable calculation)
  const [tickerMs, setTickerMs] = useState<number>(calculateRemainingMs);

  // Stable timer that ticks once per second without re-creating dependencies
  useEffect(() => {
    const initialRem = calculateRemainingMs();
    setTickerMs(initialRem);
    if (initialRem <= 0) return;

    const timer = setInterval(() => {
      const rem = calculateRemainingMs();
      setTickerMs(rem);
      if (rem <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [calculateRemainingMs]);

  const isDailyAvailable = lastCheckin === 0 || tickerMs <= 0;
  const remainingCooldownMs = isDailyAvailable ? 0 : tickerMs;

  // Current day index based on streak
  const currentStreakDay = ((userState.checkinStreak || 0) % 7) + 1;
  const currentDayReward = dailyRewards.find(r => r.day === currentStreakDay)?.reward || 0.01;

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return 'READY';
    const totalSec = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const secs = String(totalSec % 60).padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  };

  // Trigger Daily Mystery Box: strictly 1 box once daily!
  const handleOpenDailyChest = (dayNum?: number) => {
    if (!isDailyAvailable) {
      setClaimToast(`Daily check-in is strictly limited to 1 box every 24 hours. Next case unlocks in ${formatCountdown(tickerMs)}.`);
      setTimeout(() => setClaimToast(''), 3500);
      return;
    }

    // Only current streak day can be opened
    const targetDay = currentStreakDay;
    if (dayNum && dayNum !== targetDay) {
      if (dayNum < targetDay) {
        setClaimToast(`Day ${dayNum} case was already claimed.`);
      } else {
        setClaimToast(`Day ${dayNum} is locked. You must claim Day ${targetDay} first.`);
      }
      setTimeout(() => setClaimToast(''), 3000);
      return;
    }

    const targetReward = currentDayReward;

    setChestModalConfig({
      isOpen: true,
      title: `Day ${targetDay} Crypto Mystery Case`,
      subtitle: 'Continuous 24-hour streak rewards box with instant USDT yield',
      dayStreak: targetDay,
      rewardAmount: targetReward,
      isAvailable: true,
      timeRemainingMs: 0,
      caseType: 'daily',
      onConfirm: () => {
        const res = claimDailyBonus(targetDay, targetReward);
        setClaimToast(res.message);
        setTimeout(() => setClaimToast(''), 3500);
      }
    });
  };

  // Trigger First Deposit Mystery Box
  const handleOpenDepositChest = () => {
    const bonusAmount = userState.firstDepositBonusAmount > 0 
      ? userState.firstDepositBonusAmount 
      : +(userState.totalBalance * 0.03).toFixed(2);

    setChestModalConfig({
      isOpen: true,
      title: 'First Deposit 3% Mystery Crate',
      subtitle: 'Verified on-chain deposit welcome bounty unlocked!',
      dayStreak: 1,
      rewardAmount: bonusAmount,
      isAvailable: true,
      timeRemainingMs: 0,
      caseType: 'deposit_mission',
      onConfirm: () => {
        const res = claimFirstDepositBonus();
        setClaimToast(res.message);
        setTimeout(() => setClaimToast(''), 3500);
      }
    });
  };

  // Trigger 5 Referrals Mystery Box
  const handleOpenReferralChest = () => {
    setChestModalConfig({
      isOpen: true,
      title: 'VIP 5-Affiliate Elite Grand Crate',
      subtitle: '5 active deposited referral members verified on tier-1 tree!',
      dayStreak: 5,
      rewardAmount: 5.00,
      isAvailable: true,
      timeRemainingMs: 0,
      caseType: 'referral_mission',
      onConfirm: () => {
        const res = claim5ReferralsBonus();
        setClaimToast(res.message);
        setTimeout(() => setClaimToast(''), 3500);
      }
    });
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
        <div 
          className="w-full max-w-sm rounded-3xl bg-[#0b1222] border border-amber-500/30 p-5 shadow-2xl shadow-amber-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center shadow-sm">
                <Gift className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-wide">Bonus & Rewards Center</h3>
                <span className="text-[11px] text-slate-400">Daily check-in & deposit mission crates</span>
              </div>
            </div>
            <button
              onClick={closeModal}
              id="btn-close-bonus-modal"
              className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {claimToast && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs text-center font-bold animate-fadeIn">
              {claimToast}
            </div>
          )}

          {/* Screenshot 2 Inspired: "Free Cases" / "Crypto Case" 3D Animated Hero Card */}
          <div className="relative rounded-3xl bg-gradient-to-br from-[#121e36] via-[#0d1627] to-[#1a1205] border border-amber-500/40 p-4 shadow-xl overflow-hidden text-center group">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-28 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  Daily Free Case
                </span>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-cyan-300 font-mono font-bold">
                Streak Day {currentStreakDay}/7
              </span>
            </div>

            {/* Visual Box Center */}
            <div 
              onClick={() => handleOpenDailyChest()}
              className="py-2 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform"
            >
              <div className="relative w-28 h-24 flex items-center justify-center">
                {/* Glowing Aura */}
                <div className="absolute inset-0 bg-gradient-to-t from-amber-500/20 via-cyan-500/20 to-transparent rounded-full blur-md" />
                
                {/* 3D Cyber Box Illustration */}
                <svg viewBox="0 0 120 100" className="w-24 h-20 drop-shadow-xl animate-pulse">
                  <defs>
                    <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e293b" />
                      <stop offset="50%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#020617" />
                    </linearGradient>
                    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f59e0b" />
                      <stop offset="100%" stopColor="#fbbf24" />
                    </linearGradient>
                  </defs>
                  {/* Base */}
                  <rect x="20" y="40" width="80" height="50" rx="10" fill="url(#boxGrad)" stroke="#334155" strokeWidth="2" />
                  <rect x="28" y="48" width="64" height="34" rx="6" fill="#090e1a" stroke="#06b6d4" strokeWidth="1" strokeOpacity="0.8" />
                  {/* Lid */}
                  <path d="M 20 40 Q 60 15 100 40 L 100 46 Q 60 22 20 46 Z" fill="url(#gold)" />
                  {/* Lock */}
                  <circle cx="60" cy="50" r="10" fill="#0f172a" stroke="url(#gold)" strokeWidth="2" />
                  <circle cx="60" cy="50" r="4" fill={isDailyAvailable ? '#10b981' : '#f59e0b'} />
                </svg>

                {/* Available / Locked badge */}
                <div className="absolute -bottom-1">
                  {isDailyAvailable ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-md animate-bounce">
                      <Unlock className="w-3 h-3 text-slate-950" /> READY
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-900 border border-amber-500/40 text-amber-300">
                      <Clock className="w-2.5 h-2.5 text-amber-400" /> {formatCountdown(tickerMs)}
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-2 text-xs font-bold text-white">
                Day {currentStreakDay} Prize: <span className="text-emerald-400 font-mono font-black">+${currentDayReward.toFixed(2)} USDT</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {isDailyAvailable 
                  ? 'Tap to animate and unlock your daily crypto case!' 
                  : 'Daily check-in resets 24 hours after your last claim.'}
              </p>
            </div>

            {/* Action Button */}
            <div className="mt-3">
              {isDailyAvailable ? (
                <button
                  id="btn-open-daily-crypto-case"
                  onClick={() => handleOpenDailyChest()}
                  className="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:opacity-95 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Open Free Crypto Case</span>
                </button>
              ) : (
                <button
                  disabled
                  className="w-full py-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed opacity-90 font-mono"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Case Cooldown Active ({formatCountdown(tickerMs)})</span>
                </button>
              )}
            </div>
          </div>

          {/* 7-Day Continuous Streak Calendar */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                <span>7-Day Continuous Streak Matrix</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-semibold">1 Box / 24h</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {dailyRewards.slice(0, 4).map((d) => {
                const isClaimed = d.day < currentStreakDay || claimedBonuses.includes(d.day);
                const isCurrent = d.day === currentStreakDay;
                const isLocked = d.day > currentStreakDay;

                return (
                  <button
                    key={d.day}
                    onClick={() => handleOpenDailyChest(d.day)}
                    disabled={isClaimed || (isCurrent && !isDailyAvailable) || isLocked}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isClaimed
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                        : isCurrent && isDailyAvailable
                        ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 text-white shadow-md shadow-amber-500/20 active:scale-95 animate-pulse'
                        : isCurrent && !isDailyAvailable
                        ? 'bg-slate-900 border-amber-500/30 text-slate-400 opacity-80 cursor-not-allowed'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[10px] font-medium text-slate-400">Day {d.day}</span>
                    <span className="text-xs font-bold font-mono text-emerald-400 my-0.5">
                      +${d.reward.toFixed(2)}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isClaimed 
                        ? 'bg-slate-800 text-slate-500' 
                        : isCurrent && isDailyAvailable 
                        ? 'bg-amber-400 text-slate-950' 
                        : isCurrent && !isDailyAvailable
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-600'
                    }`}>
                      {isClaimed ? 'Claimed' : isCurrent && isDailyAvailable ? 'Open' : isCurrent ? '24h Lock' : 'Locked'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {dailyRewards.slice(4, 7).map((d) => {
                const isClaimed = d.day < currentStreakDay || claimedBonuses.includes(d.day);
                const isSpecial = d.day === 7;
                const isCurrent = d.day === currentStreakDay;
                const isLocked = d.day > currentStreakDay;

                return (
                  <button
                    key={d.day}
                    onClick={() => handleOpenDailyChest(d.day)}
                    disabled={isClaimed || (isCurrent && !isDailyAvailable) || isLocked}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center transition-all ${
                      isClaimed
                        ? 'bg-slate-900/60 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                        : isCurrent && isDailyAvailable
                        ? 'bg-gradient-to-b from-amber-500/25 to-slate-900 border-amber-400 text-white shadow-md shadow-amber-500/20 active:scale-95 animate-pulse'
                        : isCurrent && !isDailyAvailable
                        ? 'bg-slate-900 border-amber-500/30 text-slate-400 opacity-80 cursor-not-allowed'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-[10px] font-medium text-slate-400">
                      Day {d.day} {isSpecial && '🔥'}
                    </span>
                    <span className="text-xs font-bold font-mono text-emerald-400 my-0.5">
                      +${d.reward.toFixed(2)}
                    </span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      isClaimed 
                        ? 'bg-slate-800 text-slate-500' 
                        : isCurrent && isDailyAvailable 
                        ? 'bg-amber-400 text-slate-950' 
                        : isCurrent && !isDailyAvailable
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-slate-800 text-slate-600'
                    }`}>
                      {isClaimed ? 'Claimed' : isCurrent && isDailyAvailable ? 'Open' : isCurrent ? '24h Lock' : 'Locked'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mission Tasks */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Growth Mission Tasks</span>
              <span className="text-[10px] text-slate-400">Smart Vault Settlement</span>
            </div>

            {/* Mission 1: First Deposit 3% Bonus */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <CoinLogo symbol="USDT" size={16} />
                    <h4 className="text-xs font-bold text-white">First Deposit 3% Cash Bounty</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Make your initial deposit to unlock an animated 3% cash mystery crate.
                  </p>
                  <div className="text-xs font-bold font-mono text-emerald-400">
                    Reward: +3.0% Bonus
                    {userState.firstDepositBonusAmount > 0 && ` ($${userState.firstDepositBonusAmount.toFixed(2)} USDT)`}
                  </div>
                </div>

                {userState.hasReceivedFirstDepositBonus ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Claimed
                  </span>
                ) : userState.canClaimFirstDepositBonus ? (
                  <button
                    id="btn-claim-first-deposit-bonus"
                    onClick={handleOpenDepositChest}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 animate-pulse"
                  >
                    Open Crate
                  </button>
                ) : (
                  <button
                    onClick={() => openModal('deposit')}
                    className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs flex items-center gap-1 active:scale-95"
                  >
                    Deposit <ArrowUpRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Mission 2: 5 Valid Referrals -> 5 USDT Bonus */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <Users className="w-3 h-3" />
                    </div>
                    <h4 className="text-xs font-bold text-white">5 Active Deposited Referrals</h4>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Earn a direct $5.00 USDT cash box when 5 referral members make a qualifying deposit.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-mono font-bold">
                    <span className="text-emerald-400">+$5.00 USDT Crate</span>
                    <span className="text-slate-500">|</span>
                    <span className="text-cyan-400">
                      Progress: {userState.validReferralsCount || 0}/5 Valid
                    </span>
                  </div>
                </div>

                {userState.hasReceived5RefBonus ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" /> Claimed
                  </span>
                ) : (userState.validReferralsCount || 0) >= 5 ? (
                  <button
                    id="btn-claim-5ref-bonus"
                    onClick={handleOpenReferralChest}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 animate-pulse"
                  >
                    Open $5 Box
                  </button>
                ) : (
                  <button
                    onClick={() => openModal('invite')}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-300 font-semibold text-xs active:scale-95"
                  >
                    Invite
                  </button>
                )}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, ((userState.validReferralsCount || 0) / 5) * 100)}%` }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Animated Mystery Chest / Case Modal */}
      <MysteryChestModal 
        isOpen={chestModalConfig.isOpen}
        onClose={() => setChestModalConfig(prev => ({ ...prev, isOpen: false }))}
        title={chestModalConfig.title}
        subtitle={chestModalConfig.subtitle}
        dayStreak={chestModalConfig.dayStreak}
        rewardAmount={chestModalConfig.rewardAmount}
        isAvailable={chestModalConfig.isAvailable}
        timeRemainingMs={chestModalConfig.timeRemainingMs}
        caseType={chestModalConfig.caseType}
        onClaimConfirmed={chestModalConfig.onConfirm}
      />
    </>
  );
};
