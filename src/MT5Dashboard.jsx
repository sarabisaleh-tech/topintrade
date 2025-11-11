import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  Download,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Clock
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export default function MT5Dashboard() {
  const { currentUser } = useAuth();
  const [accountInfo, setAccountInfo] = useState(null);
  const [openPositions, setOpenPositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({
    totalTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    winRate: 0,
    avgProfit: 0,
    avgLoss: 0,
    largestProfit: 0,
    largestLoss: 0,
    profitFactor: 0
  });

  // Real-time listener for account data
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);

    const unsubscribe = onSnapshot(userDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();

        // Account Info
        if (data.account_info) {
          setAccountInfo(data.account_info);
          setIsConnected(true);
          setLastUpdate(data.account_info.last_update?.toDate() || new Date());
        }

        // Open Positions
        if (data.open_positions) {
          setOpenPositions(data.open_positions);
        }

        // Sync Status
        if (data.sync_status) {
          setSyncStatus(data.sync_status);
        }

        setLoading(false);
      } else {
        setLoading(false);
        setIsConnected(false);
      }
    }, (error) => {
      console.error('Error listening to user data:', error);
      setIsConnected(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Real-time listener for trade history
  useEffect(() => {
    if (!currentUser) return;

    const historyRef = collection(db, 'users', currentUser.uid, 'trade_history');

    const unsubscribe = onSnapshot(historyRef, (snapshot) => {
      const deals = [];
      snapshot.forEach((doc) => {
        deals.push({ id: doc.id, ...doc.data() });
      });

      // Sort by time descending
      deals.sort((a, b) => {
        const timeA = a.time?.toDate?.() || new Date(0);
        const timeB = b.time?.toDate?.() || new Date(0);
        return timeB - timeA;
      });

      setTradeHistory(deals);
      calculateStatistics(deals);
    }, (error) => {
      console.error('Error listening to trade history:', error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Calculate statistics from trade history
  const calculateStatistics = (deals) => {
    if (deals.length === 0) {
      setStatistics({
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        avgProfit: 0,
        avgLoss: 0,
        largestProfit: 0,
        largestLoss: 0,
        profitFactor: 0
      });
      return;
    }

    // Filter only closed deals (OUT)
    const closedDeals = deals.filter(d => d.entry === 'OUT' && d.type !== 'BALANCE' && d.type !== 'CREDIT');

    const winningTrades = closedDeals.filter(d => d.profit > 0);
    const losingTrades = closedDeals.filter(d => d.profit < 0);

    const totalProfit = winningTrades.reduce((sum, d) => sum + d.profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, d) => sum + d.profit, 0));

    const largestProfit = winningTrades.length > 0 ? Math.max(...winningTrades.map(d => d.profit)) : 0;
    const largestLoss = losingTrades.length > 0 ? Math.min(...losingTrades.map(d => d.profit)) : 0;

    const avgProfit = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const winRate = closedDeals.length > 0 ? (winningTrades.length / closedDeals.length) * 100 : 0;
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;

    setStatistics({
      totalTrades: closedDeals.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: winRate,
      avgProfit: avgProfit,
      avgLoss: avgLoss,
      largestProfit: largestProfit,
      largestLoss: largestLoss,
      profitFactor: profitFactor
    });
  };

  // Copy API Key
  const copyApiKey = () => {
    navigator.clipboard.writeText(currentUser.uid);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  // Download EA File
  const downloadEA = () => {
    // Create a temporary link element
    const link = document.createElement('a');
    link.href = '/TradingMonitor.mq5';
    link.download = 'TradingMonitor.mq5';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format currency
  const formatCurrency = (value, currency = 'USD') => {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format date/time
  const formatDateTime = (date) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  // Get cumulative profit data for chart
  const getCumulativeProfitData = () => {
    const closedDeals = tradeHistory.filter(d => d.entry === 'OUT' && d.type !== 'BALANCE' && d.type !== 'CREDIT');
    let cumulative = 0;
    return closedDeals.reverse().map((deal, index) => {
      cumulative += deal.profit || 0;
      return {
        index: index + 1,
        profit: cumulative,
        date: deal.time?.toDate?.() || new Date()
      };
    });
  };

  // Get symbol distribution for pie chart
  const getSymbolDistribution = () => {
    const symbolCount = {};
    const closedDeals = tradeHistory.filter(d => d.entry === 'OUT' && d.type !== 'BALANCE' && d.type !== 'CREDIT');

    closedDeals.forEach(deal => {
      const symbol = deal.symbol || 'Unknown';
      symbolCount[symbol] = (symbolCount[symbol] || 0) + 1;
    });

    return Object.entries(symbolCount).map(([symbol, count]) => ({
      symbol,
      count
    }));
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-16 h-16 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-white text-xl">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">MT5 Real-Time Dashboard</h1>
              <p className="text-gray-300">Monitor your trading account in real-time</p>
            </div>
            <div className="flex items-center gap-3">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
                }`} />
                <span className="font-semibold">{isConnected ? 'Connected' : 'Disconnected'}</span>
              </div>
              {lastUpdate && (
                <div className="flex items-center gap-2 text-gray-300">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    Updated: {formatDateTime(lastUpdate)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* EA Download Section */}
        {!isConnected && (
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Download className="w-8 h-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">Get Started with MT5 EA</h2>
                <p className="text-gray-300 mb-4">
                  To start monitoring your trades in real-time, download and install our Expert Advisor on your MT5 platform.
                </p>

                <div className="space-y-4">
                  {/* API Key */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-300 mb-2">Your API Key:</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={currentUser.uid}
                        readOnly
                        className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white font-mono"
                      />
                      <button
                        onClick={copyApiKey}
                        className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                      >
                        {apiKeyCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                        {apiKeyCopied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={downloadEA}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                  >
                    <Download className="w-5 h-5" />
                    Download Expert Advisor
                  </button>

                  {/* Installation Steps */}
                  <div className="mt-4 p-4 bg-black/20 rounded-lg">
                    <h3 className="font-semibold text-white mb-2">Installation Steps:</h3>
                    <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                      <li>Download the EA file</li>
                      <li>Open MT5 → File → Open Data Folder</li>
                      <li>Navigate to MQL5 → Experts</li>
                      <li>Copy the downloaded file here</li>
                      <li>Restart MT5</li>
                      <li>Drag & Drop EA onto any chart</li>
                      <li>Paste your API Key in settings</li>
                      <li>Enable AutoTrading</li>
                      <li>Check connection status here</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Overview Cards */}
        {accountInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Balance */}
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border border-blue-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Balance</span>
                <Wallet className="w-5 h-5 text-blue-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(accountInfo.balance, accountInfo.currency)}
              </p>
            </div>

            {/* Equity */}
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Equity</span>
                <TrendingUp className="w-5 h-5 text-green-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {formatCurrency(accountInfo.equity, accountInfo.currency)}
              </p>
            </div>

            {/* Floating P/L */}
            <div className={`bg-gradient-to-br ${
              accountInfo.profit >= 0
                ? 'from-green-500/20 to-emerald-500/20 border-green-500/30'
                : 'from-red-500/20 to-rose-500/20 border-red-500/30'
            } backdrop-blur-lg rounded-2xl p-6 border`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Floating P/L</span>
                {accountInfo.profit >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-green-400" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-red-400" />
                )}
              </div>
              <p className={`text-3xl font-bold ${
                accountInfo.profit >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {formatCurrency(accountInfo.profit, accountInfo.currency)}
              </p>
            </div>

            {/* Open Positions */}
            <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Open Positions</span>
                <Activity className="w-5 h-5 text-purple-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {openPositions.length}
              </p>
            </div>

            {/* Margin Level */}
            <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-lg rounded-2xl p-6 border border-orange-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Margin Level</span>
                <PieChart className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {accountInfo.margin_level?.toFixed(2)}%
              </p>
            </div>

            {/* Win Rate */}
            <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-lg rounded-2xl p-6 border border-indigo-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Win Rate</span>
                <BarChart3 className="w-5 h-5 text-indigo-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {statistics.winRate.toFixed(1)}%
              </p>
            </div>

            {/* Total Trades */}
            <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 backdrop-blur-lg rounded-2xl p-6 border border-pink-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Total Trades</span>
                <Activity className="w-5 h-5 text-pink-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {statistics.totalTrades}
              </p>
            </div>

            {/* Profit Factor */}
            <div className="bg-gradient-to-br from-teal-500/20 to-cyan-500/20 backdrop-blur-lg rounded-2xl p-6 border border-teal-500/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-300">Profit Factor</span>
                <TrendingUp className="w-5 h-5 text-teal-400" />
              </div>
              <p className="text-3xl font-bold text-white">
                {statistics.profitFactor > 999 ? '∞' : statistics.profitFactor.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Open Positions Table */}
        {openPositions.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Open Positions</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Ticket</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Symbol</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Type</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Volume</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Open Price</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Current</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">S/L</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">T/P</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Profit</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {openPositions.map((position, index) => (
                    <tr key={index} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white font-mono">{position.ticket}</td>
                      <td className="py-3 px-4 text-white font-semibold">{position.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          position.type === 'BUY'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {position.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">{position.volume?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-white font-mono">{position.price_open?.toFixed(5)}</td>
                      <td className="py-3 px-4 text-right text-white font-mono">{position.price_current?.toFixed(5)}</td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        {position.sl > 0 ? position.sl.toFixed(5) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-mono">
                        {position.tp > 0 ? position.tp.toFixed(5) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          position.profit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(position.profit, accountInfo?.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white text-sm">
                        {formatDateTime(position.time_open)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {tradeHistory.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Cumulative Profit Chart */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Cumulative Profit</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={getCumulativeProfitData()}>
                  <defs>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff20" />
                  <XAxis
                    dataKey="index"
                    stroke="#fff"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <YAxis
                    stroke="#fff"
                    tick={{ fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#profitGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Symbol Distribution */}
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
              <h3 className="text-xl font-bold text-white mb-4">Symbol Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={getSymbolDistribution()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ symbol, percent }) => `${symbol} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {getSymbolDistribution().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Statistics Cards */}
        {statistics.totalTrades > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-1">Winning Trades</p>
              <p className="text-2xl font-bold text-green-400">{statistics.winningTrades}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-1">Losing Trades</p>
              <p className="text-2xl font-bold text-red-400">{statistics.losingTrades}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-1">Avg Profit</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(statistics.avgProfit, accountInfo?.currency)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-1">Avg Loss</p>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(Math.abs(statistics.avgLoss), accountInfo?.currency)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-1">Largest Profit</p>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(statistics.largestProfit, accountInfo?.currency)}
              </p>
            </div>
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-4 border border-white/20">
              <p className="text-gray-300 text-sm mb-1">Largest Loss</p>
              <p className="text-2xl font-bold text-red-400">
                {formatCurrency(statistics.largestLoss, accountInfo?.currency)}
              </p>
            </div>
          </div>
        )}

        {/* Trade History Table */}
        {tradeHistory.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-4">Trade History</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Ticket</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Symbol</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Entry</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Volume</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Price</th>
                    <th className="text-right py-3 px-4 text-gray-300 font-semibold">Profit</th>
                    <th className="text-left py-3 px-4 text-gray-300 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {tradeHistory.slice(0, 50).map((deal) => (
                    <tr key={deal.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 text-white font-mono">{deal.ticket}</td>
                      <td className="py-3 px-4 text-white font-semibold">{deal.symbol}</td>
                      <td className="py-3 px-4">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          deal.type === 'BUY'
                            ? 'bg-green-500/20 text-green-400'
                            : deal.type === 'SELL'
                            ? 'bg-red-500/20 text-red-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {deal.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          deal.entry === 'IN'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-purple-500/20 text-purple-400'
                        }`}>
                          {deal.entry}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-white">{deal.volume?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-white font-mono">{deal.price?.toFixed(5)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${
                          deal.profit >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {formatCurrency(deal.profit, accountInfo?.currency)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white text-sm">
                        {formatDateTime(deal.time)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tradeHistory.length > 50 && (
              <p className="text-gray-400 text-center mt-4">
                Showing 50 of {tradeHistory.length} trades
              </p>
            )}
          </div>
        )}

        {/* No Data Message */}
        {!accountInfo && !loading && (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-12 border border-white/20 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">No Data Available</h3>
            <p className="text-gray-300">
              Install and configure the Expert Advisor to start monitoring your trades.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
