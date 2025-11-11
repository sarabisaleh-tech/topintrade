import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Login from './Login';
import LandingPage from './LandingPage';
import BacktestApp from './BacktestApp';
import JournalMT5App from './JournalMT5App';
import CryptoJournalAppWrapper from './CryptoJournalAppWrapper';
import JournalTypeSelection from './JournalTypeSelection';
import SharedBacktestWrapper from './SharedBacktestWrapper';
import LiveJournalApp from '../tit-journal/LiveJournalApp';
import AdminPanel from './AdminPanel';

export default function App() {
  const { currentUser } = useAuth();
  const [currentMode, setCurrentMode] = useState('landing'); // 'landing', 'backtest', 'journal', 'journal-select', 'journal-crypto', 'live-journal', 'admin'

  // چک کردن URL برای shared content (قبل از هر چیز دیگه)
  // استفاده از hash برای routing در dev mode
  const hash = window.location.hash;
  const pathname = window.location.pathname;

  const isShareBacktestHash = hash.startsWith('#/share/backtest/');
  const isShareBacktestPath = pathname.startsWith('/share/backtest/');
  const isShareBacktestRoute = isShareBacktestHash || isShareBacktestPath;

  // چک کردن Admin Route
  const isAdminHash = hash === '#/admin' || hash.startsWith('#/admin/');
  const isAdminPath = pathname === '/admin' || pathname.startsWith('/admin/');
  const isAdminRoute = isAdminHash || isAdminPath;

  // اگر URL admin است، set mode to admin
  useEffect(() => {
    if (isAdminRoute && currentUser) {
      setCurrentMode('admin');
    }
  }, [isAdminRoute, currentUser]);

  // ✅ چک کردن shared backtest از pathname یا hash (بدون لاگین)
  if (isShareBacktestRoute) {
    return <SharedBacktestWrapper />;
  }

  // اگر کاربر لاگین نکرده، نمایش صفحه ورود
  if (!currentUser) {
    return <Login />;
  }

  // هندلر انتخاب mode
  const handleSelectMode = (mode) => {
    setCurrentMode(mode);
  };

  // بعد از لاگین، نمایش صفحه مورد نظر
  return (
    <div className="relative">
      {/* نمایش صفحه بر اساس انتخاب کاربر */}
      {currentMode === 'landing' && (
        <LandingPage onSelectMode={handleSelectMode} />
      )}

      {currentMode === 'backtest' && (
        <BacktestApp onBack={() => setCurrentMode('landing')} />
      )}

      {currentMode === 'journal-select' && (
        <JournalTypeSelection
          onSelectType={handleSelectMode}
          onBack={() => setCurrentMode('landing')}
        />
      )}

      {currentMode === 'journal' && (
        <JournalMT5App onBack={() => setCurrentMode('journal-select')} />
      )}

      {currentMode === 'journal-crypto' && (
        <CryptoJournalAppWrapper onBack={() => setCurrentMode('journal-select')} />
      )}

      {currentMode === 'live-journal' && (
        <LiveJournalApp onBack={() => setCurrentMode('landing')} />
      )}

      {currentMode === 'admin' && (
        <AdminPanel />
      )}
    </div>
  );
}
