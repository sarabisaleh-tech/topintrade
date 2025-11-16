import React, { useState, useEffect } from 'react';
import BacktestApp from './BacktestApp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function SharedBacktestWrapper() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sharedBacktestData, setSharedBacktestData] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);

  // دریافت shareId از URL و بارگذاری دیتا
  useEffect(() => {
    async function loadSharedData() {
      const pathname = window.location.pathname;
      const hash = window.location.hash;

      let shareId = null;
      if (pathname.startsWith('/share/backtest/')) {
        shareId = pathname.split('/share/backtest/')[1];
      } else if (pathname.startsWith('/share/')) {
        shareId = pathname.split('/share/')[1];
      } else if (hash.startsWith('#/share/backtest/')) {
        shareId = hash.split('#/share/backtest/')[1];
      } else if (hash.startsWith('#/share/')) {
        shareId = hash.split('#/share/')[1];
      }

      if (!shareId) {
        setError('لینک اشتراک‌گذاری نامعتبر است');
        setLoading(false);
        return;
      }

      try {
        // بارگذاری دیتا از Backend
        const response = await fetch(`${API_URL}/api/share/${shareId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load shared backtest');
        }

        // تبدیل دیتا به فرمت BacktestApp
        const backtest = data.backtest;
        const formattedBacktest = {
          id: 1,
          name: backtest.name || 'بک‌تست اشتراکی',
          balance: backtest.balance || 1000,
          balanceType: backtest.balanceType || 'USD',
          folderId: 'root',
          filters: {
            selectedSessions: ['Tokyo', 'London', 'NewYork', 'Sydney'],
            selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
            selectedHours: Array.from({ length: 24 }, (_, i) => i),
            deactivatedTags: [],
            selectedDailyCounts: [],
            selectedMonth: 'all'
          },
          trades: backtest.trades.map((t, index) => {
            // Parse entryTime to get date and time
            const entryDate = new Date(t.entryTime);
            const dateStr = entryDate.toISOString().split('T')[0];
            const timeStr = entryDate.toTimeString().split(' ')[0].substring(0, 5);

            return {
              id: index + 1,
              date: dateStr,
              time: timeStr,
              position: t.symbol || 'EURUSD',
              risk: t.risk || 1,
              rrRatio: t.rrRatio || 2,
              stopLoss: t.stopLoss || 1,
              stopLossType: t.stopLossType || 'percent',
              result: t.profit >= 0 ? 'profit' : 'loss',
              pnl: t.profit || 0,
              tag: (t.tags && t.tags.join(', ')) || '',
              screenshotUrl: t.screenshotUrl || ''
            };
          })
        };

        setSharedBacktestData(formattedBacktest);
        setLoading(false);
        // نمایش پیام خوش‌آمدگویی بعد از بارگذاری
        setTimeout(() => setShowWelcomeModal(true), 500);
      } catch (err) {
        console.error('Error loading shared backtest:', err);
        setError('خطا در بارگذاری بک‌تست اشتراکی');
        setLoading(false);
      }
    }

    loadSharedData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">بارگذاری...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/20 border border-red-700 rounded-lg p-8 text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">خطا</h2>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!sharedBacktestData) {
    return null;
  }

  // رندر BacktestApp با دیتای اشتراکی (read-only mode)
  return (
    <>
      {/* Welcome Modal */}
      {showWelcomeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-gradient-to-br from-purple-900/90 to-gray-900/90 rounded-2xl border-2 border-purple-500/50 p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-4 bg-purple-500/20 rounded-full flex items-center justify-center">
                <span className="text-5xl">🎉</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">خوش آمدید!</h2>
              <p className="text-purple-300 text-sm">به پلتفرم تحلیل معاملات Top In Trade</p>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-6 mb-6 border border-purple-500/30">
              <p className="text-white text-center leading-relaxed mb-4">
                خوشحالم که اینجایی! برای این سایت زحمت زیادی کشیده شده و الان رایگان در اختیارته.
                پس بیا این دوستی دوطرفه کنیم، توام با دنبال کردن صفحات مارو ما رو حمایت کن 💜
              </p>

              <div className="flex flex-col gap-3">
                <a
                  href="https://www.youtube.com/@TopInTrade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 rounded-lg transition text-sm text-red-400 hover:text-red-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  دنبال کنید در YouTube
                </a>

                <a
                  href="https://www.instagram.com/titopintrade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-pink-600/20 hover:bg-pink-600/30 border border-pink-500/50 rounded-lg transition text-sm text-pink-400 hover:text-pink-300"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                  دنبال کنید در Instagram
                </a>
              </div>
            </div>

            <button
              onClick={() => setShowWelcomeModal(false)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition"
            >
              بزن بریم! 🚀
            </button>
          </div>
        </div>
      )}

      <BacktestApp
        isSharedView={true}
        sharedBacktestData={sharedBacktestData}
      />
    </>
  );
}
