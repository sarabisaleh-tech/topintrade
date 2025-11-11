import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, ScatterChart, Scatter } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, Calendar, DollarSign, Activity, Percent, Eye, EyeOff, Clock, Award, AlertCircle } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

// Theme Colors
const themeColors = {
  primary: '#331a6bff',
  primaryLight: '#350b96',
  success: '#063022ff',
  successLight: '#10B981',
  danger: '#8e1616ff',
  dangerLight: '#F87171',
  info: '#3B82F6',
  warning: '#F59E0B',
  background: '#000000',
  surface: '#151516ff',
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
  tokyo: '#0a3426ff',
  london: '#00388cff',
  newyork: '#630707ff',
  sydney: '#331a6bff',
};

export default function ShareBacktest() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [backtestData, setBacktestData] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showFilteredStats, setShowFilteredStats] = useState(false);

  // Filters state
  const [selectedSessions, setSelectedSessions] = useState(['Tokyo', 'London', 'NewYork', 'Sydney']);
  const [selectedWeekdays, setSelectedWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [selectedHours, setSelectedHours] = useState(Array.from({ length: 24 }, (_, i) => i));
  const [deactivatedTags, setDeactivatedTags] = useState([]);
  const [selectedDailyCounts, setSelectedDailyCounts] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState('all');

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
      setBacktestData(parsedData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading shared backtest:', err);
      setError('Error loading data: ' + err.message);
      setLoading(false);
    }
  };

  // محاسبه آمار با فیلترها
  const stats = useMemo(() => {
    if (!backtestData || !backtestData.trades) return null;

    let trades = [...backtestData.trades];

    // Apply filters if enabled
    if (showFilteredStats) {
      // Session filter
      if (selectedSessions.length < 4) {
        trades = trades.filter(t => selectedSessions.includes(t.session));
      }

      // Weekday filter
      if (selectedWeekdays.length < 7) {
        trades = trades.filter(t => {
          const weekday = new Date(t.entryTime).getDay();
          return selectedWeekdays.includes(weekday);
        });
      }

      // Hour filter
      if (selectedHours.length < 24) {
        trades = trades.filter(t => {
          const hour = new Date(t.entryTime).getHours();
          return selectedHours.includes(hour);
        });
      }

      // Tag filter (deactivated tags)
      if (deactivatedTags.length > 0) {
        trades = trades.filter(t => {
          if (!t.tags || t.tags.length === 0) return true;
          return !t.tags.some(tag => deactivatedTags.includes(tag));
        });
      }

      // Daily count filter
      if (selectedDailyCounts.length > 0) {
        const tradesByDate = {};
        trades.forEach(t => {
          const date = new Date(t.entryTime).toLocaleDateString('en-CA');
          tradesByDate[date] = (tradesByDate[date] || 0) + 1;
        });

        trades = trades.filter(t => {
          const date = new Date(t.entryTime).toLocaleDateString('en-CA');
          const count = tradesByDate[date];
          return selectedDailyCounts.includes(count);
        });
      }

      // Month filter
      if (selectedMonth !== 'all') {
        trades = trades.filter(t => {
          const tradeMonth = new Date(t.entryTime).toLocaleString('en-CA', { month: 'long', year: 'numeric' });
          return tradeMonth === selectedMonth;
        });
      }
    }

    const winTrades = trades.filter(t => t.profit > 0);
    const lossTrades = trades.filter(t => t.profit < 0);
    const totalProfit = trades.reduce((sum, t) => sum + t.profit, 0);

    return {
      totalTrades: trades.length,
      winTrades: winTrades.length,
      lossTrades: lossTrades.length,
      winRate: trades.length > 0 ? ((winTrades.length / trades.length) * 100).toFixed(1) : '0.0',
      totalProfit: totalProfit.toFixed(2),
      avgProfit: trades.length > 0 ? (totalProfit / trades.length).toFixed(2) : '0.00',
      avgWin: winTrades.length > 0 ? (winTrades.reduce((sum, t) => sum + t.profit, 0) / winTrades.length).toFixed(2) : '0.00',
      avgLoss: lossTrades.length > 0 ? (lossTrades.reduce((sum, t) => sum + t.profit, 0) / lossTrades.length).toFixed(2) : '0.00',
      bestTrade: trades.length > 0 ? Math.max(...trades.map(t => t.profit)).toFixed(2) : '0.00',
      worstTrade: trades.length > 0 ? Math.min(...trades.map(t => t.profit)).toFixed(2) : '0.00',
      profitFactor: lossTrades.length > 0
        ? (winTrades.reduce((sum, t) => sum + t.profit, 0) / Math.abs(lossTrades.reduce((sum, t) => sum + t.profit, 0))).toFixed(2)
        : '∞',
      trades,
      balance: backtestData.balance,
      balanceType: backtestData.balanceType
    };
  }, [backtestData, selectedSessions, selectedWeekdays, selectedHours, deactivatedTags, selectedDailyCounts, selectedMonth, showFilteredStats]);

  // محاسبه equity curve
  const equityCurve = useMemo(() => {
    if (!stats || !stats.trades) return [];

    let runningBalance = stats.balance;
    return stats.trades.map((trade, index) => {
      const profit = stats.balanceType === 'compounding'
        ? runningBalance * (trade.profit / 100)
        : trade.profit;

      runningBalance += profit;

      return {
        tradeNumber: index + 1,
        balance: parseFloat(runningBalance.toFixed(2)),
        profit: parseFloat(profit.toFixed(2)),
        date: new Date(trade.entryTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    });
  }, [stats]);

  // Monthly Performance
  const monthlyPerformance = useMemo(() => {
    if (!stats || !stats.trades) return [];

    const monthlyData = {};

    stats.trades.forEach(trade => {
      const monthKey = new Date(trade.entryTime).toLocaleString('en-CA', { month: 'long', year: 'numeric' });

      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          profit: 0,
          winRate: 0
        };
      }

      monthlyData[monthKey].totalTrades++;
      monthlyData[monthKey].profit += trade.profit;
      if (trade.profit > 0) monthlyData[monthKey].wins++;
      else if (trade.profit < 0) monthlyData[monthKey].losses++;
    });

    return Object.values(monthlyData).map(m => ({
      ...m,
      winRate: m.totalTrades > 0 ? ((m.wins / m.totalTrades) * 100).toFixed(1) : '0.0'
    }));
  }, [stats]);

  // Filter toggle functions
  const toggleSession = (session) => {
    setSelectedSessions(prev =>
      prev.includes(session)
        ? prev.filter(s => s !== session)
        : [...prev, session]
    );
  };

  const toggleWeekday = (weekday) => {
    setSelectedWeekdays(prev =>
      prev.includes(weekday)
        ? prev.filter(w => w !== weekday)
        : [...prev, weekday].sort((a, b) => a - b)
    );
  };

  const toggleHour = (hour) => {
    setSelectedHours(prev =>
      prev.includes(hour)
        ? prev.filter(h => h !== hour)
        : [...prev, hour].sort((a, b) => a - b)
    );
  };

  const toggleTag = (tag) => {
    setDeactivatedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const toggleDailyCount = (count) => {
    setSelectedDailyCounts(prev =>
      prev.includes(count)
        ? prev.filter(c => c !== count)
        : [...prev, count].sort((a, b) => a - b)
    );
  };

  // Get available tags, months, daily counts
  const availableTags = useMemo(() => {
    if (!backtestData) return [];
    return [...new Set(backtestData.trades.flatMap(t => t.tags || []))];
  }, [backtestData]);

  const availableMonths = useMemo(() => {
    if (!backtestData) return [];
    const months = backtestData.trades.map(t =>
      new Date(t.entryTime).toLocaleString('en-CA', { month: 'long', year: 'numeric' })
    );
    return ['all', ...new Set(months)];
  }, [backtestData]);

  const dailyTradeCountOptions = useMemo(() => {
    if (!backtestData) return [];

    const tradesByDate = {};
    backtestData.trades.forEach(t => {
      const date = new Date(t.entryTime).toLocaleDateString('en-CA');
      tradesByDate[date] = (tradesByDate[date] || 0) + 1;
    });

    const counts = Object.values(tradesByDate);
    return [...new Set(counts)].sort((a, b) => a - b);
  }, [backtestData]);

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

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="min-h-screen starry-bg text-white">
      {/* Header - Simple, without sidebar and profile */}
      <div className="border-b border-white/10 backdrop-blur-md bg-black/20 sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-purple-500" />
              TopInTrade
            </h1>
            <div className="text-sm text-gray-400">
              Shared Backtest - View Only
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'dashboard'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'stats'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Stats
            </button>
            <button
              onClick={() => setActiveTab('analysis')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'analysis'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setActiveTab('monthly')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'monthly'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              Monthly Report
            </button>
            <button
              onClick={() => setActiveTab('all-trades')}
              className={`px-4 py-2 rounded-lg transition ${
                activeTab === 'all-trades'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              All Trades
            </button>
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        {/* Filters Section */}
        <div className="mb-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold flex items-center gap-2">
              {showFilteredStats ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
              Advanced Filters
            </h3>
            <button
              onClick={() => setShowFilteredStats(!showFilteredStats)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                showFilteredStats
                  ? 'bg-purple-600 text-white'
                  : 'bg-white/10 text-gray-300 hover:bg-white/20'
              }`}
            >
              {showFilteredStats ? 'Filter Active' : 'Filter Inactive'}
            </button>
          </div>

          {showFilteredStats && (
            <div className="space-y-4">
              {/* Session Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Session</label>
                <div className="flex flex-wrap gap-2">
                  {['Tokyo', 'London', 'NewYork', 'Sydney'].map(session => (
                    <button
                      key={session}
                      onClick={() => toggleSession(session)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        selectedSessions.includes(session)
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {session}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekday Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Weekdays ({selectedWeekdays.length}/7)
                </label>
                <div className="flex flex-wrap gap-2">
                  {weekdayNames.map((day, index) => (
                    <button
                      key={index}
                      onClick={() => toggleWeekday(index)}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        selectedWeekdays.includes(index)
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hour Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Hours ({selectedHours.length}/24)
                </label>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 24 }, (_, i) => i).map(hour => (
                    <button
                      key={hour}
                      onClick={() => toggleHour(hour)}
                      className={`px-2 py-1 rounded text-xs font-medium transition ${
                        selectedHours.includes(hour)
                          ? 'bg-purple-600 text-white'
                          : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {hour}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags Filter */}
              {availableTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tags (Click to deactivate)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          deactivatedTags.includes(tag)
                            ? 'bg-red-600 text-white line-through opacity-50'
                            : 'bg-purple-600 text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Daily Trade Count Filter */}
              {dailyTradeCountOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Daily Trade Count
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {dailyTradeCountOptions.map(count => (
                      <button
                        key={count}
                        onClick={() => toggleDailyCount(count)}
                        className={`px-4 py-2 rounded-lg font-medium transition ${
                          selectedDailyCounts.includes(count)
                            ? 'bg-purple-600 text-white'
                            : 'bg-white/10 text-gray-400'
                        }`}
                      >
                        {count} trades
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Month Filter */}
              {availableMonths.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Month</label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full md:w-64 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
                  >
                    {availableMonths.map(month => (
                      <option key={month} value={month} className="bg-gray-900">
                        {month === 'all' ? 'All Months' : month}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && stats && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total Trades</span>
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-2xl font-bold">{stats.totalTrades}</div>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Win Rate</span>
                  <Target className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-2xl font-bold text-green-500">{stats.winRate}%</div>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Total P&L</span>
                  {parseFloat(stats.totalProfit) >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className={`text-2xl font-bold ${parseFloat(stats.totalProfit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${stats.totalProfit}
                </div>
              </div>

              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400 text-sm">Profit Factor</span>
                  <Activity className="w-5 h-5 text-blue-500" />
                </div>
                <div className="text-2xl font-bold">{stats.profitFactor}</div>
              </div>
            </div>

            {/* Equity Curve */}
            {equityCurve.length > 0 && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-6">
                <h3 className="text-xl font-bold mb-4">Equity Curve</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={equityCurve}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                    <XAxis dataKey="date" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#1F2937',
                        border: '1px solid #374151',
                        borderRadius: '8px'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="balance"
                      stroke={themeColors.primary}
                      fill={themeColors.primary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Win Trades</div>
              <div className="text-2xl font-bold text-green-500">{stats.winTrades}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Loss Trades</div>
              <div className="text-2xl font-bold text-red-500">{stats.lossTrades}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Average Profit</div>
              <div className={`text-2xl font-bold ${parseFloat(stats.avgProfit) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                ${stats.avgProfit}
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Average Win</div>
              <div className="text-2xl font-bold text-green-500">${stats.avgWin}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Average Loss</div>
              <div className="text-2xl font-bold text-red-500">${stats.avgLoss}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Best Trade</div>
              <div className="text-2xl font-bold text-green-500">${stats.bestTrade}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="text-gray-400 text-sm mb-1">Worst Trade</div>
              <div className="text-2xl font-bold text-red-500">${stats.worstTrade}</div>
            </div>
          </div>
        )}

        {/* Analysis Tab */}
        {activeTab === 'analysis' && stats && (
          <div className="space-y-6">
            {/* Win/Loss Distribution */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Win/Loss Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Wins', value: stats.winTrades, fill: themeColors.successLight },
                      { name: 'Losses', value: stats.lossTrades, fill: themeColors.dangerLight }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Profit by Session */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">Profit by Session</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={['Tokyo', 'London', 'NewYork', 'Sydney'].map(session => {
                    const sessionTrades = stats.trades.filter(t => t.session === session);
                    const profit = sessionTrades.reduce((sum, t) => sum + t.profit, 0);
                    return { session, profit: parseFloat(profit.toFixed(2)) };
                  })}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis dataKey="session" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }}
                  />
                  <Bar dataKey="profit" fill={themeColors.primary} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Monthly Report Tab */}
        {activeTab === 'monthly' && monthlyPerformance.length > 0 && (
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Monthly Performance</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-4">Month</th>
                    <th className="text-center py-3 px-4">Total Trades</th>
                    <th className="text-center py-3 px-4">Wins</th>
                    <th className="text-center py-3 px-4">Losses</th>
                    <th className="text-center py-3 px-4">Win Rate</th>
                    <th className="text-right py-3 px-4">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyPerformance.map((month, index) => (
                    <tr key={index} className="border-b border-white/5">
                      <td className="py-3 px-4">{month.month}</td>
                      <td className="text-center py-3 px-4">{month.totalTrades}</td>
                      <td className="text-center py-3 px-4 text-green-500">{month.wins}</td>
                      <td className="text-center py-3 px-4 text-red-500">{month.losses}</td>
                      <td className="text-center py-3 px-4">{month.winRate}%</td>
                      <td className={`text-right py-3 px-4 font-bold ${month.profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${month.profit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All Trades Tab */}
        {activeTab === 'all-trades' && stats && (
          <div>
            {/* Trade List - بدون Trade Entry Form */}
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold">All Trades ({stats.trades.length})</h3>
              </div>

              {stats.trades.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400">No trades found</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.trades.map((trade, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg transition hover:bg-white/5 border ${
                        trade.profit >= 0
                          ? 'bg-green-500/5 border-green-500/30'
                          : 'bg-red-500/5 border-red-500/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        {/* Left Side - Trade Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {/* Status Icon */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              trade.profit >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                              {trade.profit >= 0 ? (
                                <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : (
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              )}
                            </div>

                            {/* Symbol and Position */}
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-bold">{trade.symbol || 'N/A'}</span>
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  trade.position === 'long'
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {trade.position?.toUpperCase() || 'N/A'}
                                </span>
                                {trade.session && (
                                  <span className="px-2 py-0.5 text-xs rounded bg-purple-500/20 text-purple-400">
                                    {trade.session}
                                  </span>
                                )}
                              </div>

                              {/* Date and Time */}
                              <div className="text-sm text-gray-400">
                                {new Date(trade.entryTime).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Trade Details */}
                          <div className="flex flex-wrap gap-3 text-sm text-gray-400 mb-2">
                            {trade.risk && (
                              <span>Risk: <span className="text-white">{trade.risk}%</span></span>
                            )}
                            {trade.rrRatio && (
                              <span>R:R: <span className="text-white">{trade.rrRatio}:1</span></span>
                            )}
                            {trade.stopLoss && (
                              <span>SL: <span className="text-white">-{trade.stopLoss}{trade.stopLossType === 'pips' ? ' pips' : '%'}</span></span>
                            )}
                          </div>

                          {/* Tags */}
                          {trade.tags && trade.tags.length > 0 && (
                            <div className="flex gap-2 flex-wrap mb-2">
                              {trade.tags.map((tag, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-1 bg-purple-600/20 text-purple-300 text-xs rounded"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Screenshot Link */}
                          {trade.screenshotUrl && (
                            <button
                              onClick={() => window.open(trade.screenshotUrl, '_blank')}
                              className="mt-2 px-3 py-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition text-sm flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              View Screenshot
                            </button>
                          )}
                        </div>

                        {/* Right Side - Profit/Loss */}
                        <div className="text-right">
                          <div className={`text-3xl font-bold mb-1 ${
                            trade.profit >= 0 ? 'text-green-500' : 'text-red-500'
                          }`}>
                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                          </div>
                          {trade.profitPercent !== undefined && (
                            <div className={`text-sm ${
                              trade.profitPercent >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {trade.profitPercent >= 0 ? '+' : ''}{trade.profitPercent.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
