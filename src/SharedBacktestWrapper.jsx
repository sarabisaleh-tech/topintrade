import React, { useState, useEffect } from 'react';
import BacktestApp from './BacktestApp';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function SharedBacktestWrapper() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedBacktestData, setSharedBacktestData] = useState(null);

  // دریافت shareId از URL (از pathname یا hash)
  const pathname = window.location.pathname;
  const hash = window.location.hash;

  let shareId = null;
  if (pathname.startsWith('/share/backtest/')) {
    shareId = pathname.split('/share/backtest/')[1];
  } else if (hash.startsWith('#/share/backtest/')) {
    shareId = hash.split('#/share/backtest/')[1];
  }

  useEffect(() => {
    loadSharedBacktest();
  }, []);

  const loadSharedBacktest = async () => {
    try {
      if (!shareId) {
        setError('Share link is invalid');
        setLoading(false);
        return;
      }

      // Load from Firestore
      const docRef = doc(db, 'shared_backtests', shareId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError('This share link does not exist or has been removed');
        setLoading(false);
        return;
      }

      const parsedData = docSnap.data();

      // تبدیل دیتا به فرمت BacktestApp
      const backtestForApp = {
        id: 1,
        name: parsedData.name,
        balance: parsedData.balance,
        balanceType: parsedData.balanceType,
        folderId: 'root',
        filters: {
          selectedSessions: ['Tokyo', 'London', 'NewYork', 'Sydney'],
          selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
          selectedHours: Array.from({ length: 24 }, (_, i) => i),
          deactivatedTags: [],
          selectedDailyCounts: [],
          selectedMonth: 'all'
        },
        trades: parsedData.trades.map((t, index) => ({
          id: index + 1,
          date: new Date(t.entryTime).toISOString().split('T')[0],
          time: new Date(t.entryTime).toTimeString().split(' ')[0].substring(0, 5),
          position: t.symbol?.split('@')[0]?.trim() || 'long',
          risk: 1,
          rrRatio: parseFloat(t.symbol?.split('@')[1]?.replace('RR', '')?.trim() || '2'),
          stopLoss: 1,
          stopLossType: 'percent',
          result: t.profit >= 0 ? 'profit' : 'loss',
          pnl: t.profit,
          tag: t.tags?.join(', ') || '',
          screenshotUrl: ''
        }))
      };

      setSharedBacktestData(backtestForApp);
      setLoading(false);
    } catch (err) {
      console.error('Error loading shared backtest:', err);
      setError('Error loading data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center starry-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center starry-bg p-4">
        <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  // رندر BacktestApp با دیتای shared
  return (
    <BacktestApp
      isSharedView={true}
      sharedBacktestData={sharedBacktestData}
    />
  );
}
