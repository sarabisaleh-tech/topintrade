import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { ArrowLeft, Upload, X, TrendingUp, TrendingDown, Calendar, Clock, FileText, Heart, Target, BarChart3 } from 'lucide-react';

// Emotional states for journal
const EMOTIONAL_STATES = [
  { value: 'confident', label: '😎 Confident', color: 'green' },
  { value: 'calm', label: '😌 Calm', color: 'blue' },
  { value: 'excited', label: '🤩 Excited', color: 'purple' },
  { value: 'nervous', label: '😰 Nervous', color: 'yellow' },
  { value: 'fearful', label: '😨 Fearful', color: 'orange' },
  { value: 'greedy', label: '🤑 Greedy', color: 'red' },
  { value: 'frustrated', label: '😤 Frustrated', color: 'red' },
  { value: 'disciplined', label: '🎯 Disciplined', color: 'green' },
  { value: 'impulsive', label: '⚡ Impulsive', color: 'red' },
  { value: 'patient', label: '🧘 Patient', color: 'blue' }
];

export default function ManualJournalApp({ onBack }) {
  const { currentUser } = useAuth();

  // Form state
  const [newTrade, setNewTrade] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    symbol: '',
    initialBalance: 10000,
    stopLossSize: 1,
    stopLossSizeType: 'percent', // 'percent' or 'pips'
    position: 'long',
    risk: 1,
    rrRatio: 2,
    result: '',
    pnl: 0,
    pnlMode: 'auto', // 'auto' or 'manual'
    emotionalState: '',
    tradeNotes: '',
    chartInputType: 'link', // 'link' or 'upload'
    chartOpenLink: '',
    chartCloseLink: '',
    chartScreenshots: [],
    confirmationImages: [],
    tags: []
  });

  // UI state
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });
  const [savedTags, setSavedTags] = useState([]);
  const [activeTab, setActiveTab] = useState('all-trade'); // 'all-trade' or 'analytic'

  // Analytics filters
  const [selectedSessions, setSelectedSessions] = useState(['Tokyo', 'London', 'NewYork', 'Sydney']);
  const [selectedWeekdays, setSelectedWeekdays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [selectedHours, setSelectedHours] = useState([...Array(24)].map((_, i) => i));
  const [deactivatedTags, setDeactivatedTags] = useState([]);

  // Load trades from Firestore
  useEffect(() => {
    if (!currentUser) return;

    const loadTrades = async () => {
      try {
        const q = query(
          collection(db, 'journalTrades'),
          where('userId', '==', currentUser.uid)
        );

        const snapshot = await getDocs(q);
        const loadedTrades = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Sort by date and time in JavaScript
        loadedTrades.sort((a, b) => {
          const dateCompare = b.date.localeCompare(a.date);
          if (dateCompare !== 0) return dateCompare;
          return b.time.localeCompare(a.time);
        });

        setTrades(loadedTrades);

        // Extract unique tags
        const allTags = new Set();
        loadedTrades.forEach(trade => {
          if (trade.tags && Array.isArray(trade.tags)) {
            trade.tags.forEach(tag => allTags.add(tag));
          }
        });
        setSavedTags(Array.from(allTags));

      } catch (error) {
        console.error('Error loading trades:', error);
        showNotification('Error loading trades', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadTrades();
  }, [currentUser]);

  // Show notification
  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 3000);
  };

  // Convert image file to base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  // Handle chart screenshot upload
  const handleChartUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      const base64Images = await Promise.all(
        files.map(file => convertToBase64(file))
      );

      setNewTrade(prev => ({
        ...prev,
        chartScreenshots: [...prev.chartScreenshots, ...base64Images]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      showNotification('Error uploading images', 'error');
    }
  };

  // Handle confirmation image upload
  const handleConfirmationUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    try {
      const base64Images = await Promise.all(
        files.map(file => convertToBase64(file))
      );

      setNewTrade(prev => ({
        ...prev,
        confirmationImages: [...prev.confirmationImages, ...base64Images]
      }));
    } catch (error) {
      console.error('Error uploading images:', error);
      showNotification('Error uploading images', 'error');
    }
  };

  // Remove image
  const removeImage = (type, index) => {
    setNewTrade(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  // Add new trade
  const handleAddTrade = async () => {
    if (!newTrade.symbol || !newTrade.result) {
      showNotification('Please fill symbol and result', 'error');
      return;
    }

    try {
      const tradeData = {
        ...newTrade,
        userId: currentUser.uid,
        createdAt: new Date().toISOString(),
        pnl: parseFloat(newTrade.pnl) || 0
      };

      await addDoc(collection(db, 'journalTrades'), tradeData);

      // Reload trades
      const q = query(
        collection(db, 'journalTrades'),
        where('userId', '==', currentUser.uid)
      );

      const snapshot = await getDocs(q);
      const loadedTrades = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Sort by date and time in JavaScript
      loadedTrades.sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.time.localeCompare(a.time);
      });

      setTrades(loadedTrades);

      // Reset form
      setNewTrade({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        symbol: '',
        initialBalance: 10000,
        stopLossSize: 1,
        stopLossSizeType: 'percent',
        position: 'long',
        risk: 1,
        rrRatio: 2,
        result: '',
        pnl: 0,
        pnlMode: 'auto',
        emotionalState: '',
        tradeNotes: '',
        chartInputType: 'link',
        chartOpenLink: '',
        chartCloseLink: '',
        chartScreenshots: [],
        confirmationImages: [],
        tags: []
      });

      setShowForm(false);
      showNotification('✅ Trade added successfully!', 'success');

    } catch (error) {
      console.error('Error adding trade:', error);
      showNotification('Error adding trade', 'error');
    }
  };

  // Delete trade
  const handleDeleteTrade = async (tradeId) => {
    if (!confirm('Are you sure you want to delete this trade?')) return;

    try {
      await deleteDoc(doc(db, 'journalTrades', tradeId));
      setTrades(trades.filter(t => t.id !== tradeId));
      showNotification('Trade deleted', 'success');
    } catch (error) {
      console.error('Error deleting trade:', error);
      showNotification('Error deleting trade', 'error');
    }
  };

  // Helper: Get session from time
  const getSession = (time) => {
    if (!time) return 'Unknown';
    const hour = parseInt(time.split(':')[0]);
    if (hour >= 0 && hour < 9) return 'Tokyo';
    if (hour >= 9 && hour < 16) return 'London';
    if (hour >= 16 && hour < 24) return 'NewYork';
    return 'Sydney';
  };

  // Helper: Get weekday from date
  const getWeekday = (dateStr) => {
    return new Date(dateStr).getDay();
  };

  // Calculate analytics data
  const analyticsData = useMemo(() => {
    if (trades.length === 0) return null;

    // Session analysis
    const sessions = { Tokyo: [], London: [], NewYork: [], Sydney: [] };
    trades.forEach(trade => {
      const session = getSession(trade.time);
      if (sessions[session]) sessions[session].push(trade);
    });

    const sessionData = Object.keys(sessions).map(session => {
      const sessionTrades = sessions[session];
      const wins = sessionTrades.filter(t => t.result === 'profit').length;
      const total = sessionTrades.length;
      return {
        session,
        trades: total,
        wins,
        winRate: total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0'
      };
    });

    // Weekday analysis
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayStats = weekdays.map((day, idx) => {
      const dayTrades = trades.filter(t => getWeekday(t.date) === idx);
      const wins = dayTrades.filter(t => t.result === 'profit').length;
      return {
        day,
        total: dayTrades.length,
        wins,
        winRate: dayTrades.length > 0 ? ((wins / dayTrades.length) * 100).toFixed(1) : '0.0'
      };
    });

    // Hourly analysis
    const hourlyStats = [...Array(24)].map((_, hour) => {
      const hourTrades = trades.filter(t => {
        if (!t.time) return false;
        const tradeHour = parseInt(t.time.split(':')[0]);
        return tradeHour === hour;
      });
      const wins = hourTrades.filter(t => t.result === 'profit').length;
      return {
        hour,
        trades: hourTrades.length,
        wins,
        winRate: hourTrades.length > 0 ? ((wins / hourTrades.length) * 100).toFixed(1) : '0.0'
      };
    });

    // Tag analysis
    const tagStats = {};
    trades.forEach(trade => {
      if (trade.tags && Array.isArray(trade.tags)) {
        trade.tags.forEach(tag => {
          if (!tagStats[tag]) {
            tagStats[tag] = { wins: 0, total: 0 };
          }
          tagStats[tag].total++;
          if (trade.result === 'profit') tagStats[tag].wins++;
        });
      }
    });

    const allTagsData = Object.keys(tagStats).map(tag => ({
      tag,
      trades: tagStats[tag].total,
      wins: tagStats[tag].wins,
      winRate: ((tagStats[tag].wins / tagStats[tag].total) * 100).toFixed(1)
    })).sort((a, b) => b.trades - a.trades);

    // Overall stats
    const totalTrades = trades.length;
    const wins = trades.filter(t => t.result === 'profit').length;
    const losses = trades.filter(t => t.result === 'loss').length;
    const breakevens = trades.filter(t => t.result === 'breakeven').length;
    const totalPnl = trades.reduce((sum, t) => sum + (parseFloat(t.pnl) || 0), 0);
    const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';

    return {
      sessionData,
      weekdayData: weekdayStats,
      hourlyData: hourlyStats,
      allTagsData,
      totalTrades,
      wins,
      losses,
      breakevens,
      totalPnl,
      winRate
    };
  }, [trades]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl">Loading Journal...</p>
        </div>
      </div>
    );
  }

  // Calculate auto P&L
  const calculateAutoPnl = () => {
    if (newTrade.pnlMode === 'manual') return newTrade.pnl;
    return (newTrade.initialBalance * newTrade.risk) / 100;
  };

  // Theme colors for sessions
  const themeColors = {
    tokyo: '#f59e0b',
    london: '#3b82f6',
    newyork: '#10b981',
    sydney: '#8b5cf6',
    primary: '#8b5cf6'
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-black text-white">
      {/* Galaxy Background - Stars */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950 via-purple-950 to-blue-950"></div>

        {/* Nebula clouds */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/30 rounded-full filter blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-pink-600/20 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-orange-600/15 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '1.5s'}}></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-600/10 rounded-full filter blur-3xl animate-pulse" style={{animationDelay: '2.5s'}}></div>
        </div>

        {/* Stars */}
        <div className="absolute inset-0">
          {[...Array(200)].map((_, i) => (
            <div
              key={i}
              className="absolute bg-white rounded-full animate-twinkle"
              style={{
                width: Math.random() * 2 + 1 + 'px',
                height: Math.random() * 2 + 1 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                animationDelay: Math.random() * 3 + 's',
                animationDuration: Math.random() * 2 + 2 + 's',
                opacity: Math.random() * 0.7 + 0.3
              }}
            />
          ))}
        </div>

        {/* Brighter stars */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={`bright-${i}`}
              className="absolute rounded-full animate-twinkle"
              style={{
                width: Math.random() * 3 + 2 + 'px',
                height: Math.random() * 3 + 2 + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                background: `radial-gradient(circle, ${
                  ['#fff', '#ffd700', '#87ceeb', '#ff69b4'][Math.floor(Math.random() * 4)]
                } 0%, transparent 70%)`,
                animationDelay: Math.random() * 3 + 's',
                animationDuration: Math.random() * 2 + 1 + 's',
                boxShadow: `0 0 ${Math.random() * 10 + 5}px ${
                  ['#fff', '#ffd700', '#87ceeb', '#ff69b4'][Math.floor(Math.random() * 4)]
                }`
              }}
            />
          ))}
        </div>

        {/* Dark overlay for text contrast */}
        <div className="absolute inset-0 bg-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-900 via-emerald-900 to-teal-900 p-6 border-b border-gray-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-3xl font-bold">Manual Trading Journal</h1>
              <p className="text-purple-300">Track your trades manually</p>
            </div>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg flex items-center gap-2"
          >
            {showForm ? <X className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
            {showForm ? 'Cancel' : 'Add New Trade'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Add Trade Form */}
        {showForm && (
          <div className="bg-gray-900 rounded-2xl p-6 mb-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-6">New Trade Entry</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Initial Balance */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Initial Balance ($)</label>
                <input
                  type="number"
                  step="100"
                  value={newTrade.initialBalance}
                  onChange={(e) => setNewTrade({...newTrade, initialBalance: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Date & Time */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Date</label>
                <input
                  type="date"
                  value={newTrade.date}
                  onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">Time</label>
                <input
                  type="time"
                  value={newTrade.time}
                  onChange={(e) => setNewTrade({...newTrade, time: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Symbol */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Symbol / Pair</label>
                <input
                  type="text"
                  value={newTrade.symbol}
                  onChange={(e) => setNewTrade({...newTrade, symbol: e.target.value.toUpperCase()})}
                  placeholder="EURUSD, XAUUSD, etc."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Stop Loss Size with Percent/Pips Toggle */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Stop Loss Size</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={newTrade.stopLossSize}
                    onChange={(e) => setNewTrade({...newTrade, stopLossSize: parseFloat(e.target.value) || 0})}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="button"
                    onClick={() => setNewTrade({...newTrade, stopLossSizeType: newTrade.stopLossSizeType === 'percent' ? 'pips' : 'percent'})}
                    className={`px-6 py-2 rounded-lg font-medium transition ${
                      newTrade.stopLossSizeType === 'percent'
                        ? 'bg-purple-600 text-white'
                        : 'bg-blue-600 text-white'
                    }`}
                  >
                    {newTrade.stopLossSizeType === 'percent' ? '%' : 'Pips'}
                  </button>
                </div>
              </div>

              {/* Position Type */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Position</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTrade({...newTrade, position: 'long'})}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${
                      newTrade.position === 'long'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <TrendingUp className="w-5 h-5 inline mr-1" />
                    Long
                  </button>
                  <button
                    onClick={() => setNewTrade({...newTrade, position: 'short'})}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${
                      newTrade.position === 'short'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    <TrendingDown className="w-5 h-5 inline mr-1" />
                    Short
                  </button>
                </div>
              </div>

              {/* Risk & R:R */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block">Risk (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={newTrade.risk}
                  onChange={(e) => setNewTrade({...newTrade, risk: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-sm text-gray-400 mb-2 block">R:R Ratio</label>
                <input
                  type="number"
                  step="0.1"
                  value={newTrade.rrRatio}
                  onChange={(e) => setNewTrade({...newTrade, rrRatio: parseFloat(e.target.value) || 0})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* Result */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Result</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setNewTrade({...newTrade, result: 'profit'})}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${
                      newTrade.result === 'profit'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    ✅ Profit
                  </button>
                  <button
                    onClick={() => setNewTrade({...newTrade, result: 'loss'})}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${
                      newTrade.result === 'loss'
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    ❌ Loss
                  </button>
                  <button
                    onClick={() => setNewTrade({...newTrade, result: 'breakeven'})}
                    className={`flex-1 py-2 rounded-lg font-medium transition ${
                      newTrade.result === 'breakeven'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-700 text-gray-300'
                    }`}
                  >
                    ➖ Breakeven
                  </button>
                </div>
              </div>

              {/* PNL */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center justify-between">
                  <span>P&L ($)</span>
                  <button
                    type="button"
                    onClick={() => setNewTrade({...newTrade, pnlMode: newTrade.pnlMode === 'auto' ? 'manual' : 'auto'})}
                    className={`text-xs px-3 py-1 rounded-lg transition ${
                      newTrade.pnlMode === 'auto'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-600 text-gray-300'
                    }`}
                  >
                    {newTrade.pnlMode === 'auto' ? '🔄 Auto' : '✏️ Manual'}
                  </button>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTrade.pnlMode === 'auto' ? calculateAutoPnl().toFixed(2) : newTrade.pnl}
                  onChange={(e) => setNewTrade({...newTrade, pnl: parseFloat(e.target.value) || 0})}
                  disabled={newTrade.pnlMode === 'auto'}
                  className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 ${
                    newTrade.pnlMode === 'auto' ? 'opacity-60 cursor-not-allowed' : ''
                  }`}
                />
                {newTrade.pnlMode === 'auto' && (
                  <p className="text-xs text-green-400 mt-1">
                    Auto: ${newTrade.initialBalance.toLocaleString()} × {newTrade.risk}% = ${calculateAutoPnl().toFixed(2)}
                  </p>
                )}
              </div>

              {/* Emotional State */}
              <div>
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Emotional State
                </label>
                <select
                  value={newTrade.emotionalState}
                  onChange={(e) => setNewTrade({...newTrade, emotionalState: e.target.value})}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select emotion...</option>
                  {EMOTIONAL_STATES.map(state => (
                    <option key={state.value} value={state.value}>
                      {state.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Trade Notes */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block">Trade Notes</label>
                <textarea
                  value={newTrade.tradeNotes}
                  onChange={(e) => setNewTrade({...newTrade, tradeNotes: e.target.value})}
                  rows="4"
                  placeholder="Write your thoughts, strategy, what you learned..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {/* Chart Screenshots - Link or Upload */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Chart Screenshots
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewTrade({...newTrade, chartInputType: 'link'})}
                      className={`text-xs px-3 py-1 rounded-lg transition ${
                        newTrade.chartInputType === 'link'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      🔗 Link
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewTrade({...newTrade, chartInputType: 'upload'})}
                      className={`text-xs px-3 py-1 rounded-lg transition ${
                        newTrade.chartInputType === 'upload'
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-400'
                      }`}
                    >
                      📤 Upload
                    </button>
                  </div>
                </label>

                {newTrade.chartInputType === 'link' ? (
                  <div className="space-y-3">
                    {/* Open Chart Link */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Open Chart Link</label>
                      <input
                        type="url"
                        value={newTrade.chartOpenLink}
                        onChange={(e) => setNewTrade({...newTrade, chartOpenLink: e.target.value})}
                        placeholder="https://tradingview.com/..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    {/* Close Chart Link */}
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Close Chart Link</label>
                      <input
                        type="url"
                        value={newTrade.chartCloseLink}
                        onChange={(e) => setNewTrade({...newTrade, chartCloseLink: e.target.value})}
                        placeholder="https://tradingview.com/..."
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 text-sm"
                      />
                    </div>

                    {/* Preview of links */}
                    {(newTrade.chartOpenLink || newTrade.chartCloseLink) && (
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        {newTrade.chartOpenLink && (
                          <div className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-xs text-green-400 mb-2">📈 Open</p>
                            <a
                              href={newTrade.chartOpenLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-400 hover:text-purple-300 break-all"
                            >
                              {newTrade.chartOpenLink.substring(0, 40)}...
                            </a>
                          </div>
                        )}
                        {newTrade.chartCloseLink && (
                          <div className="bg-gray-800 p-3 rounded-lg">
                            <p className="text-xs text-red-400 mb-2">📉 Close</p>
                            <a
                              href={newTrade.chartCloseLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-purple-400 hover:text-purple-300 break-all"
                            >
                              {newTrade.chartCloseLink.substring(0, 40)}...
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleChartUpload}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 text-sm"
                    />

                    {newTrade.chartScreenshots.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                        {newTrade.chartScreenshots.map((img, idx) => (
                          <div key={idx} className="relative group">
                            <img src={img} alt={`Chart ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                            <button
                              onClick={() => removeImage('chartScreenshots', idx)}
                              className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Confirmation Images */}
              <div className="md:col-span-2">
                <label className="text-sm text-gray-400 mb-2 block flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Confirmations / Proof
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleConfirmationUpload}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                />

                {newTrade.confirmationImages.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {newTrade.confirmationImages.map((img, idx) => (
                      <div key={idx} className="relative group">
                        <img src={img} alt={`Confirmation ${idx + 1}`} className="w-full h-32 object-cover rounded-lg" />
                        <button
                          onClick={() => removeImage('confirmationImages', idx)}
                          className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTrade}
                className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3 rounded-lg font-medium transition"
              >
                Add Trade
              </button>
            </div>
          </div>
        )}

        {/* Trades List */}
        <div className="mt-6">
          <h2 className="text-2xl font-bold mb-4">Your Trades ({trades.length})</h2>

          {trades.length === 0 ? (
            <div className="bg-gray-900 rounded-2xl p-12 text-center border border-gray-800">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <p className="text-gray-400 text-lg">No trades yet. Add your first trade!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {trades.map(trade => (
                <div key={trade.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-600 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-purple-400">{trade.symbol}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {trade.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {trade.time}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className={`px-4 py-2 rounded-lg font-bold ${
                        trade.position === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {trade.position === 'long' ? '📈 LONG' : '📉 SHORT'}
                      </div>

                      <div className={`px-4 py-2 rounded-lg font-bold ${
                        trade.result === 'profit' ? 'bg-green-500/20 text-green-400' :
                        trade.result === 'loss' ? 'bg-red-500/20 text-red-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {trade.result === 'profit' ? '✅ WIN' :
                         trade.result === 'loss' ? '❌ LOSS' :
                         '➖ BE'}
                      </div>

                      <button
                        onClick={() => handleDeleteTrade(trade.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg transition text-red-400"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Initial Balance</p>
                      <p className="text-white font-semibold">${trade.initialBalance?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Stop Loss Size</p>
                      <p className="text-white font-semibold">
                        {trade.stopLossSize || 'N/A'} {trade.stopLossSizeType === 'percent' ? '%' : 'Pips'}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">Risk</p>
                      <p className="text-white font-semibold">{trade.risk}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-xs mb-1">P&L</p>
                      <p className={`font-bold ${trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                        ${trade.pnl?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                  </div>

                  {trade.emotionalState && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-1">Emotional State</p>
                      <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-300 rounded-lg text-sm">
                        {EMOTIONAL_STATES.find(s => s.value === trade.emotionalState)?.label || trade.emotionalState}
                      </div>
                    </div>
                  )}

                  {trade.tradeNotes && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-1">Notes</p>
                      <p className="text-gray-300 text-sm bg-gray-800 p-3 rounded-lg">{trade.tradeNotes}</p>
                    </div>
                  )}

                  {/* Chart Links - با تصویر TradingView */}
                  {(trade.chartOpenLink || trade.chartCloseLink) && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-2">Chart Screenshots</p>
                      <div className="grid grid-cols-2 gap-3">
                        {trade.chartOpenLink && (
                          <a
                            href={trade.chartOpenLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-green-500 transition border border-green-500/30"
                          >
                            <div className="aspect-video bg-gradient-to-br from-green-900/20 to-emerald-900/20 flex items-center justify-center relative">
                              <img
                                src={`https://s3-symbol-logo.tradingview.com/crypto/XTVCUSDT--big.svg`}
                                alt="Open Chart"
                                className="w-16 h-16 opacity-50"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 items-center justify-center text-4xl">📈</div>
                            </div>
                            <div className="p-3">
                              <p className="text-green-400 text-sm font-semibold mb-1">📈 Open Chart</p>
                              <p className="text-gray-400 text-xs break-all line-clamp-1">{trade.chartOpenLink}</p>
                            </div>
                          </a>
                        )}
                        {trade.chartCloseLink && (
                          <a
                            href={trade.chartCloseLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-gray-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-red-500 transition border border-red-500/30"
                          >
                            <div className="aspect-video bg-gradient-to-br from-red-900/20 to-pink-900/20 flex items-center justify-center relative">
                              <img
                                src={`https://s3-symbol-logo.tradingview.com/crypto/XTVCUSDT--big.svg`}
                                alt="Close Chart"
                                className="w-16 h-16 opacity-50"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                              <div className="hidden absolute inset-0 items-center justify-center text-4xl">📉</div>
                            </div>
                            <div className="p-3">
                              <p className="text-red-400 text-sm font-semibold mb-1">📉 Close Chart</p>
                              <p className="text-gray-400 text-xs break-all line-clamp-1">{trade.chartCloseLink}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {trade.chartScreenshots && trade.chartScreenshots.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-2">Uploaded Images</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {trade.chartScreenshots.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Chart ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                            onClick={() => window.open(img, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {trade.confirmationImages && trade.confirmationImages.length > 0 && (
                    <div>
                      <p className="text-gray-400 text-xs mb-2">Confirmations</p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {trade.confirmationImages.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Confirmation ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg cursor-pointer hover:opacity-80 transition"
                            onClick={() => window.open(img, '_blank')}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Notification Toast */}
      {notification.show && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-6 py-3 rounded-lg shadow-2xl border-2 ${
            notification.type === 'success' ? 'bg-green-500/20 border-green-500' :
            notification.type === 'error' ? 'bg-red-500/20 border-red-500' :
            'bg-blue-500/20 border-blue-500'
          }`}>
            <span className="text-lg font-bold text-white">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Twinkle animation */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
        .animate-twinkle {
          animation: twinkle linear infinite;
        }
      `}</style>
    </div>
  );
}
