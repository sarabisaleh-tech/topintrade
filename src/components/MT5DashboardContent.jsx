import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  RefreshCw,
  BarChart3,
  Clock,
  Filter,
  X
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

/**
 * MT5 Dashboard Content - Without background
 * Displays real-time MT5 data inside JournalApp theme
 */
export default function MT5DashboardContent() {
  const { currentUser } = useAuth();
  const [accountInfo, setAccountInfo] = useState(null);
  const [openPositions, setOpenPositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [syncStatus, setSyncStatus] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
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

  // Filter states
  const [filterSymbol, setFilterSymbol] = useState('all');
  const [filterEntry, setFilterEntry] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

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

  // Get unique symbols from trade history
  const getUniqueSymbols = () => {
    const symbols = new Set();
    tradeHistory.forEach(trade => {
      if (trade.symbol) symbols.add(trade.symbol);
    });
    return Array.from(symbols).sort();
  };

  // Filter trade history based on filters
  const getFilteredTradeHistory = () => {
    return tradeHistory.filter(trade => {
      // Symbol filter
      if (filterSymbol !== 'all' && trade.symbol !== filterSymbol) {
        return false;
      }

      // Entry filter
      if (filterEntry !== 'all' && trade.entry !== filterEntry) {
        return false;
      }

      // Date from filter
      if (filterDateFrom) {
        const tradeDate = trade.time?.toDate?.() || new Date(0);
        const fromDate = new Date(filterDateFrom);
        if (tradeDate < fromDate) {
          return false;
        }
      }

      // Date to filter
      if (filterDateTo) {
        const tradeDate = trade.time?.toDate?.() || new Date(0);
        const toDate = new Date(filterDateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (tradeDate > toDate) {
          return false;
        }
      }

      return true;
    });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading MT5 Data...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-12 border border-gray-700 text-center">
        <Activity className="w-16 h-16 text-gray-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-white mb-2">MT5 Not Connected</h3>
        <p className="text-gray-400 mb-4">
          Your MetaTrader 5 Expert Advisor is not connected yet.
        </p>
        <p className="text-sm text-gray-500">
          Make sure you have installed the EA and entered your email as the API Key.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status Header */}
      <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse"></div>
              <span className="text-green-400 font-semibold">Connected</span>
            </div>
            {lastUpdate && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Clock className="w-4 h-4" />
                <span>Updated: {formatDateTime(lastUpdate)}</span>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-400">Account</p>
            <p className="text-white font-bold">{accountInfo?.login || '-'}</p>
          </div>
        </div>
      </div>

      {/* Account Overview Cards */}
      {accountInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Balance */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Balance</span>
              <Wallet className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(accountInfo.balance, accountInfo.currency)}
            </p>
          </div>

          {/* Equity */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Equity</span>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(accountInfo.equity, accountInfo.currency)}
            </p>
          </div>

          {/* Floating P/L */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Floating P/L</span>
              {accountInfo.profit >= 0 ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-400" />
              )}
            </div>
            <p className={`text-2xl font-bold ${
              accountInfo.profit >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              {formatCurrency(accountInfo.profit, accountInfo.currency)}
            </p>
          </div>

          {/* Open Positions */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400 text-sm">Open Positions</span>
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-2xl font-bold text-white">
              {openPositions.length}
            </p>
          </div>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-purple-400">{statistics.winRate.toFixed(1)}%</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Total Trades</p>
          <p className="text-2xl font-bold text-white">{statistics.totalTrades}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Profit Factor</p>
          <p className="text-2xl font-bold text-green-400">
            {statistics.profitFactor > 999 ? '∞' : statistics.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
          <p className="text-gray-400 text-xs mb-1">Avg Profit</p>
          <p className="text-xl font-bold text-green-400">
            {formatCurrency(statistics.avgProfit, accountInfo?.currency)}
          </p>
        </div>
      </div>

      {/* Open Positions Table */}
      {openPositions.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-bold text-white mb-4">Open Positions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Ticket</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Symbol</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Type</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Volume</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Open Price</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Current</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">S/L</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">T/P</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Profit</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {openPositions.map((position, index) => (
                  <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-white font-mono text-sm">{position.ticket}</td>
                    <td className="py-3 px-4 text-white font-semibold">{position.symbol}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        position.type === 'BUY'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {position.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-white text-sm">{position.volume?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-white font-mono text-sm">{position.price_open?.toFixed(5)}</td>
                    <td className="py-3 px-4 text-right text-white font-mono text-sm">{position.price_current?.toFixed(5)}</td>
                    <td className="py-3 px-4 text-right text-white font-mono text-sm">
                      {position.sl > 0 ? position.sl.toFixed(5) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right text-white font-mono text-sm">
                      {position.tp > 0 ? position.tp.toFixed(5) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold text-sm ${
                        position.profit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(position.profit, accountInfo?.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white text-xs">
                      {formatDateTime(position.time_open)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cumulative Profit Chart */}
      {tradeHistory.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
          <h3 className="text-xl font-bold text-white mb-4">Cumulative Profit</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={getCumulativeProfitData()}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="index"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <YAxis
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
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
      )}

      {/* Trade History Table */}
      {tradeHistory.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Trade History - Complete Data</h2>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Filter className="w-4 h-4" />
              <span>Filter your trades</span>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            {/* Symbol Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Symbol</label>
              <select
                value={filterSymbol}
                onChange={(e) => setFilterSymbol(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Symbols</option>
                {getUniqueSymbols().map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            {/* Entry Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Entry</label>
              <select
                value={filterEntry}
                onChange={(e) => setFilterEntry(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              >
                <option value="all">All</option>
                <option value="IN">IN</option>
                <option value="OUT">OUT</option>
              </select>
            </div>

            {/* Date From Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">From Date</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Date To Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">To Date</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Clear Filters Button */}
            {(filterSymbol !== 'all' || filterEntry !== 'all' || filterDateFrom || filterDateTo) && (
              <div className="md:col-span-4 flex justify-end">
                <button
                  onClick={() => {
                    setFilterSymbol('all');
                    setFilterEntry('all');
                    setFilterDateFrom('');
                    setFilterDateTo('');
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Ticket</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Symbol</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Type</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Entry</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Volume</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Price</th>
                  <th className="text-right py-3 px-4 text-gray-400 font-semibold text-sm">Profit</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-semibold text-sm">Time</th>
                </tr>
              </thead>
              <tbody>
                {getFilteredTradeHistory().map((deal) => (
                  <tr key={deal.id} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-white font-mono text-sm">{deal.ticket}</td>
                    <td className="py-3 px-4 text-white font-semibold">{deal.symbol}</td>
                    <td className="py-3 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
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
                    <td className="py-3 px-4 text-right text-white text-sm">{deal.volume?.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-white font-mono text-sm">{deal.price?.toFixed(5)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-bold text-sm ${
                        deal.profit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(deal.profit, accountInfo?.currency)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white text-xs">
                      {formatDateTime(deal.time)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <p className="text-gray-400">
              Showing <span className="text-white font-semibold">{getFilteredTradeHistory().length}</span> of <span className="text-white font-semibold">{tradeHistory.length}</span> trades
            </p>
            {getFilteredTradeHistory().length < tradeHistory.length && (
              <p className="text-purple-400">
                {tradeHistory.length - getFilteredTradeHistory().length} trades filtered out
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
