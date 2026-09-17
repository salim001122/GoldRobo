/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
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
  const { activeTab, isAuthenticated, loginUser } = useApp();

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
