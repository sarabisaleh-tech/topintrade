import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import Login from './Login';
import LandingPage from './LandingPage';
import BacktestApp from './BacktestApp';
import JournalMT5App from './JournalMT5App';
import ManualJournalApp from './ManualJournalApp';
import CryptoJournalAppWrapper from './CryptoJournalAppWrapper';
import JournalTypeSelection from './JournalTypeSelection';
import SharedBacktestWrapper from './SharedBacktestWrapper';
import LiveJournalApp from '../tit-journal/LiveJournalApp';
import AdminPanel from './AdminPanel';
import ProfilePage from './ProfilePage';

export default function App() {
  const { currentUser, loading } = useAuth();
  const [currentMode, setCurrentMode] = useState('landing'); // 'landing', 'backtest', 'journal', 'journal-select', 'journal-crypto', 'live-journal', 'admin', 'profile'

  // چک کردن URL برای shared content (قبل از هر چیز دیگه)
  const hash = window.location.hash;
  const pathname = window.location.pathname;

  const isShareBacktestHash = hash.startsWith('#/share/backtest/') || hash.startsWith('#/share/');
  const isShareBacktestPath = pathname.startsWith('/share/backtest/') || pathname.startsWith('/share/');
  const isShareBacktestRoute = isShareBacktestHash || isShareBacktestPath;

  // ✅ چک کردن shared backtest از pathname یا hash (بدون لاگین)
  if (isShareBacktestRoute) {
    return <SharedBacktestWrapper />;
  }

  // هندلر انتخاب mode
  const handleSelectMode = (mode) => {
    setCurrentMode(mode);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white text-lg">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // اگه لاگین نکرده، Login رو نشون بده
  if (!currentUser) {
    return <Login />;
  }

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
        <ManualJournalApp onBack={() => setCurrentMode('journal-select')} />
      )}

      {currentMode === 'journal-crypto' && (
        <CryptoJournalAppWrapper onBack={() => setCurrentMode('journal-select')} />
      )}

      {currentMode === 'live-journal' && (
        <LiveJournalApp onBack={() => setCurrentMode('landing')} />
      )}

      {currentMode === 'admin' && (
        <AdminPanel onBack={() => setCurrentMode('landing')} />
      )}

      {currentMode === 'profile' && (
        <ProfilePage onBack={() => setCurrentMode('landing')} />
      )}
    </div>
  );
}
