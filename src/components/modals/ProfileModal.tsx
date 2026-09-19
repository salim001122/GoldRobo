import React, { useState } from 'react';
import { X, User, Copy, Check, Shield, Volume2, VolumeX, Key, LogOut, Headphones } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProfileModal: React.FC = () => {
  const { closeModal, userState, toggleSound, openModal, logoutUser, t } = useApp();
  const [copiedUid, setCopiedUid] = useState<boolean>(false);
  const [copiedRef, setCopiedRef] = useState<boolean>(false);

  const emailPrefix = userState.email ? userState.email.split('@')[0] : '';
  const effUsername = (userState.username && !userState.username.toUpperCase().startsWith('GOLD')) ? userState.username : '';
  const myReferralUsername = effUsername || emailPrefix || (userState.referralCode && !userState.referralCode.toUpperCase().startsWith('GOLD') ? userState.referralCode : 'trader');

  const handleCopyUid = () => {
    navigator.clipboard.writeText(userState.uid);
    setCopiedUid(true);
    setTimeout(() => setCopiedUid(false), 2000);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(myReferralUsername);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-sm rounded-3xl bg-[#0f172a] border border-blue-500/30 p-5 shadow-2xl shadow-blue-500/20 space-y-4 max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white">{t('security_settings', 'Account & Security')}</h3>
          </div>
          <button
            onClick={closeModal}
            className="w-8 h-8 rounded-full bg-slate-800/80 text-slate-400 hover:text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#151f38] to-[#0d1424] border border-blue-500/30 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-lg shadow-lg shadow-amber-500/20 uppercase">
            {userState.username ? userState.username.slice(0, 2) : 'GR'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white truncate">
                {userState.username || 'RoboTrader'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold font-mono border border-amber-500/30">
                VIP {userState.vipLevel}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 truncate mt-0.5">
              {userState.email}
            </div>
            <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
              <span>UID: {userState.uid}</span>
              <button
                onClick={handleCopyUid}
                className="text-blue-400 hover:text-cyan-300 p-0.5"
                title="Copy UID"
              >
                {copiedUid ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <div className="text-[11px] text-amber-400 font-mono mt-0.5 flex items-center gap-1 font-semibold">
              <span>Referral: @{myReferralUsername}</span>
              <button
                onClick={handleCopyRef}
                className="text-amber-400 hover:text-amber-200 p-0.5"
                title="Copy Referral Username"
              >
                {copiedRef ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        </div>

        {/* Preferences & Settings */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-300 block">{t('security_settings', 'Security & Sound')}</span>

          {/* Sound toggle */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {userState.soundEnabled ? (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-500" />
              )}
              <div>
                <div className="text-xs font-semibold text-white">Audio Synthesizer FX</div>
                <div className="text-[10px] text-slate-400">Tactile futuristic clicks & win chimes</div>
              </div>
            </div>
            <button
              onClick={toggleSound}
              className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                userState.soundEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                userState.soundEnabled ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* 2FA toggle - Coming Soon per user request */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Shield className="w-4 h-4 text-slate-400" />
              <div>
                <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>2FA Security Lock</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
                    Active PIN Protection
                  </span>
                </div>
                <div className="text-[10px] text-slate-400">6-digit Security PIN for withdrawals</div>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">Enabled</span>
          </div>

          {/* Customer Support */}
          <button
            id="btn-support-profile"
            onClick={() => {
              closeModal();
              openModal('support');
            }}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/15 border border-amber-500/40 hover:border-amber-400/80 flex items-center justify-between transition-all text-left group cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                  {t('help_support', '24/7 VIP Customer Support')}
                </div>
                <div className="text-[10px] text-slate-400">Instant AI answers & Live Agent desk</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-emerald-400">Online</span>
            </div>
          </button>

          {/* Language Switch */}
          <button
            onClick={() => openModal('language')}
            className="w-full p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between hover:border-slate-700 transition-all text-left"
          >
            <div className="text-xs font-semibold text-white">{t('switch_language', 'Display Language')}</div>
            <span className="text-xs text-blue-400 font-medium uppercase">
              {userState.selectedLanguage}
            </span>
          </button>
        </div>

        {/* Account Controls */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={() => {
              closeModal();
              logoutUser();
            }}
            className="w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 hover:text-rose-200 font-semibold text-xs border border-rose-500/30 flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            {t('sign_out', 'Sign Out of Account')}
          </button>
        </div>

      </div>
    </div>
  );
};
