import React from 'react';
import { Home, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const BottomNav: React.FC = () => {
  const { activeTab, setActiveTab, t } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#070b16]/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto px-6 h-18 flex items-center justify-between relative">
        
        {/* Home Tab */}
        <button
          id="nav-tab-home"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center w-16 py-1 transition-colors ${
            activeTab === 'home' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Home Tab"
        >
          <div className="relative">
            <Home className="w-5 h-5 mb-1 stroke-[2.2]" />
            {activeTab === 'home' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_6px_#60a5fa]" />
            )}
          </div>
          <span className="text-[11px] font-medium tracking-wide">{t('nav_home', 'Home')}</span>
        </button>

        {/* Center Floating Robot Action Tab */}
        <div className="relative -top-3 flex flex-col items-center">
          <button
            id="nav-tab-robot"
            onClick={() => setActiveTab('robot')}
            className="group relative flex items-center justify-center active:scale-95 transition-all duration-200 focus:outline-none"
            aria-label="GOLDROBO Engine"
          >
            {/* Outer glowing diamond background */}
            <div className={`w-14 h-14 rounded-2xl rotate-45 flex items-center justify-center transition-all duration-300 ${
              activeTab === 'robot' 
                ? 'bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 shadow-[0_0_20px_rgba(245,158,11,0.6)] ring-2 ring-yellow-300/60'
                : 'bg-gradient-to-br from-amber-500/80 to-yellow-600/80 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_0_15px_rgba(245,158,11,0.5)]'
            }`}>
              {/* Inner container */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center -rotate-45 bg-[#090f20]">
                {/* Robot Golden Mascot Face SVG */}
                <svg
                  viewBox="0 0 36 36"
                  className="w-8 h-8 text-amber-400 drop-shadow-sm transition-transform group-hover:scale-110"
                  fill="currentColor"
                >
                  <line x1="18" y1="8" x2="18" y2="4" stroke="#fef08a" strokeWidth="2" strokeLinecap="round" />
                  <circle cx="18" cy="3" r="1.8" fill="#fef08a" />
                  <rect x="2" y="14" width="3" height="8" rx="1.5" fill="#f59e0b" />
                  <rect x="31" y="14" width="3" height="8" rx="1.5" fill="#f59e0b" />
                  <rect x="5" y="8" width="26" height="20" rx="6" fill="#d97706" />
                  <rect x="8" y="11" width="20" height="13" rx="4" fill="#0f172a" />
                  <circle cx="13" cy="17" r="2.2" fill="#38bdf8" className="animate-pulse" />
                  <circle cx="23" cy="17" r="2.2" fill="#38bdf8" className="animate-pulse" />
                  <path d="M15 20 Q18 22 21 20" stroke="#facc15" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
              </div>
            </div>
          </button>
          <span className={`text-[11px] font-medium tracking-wide mt-1.5 transition-colors ${
            activeTab === 'robot' ? 'text-amber-400 font-bold' : 'text-slate-400'
          }`}>
            {t('nav_quantify', 'GOLDROBO')}
          </span>
        </div>

        {/* Assets Tab */}
        <button
          id="nav-tab-assets"
          onClick={() => setActiveTab('assets')}
          className={`flex flex-col items-center justify-center w-16 py-1 transition-colors ${
            activeTab === 'assets' ? 'text-blue-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
          aria-label="Assets Tab"
        >
          <div className="relative">
            <Wallet className="w-5 h-5 mb-1 stroke-[2.2]" />
            {activeTab === 'assets' && (
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full shadow-[0_0_6px_#60a5fa]" />
            )}
          </div>
          <span className="text-[11px] font-medium tracking-wide">{t('nav_assets', 'Assets')}</span>
        </button>

      </div>
    </nav>
  );
};
