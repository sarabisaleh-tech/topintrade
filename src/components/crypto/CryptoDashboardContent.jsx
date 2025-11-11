import React, { useState, useMemo } from 'react';
import { useCryptoData } from './CryptoDataProvider';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  RefreshCw,
  BarChart3,
  Clock,
  Activity
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

const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];

export default function CryptoDashboardContent() {
  const { trades, loading, accountInfo, stats, refreshData } = useCryptoData();
  const [selectedTab, setSelectedTab] = useState('overview'); // overview, monthly, setup

  // Format currency
  const formatCurrency = (value, currency = 'USDT') => {
    if (value === null || value === undefined) return '0.00';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value) + ' ' + currency;
  };

  // Get cumulative profit data for chart
  const getCumulativeProfitData = useMemo(() => {
    let cumulative = 0;
    return trades.map((trade, index) => {
      cumulative += trade.profit || 0;
      return {
        index: index + 1,
        profit: cumulative,
        date: new Date(trade.closeTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      };
    }).reverse();
  }, [trades]);

  // Get monthly data
  const getMonthlyData = useMemo(() => {
    const monthlyMap = {};

    trades.forEach(trade => {
      const date = new Date(trade.closeTime);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = {
          month: date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }),
          profit: 0,
          trades: 0,
          wins: 0,
          losses: 0
        };
      }

      monthlyMap[monthKey].profit += trade.profit;
      monthlyMap[monthKey].trades += 1;
      if (trade.profit > 0) monthlyMap[monthKey].wins += 1;
      else monthlyMap[monthKey].losses += 1;
    });

    return Object.values(monthlyMap).reverse();
  }, [trades]);

  // Get setup analysis data
  const getSetupAnalysis = useMemo(() => {
    const setupMap = {};

    trades.forEach(trade => {
      if (!trade.setup) return;

      if (!setupMap[trade.setup]) {
        setupMap[trade.setup] = {
          name: trade.setup,
          totalTrades: 0,
          wins: 0,
          losses: 0,
          profit: 0
        };
      }

      setupMap[trade.setup].totalTrades += 1;
      setupMap[trade.setup].profit += trade.profit;
      if (trade.profit > 0) setupMap[trade.setup].wins += 1;
      else setupMap[trade.setup].losses += 1;
    });

    return Object.values(setupMap).map(setup => ({
      ...setup,
      winRate: ((setup.wins / setup.totalTrades) * 100).toFixed(1)
    }));
  }, [trades]);

  // Get pair distribution
  const getPairDistribution = useMemo(() => {
    const pairMap = {};

    trades.forEach(trade => {
      if (!pairMap[trade.pair]) {
        pairMap[trade.pair] = { name: trade.pair, value: 0 };
      }
      pairMap[trade.pair].value += 1;
    });

    return Object.values(pairMap);
  }, [trades]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading Crypto Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-gray-800/50 backdrop-blur rounded-xl p-2 border border-gray-700">
        <button
          onClick={() => setSelectedTab('overview')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
            selectedTab === 'overview'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <Activity className="w-4 h-4 inline mr-2" />
          Dashboard
        </button>
        <button
          onClick={() => setSelectedTab('monthly')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
            selectedTab === 'monthly'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <BarChart3 className="w-4 h-4 inline mr-2" />
          Monthly Report
        </button>
        <button
          onClick={() => setSelectedTab('setup')}
          className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 ${
            selectedTab === 'setup'
              ? 'bg-purple-600 text-white'
              : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
          }`}
        >
          <TrendingUp className="w-4 h-4 inline mr-2" />
          Setup Analysis
        </button>
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <>
          {/* Account Info */}
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-purple-400" />
                Account Overview
              </h3>
              <button
                onClick={refreshData}
                className="p-2 rounded-lg bg-gray-700/50 hover:bg-gray-600/50 transition-all"
              >
                <RefreshCw className="w-4 h-4 text-gray-400" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-400 mb-1">Balance</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(accountInfo.balance)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Equity</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(accountInfo.equity)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Exchange</p>
                <p className="text-lg font-semibold text-gray-300">{accountInfo.exchange}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Currency</p>
                <p className="text-lg font-semibold text-gray-300">{accountInfo.currency}</p>
              </div>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Total Trades</p>
              <p className="text-3xl font-bold text-white">{stats.totalTrades}</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Win Rate</p>
              <p className="text-3xl font-bold text-green-400">{stats.winRate}%</p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Total Profit</p>
              <p className={`text-3xl font-bold ${parseFloat(stats.totalProfit) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.totalProfit)}
              </p>
            </div>
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-4 border border-gray-700">
              <p className="text-sm text-gray-400 mb-1">Profit Factor</p>
              <p className="text-3xl font-bold text-purple-400">{stats.profitFactor}</p>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Cumulative Profit Chart */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Cumulative Profit</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={getCumulativeProfitData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                    labelStyle={{ color: '#9ca3af' }}
                  />
                  <Area type="monotone" dataKey="profit" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pair Distribution */}
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4">Trading Pairs Distribution</h3>
              <ResponsiveContainer width="100%" height={250}>
                <RePieChart>
                  <Pie
                    data={getPairDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getPairDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Win/Loss Stats */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-400" />
                Winning Trades
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Count:</span>
                  <span className="text-white font-semibold">{stats.winningTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Average Win:</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(stats.averageWin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Largest Win:</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(stats.largestWin)}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-red-400" />
                Losing Trades
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Count:</span>
                  <span className="text-white font-semibold">{stats.losingTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Average Loss:</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(stats.averageLoss)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Largest Loss:</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(stats.largestLoss)}</span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Monthly Report Tab */}
      {selectedTab === 'monthly' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Monthly Performance</h3>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={getMonthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend />
                <Bar dataKey="profit" fill="#8b5cf6" name="Profit/Loss" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-4">Monthly Statistics</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-3 px-4">Month</th>
                    <th className="text-right text-gray-400 py-3 px-4">Trades</th>
                    <th className="text-right text-gray-400 py-3 px-4">Wins</th>
                    <th className="text-right text-gray-400 py-3 px-4">Losses</th>
                    <th className="text-right text-gray-400 py-3 px-4">Win Rate</th>
                    <th className="text-right text-gray-400 py-3 px-4">Profit/Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {getMonthlyData.map((month, index) => (
                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="text-white py-3 px-4">{month.month}</td>
                      <td className="text-right text-gray-300 py-3 px-4">{month.trades}</td>
                      <td className="text-right text-green-400 py-3 px-4">{month.wins}</td>
                      <td className="text-right text-red-400 py-3 px-4">{month.losses}</td>
                      <td className="text-right text-gray-300 py-3 px-4">
                        {((month.wins / month.trades) * 100).toFixed(1)}%
                      </td>
                      <td className={`text-right py-3 px-4 font-semibold ${month.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(month.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Setup Analysis Tab */}
      {selectedTab === 'setup' && (
        <div className="space-y-6">
          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Setup Performance Analysis</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left text-gray-400 py-3 px-4">Setup Type</th>
                    <th className="text-right text-gray-400 py-3 px-4">Total Trades</th>
                    <th className="text-right text-gray-400 py-3 px-4">Wins</th>
                    <th className="text-right text-gray-400 py-3 px-4">Losses</th>
                    <th className="text-right text-gray-400 py-3 px-4">Win Rate</th>
                    <th className="text-right text-gray-400 py-3 px-4">Total Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {getSetupAnalysis.map((setup, index) => (
                    <tr key={index} className="border-b border-gray-700/50 hover:bg-gray-700/20">
                      <td className="text-white py-3 px-4 font-semibold">{setup.name}</td>
                      <td className="text-right text-gray-300 py-3 px-4">{setup.totalTrades}</td>
                      <td className="text-right text-green-400 py-3 px-4">{setup.wins}</td>
                      <td className="text-right text-red-400 py-3 px-4">{setup.losses}</td>
                      <td className="text-right text-gray-300 py-3 px-4">{setup.winRate}%</td>
                      <td className={`text-right py-3 px-4 font-semibold ${setup.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(setup.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700">
            <h3 className="text-xl font-bold text-white mb-6">Setup Win Rate Comparison</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getSetupAnalysis}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px' }}
                  labelStyle={{ color: '#9ca3af' }}
                />
                <Legend />
                <Bar dataKey="winRate" fill="#10b981" name="Win Rate %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
