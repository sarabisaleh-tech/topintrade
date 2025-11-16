import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, Calendar, Eye, Link as LinkIcon } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// Theme Colors
const themeColors = {
  primary: '#331a6bff',
  success: '#063022ff',
  danger: '#8e1616ff',
  background: '#000000',
  surface: '#151516ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
};

export default function SharedBacktestView({ shareId }) {
  const [backtest, setBacktest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadSharedBacktest() {
      try {
        const response = await fetch(`${API_URL}/api/share/${shareId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load shared backtest');
        }

        setBacktest(data.backtest);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    }

    if (shareId) {
      loadSharedBacktest();
    }
  }, [shareId]);

  // Calculate statistics from trades
  const stats = useMemo(() => {
    if (!backtest?.trades || backtest.trades.length === 0) {
      return null;
    }

    const trades = backtest.trades;
    const wins = trades.filter(t => t.result === 'Win').length;
    const losses = trades.filter(t => t.result === 'Loss').length;
    const total = trades.length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : 0;

    const totalProfit = trades.reduce((sum, t) => sum + (t.result === 'Win' ? (t.profit || 0) : 0), 0);
    const totalLoss = trades.reduce((sum, t) => sum + (t.result === 'Loss' ? Math.abs(t.profit || 0) : 0), 0);
    const netProfit = totalProfit - totalLoss;
    const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss).toFixed(2) : totalProfit > 0 ? '∞' : '0';

    const avgWin = wins > 0 ? (totalProfit / wins).toFixed(2) : 0;
    const avgLoss = losses > 0 ? (totalLoss / losses).toFixed(2) : 0;

    // Calculate equity curve
    let equity = backtest.initialBalance || 1000;
    const equityCurve = [{ trade: 0, equity: equity }];

    trades.forEach((trade, index) => {
      const profit = trade.result === 'Win' ? (trade.profit || 0) : -(Math.abs(trade.profit || 0));
      equity += profit;
      equityCurve.push({ trade: index + 1, equity: parseFloat(equity.toFixed(2)) });
    });

    return {
      total,
      wins,
      losses,
      winRate,
      netProfit: netProfit.toFixed(2),
      profitFactor,
      avgWin,
      avgLoss,
      equityCurve
    };
  }, [backtest]);

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-6 mb-4">
            <p className="text-red-400 text-lg mb-2">خطا در بارگذاری</p>
            <p className="text-gray-400">{error}</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg transition"
          >
            بازگشت به صفحه اصلی
          </button>
        </div>
      </div>
    );
  }

  if (!backtest) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-600/20 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{backtest.name || 'بک‌تست اشتراکی'}</h1>
                <p className="text-gray-400 text-sm flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  مشاهده فقط‌خواندنی
                </p>
              </div>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition"
            >
              بازگشت
            </button>
          </div>

          {backtest.description && (
            <p className="text-gray-400 mt-2">{backtest.description}</p>
          )}
        </div>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Trades */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">تعداد معاملات</span>
                <BarChart3 className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold">{stats.total}</p>
              <p className="text-sm text-gray-500 mt-1">
                {stats.wins} برد / {stats.losses} باخت
              </p>
            </div>

            {/* Win Rate */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">نرخ برد</span>
                <Target className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-green-400">{stats.winRate}%</p>
              <p className="text-sm text-gray-500 mt-1">
                میانگین: {stats.avgWin}R برد / {stats.avgLoss}R باخت
              </p>
            </div>

            {/* Net Profit */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">سود خالص</span>
                {parseFloat(stats.netProfit) >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
              <p className={`text-3xl font-bold ${parseFloat(stats.netProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.netProfit}R
              </p>
            </div>

            {/* Profit Factor */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">فاکتور سود</span>
                <TrendingUp className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-purple-400">{stats.profitFactor}</p>
            </div>
          </div>
        </div>
      )}

      {/* Equity Curve */}
      {stats?.equityCurve && stats.equityCurve.length > 1 && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">منحنی سرمایه</h2>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={stats.equityCurve}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.8}/>
                    <stop offset="30%" stopColor="#9333ea" stopOpacity={0.5}/>
                    <stop offset="70%" stopColor="#7e22ce" stopOpacity={0.2}/>
                    <stop offset="100%" stopColor="#000000" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="trade" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#E5E7EB' }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="#a855f7"
                  strokeWidth={3}
                  fill="url(#equityGradient)"
                  name="Equity"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Trades List */}
      {backtest.trades && backtest.trades.length > 0 && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-bold mb-4">لیست معاملات ({backtest.trades.length})</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-right p-3 text-gray-400">#</th>
                    <th className="text-right p-3 text-gray-400">تاریخ</th>
                    <th className="text-right p-3 text-gray-400">جفت ارز</th>
                    <th className="text-right p-3 text-gray-400">نوع</th>
                    <th className="text-right p-3 text-gray-400">نتیجه</th>
                    <th className="text-right p-3 text-gray-400">سود/زیان</th>
                    <th className="text-right p-3 text-gray-400">یادداشت</th>
                  </tr>
                </thead>
                <tbody>
                  {backtest.trades.map((trade, index) => (
                    <tr key={index} className="border-b border-gray-800 hover:bg-gray-700/30 transition">
                      <td className="p-3">{index + 1}</td>
                      <td className="p-3">{trade.date}</td>
                      <td className="p-3">{trade.pair}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-sm ${trade.type === 'Buy' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {trade.type === 'Buy' ? 'خرید' : 'فروش'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-sm ${trade.result === 'Win' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                          {trade.result === 'Win' ? 'برد' : 'باخت'}
                        </span>
                      </td>
                      <td className={`p-3 font-bold ${trade.result === 'Win' ? 'text-green-400' : 'text-red-400'}`}>
                        {trade.result === 'Win' ? '+' : '-'}{Math.abs(trade.profit || 0)}R
                      </td>
                      <td className="p-3 text-gray-400 max-w-xs truncate">{trade.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
