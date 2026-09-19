import React from 'react';
import { User, Globe, RotateCw, ChevronLeft, Info, Bell, Headphones } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SUPPORTED_LANGUAGES } from '../utils/translations';

interface HeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  showCoinInfo?: boolean;
  onCoinInfo?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  showBack,
  onBack,
  title,
  showCoinInfo,
  onCoinInfo
}) => {
  const { activeTab, setActiveTab, openModal, userState, t } = useApp();
  const currentLangObj = SUPPORTED_LANGUAGES.find(l => l.code === userState.selectedLanguage);

  if (showBack) {
    return (
      <header className="sticky top-0 z-30 w-full max-w-md mx-auto px-4 py-3 flex items-center justify-between bg-[#080d1a]/90 backdrop-blur-md border-b border-slate-800/40">
        <button
          id="btn-back-header"
          onClick={onBack || (() => setActiveTab('home'))}
          className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shadow-sm"
          aria-label="Go Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <h1 className="text-lg font-bold text-white tracking-wide truncate max-w-[200px] text-center">
          {title || 'GOLDROBO'}
        </h1>

        {showCoinInfo ? (
          <button
            id="btn-coin-info"
            onClick={onCoinInfo || (() => openModal('coinInfo'))}
            className="w-10 h-10 rounded-full bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-300 hover:text-white active:scale-95 transition-all shadow-sm"
            aria-label="Coin Information"
          >
            <Info className="w-5 h-5" />
          </button>
        ) : (
          <div className="w-10" />
        )}
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 w-full max-w-md mx-auto px-4 py-3.5 flex items-center justify-between bg-[#080d1a]/90 backdrop-blur-md border-b border-slate-800/40">
      {/* Brand Logo */}
      <div 
        className="flex items-center gap-2.5 cursor-pointer select-none"
        onClick={() => setActiveTab('home')}
      >
        <div className="relative w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 via-yellow-400 to-amber-600 p-0.5 shadow-lg shadow-amber-500/20 flex items-center justify-center">
          {/* Cybernetic Golden Robot Mascot */}
          <div className="w-full h-full rounded-[10px] bg-[#090f20] flex items-center justify-center overflow-hidden p-1">
            <svg viewBox="0 0 36 36" className="w-6 h-6 text-amber-400" fill="currentColor">
              <rect x="2" y="14" width="4" height="8" rx="2" fill="#f59e0b" />
              <rect x="30" y="14" width="4" height="8" rx="2" fill="#f59e0b" />
              <rect x="5" y="8" width="26" height="20" rx="6" fill="#d97706" />
              <rect x="8" y="11" width="20" height="13" rx="4" fill="#0f172a" />
              <circle cx="13" cy="17" r="2.2" fill="#38bdf8" className="animate-pulse" />
              <circle cx="23" cy="17" r="2.2" fill="#38bdf8" className="animate-pulse" />
              <path d="M15 20 Q18 22 21 20" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" fill="none" />
            </svg>
          </div>
        </div>
        <div className="flex items-center tracking-wider">
          <span className="text-xl font-black bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 bg-clip-text text-transparent">
            GOLD
          </span>
          <span className="text-xl font-extrabold text-white">
            ROBO
          </span>
          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            AI
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        <button
          id="btn-support-header"
          onClick={() => openModal('support')}
          className="relative w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-amber-400 hover:text-white hover:border-amber-500/50 active:scale-95 transition-all shadow-sm"
          title={t('help_support', '24/7 VIP Customer Support')}
          aria-label="Customer Support"
        >
          <Headphones className="w-4 h-4" />
          <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse border border-[#080d1a]" />
        </button>

        <button
          id="btn-profile-header"
          onClick={() => openModal('profile')}
          className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 active:scale-95 transition-all shadow-sm"
          title={t('account_security', 'Account & Security')}
          aria-label="Account profile"
        >
          <User className="w-4 h-4" />
        </button>

        {activeTab === 'assets' && (
          <button
            id="btn-history-header"
            onClick={() => openModal('history')}
            className="w-9 h-9 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:border-slate-500 active:scale-95 transition-all shadow-sm"
            title={t('records', 'Transaction History')}
            aria-label="Transaction History"
          >
            <RotateCw className="w-4 h-4" />
          </button>
        )}

        <button
          id="btn-language-header"
          onClick={() => openModal('language')}
          className="h-9 px-2.5 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center gap-1.5 text-slate-200 hover:text-white hover:border-amber-500/50 active:scale-95 transition-all shadow-sm"
          title={t('switch_language', 'Switch Language')}
          aria-label="Language selection"
        >
          <span className="text-base leading-none">{currentLangObj?.flag || '🌐'}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 font-mono">
            {userState.selectedLanguage}
          </span>
        </button>
      </div>
    </header>
  );
};
