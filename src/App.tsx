/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Headphones } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/Header';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { RobotScreen } from './components/RobotScreen';
import { AssetsScreen } from './components/AssetsScreen';
import { ModalManager } from './components/modals/ModalManager';
import { AuthScreen } from './components/AuthScreen';
import { AdminPanel } from './components/AdminPanel';

const AppContent: React.FC = () => {
  const { activeTab, isAuthenticated, loginUser, openModal } = useApp();

  // Check if current route is /panel or #panel
  const checkIsAdminRoute = () => {
    if (typeof window === 'undefined') return false;
    const path = window.location.pathname.toLowerCase();
    const hash = window.location.hash.toLowerCase();
    return (
      path === '/panel' ||
      path.startsWith('/panel/') ||
      hash === '#panel' ||
      hash === '#/panel' ||
      hash.startsWith('#panel') ||
      hash.startsWith('#/panel')
    );
  };

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(checkIsAdminRoute);

  useEffect(() => {
    const checkRoute = () => {
      setIsAdminRoute(checkIsAdminRoute());
    };

    const handleOpenAdminEvent = () => {
      try {
        window.location.hash = 'panel';
      } catch {}
      setIsAdminRoute(true);
    };

    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('goldrobo_open_admin', handleOpenAdminEvent);
    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('goldrobo_open_admin', handleOpenAdminEvent);
    };
  }, []);

  const handleExitAdmin = () => {
    try {
      window.location.hash = '';
      window.history.pushState({}, '', '/');
    } catch {}
    setIsAdminRoute(false);
  };

  // Admin Portal Route (/panel)
  if (isAdminRoute) {
    return <AdminPanel onExit={handleExitAdmin} />;
  }

  // Mandatory Authentication Gate: User cannot access any part of the app without login/sign-up
  if (!isAuthenticated) {
    return <AuthScreen onAuthenticated={loginUser} />;
  }

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col justify-between selection:bg-cyan-500 selection:text-white">
      {/* Dynamic Header: Home and Assets use standard RoboGrid branding; Robot screen uses its dedicated creator trade header */}
      {activeTab !== 'robot' && <Header />}

      {/* Main Content View with transition */}
      <main className="flex-1 w-full flex flex-col">
        {activeTab === 'home' && <HomeScreen />}
        {activeTab === 'robot' && <RobotScreen />}
        {activeTab === 'assets' && <AssetsScreen />}
      </main>

      {/* Floating 24/7 Customer Support Trigger */}
      <button
        id="btn-floating-support"
        onClick={() => openModal('support')}
        className="fixed bottom-22 right-4 z-30 flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold shadow-xl shadow-amber-500/30 border border-amber-300/60 active:scale-95 transition-all group cursor-pointer"
        title="24/7 VIP Customer Support"
        aria-label="Customer Support"
      >
        <div className="relative flex items-center justify-center">
          <Headphones className="w-4 h-4 text-slate-950" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 border border-slate-950 animate-pulse" />
        </div>
        <span className="text-[11px] font-extrabold tracking-tight">Support</span>
      </button>

      {/* Persistent Bottom Floating Navigation */}
      <BottomNav />

      {/* Full Modals System */}
      <ModalManager />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
