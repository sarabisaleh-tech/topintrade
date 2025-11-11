import React, { useState, useMemo, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, Calendar, Upload, Menu, X, Clock, LogOut, Shield, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import AdminPanel from './AdminPanel.jsx';
import ProfileMenu from './ProfileMenu.jsx';
import {
  loadUserData,
  saveBacktests,
  saveFolders,
  saveCurrentBacktest,
  saveTags,
  saveTrackingSessions,
  saveTradeFormDefaults,
  listenToUserData,
  migrateFromLocalStorage,
  forceSave
} from './firestoreData.js';
import { testFirestoreConnection } from './testFirestore.js';
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
// Theme Colors - می‌تونی اینجا رنگ‌ها رو تغییر بدی
const themeColors = {
  // Primary Colors
  primary: '#331a6bff',        // بنفش اصلی
  primaryLight: '#350b96',   // بنفش روشن
  primaryDark: '#350b96',    // بنفش تیره
  
  // Success/Profit
  success: '#063022ff',        // سبز
  successLight: '#063022ff',   
  successDark: '#063022ff',
  
  // Danger/Loss
  danger: '#8e1616ff',         // قرمز
  dangerLight: '#F87171',
  dangerDark: '#DC2626',
  
  // Info
  info: '#3B82F6',           // آبی
  infoLight: '#60A5FA',
  infoDark: '#2563EB',
  
  // Warning
  warning: '#F59E0B',        // نارنجی
  warningLight: '#FBBF24',
  warningDark: '#D97706',
  
  // Neutral
  background: '#000000',     // مشکی
  surface: '#151516ff',        // خاکستری تیره
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
  
  // Sessions
  tokyo: '#0a3426ff',          // سبز
  london: '#00388cff',         // آبی
  newyork: '#630707ff',        // قرمز
  sydney: '#331a6bff',         // بنفش - تغییر دادم
  
  // Custom - رنگ دلخواه تو
  custom1: '#350b96',        // رنگ بنفش تو
};
export default function BacktestApp({ onBack, isSharedView = false, sharedBacktestData = null }) {
  // Authentication
  const { currentUser, logout } = useAuth();

  // Admin Panel State
  const [showAdminPanel, setShowAdminPanel] = useState(false);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [dateRangeFrom, setDateRangeFrom] = useState('');
  const [dateRangeTo, setDateRangeTo] = useState('');
  const [showBacktestModal, setShowBacktestModal] = useState(false);
  const [showSidebar, setShowSidebar] = useState(!isSharedView); // سایدبار رو در shared view مخفی کن
  // Helper function برای ایجاد فیلترهای پیش‌فرض برای هر بک‌تست
  const getDefaultFilters = () => ({
    selectedSessions: ['Tokyo', 'London', 'NewYork', 'Sydney'],
    selectedWeekdays: [0, 1, 2, 3, 4, 5, 6],
    selectedHours: Array.from({ length: 24 }, (_, i) => i),
    deactivatedTags: [],
    selectedDailyCounts: [],
    selectedMonth: 'all'
  });

  const [folders, setFolders] = useState([{ id: 'root', name: 'User', isExpanded: true, emoji: '🪐' }]);
  const [backtests, setBacktests] = useState(
    isSharedView && sharedBacktestData
      ? [sharedBacktestData]
      : [{
          id: 1,
          name: 'ENA pro full filter D4 15m',
          balance: 100000,
          balanceType: 'fixed',
          trades: [],
          folderId: 'root',
          filters: getDefaultFilters()
        }]
  );
  const [currentBacktest, setCurrentBacktest] = useState(0);
  const [newBacktest, setNewBacktest] = useState({ name: '', balance: 100000, balanceType: 'fixed', folderId: 'root' });
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [backtestToMove, setBacktestToMove] = useState(null);
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [showEditBacktestModal, setShowEditBacktestModal] = useState(false);
  const [editingBacktest, setEditingBacktest] = useState(null);

  // فیلترهای بک‌تست فعلی - حالا از داخل هر بک‌تست خونده میشه
  const currentFilters = backtests[currentBacktest]?.filters || getDefaultFilters();
  const selectedSessions = currentFilters.selectedSessions;
  const selectedWeekdays = currentFilters.selectedWeekdays;
  const selectedHours = currentFilters.selectedHours;
  const deactivatedTags = currentFilters.deactivatedTags;
  const selectedDailyCounts = currentFilters.selectedDailyCounts;
  const selectedMonth = currentFilters.selectedMonth;

  // Helper functions برای آپدیت فیلترها
  const updateCurrentBacktestFilters = (filterUpdates) => {
    const updatedBacktests = [...backtests];
    updatedBacktests[currentBacktest] = {
      ...updatedBacktests[currentBacktest],
      filters: {
        ...updatedBacktests[currentBacktest].filters,
        ...filterUpdates
      }
    };
    setBacktests(updatedBacktests);
  };

  const setSelectedSessions = (sessions) => updateCurrentBacktestFilters({ selectedSessions: sessions });
  const setSelectedWeekdays = (weekdays) => updateCurrentBacktestFilters({ selectedWeekdays: weekdays });
  const setSelectedHours = (hours) => updateCurrentBacktestFilters({ selectedHours: hours });
  const setDeactivatedTags = (tags) => updateCurrentBacktestFilters({ deactivatedTags: tags });
  const setSelectedDailyCounts = (counts) => updateCurrentBacktestFilters({ selectedDailyCounts: counts });
  const setSelectedMonth = (month) => updateCurrentBacktestFilters({ selectedMonth: month });

  const [showFilteredStats, setShowFilteredStats] = useState(false);

  // Tracking Time States
  const [isTrackingTime, setIsTrackingTime] = useState(false);
  const [trackingStartTime, setTrackingStartTime] = useState(null);
  const [trackingSessions, setTrackingSessions] = useState([]);
  const [currentSessionTime, setCurrentSessionTime] = useState(0);
  const [todayAccumulatedTime, setTodayAccumulatedTime] = useState(0);
  const [todayAccumulatedDate, setTodayAccumulatedDate] = useState('');
  const [selectedTrackingMonth, setSelectedTrackingMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  const [newTrade, setNewTrade] = useState({
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    position: 'long',
    risk: 1,
    rrRatio: 2,
    stopLoss: 1,
    tag: '',
    timeFormat: '24h',
    stopLossType: 'percent',
    selectedTags: [],
    screenshotUrl: ''
  });
  
  const [savedTags, setSavedTags] = useState([]);
  const [pinnedTags, setPinnedTags] = useState([]);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: '' });

  // تست Firestore در window برای debug
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testFirestore = testFirestoreConnection;
      window.forceSave = forceSave;
      console.log('💡 Debug commands available:');
      console.log('   - testFirestore() → تست اتصال Firestore');
      console.log('   - forceSave() → ذخیره فوری (بدون انتظار 5 ثانیه)');
    }
  }, []);

  // Load all data from Firestore when user logs in (فقط اگر shared view نباشه)
  useEffect(() => {
    if (!currentUser || isSharedView) return;

    const loadData = async () => {
      try {
        console.log('🔑 Loading data for User Email:', currentUser.uid);
        console.log('📧 User Email:', currentUser.uid);
        const userData = await loadUserData(currentUser.uid);

        // Check if we need to migrate from localStorage
        const hasLocalData = window.localStorage?.getItem('backtests');
        if (hasLocalData && (!userData.backtests || userData.backtests.length === 0)) {
          console.log('Migrating data from localStorage to Firestore...');
          await migrateFromLocalStorage(currentUser.uid);
          // Reload data after migration
          const migratedData = await loadUserData(currentUser.uid);
          // اضافه کردن فیلترهای پیش‌فرض به بک‌تست‌هایی که ندارن
          const backtestsWithFilters = (migratedData.backtests.length > 0 ? migratedData.backtests : [{ id: 1, name: 'ENA pro full filter D4 15m', balance: 100000, balanceType: 'fixed', trades: [], folderId: 'root' }])
            .map(bt => ({ ...bt, filters: bt.filters || getDefaultFilters() }));
          setBacktests(backtestsWithFilters);
          const defaultFolderName = currentUser?.email?.split('@')[0] || currentUser?.displayName || 'User';
          setFolders(migratedData.folders.length > 0 ? migratedData.folders : [{ id: 'root', name: defaultFolderName, isExpanded: true, emoji: '🪐' }]);
          setCurrentBacktest(migratedData.currentBacktest || 0);
          setSavedTags(migratedData.savedTags || []);
          setPinnedTags(migratedData.pinnedTags || []);
          setTrackingSessions(migratedData.trackingSessions || []);
          setTodayAccumulatedTime(migratedData.todayAccumulatedTime || 0);
          setTodayAccumulatedDate(migratedData.todayAccumulatedDate || '');
          if (migratedData.tradeFormDefaults) {
            setNewTrade(prev => ({
              ...prev,
              date: migratedData.tradeFormDefaults.date || prev.date,
              time: migratedData.tradeFormDefaults.time || prev.time,
              timeFormat: migratedData.tradeFormDefaults.timeFormat || prev.timeFormat,
              stopLossType: migratedData.tradeFormDefaults.stopLossType || prev.stopLossType
            }));
          }
        } else {
          // Load from Firestore
          // اضافه کردن فیلترهای پیش‌فرض به بک‌تست‌هایی که ندارن
          const backtestsWithFilters = (userData.backtests.length > 0 ? userData.backtests : [{ id: 1, name: 'ENA pro full filter D4 15m', balance: 100000, balanceType: 'fixed', trades: [], folderId: 'root' }])
            .map(bt => ({ ...bt, filters: bt.filters || getDefaultFilters() }));
          setBacktests(backtestsWithFilters);
          const defaultFolderName = currentUser?.email?.split('@')[0] || currentUser?.displayName || 'User';
          setFolders(userData.folders.length > 0 ? userData.folders : [{ id: 'root', name: defaultFolderName, isExpanded: true, emoji: '🪐' }]);
          setCurrentBacktest(userData.currentBacktest || 0);
          setSavedTags(userData.savedTags || []);
          setPinnedTags(userData.pinnedTags || []);
          setTrackingSessions(userData.trackingSessions || []);

          // Handle today's accumulated time with date check (Iran time)
          const iranOffset = 3.5 * 60 * 60 * 1000; // 3.5 hours in milliseconds
          const iranTime = new Date(Date.now() + iranOffset);
          const today = iranTime.toISOString().split('T')[0];

          console.log('📅 Date check:', {
            savedDate: userData.todayAccumulatedDate,
            today: today,
            savedTime: Math.floor((userData.todayAccumulatedTime || 0) / 60000) + 'm',
            isToday: userData.todayAccumulatedDate === today
          });

          if (userData.todayAccumulatedDate === today) {
            // Same day - restore accumulated time
            console.log('✅ Same day - restoring accumulated time:', Math.floor((userData.todayAccumulatedTime || 0) / 60000) + 'm');
            setTodayAccumulatedTime(userData.todayAccumulatedTime || 0);
            setTodayAccumulatedDate(today);

            // Restore tracking state if was tracking
            if (userData.isTrackingTime && userData.trackingStartTime) {
              const savedStart = userData.trackingStartTime;
              const now = Date.now();

              // Check if saved start time is reasonable (not too far in past)
              const elapsedSinceSaved = now - savedStart;
              const maxReasonableElapsed = 24 * 60 * 60 * 1000; // 24 hours

              if (elapsedSinceSaved < maxReasonableElapsed && elapsedSinceSaved > 0) {
                setIsTrackingTime(true);
                setTrackingStartTime(savedStart);
                console.log('✅ Restored tracking session from:', new Date(savedStart).toLocaleString());
                console.log('   Elapsed since saved:', Math.floor(elapsedSinceSaved / 60000) + 'm');
              } else {
                console.log('⚠️ Saved tracking time is too old, not restoring');
              }
            }
          } else {
            // New day - reset accumulated time
            console.log('🆕 New day detected! Resetting accumulated time.');
            setTodayAccumulatedTime(0);
            setTodayAccumulatedDate(today);
            // Don't restore tracking state on new day
          }

          if (userData.tradeFormDefaults) {
            setNewTrade(prev => ({
              ...prev,
              date: userData.tradeFormDefaults.date || prev.date,
              time: userData.tradeFormDefaults.time || prev.time,
              timeFormat: userData.tradeFormDefaults.timeFormat || prev.timeFormat,
              stopLossType: userData.tradeFormDefaults.stopLossType || prev.stopLossType
            }));
          }
        }
      } catch (error) {
        console.error('Error loading data from Firestore:', error);
      }
    };

    loadData();
  }, [currentUser]);

  // Save backtests to Firestore whenever it changes
  useEffect(() => {
    if (currentUser?.uid && backtests.length > 0) {
      saveBacktests(currentUser.uid, backtests);
    }
  }, [backtests, currentUser]);

  // Save folders to Firestore whenever it changes
  useEffect(() => {
    if (currentUser?.uid && folders.length > 0) {
      saveFolders(currentUser.uid, folders);
    }
  }, [folders, currentUser]);

  // Save current backtest index to Firestore
  useEffect(() => {
    if (currentUser?.uid) {
      saveCurrentBacktest(currentUser.uid, currentBacktest);
    }
  }, [currentBacktest, currentUser]);

  // Save tags to Firestore whenever they change
  useEffect(() => {
    if (currentUser?.uid) {
      saveTags(currentUser.uid, savedTags, pinnedTags);
    }
  }, [savedTags, pinnedTags, currentUser]);

  // Auto-add pinned tags to new trades
  useEffect(() => {
    if (pinnedTags.length > 0) {
      setNewTrade(prev => {
        const uniqueTags = [...new Set([...pinnedTags, ...prev.selectedTags])];
        return { ...prev, selectedTags: uniqueTags };
      });
    }
  }, [pinnedTags]);

  // Auto-start tracking on user activity and auto-pause after 1 minute of inactivity
  useEffect(() => {
    if (!currentUser) return; // Only track for logged-in users

    let mouseMoveTimeout;
    const handleUserActivity = () => {
      setLastActivityTime(Date.now());

      // Auto-start tracking if not already tracking
      if (!isTrackingTime) {
        const iranOffset = 3.5 * 60 * 60 * 1000;
        const iranTime = new Date(Date.now() + iranOffset);
        const today = iranTime.toISOString().split('T')[0];

        setIsTrackingTime(true);
        // Start new session from now
        setTrackingStartTime(Date.now());

        if (!todayAccumulatedDate || todayAccumulatedDate !== today) {
          // New day or first time today
          setTodayAccumulatedDate(today);
        }

        console.log('▶️ Tracking started/resumed at:', new Date().toLocaleString());
      }
    };

    // Throttle mousemove to avoid performance issues
    const handleMouseMove = () => {
      if (mouseMoveTimeout) return;
      mouseMoveTimeout = setTimeout(() => {
        handleUserActivity();
        mouseMoveTimeout = null;
      }, 1000); // Only trigger once per second
    };

    // Listen to user activity events
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('scroll', handleUserActivity);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('scroll', handleUserActivity);
      window.removeEventListener('mousemove', handleMouseMove);
      if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
    };
  }, [isTrackingTime, currentUser, todayAccumulatedDate]);

  // Auto-pause after 1 minute of inactivity
  useEffect(() => {
    if (!isTrackingTime) return;

    const checkInactivity = setInterval(() => {
      const now = Date.now();
      const timeSinceLastActivity = now - lastActivityTime;
      const oneMinute = 60 * 1000; // 1 minute in milliseconds

      if (timeSinceLastActivity >= oneMinute) {
        // Auto-pause tracking
        const elapsed = now - trackingStartTime;
        setTodayAccumulatedTime(prev => prev + elapsed);
        setIsTrackingTime(false);
        setTrackingStartTime(null);
        setCurrentSessionTime(0);
      }
    }, 1000); // Check every second

    return () => clearInterval(checkInactivity);
  }, [isTrackingTime, lastActivityTime, trackingStartTime]);

  // Update tracking timer with Iran time check
  useEffect(() => {
    let interval;
    if (isTrackingTime) {
      interval = setInterval(() => {
        const now = Date.now();
        const elapsed = now - trackingStartTime;
        const total = todayAccumulatedTime + elapsed;

        // Check if midnight passed (Iran time = UTC+3:30)
        const iranOffset = 3.5 * 60 * 60 * 1000; // 3.5 hours in milliseconds
        const iranTime = new Date(now + iranOffset);
        const currentDate = iranTime.toISOString().split('T')[0];

        if (todayAccumulatedDate && todayAccumulatedDate !== currentDate) {
          // Midnight passed - reset
          const duration = todayAccumulatedTime + elapsed;
          const yesterday = new Date(iranTime);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          // Save yesterday's data
          setTrackingSessions(prev => {
            const updated = [...prev];
            const idx = updated.findIndex(s => s.date === yesterdayStr);
            if (idx >= 0) {
              updated[idx].duration = duration;
            } else {
              updated.push({ date: yesterdayStr, duration: duration });
            }
            // Save to Firestore
            if (currentUser?.uid) {
              saveTrackingSessions(currentUser.uid, updated, 0, currentDate, true, now);
            }
            return updated;
          });

          // Reset for new day
          setTodayAccumulatedTime(0);
          setTodayAccumulatedDate(currentDate);
          setTrackingStartTime(now);
          setCurrentSessionTime(0);
        } else {
          setCurrentSessionTime(total);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTrackingTime, trackingStartTime, todayAccumulatedTime, todayAccumulatedDate, currentUser]);

  // Auto-save tracking state when it changes
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Save tracking state to Firestore
    saveTrackingSessions(
      currentUser.uid,
      trackingSessions,
      todayAccumulatedTime,
      todayAccumulatedDate,
      isTrackingTime,
      trackingStartTime
    );
  }, [isTrackingTime, trackingStartTime, todayAccumulatedTime, todayAccumulatedDate, currentUser, trackingSessions]);

  // Auto-save tracking time every 5 seconds when tracking is active
  useEffect(() => {
    if (!currentUser?.uid || !isTrackingTime) return;

    const saveInterval = setInterval(() => {
      // Calculate current accumulated time including current session
      const now = Date.now();
      const currentSessionElapsed = now - trackingStartTime;
      const totalAccumulated = todayAccumulatedTime + currentSessionElapsed;

      console.log('💾 Auto-saving tracking time (every 5s):', {
        totalAccumulated: Math.floor(totalAccumulated / 60000) + 'm',
        todayAccumulated: Math.floor(todayAccumulatedTime / 60000) + 'm',
        currentSession: Math.floor(currentSessionElapsed / 60000) + 'm'
      });

      // Save to Firestore
      saveTrackingSessions(
        currentUser.uid,
        trackingSessions,
        todayAccumulatedTime,
        todayAccumulatedDate,
        isTrackingTime,
        trackingStartTime
      );
    }, 5000); // Every 5 seconds

    return () => clearInterval(saveInterval);
  }, [isTrackingTime, trackingStartTime, todayAccumulatedTime, todayAccumulatedDate, currentUser, trackingSessions]);

  const initialBalance = backtests?.[currentBacktest]?.balance || 100000;

  const getFilteredTrades = useMemo(() => {
    if (!backtests || backtests.length === 0) return [];
    const ct = backtests[currentBacktest]?.trades || [];

    // اگه همه چی فعاله، همه رو برگردون
    if (selectedSessions.length === 4 &&
        selectedWeekdays.length === 7 &&
        selectedHours.length === 24 &&
        deactivatedTags.length === 0 &&
        selectedDailyCounts.length === 0) {
      return ct;
    }

    // ابتدا فیلترهای معمولی (session, weekday, hour, tag) رو اعمال میکنیم
    let filtered = ct.filter(t => {
      // فیلتر Session
      const hour = parseInt(t.time.split(':')[0]);
      let session = 'London';

      if (hour >= 4 && hour < 12) session = 'Tokyo';
      else if (hour >= 11 && hour < 19) session = 'London';
      else if (hour >= 16 && hour < 24) session = 'NewYork';
      else if (hour >= 0 && hour < 8) session = 'Sydney';

      // اگه این سشن خاموشه، این ترید رو نگه ندار
      if (!selectedSessions.includes(session)) {
        return false;
      }

      // فیلتر Weekday
      const dayIndex = new Date(t.date).getDay();
      if (!selectedWeekdays.includes(dayIndex)) {
        return false;
      }

      // فیلتر Hour
      if (!selectedHours.includes(hour)) {
        return false;
      }

      // فیلتر Tag - اگر تگی غیرفعال شده باشد، تریدهای با آن تگ را نشان نده
      if (deactivatedTags.length > 0) {
        if (!t.tag) return true; // اگر تریدی تگ نداره، نشونش بده
        const tradeTags = t.tag.split(',').map(tag => tag.trim());
        const hasDeactivatedTag = tradeTags.some(tag => deactivatedTags.includes(tag));
        if (hasDeactivatedTag) {
          return false; // اگر حداقل یکی از تگ‌ها غیرفعال باشه، این ترید رو نشون نده
        }
      }

      return true;
    });

    // حالا فیلتر Daily Trade Count رو اعمال میکنیم
    // منطق: از هر روز فقط N تا اولین ترید (بر اساس زمان) رو نگه میداریم
    if (selectedDailyCounts.length > 0) {
      // تریدها رو بر اساس تاریخ و زمان مرتب میکنیم
      const sortedTrades = [...filtered].sort((a, b) => {
        const dateCompare = a.date.localeCompare(b.date);
        if (dateCompare !== 0) return dateCompare;

        // اگر تاریخ یکسانه، بر اساس زمان مرتب کن
        // فرض: فرمت time مثل "14:30" یا "09:15" هست
        const timeA = a.openTime || a.time || '00:00';
        const timeB = b.openTime || b.time || '00:00';
        return timeA.localeCompare(timeB);
      });

      // گروه‌بندی بر اساس تاریخ
      const tradesByDate = {};
      sortedTrades.forEach(t => {
        if (!tradesByDate[t.date]) {
          tradesByDate[t.date] = [];
        }
        tradesByDate[t.date].push(t);
      });

      // از هر روز، فقط به تعداد کمترین فیلتر انتخابی نگه میداریم
      // مثلاً اگه [1] انتخاب شده، از هر روز فقط 1 ترید نگه میداریم
      // اگه [1, 2] انتخاب شده، از هر روز فقط 1 ترید نگه میداریم (کمترین)
      const minCount = Math.min(...selectedDailyCounts);

      filtered = [];
      Object.keys(tradesByDate).forEach(date => {
        const dailyTrades = tradesByDate[date];
        // از این روز، فقط به تعداد کمترین فیلتر انتخابی رو نگه دار
        const tradesToKeep = dailyTrades.slice(0, minCount);
        filtered.push(...tradesToKeep);
      });
    }

    return filtered;
  }, [backtests, currentBacktest, selectedSessions, selectedWeekdays, selectedHours, deactivatedTags, selectedDailyCounts]);
  // آمار بدون فیلتر (همه تریدها)
  const statsBeforeFilter = useMemo(() => {
    const allTrades = backtests[currentBacktest]?.trades || [];
    
    const tt = allTrades.length;
    const w = allTrades.filter(t => t.result === 'profit').length;
    const l = allTrades.filter(t => t.result === 'loss').length;
    const wr = tt > 0 ? (w / tt * 100).toFixed(1) : 0;
    const tp = allTrades.reduce((s, t) => s + t.pnl, 0);
    const tpp = ((tp / initialBalance) * 100).toFixed(1);
    
    return { 
      totalTrades: tt, 
      wins: w,
      losses: l,
      winRate: wr, 
      totalPnl: tp.toFixed(2),
      totalPnlPercent: tpp
    };
  }, [backtests, currentBacktest, initialBalance]);

  const stats = useMemo(() => {
    const ct = getFilteredTrades;  // این درسته چون getFilteredTrades یه useMemo هست
    const tt = ct.length, w = ct.filter(t => t.result === 'profit').length, l = ct.filter(t => t.result === 'loss').length;
    const wr = tt > 0 ? (w / tt * 100).toFixed(1) : 0;
    const tp = ct.reduce((s, t) => s + t.pnl, 0);
    const tpp = ((tp / initialBalance) * 100).toFixed(1);
    const aw = w > 0 ? ct.filter(t => t.result === 'profit').reduce((s, t) => s + t.pnl, 0) / w : 0;
    const al = l > 0 ? Math.abs(ct.filter(t => t.result === 'loss').reduce((s, t) => s + t.pnl, 0) / l) : 0;
    const ex = tt > 0 ? ((aw * w) - (al * l)) / tt : 0;
    
    const totalRR = ct.reduce((sum, t) => sum + (t.result === 'profit' ? t.rrRatio : 0), 0);
    const avgRR = tt > 0 ? (totalRR / tt).toFixed(2) : 0;
    
    const totalRWins = ct.filter(t => t.result === 'profit').reduce((sum, t) => sum + t.rrRatio, 0);
    const totalRLosses = ct.filter(t => t.result === 'loss').length;
    const pf = totalRLosses > 0 ? (totalRWins / totalRLosses).toFixed(2) : totalRWins > 0 ? totalRWins.toFixed(2) : '0.00';
    
    let maxConsecutiveRecovery = 0;
    let currentStreak = 0;
    let lowestStreak = 0;
    
    ct.slice().reverse().forEach(t => {
      if (t.result === 'profit') {
        currentStreak += t.rrRatio;
      } else {
        currentStreak -= 1;
      }
      
      if (currentStreak < lowestStreak) {
        lowestStreak = currentStreak;
      }
      
      const recovery = currentStreak - lowestStreak;
      if (recovery > maxConsecutiveRecovery) {
        maxConsecutiveRecovery = recovery;
      }
    });
    
    const rf = maxConsecutiveRecovery.toFixed(2);
    
    const longTrades = ct.filter(t => t.position === 'long');
    const shortTrades = ct.filter(t => t.position === 'short');
    const longWins = longTrades.filter(t => t.result === 'profit').length;
    const shortWins = shortTrades.filter(t => t.result === 'profit').length;
    const longWR = longTrades.length > 0 ? (longWins / longTrades.length * 100).toFixed(1) : 0;
    const shortWR = shortTrades.length > 0 ? (shortWins / shortTrades.length * 100).toFixed(1) : 0;
    
    const longPnl = longTrades.reduce((s, t) => s + t.pnl, 0);
    const shortPnl = shortTrades.reduce((s, t) => s + t.pnl, 0);
    
    // محاسبه Max Drawdown - افت از بالاترین نقطه (peak to trough)
    let maxDD = 0;
    let currentEquity = initialBalance;
    let peakEquity = initialBalance;

    // Sort trades by date and time (oldest first)
    const sortedTrades = ct.slice().sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    sortedTrades.forEach(t => {
      currentEquity += t.pnl;

      // Track بالاترین equity
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
      }

      // محاسبه Drawdown از peak تا current
      if (currentEquity < peakEquity) {
        const ddAmount = peakEquity - currentEquity;
        const dd = (ddAmount / peakEquity) * 100;
        if (dd > maxDD) {
          maxDD = dd;
        }
      }
    });

    // محاسبه Peak Profit
    let maxEquity = initialBalance;
    let equity = initialBalance;

    const peakProfitTrades = [...ct].sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    peakProfitTrades.forEach(t => {
      equity += t.pnl;
      if (equity > maxEquity) {
        maxEquity = equity;
      }
    });

    const peakProfit = (((maxEquity - initialBalance) / initialBalance) * 100).toFixed(2);

    return {
      totalTrades: tt, wins: w, losses: l, winRate: wr, totalPnl: tp, totalPnlPercent: tpp,
      expectancy: ex.toFixed(2), profitFactor: pf, avgWin: aw.toFixed(0), avgLoss: al.toFixed(0),
      longTrades: longTrades.length, shortTrades: shortTrades.length, longWR, shortWR, longPnl, shortPnl,
      maxDrawdown: maxDD.toFixed(2), recoveryFactor: rf, averageRR: avgRR, peakProfit
    };
  }, [getFilteredTrades, initialBalance]); 

  const equityCurve = useMemo(() => {
    const ct = getFilteredTrades;
    const balance = backtests?.[currentBacktest]?.balance || 100000;

    let filteredTrades = ct;
    if (selectedMonth !== 'all') {
      filteredTrades = ct.filter(t => {
        const tradeMonth = new Date(t.date).toLocaleString('en-US', { month: 'short' });
        return tradeMonth.toLowerCase() === selectedMonth.toLowerCase();
      });
    }

    let startBalance = balance;
    if (selectedMonth !== 'all') {
      const tradesBeforeMonth = ct.filter(t => {
        const tradeDate = new Date(t.date);
        const selectedDate = new Date(filteredTrades[filteredTrades.length - 1]?.date || Date.now());
        return tradeDate < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      });
      startBalance = balance + tradesBeforeMonth.reduce((sum, t) => sum + t.pnl, 0);
    }

    let eq = startBalance;
    let maxDrawdownPercent = 0;
    const d = [{ trade: 0, equity: startBalance, drawdownLine: null, maxDrawdown: 0 }];

    const sortedTrades = filteredTrades.slice().reverse();

    sortedTrades.forEach((t, i) => {
      eq += t.pnl;

      // محاسبه Drawdown فقط زمانی که زیر بالانس شروع می‌رود
      if (eq < startBalance) {
        const ddAmount = startBalance - eq;
        const currentDrawdown = (ddAmount / startBalance) * 100;

        // به‌روزرسانی Max Drawdown
        if (currentDrawdown > maxDrawdownPercent) {
          maxDrawdownPercent = currentDrawdown;
        }
      }

      const ddLine = eq < startBalance ? startBalance : null;

      d.push({
        trade: i + 1,
        equity: eq,
        drawdownLine: ddLine,
        maxDrawdown: maxDrawdownPercent
      });
    });

    return d;
  }, [getFilteredTrades, backtests, currentBacktest, selectedMonth]);

  const monthlyStats = useMemo(() => {
    const ct = getFilteredTrades;
    const months = {};

    ct.forEach(t => {
      const month = new Date(t.date).toLocaleString('en-US', { month: 'short' });
      if (!months[month]) {
        months[month] = [];
      }
      months[month].push(t);
    });

    return Object.keys(months).sort((a, b) => {
      const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return monthOrder.indexOf(a) - monthOrder.indexOf(b);
    });
  }, [getFilteredTrades]);

  // Monthly Report Data - shows detailed stats for selected month
  const selectedMonthlyReport = useMemo(() => {
    if (selectedMonth === 'all') return null;

    const ct = getFilteredTrades;
    const filteredTrades = ct.filter(t => {
      const tradeMonth = new Date(t.date).toLocaleString('en-US', { month: 'short' });
      return tradeMonth.toLowerCase() === selectedMonth.toLowerCase();
    });

    if (filteredTrades.length === 0) return null;

    const wins = filteredTrades.filter(t => t.result === 'profit').length;
    const losses = filteredTrades.filter(t => t.result === 'loss').length;
    const total = filteredTrades.length;
    const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';

    const totalPnl = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
    const totalPnlPercent = ((totalPnl / initialBalance) * 100).toFixed(2);

    const avgWin = wins > 0 ? filteredTrades.filter(t => t.result === 'profit').reduce((sum, t) => sum + t.pnl, 0) / wins : 0;
    const avgLoss = losses > 0 ? Math.abs(filteredTrades.filter(t => t.result === 'loss').reduce((sum, t) => sum + t.pnl, 0) / losses) : 0;

    const profitFactor = losses > 0 ? (Math.abs(avgWin * wins) / Math.abs(avgLoss * losses)).toFixed(2) : wins > 0 ? '∞' : '0.00';

    const longTrades = filteredTrades.filter(t => t.position === 'long');
    const shortTrades = filteredTrades.filter(t => t.position === 'short');
    const longWins = longTrades.filter(t => t.result === 'profit').length;
    const shortWins = shortTrades.filter(t => t.result === 'profit').length;
    const longWR = longTrades.length > 0 ? ((longWins / longTrades.length) * 100).toFixed(1) : '0.0';
    const shortWR = shortTrades.length > 0 ? ((shortWins / shortTrades.length) * 100).toFixed(1) : '0.0';

    // Calculate Max Drawdown for this month
    // Max Drawdown = فقط زمانی محاسبه می‌شود که اکانت از balance اول ماه به ضرر برود
    const balance = backtests?.[currentBacktest]?.balance || 100000;

    // Calculate month start balance (balance before this month started)
    const tradesBeforeMonth = ct.filter(t => {
      const tradeDate = new Date(t.date);
      const selectedDate = new Date(filteredTrades[filteredTrades.length - 1]?.date || Date.now());
      return tradeDate < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    });
    const monthStartBalance = balance + tradesBeforeMonth.reduce((sum, t) => sum + t.pnl, 0);

    // Sort trades by date AND time (oldest first)
    const sortedTrades = filteredTrades.slice().sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    let currentEquity = monthStartBalance;
    let maxDrawdownPercent = 0;
    let peakTargetPercent = 0;
    let peakEquity = monthStartBalance;

    sortedTrades.forEach(t => {
      currentEquity += t.pnl;

      // محاسبه peak target (بالاترین سود از ابتدای ماه)
      if (currentEquity > peakEquity) {
        peakEquity = currentEquity;
        peakTargetPercent = ((peakEquity - monthStartBalance) / monthStartBalance) * 100;
      }

      // محاسبه Max Drawdown - فقط وقتی که زیر بالانس اولیه ماه میره
      if (currentEquity < monthStartBalance) {
        const ddAmount = monthStartBalance - currentEquity;
        const ddPercent = (ddAmount / monthStartBalance) * 100;
        if (ddPercent > maxDrawdownPercent) {
          maxDrawdownPercent = ddPercent;
        }
      }
    });

    // محاسبه Peak Profit تجمعی (از initial balance تا آخر این ماه)
    // باید بالاترین equity از ابتدا تا آخر این ماه رو پیدا کنیم
    let maxEquityEver = balance;
    let equityTracker = balance;

    // Get all trades up to and including this month, sorted by date
    const allTradesUpToMonth = ct.filter(t => {
      const tradeDate = new Date(t.date);
      const lastTradeOfMonth = new Date(filteredTrades[filteredTrades.length - 1]?.date || Date.now());
      return tradeDate <= lastTradeOfMonth;
    }).sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    allTradesUpToMonth.forEach(t => {
      equityTracker += t.pnl;
      if (equityTracker > maxEquityEver) {
        maxEquityEver = equityTracker;
      }
    });

    const peakProfitPercent = (((maxEquityEver - balance) / balance) * 100).toFixed(2);

    // Debug log for comparison
    console.log(`Selected Monthly Report (${selectedMonth}): Peak Profit = ${peakProfitPercent}%, Initial Balance = $${balance.toFixed(0)}, Max Equity Ever = $${maxEquityEver.toFixed(0)}`);

    return {
      totalTrades: total,
      wins,
      losses,
      winRate,
      totalPnl: totalPnl.toFixed(2),
      totalPnlPercent,
      avgWin: avgWin.toFixed(0),
      avgLoss: avgLoss.toFixed(0),
      profitFactor,
      longTrades: longTrades.length,
      shortTrades: shortTrades.length,
      longWR,
      shortWR,
      maxDrawdown: maxDrawdownPercent.toFixed(2),
      peakTarget: peakTargetPercent.toFixed(2),
      peakProfit: peakProfitPercent
    };
  }, [selectedMonth, getFilteredTrades, initialBalance, backtests, currentBacktest]);

  // Monthly Peak Profit - محاسبه Peak Profit برای هر ماه
  const monthlyPeakProfits = useMemo(() => {
    const ct = getFilteredTrades;
    if (ct.length === 0) return [];

    const balance = backtests?.[currentBacktest]?.balance || 100000;

    // Group trades by month
    const months = {};
    ct.forEach(t => {
      const month = new Date(t.date).toLocaleString('en-US', { month: 'short' });
      if (!months[month]) months[month] = [];
      months[month].push(t);
    });

    const results = [];
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    monthOrder.forEach(month => {
      if (!months[month]) return;

      const filteredTrades = months[month];

      // محاسبه بالانس اول ماه
      const tradesBeforeMonth = ct.filter(t => {
        const tradeDate = new Date(t.date);
        const selectedDate = new Date(filteredTrades[filteredTrades.length - 1]?.date || Date.now());
        return tradeDate < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      });
      const monthStartBalance = balance + tradesBeforeMonth.reduce((sum, t) => sum + t.pnl, 0);

      // Sort trades by date (oldest first)
      const sortedTrades = filteredTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

      // محاسبه Peak Profit برای این ماه
      let currentEquity = monthStartBalance;
      let peakEquity = monthStartBalance;

      sortedTrades.forEach(t => {
        currentEquity += t.pnl;
        if (currentEquity > peakEquity) {
          peakEquity = currentEquity;
        }
      });

      // محاسبه Peak Profit به درصد از بالانس اولیه
      const peakProfitPercent = (((peakEquity - monthStartBalance) / balance) * 100).toFixed(2);

      results.push({
        month,
        peakProfit: parseFloat(peakProfitPercent),
        trades: sortedTrades.length,
        monthStartBalance: monthStartBalance.toFixed(0),
        peakEquity: peakEquity.toFixed(0)
      });
    });

    return results;
  }, [getFilteredTrades, backtests, currentBacktest]);

  // Monthly Peak Targets - Calculate peak target for each month (exactly like Monthly Report)
  const monthlyPeakTargets = useMemo(() => {
    const ct = getFilteredTrades;
    if (ct.length === 0) return [];

    const balance = backtests?.[currentBacktest]?.balance || 100000;

    // Group trades by month
    const months = {};
    ct.forEach(t => {
      const month = new Date(t.date).toLocaleString('en-US', { month: 'short' });
      if (!months[month]) {
        months[month] = [];
      }
      months[month].push(t);
    });

    // Month order
    const monthOrder = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const results = [];

    monthOrder.forEach(month => {
      if (!months[month]) return; // Skip months with no trades

      const filteredTrades = months[month];

      // Calculate month start balance - same as Monthly Report
      const tradesBeforeMonth = ct.filter(t => {
        const tradeDate = new Date(t.date);
        const selectedDate = new Date(filteredTrades[filteredTrades.length - 1]?.date || Date.now());
        return tradeDate < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      });
      const monthStartBalance = balance + tradesBeforeMonth.reduce((sum, t) => sum + t.pnl, 0);

      // Sort trades by date (oldest first) - same as Monthly Report
      const sortedTrades = filteredTrades.slice().sort((a, b) => new Date(a.date) - new Date(b.date));

      let currentEquity = monthStartBalance;
      let peakTargetPercent = 0;
      let peakEquity = monthStartBalance;

      // محاسبه peak target (بالاترین سود از ابتدای ماه) - EXACTLY like Monthly Report
      sortedTrades.forEach(t => {
        currentEquity += t.pnl;

        if (currentEquity > peakEquity) {
          peakEquity = currentEquity;
          peakTargetPercent = ((peakEquity - monthStartBalance) / monthStartBalance) * 100;
        }
      });

      results.push({
        month,
        peakTarget: peakTargetPercent,
        trades: sortedTrades.length
      });

      // Debug log
      console.log(`${month}: Peak Target = ${peakTargetPercent.toFixed(2)}%, Start Balance = $${monthStartBalance.toFixed(0)}, Peak = $${peakEquity.toFixed(0)}`);
    });

    console.log('Monthly Peak Targets Results:', results);
    console.log('Total months with trades:', results.length);
    return results;
  }, [getFilteredTrades, backtests, currentBacktest]);

  const dailyDrawdown = useMemo(() => {
    const ct = getFilteredTrades;

    let filteredTrades = ct;
    if (selectedMonth !== 'all') {
      filteredTrades = ct.filter(t => {
        const tradeMonth = new Date(t.date).toLocaleString('en-US', { month: 'short' });
        return tradeMonth.toLowerCase() === selectedMonth.toLowerCase();
      });
    }

    const balance = backtests?.[currentBacktest]?.balance || 100000;

    // گروه‌بندی تریدها بر اساس تاریخ
    const tradesByDate = {};
    filteredTrades.forEach(t => {
      if (!tradesByDate[t.date]) {
        tradesByDate[t.date] = [];
      }
      tradesByDate[t.date].push(t);
    });

    // محاسبه Drawdown برای هر روز
    let maxDailyDD = 0;

    // مرتب کردن تاریخ‌ها
    const sortedDates = Object.keys(tradesByDate).sort();

    sortedDates.forEach((date, dayIndex) => {
      const dayTrades = tradesByDate[date];

      // محاسبه بالانس اول روز (تمام trades قبل از این روز)
      let dayStartBalance = balance;
      for (let i = 0; i < dayIndex; i++) {
        const prevDate = sortedDates[i];
        const prevDayTrades = tradesByDate[prevDate];
        dayStartBalance += prevDayTrades.reduce((sum, t) => sum + t.pnl, 0);
      }

      // مرتب کردن trades بر اساس زمان
      const sortedDayTrades = dayTrades.sort((a, b) => a.time.localeCompare(b.time));

      let currentEquity = dayStartBalance;
      let maxDDInDay = 0;

      sortedDayTrades.forEach(t => {
        currentEquity += t.pnl;

        // Drawdown فقط زمانی حساب می‌شود که زیر بالانس اول روز برود
        if (currentEquity < dayStartBalance) {
          const ddAmount = dayStartBalance - currentEquity;
          const ddPercent = (ddAmount / dayStartBalance) * 100;
          if (ddPercent > maxDDInDay) {
            maxDDInDay = ddPercent;
          }
        }
      });

      if (maxDDInDay > maxDailyDD) {
        maxDailyDD = maxDDInDay;
      }
    });

    return maxDailyDD.toFixed(2);
  }, [getFilteredTrades, selectedMonth, backtests, currentBacktest]);

  const dailyTradeCountAnalysis = useMemo(() => {
    const ct = getFilteredTrades;
    if (ct.length === 0) return [];
    
    const tradesByDate = {};
    ct.forEach(t => {
      if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
      tradesByDate[t.date].push(t);
    });
    
    const limits = [1, 2, 3, 4, 5];
    const analysis = limits.map(limit => {
      let totalTrades = 0;
      let wins = 0;
      let losses = 0;
      let activeDays = 0;
      
      Object.values(tradesByDate).forEach(dayTrades => {
        if (dayTrades.length >= limit) {
          activeDays++;
          const limitedTrades = dayTrades.slice(-limit);
          limitedTrades.forEach(trade => {
            totalTrades++;
            if (trade.result === 'profit') wins++;
            else losses++;
          });
        }
      });
      
      const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : 0;
      const totalPercent = totalTrades > 0 ? ((totalTrades / ct.length) * 100).toFixed(0) : 0;
      
      return {
        limit,
        trades: totalTrades,
        wins,
        losses,
        winRate,
        days: activeDays,
        totalPercent,
        wlRatio: `${wins}W/${losses}L`
      };
    });
    
    return analysis;
  }, [getFilteredTrades]);

  // استخراج گزینه‌های Daily Trade Count برای فیلتر
  const dailyCountOptions = useMemo(() => {
    const ct = backtests[currentBacktest]?.trades || [];
    if (ct.length === 0) return [];

    const tradesByDate = {};
    ct.forEach(t => {
      if (!tradesByDate[t.date]) {
        tradesByDate[t.date] = 0;
      }
      tradesByDate[t.date]++;
    });

    const counts = Object.values(tradesByDate);
    const uniqueCounts = [...new Set(counts)].sort((a, b) => a - b);

    return uniqueCounts.map(count => {
      const daysWithThisCount = Object.entries(tradesByDate).filter(([_, c]) => c === count).length;
      const totalTradesWithThisCount = count * daysWithThisCount;

      return {
        count,
        days: daysWithThisCount,
        totalTrades: totalTradesWithThisCount
      };
    });
  }, [backtests, currentBacktest]);

  const weekdayData = useMemo(() => {
    const ct = getFilteredTrades;
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const data = weekdays.map(day => ({ day, wins: 0, losses: 0, total: 0, winRate: 0 }));
    
    ct.forEach(t => {
      const dayIndex = new Date(t.date).getDay();
      if (t.result === 'profit') data[dayIndex].wins++;
      else data[dayIndex].losses++;
      data[dayIndex].total++;
    });
    
    data.forEach(d => {
      d.winRate = d.total > 0 ? ((d.wins / d.total) * 100).toFixed(1) : 0;
    });
    
    return data;
  }, [getFilteredTrades]);

  const sessionData = useMemo(() => {
    const ct = getFilteredTrades;
    const sessions = { 
      Tokyo: { wins: 0, losses: 0, total: 0 }, 
      London: { wins: 0, losses: 0, total: 0 }, 
      NewYork: { wins: 0, losses: 0, total: 0 },
      Sydney: { wins: 0, losses: 0, total: 0 }
    };
    
    ct.forEach(t => {
      const hour = parseInt(t.time.split(':')[0]);
      let session = 'London';
      
      // Tokyo: 4 صبح - 12 ظهر (4-12)
      if (hour >= 4 && hour < 12) session = 'Tokyo';
      // London: 11 صبح - 7 شب (11-19)
      else if (hour >= 11 && hour < 19) session = 'London';
      // NewYork: 4 بعدازظهر - 12 شب (16-24)
      else if (hour >= 16 && hour < 24) session = 'NewYork';
      // Sydney: 12 شب - 8 صبح (0-8)
      else if (hour >= 0 && hour < 8) session = 'Sydney';
      
      if (t.result === 'profit') sessions[session].wins++;
      else sessions[session].losses++;
      sessions[session].total++;
    });
  
    return Object.entries(sessions).map(([name, data]) => ({
      session: name,
      winRate: data.total > 0 ? ((data.wins / data.total) * 100).toFixed(1) : 0,
      trades: `${data.wins}/${data.total}`
    }));
  }, [getFilteredTrades]);

  const timeHeatmapData = useMemo(() => {
    const ct = getFilteredTrades;
    const weekdays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
    const heatmap = {};
    
    hours.forEach(h => {
      heatmap[h] = {
        days: weekdays.map(() => ({ count: 0, wins: 0, losses: 0 })),
        totalWins: 0,
        totalLosses: 0,
        totalCount: 0
      };
    });
    
    ct.forEach(t => {
      const hour = t.time.split(':')[0];
      const dayIndex = new Date(t.date).getDay();
      if (heatmap[hour]) {
        heatmap[hour].days[dayIndex].count++;
        heatmap[hour].totalCount++;
        
        if (t.result === 'profit') {
          heatmap[hour].days[dayIndex].wins++;
          heatmap[hour].totalWins++;
        } else {
          heatmap[hour].days[dayIndex].losses++;
          heatmap[hour].totalLosses++;
        }
      }
    });
    
    return { hours, weekdays, data: heatmap };
  }, [getFilteredTrades]);

  // تگ‌های همه تریدها (بدون فیلتر) - برای نمایش در لیست
  const allTagsData = useMemo(() => {
    const allTrades = backtests[currentBacktest]?.trades || [];
    const tags = {};

    allTrades.forEach(t => {
      if (t.tag && t.tag.trim()) {
        const individualTags = t.tag.split(',').map(tag => tag.trim()).filter(tag => tag);

        individualTags.forEach(tag => {
          if (!tags[tag]) tags[tag] = { wins: 0, losses: 0, total: 0, pnl: 0 };
          if (t.result === 'profit') tags[tag].wins++;
          else if (t.result === 'loss') tags[tag].losses++;
          tags[tag].total++;
          tags[tag].pnl += t.pnl;
        });
      }
    });

    return Object.entries(tags)
      .map(([tag, data]) => ({
        tag,
        winRate: ((data.wins / data.total) * 100).toFixed(1),
        trades: `${data.wins}/${data.total}`,
        pnl: data.pnl,
        totalTrades: data.total
      }))
      .sort((a, b) => b.totalTrades - a.totalTrades);
  }, [backtests, currentBacktest]);

  // تگ‌های تریدهای فیلتر شده - برای نمایش آمار
  const tagAnalysisData = useMemo(() => {
    const ct = getFilteredTrades;
    const tags = {};

    ct.forEach(t => {
      if (t.tag && t.tag.trim()) {
        // جدا کردن تگ‌های multiple با کاما
        const individualTags = t.tag.split(',').map(tag => tag.trim()).filter(tag => tag);

        individualTags.forEach(tag => {
          if (!tags[tag]) tags[tag] = { wins: 0, losses: 0, total: 0, pnl: 0 };
          if (t.result === 'profit') tags[tag].wins++;
          else if (t.result === 'loss') tags[tag].losses++;
          tags[tag].total++;
          tags[tag].pnl += t.pnl;
        });
      }
    });

    return Object.entries(tags)
      .map(([tag, data]) => ({
        tag,
        winRate: ((data.wins / data.total) * 100).toFixed(1),
        trades: `${data.wins}/${data.total}`,
        pnl: data.pnl,
        totalTrades: data.total
      }))
      .sort((a, b) => b.totalTrades - a.totalTrades);
  }, [getFilteredTrades]);

  const filteredTrades = useMemo(() => {
    const ct = getFilteredTrades;

    // فیلتر جستجو
    let filtered = !searchTerm ? ct : ct.filter(t =>
      t.date.includes(searchTerm) ||
      t.time.includes(searchTerm) ||
      t.position.includes(searchTerm.toLowerCase())
    );

    // فیلتر تاریخ
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      filtered = filtered.filter(t => {
        const tradeDate = new Date(t.date);
        const tradeDateOnly = new Date(tradeDate.getFullYear(), tradeDate.getMonth(), tradeDate.getDate());

        switch(dateFilter) {
          case 'today':
            return tradeDateOnly.getTime() === today.getTime();
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return tradeDateOnly.getTime() === yesterday.getTime();
          case 'thisWeek':
            const weekStart = new Date(today);
            weekStart.setDate(today.getDate() - today.getDay());
            return tradeDateOnly >= weekStart;
          case 'thisMonth':
            return tradeDate.getMonth() === now.getMonth() && tradeDate.getFullYear() === now.getFullYear();
          case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            return tradeDate.getMonth() === lastMonth.getMonth() && tradeDate.getFullYear() === lastMonth.getFullYear();
          case 'dateRange':
            // فیلتر محدوده تاریخ
            if (dateRangeFrom && dateRangeTo) {
              const fromDate = new Date(dateRangeFrom);
              const toDate = new Date(dateRangeTo);
              return tradeDateOnly >= fromDate && tradeDateOnly <= toDate;
            } else if (dateRangeFrom) {
              const fromDate = new Date(dateRangeFrom);
              return tradeDateOnly >= fromDate;
            } else if (dateRangeTo) {
              const toDate = new Date(dateRangeTo);
              return tradeDateOnly <= toDate;
            }
            return true;
          default:
            return true;
        }
      });
    }

    // مرتب‌سازی بر اساس تاریخ و ساعت (جدیدترین اول)
    return filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.time.localeCompare(a.time);
    });
  }, [getFilteredTrades, searchTerm, dateFilter, dateRangeFrom, dateRangeTo]);

  const handleAddTrade = (result) => {
    let pnl = 0;

    // محاسبه بالانس برای Dynamic
    let currentBalance = initialBalance;
    
    if (backtests[currentBacktest].balanceType === 'dynamic') {
      // محاسبه سود/ضرر ماهانه
      const ct = backtests[currentBacktest]?.trades || [];
      
      // گروه‌بندی بر اساس ماه
      const monthlyPnl = {};
      ct.forEach(t => {
        const monthKey = t.date.substring(0, 7); // 2025-01
        if (!monthlyPnl[monthKey]) {
          monthlyPnl[monthKey] = 0;
        }
        monthlyPnl[monthKey] += t.pnl;
      });
      
      // محاسبه بالانس تا ماه قبل
      const currentMonth = newTrade.date.substring(0, 7);
      Object.keys(monthlyPnl).forEach(month => {
        if (month < currentMonth) {
          const monthProfit = monthlyPnl[month];
          currentBalance += monthProfit;
        }
      });
      
      // اگه همین ماهه، از بالانس اول ماه استفاده کن
      const thisMonthTrades = ct.filter(t => t.date.substring(0, 7) === currentMonth);
      if (thisMonthTrades.length === 0) {
        // اولین ترید این ماه
      } else {
        // بالانس اول ماه رو نگه دار
        currentBalance = initialBalance;
        Object.keys(monthlyPnl).forEach(month => {
          if (month < currentMonth) {
            currentBalance += monthlyPnl[month];
          }
        });
      }
    }
    
    const riskAmount = (newTrade.risk / 100) * currentBalance;
    
    if (result === 'profit') {
      pnl = riskAmount * newTrade.rrRatio;
    } else if (result === 'loss') {
      pnl = -riskAmount;
    } else if (result === 'riskfree') {
      pnl = 0;
    }
    
    const ub = [...backtests]; 
    const tagString = newTrade.selectedTags.join(', ');
    ub[currentBacktest].trades = [{ 
      id: Date.now(), 
      ...newTrade, 
      tag: tagString, 
      result, 
      pnl,
      stopLossType: newTrade.stopLossType 
    }, ...ub[currentBacktest].trades];
    setBacktests(ub);
    
    newTrade.selectedTags.forEach(tag => {
      if (!savedTags.includes(tag)) {
        setSavedTags([...savedTags, tag]);
      }
    });

    // Keep pinned tags, remove only non-pinned tags
    setNewTrade({ ...newTrade, selectedTags: pinnedTags, screenshotUrl: '' });
    setTagInput('');
    
    // نمایش نوتیفیکیشن
    const messages = {
      profit: '✅ Take Profit recorded',
      loss: '❌ Stop Loss recorded',
      riskfree: '🔵 Risk Free recorded'
    };
    setNotification({ show: true, message: messages[result], type: result });
    setTimeout(() => setNotification({ show: false, message: '', type: '' }), 2000);
  };

  const handleDeleteTag = (tagToDelete) => {
    setSavedTags(savedTags.filter(tag => tag !== tagToDelete));
  };

  const handleSelectTag = (tag) => {
    setNewTrade({ ...newTrade, tag });
    setShowTagDropdown(false);
  };

  const handleUndo = () => {
    const ct = backtests[currentBacktest]?.trades || [];
    if (ct.length > 0) {
      const ub = [...backtests];
      ub[currentBacktest].trades = ct.slice(1);
      setBacktests(ub);
    }
  };

  const handleDeleteTrade = (id) => {
    const ub = [...backtests];
    ub[currentBacktest].trades = ub[currentBacktest].trades.filter(t => t.id !== id);
    setBacktests(ub);
  };

  const handleEditTrade = (trade) => {
    // تبدیل تگ از string به array برای نمایش chips
    const tagsArray = trade.tag ? trade.tag.split(',').map(t => t.trim()).filter(t => t) : [];
    setEditingTrade({...trade, selectedTags: tagsArray});
    setShowEditModal(true);
  };

  const handleSaveEditTrade = () => {
    if (!editingTrade) return;

    const riskAmount = (editingTrade.risk / 100) * initialBalance;
    let newPnl = 0;

    if (editingTrade.result === 'profit') {
      newPnl = riskAmount * editingTrade.rrRatio;
    } else if (editingTrade.result === 'loss') {
      newPnl = -riskAmount;
    } else if (editingTrade.result === 'riskfree') {
      newPnl = 0;
    }

    // تبدیل selectedTags از array به string
    const tagString = editingTrade.selectedTags ? editingTrade.selectedTags.join(', ') : '';

    const ub = [...backtests];
    ub[currentBacktest].trades = ub[currentBacktest].trades.map(t =>
      t.id === editingTrade.id ? {...editingTrade, tag: tagString, pnl: newPnl} : t
    );
    setBacktests(ub);
    setShowEditModal(false);
    setEditingTrade(null);
  };

  const handleCreateBacktest = () => {
    if (!newBacktest.name.trim()) {
      alert('Please enter a backtest name');
      return;
    }
    setBacktests([...backtests, {
      id: Date.now(),
      ...newBacktest,
      balance: parseFloat(newBacktest.balance),
      trades: [],
      filters: getDefaultFilters() // اضافه کردن فیلترهای پیش‌فرض
    }]);
    setCurrentBacktest(backtests.length);
    setShowBacktestModal(false);
    // Keep the current folderId instead of resetting to 'root'
    const currentFolderId = newBacktest.folderId || folders[0]?.id || 'root';
    setNewBacktest({ name: '', balance: 100000, balanceType: 'fixed', folderId: currentFolderId });
  };

  // لیست ایموجی سیاره‌ها
  const planetEmojis = ['🪐', '🌑', '🌒', '🌓', '🌔', '🌍', '🌕', '🌖', '🌗', '🌘', '⭐', '🌎', '🌟', '✨', '💫', '🌠', '🌏'];

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) {
      alert('Please enter a folder name');
      return;
    }

    // انتخاب ایموجی سیاره بدون تکرار
    const usedEmojis = folders.filter(f => f.emoji).map(f => f.emoji);
    const availableEmojis = planetEmojis.filter(e => !usedEmojis.includes(e));
    const selectedEmoji = availableEmojis.length > 0
      ? availableEmojis[Math.floor(Math.random() * availableEmojis.length)]
      : planetEmojis[Math.floor(Math.random() * planetEmojis.length)];

    setFolders([...folders, {
      id: `folder-${Date.now()}`,
      name: newFolderName,
      isExpanded: true,
      emoji: selectedEmoji
    }]);
    setShowNewFolderModal(false);
    setNewFolderName('');
  };
  
  const toggleFolder = (fid) => setFolders(folders.map(f => f.id === fid ? {...f, isExpanded: !f.isExpanded} : f));
  // Function to get planet icon for folders
  const getPlanetIcon = (folderId, index) => {
    const planets = ['🪐', '🌍', '🌎', '🌏', '🪐', '⭐', '🌟', '💫', '✨', '🌙', '☄️', '🌠'];
    if (folderId === 'root') return '🪐'; // Saturn for root
    return planets[index % planets.length];
  };

  const handleMoveBacktest = (bid, tfid) => { setBacktests(backtests.map(bt => bt.id === bid ? {...bt, folderId: tfid} : bt)); setShowMoveModal(false); setBacktestToMove(null); };
  const handleDeleteFolder = (fid) => { if (fid === 'root') { alert('Cannot delete root folder'); return; } if (backtests.some(bt => bt.folderId === fid)) { alert('Cannot delete folder with backtests.'); return; } setFolders(folders.filter(f => f.id !== fid)); };
  const handleDeleteBacktest = (idx) => {
    if (backtests.length === 1) {
      alert('Cannot delete the last backtest');
      return;
    }
    const ub = backtests.filter((_, i) => i !== idx);
    setBacktests(ub);
    if (currentBacktest >= ub.length) setCurrentBacktest(ub.length - 1);
  };

  const handleEditFolder = (folder) => {
    setEditingFolder({ ...folder });
    setShowEditFolderModal(true);
  };

  const handleSaveFolder = () => {
    if (!editingFolder.name.trim()) {
      alert('Please enter a folder name');
      return;
    }
    setFolders(folders.map(f => f.id === editingFolder.id ? { ...f, name: editingFolder.name } : f));
    setShowEditFolderModal(false);
    setEditingFolder(null);
  };

  const handleEditBacktest = (backtest, index) => {
    setEditingBacktest({ ...backtest, index });
    setShowEditBacktestModal(true);
  };

  const handleSaveBacktest = () => {
    if (!editingBacktest.name.trim()) {
      alert('Please enter a backtest name');
      return;
    }
    const updatedBacktests = [...backtests];
    updatedBacktests[editingBacktest.index] = {
      ...updatedBacktests[editingBacktest.index],
      name: editingBacktest.name,
      balance: parseFloat(editingBacktest.balance) || 100000,
      balanceType: editingBacktest.balanceType
    };
    setBacktests(updatedBacktests);
    setShowEditBacktestModal(false);
    setEditingBacktest(null);
  };
  
  const handleExportCSV = () => {
    const ct = backtests[currentBacktest]?.trades || [];
    const headers = ['Date', 'Time', 'Position', 'Risk', 'RR', 'StopLoss', 'StopLossType', 'Result', 'PnL', 'Tag', 'Screenshot'];
    const rows = ct.map(t => [t.date, t.time, t.position, t.risk, t.rrRatio, t.stopLoss, t.stopLossType || 'percent', t.result, t.pnl, t.tag || '', t.screenshotUrl || '']);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${backtests[currentBacktest].name}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleShareBacktest = async () => {
    const currentBt = backtests[currentBacktest];
    if (!currentBt || !currentBt.trades || currentBt.trades.length === 0) {
      alert('No trades to share! Please add some trades first.');
      return;
    }

    try {
      // ساخت یک ID منحصر به فرد برای share link
      const shareId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // تبدیل trades به فرمت مناسب ShareBacktest
      const shareData = {
        name: currentBt.name,
        balance: currentBt.balance,
        balanceType: currentBt.balanceType,
        trades: currentBt.trades.map(t => ({
          symbol: t.position || 'N/A',
          position: t.position || 'long',
          profit: parseFloat(t.pnl),
          profitPercent: t.pnl ? ((t.pnl / currentBt.balance) * 100) : 0,
          entryTime: new Date(`${t.date}T${t.time}`).toISOString(),
          session: determineSession(t.time),
          tags: t.tag ? t.tag.split(',').map(tag => tag.trim()).filter(tag => tag) : [],
          risk: t.risk || 1,
          rrRatio: t.rrRatio || 2,
          stopLoss: t.stopLoss || 1,
          stopLossType: t.stopLossType || 'percent',
          screenshotUrl: t.screenshotUrl || ''
        })),
        createdAt: new Date().toISOString()
      };

      // ذخیره در Firestore
      await setDoc(doc(db, 'shared_backtests', shareId), shareData);

      // ساخت لینک (استفاده از hash برای dev mode)
      // در production باید از pathname استفاده کنیم
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const shareUrl = isLocalhost
        ? `${window.location.origin}/#/share/backtest/${shareId}`
        : `${window.location.origin}/share/backtest/${shareId}`;

      // کپی کردن لینک به کلیپبورد
      navigator.clipboard.writeText(shareUrl).then(() => {
        alert(`Share link copied to clipboard!\n\n${shareUrl}\n\nAnyone with this link can view your backtest (read-only).`);
      }).catch(err => {
        // اگر clipboard API کار نکرد، لینک رو نمایش بده
        prompt('Share link (copy this):', shareUrl);
      });
    } catch (error) {
      console.error('Error sharing backtest:', error);
      alert('Failed to create share link. Please try again.');
    }
  };

  // تابع کمکی برای تشخیص Session بر اساس زمان
  const determineSession = (timeStr) => {
    if (!timeStr) return 'London';
    const hour = parseInt(timeStr.split(':')[0]);
    if (hour >= 0 && hour < 6) return 'Sydney';
    if (hour >= 6 && hour < 12) return 'Tokyo';
    if (hour >= 12 && hour < 18) return 'London';
    return 'NewYork';
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n');
      const trades = [];
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        const [date, time, position, risk, rrRatio, stopLoss, stopLossType, result, pnl, tag, screenshotUrl] = lines[i].split(',');
        trades.push({ id: Date.now() + i, date, time, position, risk: parseFloat(risk), rrRatio: parseFloat(rrRatio), stopLoss: parseFloat(stopLoss), stopLossType: stopLossType || 'percent', result, pnl: parseFloat(pnl), tag: tag || '', screenshotUrl: screenshotUrl || '' });
      }
      const ub = [...backtests];
      // جایگزینی کامل به جای اضافه شدن
      ub[currentBacktest].trades = trades;
      setBacktests(ub);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (currentUser?.uid) {
      saveTradeFormDefaults(currentUser.uid, {
        date: newTrade.date,
        time: newTrade.time,
        timeFormat: newTrade.timeFormat,
        stopLossType: newTrade.stopLossType
      });
    }
  }, [newTrade.date, newTrade.time, newTrade.timeFormat, newTrade.stopLossType, currentUser]);

  useEffect(() => {
    const kp = (e) => { 
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); handleAddTrade('profit'); } 
      else if (e.ctrlKey && e.key === 'l') { e.preventDefault(); handleAddTrade('loss'); } 
      else if (e.ctrlKey && e.key === 'z') { e.preventDefault(); handleUndo(); } 
      else if (e.ctrlKey && e.key === 'r') { e.preventDefault(); handleAddTrade('riskfree'); }
      else if (e.key === 'ArrowUp' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const currentDate = new Date(newTrade.date);
          currentDate.setDate(currentDate.getDate() + 1);
          setNewTrade({...newTrade, date: currentDate.toISOString().split('T')[0]});
        }
      }
      else if (e.key === 'ArrowDown' && !e.ctrlKey && !e.shiftKey && !e.altKey) {
        const activeElement = document.activeElement;
        if (activeElement?.tagName !== 'INPUT' && activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          const currentDate = new Date(newTrade.date);
          currentDate.setDate(currentDate.getDate() - 1);
          setNewTrade({...newTrade, date: currentDate.toISOString().split('T')[0]});
        }
      }
    };
    const handleClickOutside = (e) => {
      if (showTagDropdown && !e.target.closest('.tag-input-container')) {
        setShowTagDropdown(false);
      }
    };
    window.addEventListener('keydown', kp);
    document.addEventListener('click', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', kp);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [newTrade, showTagDropdown]);

  // تب‌های مختلف برای کاربران لاگین شده و مهمان
  const tabs = currentUser
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'stopAnalysis', label: 'Stop Analysis', icon: Target },
        { id: 'monthlyReport', label: 'Monthly Report', icon: Calendar },
        { id: 'allTrades', label: 'All Trades', icon: TrendingDown },
        { id: 'trackingTime', label: 'Tracking Time', icon: Clock }
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
        { id: 'stopAnalysis', label: 'Stop Analysis', icon: Target },
        { id: 'monthlyReport', label: 'Monthly Report', icon: Calendar }
      ];
  // محاسبه Orig Target - کمترین Peak Target در بین 80% بالاترین ماه‌ها
  const avgMonthlyTarget = useMemo(() => {
    const ct = backtests[currentBacktest]?.trades || [];
    const monthlyData = {};

    ct.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { trades: [] };
      }
      monthlyData[monthKey].trades.push(t);
    });

    // محاسبه Peak Profit برای هر ماه
    const monthlyPeakPercentages = Object.values(monthlyData)
      .map(data => {
        let maxEquity = initialBalance;
        let currentEquity = initialBalance;

        const sortedTrades = [...data.trades].sort((a, b) => {
          const dateCompare = a.date.localeCompare(b.date);
          if (dateCompare !== 0) return dateCompare;
          return a.time.localeCompare(b.time);
        });

        sortedTrades.forEach(t => {
          currentEquity += t.pnl;
          if (currentEquity > maxEquity) {
            maxEquity = currentEquity;
          }
        });

        return ((maxEquity - initialBalance) / initialBalance) * 100;
      })
      .sort((a, b) => a - b); // مرتب‌سازی از کم به زیاد برای محاسبه پرسنتایل

    if (monthlyPeakPercentages.length === 0) return 0;

    // محاسبه پرسنتایل 20 (یعنی 80% ماه‌ها از این عدد بهتر بودن)
    // برای 4 ماه: [13, 20, 21, 33] -> پرسنتایل 20 = ایندکس 0.8 = عدد 20
    const percentile20Index = Math.floor(monthlyPeakPercentages.length * 0.2);
    const origTarget = monthlyPeakPercentages[percentile20Index];

    return origTarget.toFixed(1);
  }, [backtests, currentBacktest, initialBalance]);
  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .starry-bg {
          background: radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%);
          position: relative;
          min-height: 100vh;
        }
        .starry-bg::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 0;
          background-image:
            radial-gradient(1px 1px at 20px 30px, white, transparent),
            radial-gradient(1px 1px at 60px 70px, white, transparent),
            radial-gradient(1px 1px at 50px 160px, white, transparent),
            radial-gradient(1px 1px at 130px 80px, white, transparent),
            radial-gradient(1px 1px at 140px 150px, white, transparent),
            radial-gradient(2px 2px at 200px 50px, white, transparent),
            radial-gradient(1px 1px at 230px 140px, white, transparent),
            radial-gradient(1px 1px at 280px 100px, white, transparent),
            radial-gradient(1px 1px at 300px 190px, white, transparent),
            radial-gradient(1px 1px at 350px 120px, white, transparent),
            radial-gradient(2px 2px at 90px 10px, white, transparent),
            radial-gradient(1px 1px at 110px 200px, white, transparent),
            radial-gradient(1px 1px at 160px 5px, white, transparent),
            radial-gradient(1px 1px at 190px 220px, white, transparent),
            radial-gradient(2px 2px at 250px 180px, white, transparent),
            radial-gradient(1px 1px at 320px 60px, white, transparent),
            radial-gradient(1px 1px at 380px 170px, white, transparent),
            radial-gradient(1px 1px at 10px 90px, white, transparent),
            radial-gradient(1px 1px at 40px 180px, white, transparent),
            radial-gradient(2px 2px at 80px 120px, white, transparent);
          background-repeat: repeat;
          background-size: 400px 250px;
          animation: twinkle 3s ease-in-out infinite;
        }
      `}</style>
      <div className="min-h-screen starry-bg text-white flex flex-col">
        <div className="glass-card border-b border-gray-700 p-3 flex-shrink-0 relative z-30">
          <div className="flex items-center justify-between max-w-full mx-auto px-4">
            <div className="flex items-center gap-3">
              {/* دکمه بازگشت - فقط برای کاربران لاگین شده */}
              {currentUser && onBack && (
                <button
                  onClick={onBack}
                  className="p-2 hover:bg-gray-700 rounded-lg transition flex items-center gap-2 text-gray-300 hover:text-white"
                  title="بازگشت به صفحه اصلی"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              {/* Sidebar toggle - فقط برای کاربران لاگین شده */}
              {currentUser && (
                <button onClick={() => setShowSidebar(!showSidebar)} className="p-2 hover:bg-gray-700 rounded-lg transition">
                  {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              )}
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo-white.png" alt="Top In Trade" className="max-w-full max-h-full object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold flex items-center gap-2">
                  Top In Trade
                </h1>
                <p className="text-xs text-gray-400">
                  Professional Backtest Platform
                  {!currentUser && <span className="ml-2 text-blue-400">👁️ Guest Mode</span>}
                </p>
              </div>
            </div>

            {/* Total P&L - Center of Header */}
            <div className="flex items-center gap-3 bg-gray-800/30 backdrop-blur rounded-lg px-4 py-2 border border-gray-700/30">
              <div className="flex flex-col items-center min-w-[80px]">
                <p className="text-[9px] uppercase tracking-wide text-gray-500 mb-0.5">TOTAL P&L</p>
                <p className={`text-base font-semibold tabular-nums ${Number(stats.totalPnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {Number(stats.totalPnlPercent) >= 0 ? '+' : ''}{stats.totalPnlPercent}%
                </p>
              </div>
              <div className="h-6 w-px bg-gray-700"></div>
              <div className="flex flex-col items-center min-w-[80px]">
                <p className="text-[9px] uppercase tracking-wide text-gray-500 mb-0.5">AMOUNT</p>
                <p className={`text-base font-semibold tabular-nums ${stats.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.totalPnl >= 0 ? '+' : ''}${Number(stats.totalPnl).toLocaleString('en-US', {maximumFractionDigits: 0})}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Actions Menu - فقط برای کاربران لاگین شده و نه در shared view */}
              {currentUser && !isSharedView && (
                <div className="relative">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="bg-purple-900 hover:bg-purple-600 p-2 rounded-lg text-sm font-medium transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-full mr-2 top-0 flex items-center gap-2 z-50">
                      {selectedMonth !== 'all' && (
                        <button
                          onClick={() => { setSelectedMonth('all'); setShowActionsMenu(false); }}
                          className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap shadow-xl"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                          بازگشت
                        </button>
                      )}
                      {!false && (
                        <button
                          onClick={() => { setShowBacktestModal(true); setShowActionsMenu(false); }}
                          className="bg-purple-900 hover:bg-purple-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap shadow-xl"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                          New Backtest
                        </button>
                      )}
                      <button
                        onClick={() => { handleShareBacktest(); setShowActionsMenu(false); }}
                        className="bg-indigo-900 hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap shadow-xl"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        Share
                      </button>
                      <button
                        onClick={() => { handleExportCSV(); setShowActionsMenu(false); }}
                        className="bg-blue-900 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap shadow-xl"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export CSV
                      </button>
                      {!false && (
                        <label className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 cursor-pointer whitespace-nowrap shadow-xl">
                          <Upload className="w-4 h-4" />
                          Import CSV
                          <input type="file" accept=".csv" onChange={(e) => { handleImportCSV(e); setShowActionsMenu(false); }} className="hidden" />
                        </label>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Export button برای کاربران مهمان - فقط Export */}
              {!currentUser && (
                <button
                  onClick={() => handleExportCSV()}
                  className="bg-blue-900 hover:bg-blue-600 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  title="Export shared backtest data"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span className="hidden md:inline">Export CSV</span>
                </button>
              )}

              {/* Admin Panel Button - فقط برای Admin و فقط در حالت عادی (نه shared view) */}
              {!isSharedView && currentUser?.email?.toLowerCase() === 'titteam.1404@gmail.com' && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="bg-purple-600 hover:bg-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  title="پنل مدیریت"
                >
                  <Shield className="w-4 h-4" />
                  <span className="hidden md:inline">پنل ادمین</span>
                </button>
              )}

              {/* Profile Menu - فقط برای کاربران لاگین شده و نه در shared view */}
              {currentUser && !isSharedView && (
                <ProfileMenu
                  currentSessionTime={currentSessionTime}
                  isTrackingTime={isTrackingTime}
                />
              )}

              {/* Shared View Badge */}
              {isSharedView && (
                <div className="bg-blue-600/20 border border-blue-600 rounded-lg px-3 py-1.5 text-sm text-blue-400">
                  View Only
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-1 relative z-10">
          {/* Sidebar - فقط برای کاربران لاگین شده */}
          {currentUser && showSidebar && !false && (
            <div className="w-64 glass-card border-r border-gray-700 flex-shrink-0 overflow-y-auto relative z-10">
              <div className="p-4">
                <button onClick={() => setShowNewFolderModal(true)} className="w-full bg-blue-500 hover:bg-blue-600 px-3 py-1.5 rounded text-xs font-medium transition flex items-center justify-center gap-1 mb-3">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Folder
                </button>
                <div className="space-y-2">
                  {folders.map((folder, folderIndex) => {
                  const fbt = backtests.filter(bt => bt.folderId === folder.id);
                  const planetIcon = getPlanetIcon(folder.id, folderIndex);
                  return (
                    <div key={folder.id} className="bg-gray-800/50 rounded-lg">
                      <div className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-700/50 rounded-lg transition group">
                        <div className="flex items-center gap-2 flex-1" onClick={() => toggleFolder(folder.id)}>
                          <svg className={`w-4 h-4 transition-transform ${folder.isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          <span className="text-lg">{planetIcon}</span>
                          <span className="text-sm font-normal text-gray-300">{folder.name}</span><span className="text-xs text-gray-500 ml-1">({fbt.length})</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={(e) => { e.stopPropagation(); handleEditFolder(folder); }} className="text-blue-400 hover:text-blue-300 p-1" title="Edit folder">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          {folder.id !== 'root' && <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); }} className="text-red-400 hover:text-red-300 p-1" title="Delete folder"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
                        </div>
                      </div>
                      {folder.isExpanded && (
                        <div className="pl-6 pr-2 pb-2 space-y-1">
                          {fbt.length === 0 ? <div className="text-xs text-gray-500 italic py-2 pl-2">Empty folder</div> : fbt.map(bt => {
                            const bti = backtests.indexOf(bt);
                            return (
                              <div key={bt.id} className={`flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition group ${currentBacktest === bti ? 'bg-purple-500 text-white' : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'}`}>
                                <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setCurrentBacktest(bti)}>
                                  <span className="truncate font-medium text-xs">{bt.name}</span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                  <button onClick={(e) => { e.stopPropagation(); handleEditBacktest(bt, bti); }} className="text-blue-400 hover:text-blue-300 p-1" title="Edit backtest">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setBacktestToMove(bt); setShowMoveModal(true); }} className="text-purple-400 hover:text-purple-300 p-1" title="Move backtest"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></button>
                                  {backtests.length > 1 && <button onClick={(e) => { e.stopPropagation(); handleDeleteBacktest(bti); }} className="text-red-400 hover:text-red-300 p-1" title="Delete backtest"><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          )}

          <div className="flex-1 overflow-y-auto h-full">
            <div className="p-4 h-full flex flex-col">
              <div className="flex items-center justify-between gap-4 mb-4 overflow-x-auto pb-2">
                <div className="flex gap-2">{tabs.map(tab => { const Icon = tab.icon; return <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? 'bg-purple-500 text-white border-2 border-white' : 'bg-gray-800 text-gray-400 hover:bg-[#7c3aed] border-2 border-transparent'}`}><Icon className="w-3 h-3" />{tab.label}</button>; })}</div>

                <div className="flex items-center gap-3">
                  {/* Active Session Timer - Show on all tabs except trackingTime */}
                  {isTrackingTime && activeTab !== 'trackingTime' && (
                  <div className="flex items-center gap-2 bg-red-600/20 border border-red-600 rounded-lg px-3 py-1.5">
                    <Clock className="w-4 h-4 text-red-400" />
                    <div>
                      <p className="text-[10px] text-gray-400 leading-tight">Active Session</p>
                      <p className="text-sm font-bold text-red-400 leading-tight">
                        {Math.floor(currentSessionTime / 3600000)}h {Math.floor((currentSessionTime % 3600000) / 60000)}m {Math.floor((currentSessionTime % 60000) / 1000)}s
                      </p>
                    </div>
                  </div>
                )}

                {/* Track Time Button */}
                <button
                  onClick={() => {
                    if (isTrackingTime) {
                      // Pause tracking - save accumulated time
                      const endTime = Date.now();
                      const elapsed = endTime - trackingStartTime;
                      const newAccumulated = todayAccumulatedTime + elapsed;

                      setTodayAccumulatedTime(newAccumulated);
                      setCurrentSessionTime(newAccumulated);

                      // Save to sessions
                      const iranOffset = 3.5 * 60 * 60 * 1000;
                      const iranTime = new Date(endTime + iranOffset);
                      const today = iranTime.toISOString().split('T')[0];

                      setTrackingSessions(prev => {
                        const updated = [...prev];
                        const todayIndex = updated.findIndex(s => s.date === today);

                        if (todayIndex >= 0) {
                          updated[todayIndex].duration = newAccumulated;
                        } else {
                          updated.push({ date: today, duration: newAccumulated });
                        }

                        // Save to Firestore
                        if (currentUser?.uid) {
                          saveTrackingSessions(currentUser.uid, updated, newAccumulated, today, false, null);
                        }
                        return updated;
                      });

                      setTodayAccumulatedDate(today);
                      setIsTrackingTime(false);
                      setTrackingStartTime(null);
                    } else {
                      // Start/Resume tracking
                      setIsTrackingTime(true);
                      setTrackingStartTime(Date.now());
                    }
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-2 ${
                    isTrackingTime
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {isTrackingTime ? (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      Pause
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Track Time
                    </>
                  )}
                </button>
              </div>
            </div>

            {activeTab === 'allTrades' && !isSharedView && (
            <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700 p-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4" />Trade Entry</h2>
                <button
                  onClick={handleUndo}
                  disabled={false}
                  className={`text-xs px-2 py-1 rounded transition ${
                    false
                      ? 'bg-gray-600 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title="Undo (Ctrl+Z)"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Date</label>
                  <div className="relative flex items-center gap-1">
                    <input 
                      type="date" 
                      value={newTrade.date} 
                      onChange={(e) => setNewTrade({...newTrade, date: e.target.value})}
                      onFocus={(e) => e.target.select()}
                      onClick={(e) => e.target.select()}
                      className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white" 
                    />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          const currentDate = new Date(newTrade.date);
                          currentDate.setDate(currentDate.getDate() + 1);
                          setNewTrade({...newTrade, date: currentDate.toISOString().split('T')[0]});
                        }}
                        className="p-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition"
                        title="Next day (Arrow Up)"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const currentDate = new Date(newTrade.date);
                          currentDate.setDate(currentDate.getDate() - 1);
                          setNewTrade({...newTrade, date: currentDate.toISOString().split('T')[0]});
                        }}
                        className="p-0.5 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition"
                        title="Previous day (Arrow Down)"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Time</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder={newTrade.timeFormat === '24h' ? "14:30" : "02:30 PM"} 
                      value={newTrade.time} 
                      onChange={(e) => {
                        let value = e.target.value;
                        
                        // حذف کاراکترهای غیر مجاز
                        value = value.replace(/[^\d:]/g, '');
                        
                        const parts = value.split(':');
                        let hour = parts[0] || '';
                        let minute = parts[1] || '';
                        
                        // محدود کردن ساعت به 2 رقم و max 23
                        if (hour.length > 2) hour = hour.slice(0, 2);
                        if (parseInt(hour) > 23) hour = '23';
                        
                        // محدود کردن دقیقه به 2 رقم و max 59
                        if (minute.length > 2) minute = minute.slice(0, 2);
                        if (parseInt(minute) > 59) minute = '59';
                        
                        // ساخت مقدار نهایی
                        value = parts.length > 1 ? hour + ':' + minute : hour;
                        
                        setNewTrade({...newTrade, time: value});
                      }}
                      onFocus={(e) => {
                        const input = e.target;
                        const value = input.value;
                        const cursorPos = input.selectionStart;
                        const colonIndex = value.indexOf(':');
                        
                        if (colonIndex === -1 || cursorPos <= colonIndex) {
                          input.setSelectionRange(0, colonIndex === -1 ? value.length : colonIndex);
                        } else {
                          input.setSelectionRange(colonIndex + 1, value.length);
                        }
                      }}
                      onClick={(e) => {
                        const input = e.target;
                        const value = input.value;
                        const cursorPos = input.selectionStart;
                        const colonIndex = value.indexOf(':');
                        
                        if (colonIndex === -1 || cursorPos <= colonIndex) {
                          input.setSelectionRange(0, colonIndex === -1 ? value.length : colonIndex);
                        } else {
                          input.setSelectionRange(colonIndex + 1, value.length);
                        }
                      }}
                      onKeyDown={(e) => {
                        const input = e.target;
                        const value = input.value;
                        const cursorPos = input.selectionStart;
                        const colonIndex = value.indexOf(':');
                        
                        // فقط اعداد و Backspace و Tab مجازن
                        if (e.key >= '0' && e.key <= '9') {
                          const parts = value.split(':');
                          const hour = parts[0] || '';
                          const minute = parts[1] || '';
                          
                          // اگه روی بخش ساعت هستیم
                          if (colonIndex === -1 || cursorPos <= colonIndex) {
                            const selection = input.selectionEnd - input.selectionStart;
                            
                            // اگه کل ساعت select شده، جایگزین کن
                            if (selection > 0) {
                              e.preventDefault();
                              setNewTrade({...newTrade, time: e.key + (minute ? ':' + minute : '')});
                              setTimeout(() => input.setSelectionRange(1, 1), 0);
                            }
                            // اگه ساعت 2 رقمی شد، اتوماتیک برو دقیقه
                            else if (hour.length === 2) {
                              e.preventDefault();
                              const newValue = hour + ':' + e.key;
                              setNewTrade({...newTrade, time: newValue});
                              setTimeout(() => {
                                input.setSelectionRange(newValue.length, newValue.length);
                              }, 0);
                            }
                          }
                          // اگه روی بخش دقیقه هستیم
                          else if (colonIndex > -1 && cursorPos > colonIndex) {
                            const selection = input.selectionEnd - input.selectionStart;
                            
                            // اگه کل دقیقه select شده، جایگزین کن
                            if (selection > 0) {
                              e.preventDefault();
                              setNewTrade({...newTrade, time: hour + ':' + e.key});
                              setTimeout(() => input.setSelectionRange(colonIndex + 2, colonIndex + 2), 0);
                            }
                            // اگه دقیقه 2 رقمی شد، جلوگیری از ورود بیشتر
                            else if (minute.length >= 2) {
                              e.preventDefault();
                            }
                          }
                        }
                        // Backspace handling
                        else if (e.key === 'Backspace') {
                          if (cursorPos === colonIndex + 1 && colonIndex > -1) {
                            e.preventDefault();
                            setNewTrade({...newTrade, time: value.slice(0, -1)});
                            setTimeout(() => input.setSelectionRange(value.length - 1, value.length - 1), 0);
                          }
                        }
                        // جلوگیری از تایپ کاراکترهای غیرمجاز
                        else if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete') {
                          if (e.key !== ':') {
                            e.preventDefault();
                          }
                        }
                      }}
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 pr-16 text-sm focus:outline-none focus:border-purple-500 text-white" 
                    />
                    <select 
                      value={newTrade.timeFormat} 
                      onChange={(e) => {
                        const newFormat = e.target.value;
                        setNewTrade({...newTrade, timeFormat: newFormat});
                        
                        if (newFormat === '12h' && !newTrade.time.toUpperCase().includes('AM') && !newTrade.time.toUpperCase().includes('PM')) {
                          const timeWithoutAMPM = newTrade.time.trim();
                          setNewTrade({...newTrade, timeFormat: newFormat, time: timeWithoutAMPM + ' AM'});
                        } else if (newFormat === '24h') {
                          const timeWithoutAMPM = newTrade.time.replace(/\s*(AM|PM)$/i, '').trim();
                          setNewTrade({...newTrade, timeFormat: newFormat, time: timeWithoutAMPM});
                        }
                      }}
                      className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="24h">24h</option>
                      <option value="12h">AM/PM</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Position</label>
                  <div className="flex gap-1">
                    <button onClick={() => setNewTrade({...newTrade, position: 'long'})} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${newTrade.position === 'long' ? 'bg-green-900 text-white border-2 border-white' : 'bg-gray-700 text-gray-300 hover:bg-[#7c3aed] border-2 border-transparent'}`}>Long</button>
                    <button onClick={() => setNewTrade({...newTrade, position: 'short'})} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${newTrade.position === 'short' ? 'bg-red-700 text-white border-2 border-white' : 'bg-gray-700 text-gray-300 hover:bg-[#7c3aed] border-2 border-transparent'}`}>Short</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">
                    SL ({newTrade.stopLossType === 'percent' ? '%' : 'Pips'})
                  </label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step={newTrade.stopLossType === 'percent' ? '0.1' : '1'} 
                      placeholder={newTrade.stopLossType === 'percent' ? '1.5' : '20'} 
                      value={newTrade.stopLoss} 
                      onChange={(e) => setNewTrade({...newTrade, stopLoss: parseFloat(e.target.value) || 0})} 
                      className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 pr-16 text-sm focus:outline-none focus:border-purple-500 text-white" 
                    />
                    <select 
                      value={newTrade.stopLossType} 
                      onChange={(e) => setNewTrade({...newTrade, stopLossType: e.target.value})}
                      className="absolute right-1 top-1/2 -translate-y-1/2 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="percent">%</option>
                      <option value="pips">Pips</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">R:R</label>
                  <input 
                    type="number" 
                    value={newTrade.rrRatio} 
                    onChange={(e) => setNewTrade({...newTrade, rrRatio: parseFloat(e.target.value)})} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white" 
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Risk (%)</label>
                  <input 
                    type="number" 
                    value={newTrade.risk} 
                    onChange={(e) => setNewTrade({...newTrade, risk: parseFloat(e.target.value)})} 
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white" 
                  />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">Tags</label>
                <div className="relative tag-input-container">
                  <div className="flex flex-wrap gap-1.5 w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus-within:border-purple-500 min-h-[38px] items-center">
                    {newTrade.selectedTags.map((tag, idx) => (
                      <div 
                        key={idx}
                        className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-gray-700 border border-gray-600 rounded text-xs text-gray-200"
                      >
                        <span>{tag}</span>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            setNewTrade({...newTrade, selectedTags: newTrade.selectedTags.filter((_, i) => i !== idx)});
                          }}
                          className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-gray-800 rounded-full p-0.5 text-red-400 hover:text-red-300 transition"
                          type="button"
                        >
                          <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    <input 
                      type="text" 
                      placeholder="Add tags..." 
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && tagInput.trim()) {
                          e.preventDefault();
                          const trimmedTag = tagInput.trim();
                          if (!newTrade.selectedTags.includes(trimmedTag)) {
                            setNewTrade({...newTrade, selectedTags: [...newTrade.selectedTags, trimmedTag]});
                            if (!savedTags.includes(trimmedTag)) {
                              setSavedTags([...savedTags, trimmedTag]);
                            }
                          }
                          setTagInput('');
                        } else if (e.key === 'Backspace' && tagInput === '' && newTrade.selectedTags.length > 0) {
                          e.preventDefault();
                          setNewTrade({...newTrade, selectedTags: newTrade.selectedTags.slice(0, -1)});
                        }
                      }}
                      className="flex-1 min-w-[120px] bg-transparent outline-none text-white placeholder-gray-500"
                    />
                  </div>
                </div>
                {savedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {savedTags.map((tag, idx) => {
                      const isPinned = pinnedTags.includes(tag);
                      return (
                        <div
                          key={idx}
                          onClick={() => {
                            if (!newTrade.selectedTags.includes(tag)) {
                              setNewTrade({...newTrade, selectedTags: [...newTrade.selectedTags, tag]});
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (isPinned) {
                              setPinnedTags(pinnedTags.filter(t => t !== tag));
                            } else {
                              setPinnedTags([...pinnedTags, tag]);
                            }
                          }}
                          className={`group relative flex items-center gap-1 px-3 py-1.5 rounded-lg cursor-pointer transition ${
                            isPinned
                              ? 'bg-orange-500/20 border-2 border-orange-500 hover:bg-orange-500/30'
                              : 'bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30'
                          }`}
                        >
                          <span className={`text-sm ${isPinned ? 'text-orange-300 font-semibold' : 'text-purple-300'}`}>{tag}</span>
                          {isPinned && (
                            <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                            </svg>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteTag(tag); }}
                            className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-gray-800 rounded-full p-0.5 text-red-400 hover:text-red-300 transition"
                          >
                            <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="text-xs text-gray-400 mb-1 block">Screenshot URL</label>
                <input 
                  type="text" 
                  placeholder="https://www.tradingview.com/x/..." 
                  value={newTrade.screenshotUrl} 
                  onChange={(e) => setNewTrade({...newTrade, screenshotUrl: e.target.value})}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white" 
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                <button
                  onClick={() => handleAddTrade('profit')}
                  disabled={false}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    false
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-900 hover:bg-[#7c3aed] text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Take Profit</span>
                  <span className="text-xs opacity-75">(Ctrl+T)</span>
                </button>
                <button
                  onClick={() => handleAddTrade('loss')}
                  disabled={false}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    false
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-red-700 hover:bg-[#7c3aed] text-white'
                  }`}
                >
                  <TrendingDown className="w-4 h-4" />
                  <span className="hidden sm:inline">Stop Loss</span>
                  <span className="text-xs opacity-75">(Ctrl+S)</span>
                </button>
                <button
                  onClick={() => handleAddTrade('riskfree')}
                  disabled={false}
                  className={`py-2 px-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition ${
                    false
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-700 hover:bg-[#7c3aed] text-white'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  <span className="hidden sm:inline">Risk Free</span>
                  <span className="text-xs opacity-75">(Ctrl+R)</span>
                </button>
              </div>
              <div className="text-xs mt-3">
                <span className="text-gray-400">Balance:</span>
                <span className="ml-2 text-green-400 font-bold">${(initialBalance + parseFloat(stats.totalPnl)).toLocaleString()}</span>
                <span className="ml-3 text-gray-400">Risk Amount: ${((newTrade.risk / 100) * initialBalance).toFixed(2)}</span>
                <span className="ml-3 text-green-400">Potential Profit: ${((newTrade.risk / 100) * initialBalance * newTrade.rrRatio).toFixed(2)}</span>
                <span className="ml-3 text-red-400">Potential Loss: ${((newTrade.risk / 100) * initialBalance).toFixed(2)}</span>
              </div>
            </div>
            )}

            {activeTab === 'dashboard' && (
            <div className="space-y-2 compact2">
              <style>{`
                /* Galaxy Background Animation */
                @keyframes float {
                  0%, 100% { transform: translate(0, 0) rotate(0deg); }
                  33% { transform: translate(30px, -30px) rotate(120deg); }
                  66% { transform: translate(-20px, 20px) rotate(240deg); }
                }

                @keyframes twinkle {
                  0%, 100% { opacity: 0.3; }
                  50% { opacity: 1; }
                }

                .galaxy-bg {
                  position: fixed;
                  inset: 0;
                  z-index: 0;
                  background: radial-gradient(ellipse at top, #1a1a2e 0%, #0f0f1e 50%, #000000 100%);
                }

                .star {
                  position: absolute;
                  background: white;
                  border-radius: 50%;
                  animation: twinkle 3s infinite;
                }

                .star-1 { width: 1px; height: 1px; top: 10%; left: 20%; animation-delay: 0s; }
                .star-2 { width: 2px; height: 2px; top: 20%; left: 80%; animation-delay: 0.5s; }
                .star-3 { width: 1px; height: 1px; top: 30%; left: 50%; animation-delay: 1s; }
                .star-4 { width: 1px; height: 1px; top: 40%; left: 10%; animation-delay: 1.5s; }
                .star-5 { width: 2px; height: 2px; top: 50%; left: 90%; animation-delay: 2s; }
                .star-6 { width: 1px; height: 1px; top: 60%; left: 30%; animation-delay: 2.5s; }
                .star-7 { width: 1px; height: 1px; top: 70%; left: 70%; animation-delay: 0.3s; }
                .star-8 { width: 2px; height: 2px; top: 80%; left: 40%; animation-delay: 1.8s; }
                .star-9 { width: 1px; height: 1px; top: 15%; left: 60%; animation-delay: 0.8s; }
                .star-10 { width: 1px; height: 1px; top: 25%; left: 15%; animation-delay: 1.3s; }
                .star-11 { width: 1px; height: 1px; top: 35%; left: 85%; animation-delay: 2.3s; }
                .star-12 { width: 2px; height: 2px; top: 45%; left: 45%; animation-delay: 0.6s; }
                .star-13 { width: 1px; height: 1px; top: 55%; left: 25%; animation-delay: 1.1s; }
                .star-14 { width: 1px; height: 1px; top: 65%; left: 75%; animation-delay: 1.6s; }
                .star-15 { width: 1px; height: 1px; top: 75%; left: 55%; animation-delay: 2.1s; }
                .star-16 { width: 2px; height: 2px; top: 85%; left: 65%; animation-delay: 0.4s; }
                .star-17 { width: 1px; height: 1px; top: 12%; left: 35%; animation-delay: 1.4s; }
                .star-18 { width: 1px; height: 1px; top: 22%; left: 95%; animation-delay: 1.9s; }
                .star-19 { width: 1px; height: 1px; top: 32%; left: 5%; animation-delay: 0.9s; }
                .star-20 { width: 1px; height: 1px; top: 42%; left: 88%; animation-delay: 2.4s; }
                .star-21 { width: 2px; height: 2px; top: 52%; left: 12%; animation-delay: 0.7s; }
                .star-22 { width: 1px; height: 1px; top: 62%; left: 92%; animation-delay: 1.2s; }
                .star-23 { width: 1px; height: 1px; top: 72%; left: 22%; animation-delay: 1.7s; }
                .star-24 { width: 1px; height: 1px; top: 82%; left: 82%; animation-delay: 2.2s; }
                .star-25 { width: 1px; height: 1px; top: 18%; left: 48%; animation-delay: 0.2s; }

                .nebula {
                  position: absolute;
                  border-radius: 50%;
                  filter: blur(80px);
                  opacity: 0.15;
                  animation: float 20s infinite ease-in-out;
                }

                .nebula-1 {
                  width: 400px;
                  height: 400px;
                  background: radial-gradient(circle, rgba(138, 43, 226, 0.4) 0%, transparent 70%);
                  top: 10%;
                  left: 10%;
                  animation-delay: 0s;
                }

                .nebula-2 {
                  width: 500px;
                  height: 500px;
                  background: radial-gradient(circle, rgba(65, 105, 225, 0.3) 0%, transparent 70%);
                  top: 50%;
                  right: 10%;
                  animation-delay: 7s;
                }

                .nebula-3 {
                  width: 350px;
                  height: 350px;
                  background: radial-gradient(circle, rgba(147, 51, 234, 0.35) 0%, transparent 70%);
                  bottom: 10%;
                  left: 30%;
                  animation-delay: 14s;
                }

                /* Glassmorphism Cards */
                .glass-card {
                  background: rgba(17, 24, 39, 0.4) !important;
                  backdrop-filter: blur(12px) !important;
                  border: 1px solid rgba(255, 255, 255, 0.1) !important;
                  box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37) !important;
                }

                .glass-card-light {
                  background: rgba(31, 41, 55, 0.3) !important;
                  backdrop-filter: blur(10px) !important;
                  border: 1px solid rgba(255, 255, 255, 0.08) !important;
                }

                /* Compact styles */
                .compact2 { font-size: 85%; }
                .compact2 :is(h1,h2,h3) { margin-bottom: 0.25rem; line-height: 1.15; }
                .compact2 .mb-8 { margin-bottom: 0.75rem !important; }
                .compact2 .mb-6 { margin-bottom: 0.5rem !important; }
                .compact2 .mb-4 { margin-bottom: 0.35rem !important; }
                .compact2 .mb-3 { margin-bottom: 0.25rem !important; }
                .compact2 .mb-2 { margin-bottom: 0.15rem !important; }
                .compact2 .mt-4 { margin-top: 0.35rem !important; }
                .compact2 .mt-3 { margin-top: 0.25rem !important; }
                .compact2 .gap-6 { gap: 0.5rem !important; }
                .compact2 .gap-5 { gap: 0.45rem !important; }
                .compact2 .gap-4 { gap: 0.35rem !important; }
                .compact2 .gap-3 { gap: 0.25rem !important; }
                .compact2 .gap-2 { gap: 0.15rem !important; }
                .compact2 .space-y-6 > * + * { margin-top: 0.5rem !important; }
                .compact2 .space-y-4 > * + * { margin-top: 0.35rem !important; }
                .compact2 .space-y-3 > * + * { margin-top: 0.25rem !important; }
                .compact2 .space-y-2 > * + * { margin-top: 0.15rem !important; }
                .compact2 .p-6 { padding: 0.75rem !important; }
                .compact2 .p-5 { padding: 0.65rem !important; }
                .compact2 .p-4 { padding: 0.5rem !important; }
                .compact2 .p-3 { padding: 0.4rem !important; }
                .compact2 .px-4 { padding-left: 0.5rem !important; padding-right: 0.5rem !important; }
                .compact2 .py-3 { padding-top: 0.4rem !important; padding-bottom: 0.4rem !important; }
                .compact2 .py-2 { padding-top: 0.3rem !important; padding-bottom: 0.3rem !important; }
                .compact2 .text-3xl { font-size: 1.25rem !important; line-height: 1.3; }
                .compact2 .text-2xl { font-size: 1.1rem !important; line-height: 1.3; }
                .compact2 .text-xl { font-size: 0.95rem !important; line-height: 1.3; }
                .compact2 .text-lg { font-size: 0.875rem !important; line-height: 1.3; }
                .compact2 .text-base { font-size: 0.8125rem !important; line-height: 1.3; }
                .compact2 .text-sm { font-size: 0.75rem !important; line-height: 1.3; }
                .compact2 .text-xs { font-size: 0.6875rem !important; line-height: 1.2; }
                .compact2 .row-compact { padding: 0.4rem 0.5rem !important; line-height: 1.2; }
                .compact2 .min-h-48 { min-height: 8rem !important; }
                .compact2 .grid { gap: 0.5rem !important; }
                .compact2 .w-4 { width: 0.875rem !important; height: 0.875rem !important; }
                .compact2 .w-5 { width: 1rem !important; height: 1rem !important; }
                .compact2 .w-10 { width: 2rem !important; height: 2rem !important; }
                .compact2 .w-12 { width: 2.25rem !important; height: 2.25rem !important; }
                
                @keyframes slide-in {
                  from {
                    transform: translateX(400px);
                    opacity: 0;
                  }
                  to {
                    transform: translateX(0);
                    opacity: 1;
                  }
                }
                
                .animate-slide-in {
                  animation: slide-in 0.3s ease-out;
                }
              `}</style>


                <div className="text-center mb-3">
                  <h2 className="text-2xl font-bold mb-1">Performance Dashboard</h2>
                  <p className="text-sm text-gray-400">Comprehensive trading statistics and analysis</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                  <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-400">Total P&L</p><TrendingDown className="w-4 h-4 text-red-400" /></div>
                    <p className={`text-3xl font-bold ${Number(stats.totalPnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{stats.totalPnlPercent}%</p>
                    <p className="text-xs text-gray-500 mt-1">${stats.totalPnl.toFixed(0)} (${(stats.totalPnl/1000).toFixed(1)}k)</p>
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-400">Avg R:R</p><BarChart3 className="w-4 h-4 text-blue-400" /></div>
                    <p className="text-3xl font-bold text-yellow-400">{stats.averageRR}R</p>
                    <p className="text-xs text-gray-500 mt-1">Average reward per trade</p>
                  </div>
                  <div className="bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center justify-between mb-2"><p className="text-xs text-gray-400">Profit & Recovery</p><Calendar className="w-4 h-4 text-green-400" /></div>
                    <p className="text-xl font-bold text-purple-400">{stats.profitFactor}R</p>
                    <p className="text-sm text-gray-400">Profit Factor</p>
                    <p className="text-xl font-bold text-green-400 mt-1">+{stats.recoveryFactor}R</p>
                    <p className="text-sm text-gray-400">Recovery Factor</p>
                  </div>
                </div>

                <div className="glass-card rounded-xl p-3 mb-3">
                    <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-base font-bold">Equity Curve</h3>
                      <p className="text-xs text-gray-400 mt-1">Track your account balance and drawdown over time</p>
                    </div>
                    <div className="flex gap-4">
                      {selectedMonth !== 'all' && (
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Daily Drawdown</p>
                          <p className="text-xl font-bold text-red-400">-{dailyDrawdown}%</p>
                          <p className="text-xs text-gray-500">Max in one day</p>
                        </div>
                      )}
                      {selectedMonth !== 'all' && (() => {
                        const ct = getFilteredTrades;
                        const filteredTrades = ct.filter(t => {
                          const tradeMonth = new Date(t.date).toLocaleString('en-US', { month: 'short' });
                          return tradeMonth.toLowerCase() === selectedMonth.toLowerCase();
                        });

                        let startBalance = initialBalance;
                        const tradesBeforeMonth = ct.filter(t => {
                          const tradeDate = new Date(t.date);
                          const selectedDate = new Date(filteredTrades[filteredTrades.length - 1]?.date || Date.now());
                          return tradeDate < new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
                        });
                        startBalance = initialBalance + tradesBeforeMonth.reduce((sum, t) => sum + t.pnl, 0);

                        const monthPnl = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
                        const monthPercent = ((monthPnl / initialBalance) * 100).toFixed(1);

                        return (
                          <div className="text-right">
                            <p className="text-xs text-gray-400">Monthly P&L</p>
                            <p className={`text-xl font-bold ${Number(monthPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {Number(monthPercent) >= 0 ? '+' : ''}{monthPercent}%
                            </p>
                            <p className="text-xs text-gray-500">${monthPnl.toFixed(2)}</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={equityCurve} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#60a5fa" stopOpacity={0.8}/>
                          <stop offset="30%" stopColor="#3b82f6" stopOpacity={0.5}/>
                          <stop offset="70%" stopColor="#1e40af" stopOpacity={0.2}/>
                          <stop offset="100%" stopColor="#000000" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" strokeOpacity={0.15} />
                      <XAxis
                        dataKey="trade"
                        stroke="#6B7280"
                        style={{fontSize: '11px'}}
                        tick={{fill: '#6B7280'}}
                      />
                      <YAxis
                        stroke="#6B7280"
                        style={{fontSize: '11px'}}
                        tick={{fill: '#6B7280'}}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1F2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          fontSize: '12px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                        }}
                        formatter={(value, name) => {
                          if (name === 'Equity') return [`$${value.toFixed(0)}`, 'Balance'];
                          return [value, name];
                        }}
                      />
                      <Legend
                        wrapperStyle={{fontSize: '12px'}}
                        iconType="circle"
                      />
                      <Area
                        type="monotone"
                        dataKey="equity"
                        stroke="#60a5fa"
                        strokeWidth={3}
                        fill="url(#equityGradient)"
                        name="Equity"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  
                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => setSelectedMonth('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedMonth === 'all'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      All Trades
                    </button>
                    {monthlyStats.map(month => (
                      <button
                        key={month}
                        onClick={() => setSelectedMonth(month)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          selectedMonth === month
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {month}
                      </button>
                    ))}
                  </div>


                  <div className="grid grid-cols-4 gap-4 mt-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Current Balance</p>
                      <p className={`text-xl font-bold ${equityCurve[equityCurve.length - 1]?.equity >= initialBalance ? 'text-green-400' : 'text-red-400'}`}>
                        ${equityCurve[equityCurve.length - 1]?.equity.toFixed(0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Max Drawdown</p>
                      <p className="text-xl font-bold text-red-400">
                        -{Math.max(...equityCurve.map(d => d.maxDrawdown || 0)).toFixed(2)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Peak Profit</p>
                      <p className="text-xl font-bold text-green-400">
                        +{selectedMonth !== 'all' && selectedMonthlyReport
                          ? selectedMonthlyReport.peakProfit
                          : stats.peakProfit}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Total Trades</p>
                      <p className="text-xl font-bold text-white">
                        {selectedMonth !== 'all' && selectedMonthlyReport
                          ? selectedMonthlyReport.totalTrades
                          : stats.totalTrades}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between bg-gray-800/50 backdrop-blur rounded-lg p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                      <Target className="w-5 h-5 text-green-400" />
                      <div>
                        <p className="text-xs text-gray-400">Win Rate</p>
                        <p className="text-2xl font-bold text-green-400">
                          {(() => {
                            const ct = getFilteredTrades;
                            let filteredTrades = ct;
                            if (selectedMonth !== 'all') {
                              filteredTrades = ct.filter(t => {
                                const tradeMonth = new Date(t.date).toLocaleString('en-US', { month: 'short' });
                                return tradeMonth.toLowerCase() === selectedMonth.toLowerCase();
                              });
                            }
                            const wins = filteredTrades.filter(t => t.result === 'profit').length;
                            const total = filteredTrades.length;
                            return total > 0 ? ((wins / total) * 100).toFixed(1) : '0.0';
                          })()}%
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">{stats.wins} of {stats.totalTrades} trades</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="glass-card rounded-xl p-3">
                    <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/></svg>
                      Position Analysis
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-green-400"></div>
                          <span className="text-sm">Long</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{stats.longTrades} trades ({stats.totalTrades > 0 ? ((stats.longTrades/stats.totalTrades)*100).toFixed(0) : 0}%)</p>
                          <p className="text-sm font-bold text-green-400">{stats.longWR}% WR</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-400"></div>
                          <span className="text-sm">Short</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{stats.shortTrades} trades ({stats.totalTrades > 0 ? ((stats.shortTrades/stats.totalTrades)*100).toFixed(0) : 0}%)</p>
                          <p className="text-sm font-bold text-red-400">{stats.shortWR}% WR</p>
                        </div>
                      </div>
                      <div className="h-4 bg-gray-700 rounded-full overflow-hidden flex">
                        <div className="bg-green-500 h-full" style={{width: `${stats.totalTrades > 0 ? (stats.longTrades/stats.totalTrades)*100 : 0}%`}}></div>
                        <div className="bg-red-500 h-full" style={{width: `${stats.totalTrades > 0 ? (stats.shortTrades/stats.totalTrades)*100 : 0}%`}}></div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card rounded-xl p-4">
                    <h3 className="text-base font-bold mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/></svg>
                      Performance Metrics
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card-light rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">W / L</p>
                        <p className="text-lg font-bold">{stats.wins + stats.losses > 0 ? ((stats.wins/(stats.wins+stats.losses))*100).toFixed(1) : 0}%</p>
                        <p className="text-xs text-gray-500">Wins / Losses</p>
                      </div>
                      <div className="glass-card-light rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Max Drawdown</p>
                        <p className="text-lg font-bold text-red-400">-{stats.maxDrawdown}%</p>
                      </div>
                      <div className="glass-card-light rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Max W / Max L</p>
                        <p className="text-sm font-bold text-green-400">${stats.avgWin}</p>
                        <p className="text-sm font-bold text-red-400">/ ${stats.avgLoss}</p>
                      </div>
                      <div className="glass-card-light rounded-lg p-3">
                        <p className="text-xs text-gray-400 mb-1">Current</p>
                        <p className="text-lg font-bold">{stats.totalTrades > 0 ? ((stats.wins/stats.totalTrades)*100).toFixed(0) : 0}% / {stats.totalTrades > 0 ? ((stats.losses/stats.totalTrades)*100).toFixed(0) : 0}%</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monthly Peak Profit Section */}
                {monthlyPeakProfits.length > 0 && (
                  <div className="glass-card rounded-xl p-4 mt-4">
                    <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                      </svg>
                      Monthly Peak Profit
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {monthlyPeakProfits.map((monthData) => (
                        <div
                          key={monthData.month}
                          className="glass-card-light rounded-lg p-3 hover:scale-105 transition-transform cursor-pointer"
                          onClick={() => setSelectedMonth(monthData.month)}
                          title={`Peak: $${monthData.peakEquity} | Start: $${monthData.monthStartBalance}`}
                        >
                          <p className="text-xs text-gray-400 mb-1">{monthData.month}</p>
                          <p className={`text-xl font-bold ${monthData.peakProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {monthData.peakProfit >= 0 ? '+' : ''}{monthData.peakProfit}%
                          </p>
                          <p className="text-xs text-gray-500 mt-1">{monthData.trades} trades</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Daily Trade Count Analysis
                      </h3>
                      {dailyTradeCountAnalysis.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {selectedDailyCounts.length === 0 ? 'All' : selectedDailyCounts.length} Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mb-4">Click to filter by days with specific trade counts</p>
                    <div className="space-y-2">
                      {dailyTradeCountAnalysis.map((item) => {
                        const isSelected = selectedDailyCounts.length === 0 || selectedDailyCounts.includes(item.limit);

                        return (
                          <button
                            key={item.limit}
                            onClick={() => {
                              if (selectedDailyCounts.includes(item.limit)) {
                                setSelectedDailyCounts(selectedDailyCounts.filter(c => c !== item.limit));
                              } else {
                                setSelectedDailyCounts([...selectedDailyCounts, item.limit].sort((a, b) => a - b));
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? themeColors.primary : themeColors.surface,
                              borderColor: isSelected ? themeColors.primaryLight : themeColors.border,
                              opacity: isSelected ? 1 : 0.5
                            }}
                            className="w-full border rounded-lg p-3 text-left transition-all hover:opacity-100 hover:scale-[1.01] cursor-pointer"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                                  <span className="text-2xl font-bold text-purple-400">{item.limit}</span>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400">trades/day</p>
                                  {isSelected && selectedDailyCounts.length > 0 && (
                                    <div className="w-5 h-5 bg-purple-500 rounded-full flex items-center justify-center mt-1">
                                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm text-gray-400">Win Rate</p>
                                <p className={`text-2xl font-bold ${parseFloat(item.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                  {item.winRate}%
                                </p>
                                <p className="text-xs text-gray-400">{item.wlRatio}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-3 text-center">
                              <div>
                                <p className="text-xs text-gray-400">Total</p>
                                <p className="text-lg font-bold">{item.trades}</p>
                                <p className="text-xs text-gray-500">{item.totalPercent}%</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Days</p>
                                <p className="text-lg font-bold">{item.days}</p>
                                <p className="text-xs text-gray-500">day{item.days !== 1 ? 's' : ''}</p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-400">Avg/Day</p>
                                <p className="text-lg font-bold">{item.days > 0 ? (item.trades / item.days).toFixed(1) : 0}</p>
                                <p className="text-xs text-gray-500">trades</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {selectedDailyCounts.length > 0 && (
                      <button
                        onClick={() => setSelectedDailyCounts([])}
                        className="w-full mt-3 text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                      >
                        Clear Filter (Show All)
                      </button>
                    )}
                  </div>

                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        Session Analysis
                      </h3>
                      <span className="text-xs text-gray-400">
                        {selectedSessions.length}/4 Active
                      </span>
                    </div>
                    <div className="space-y-2">
                      {sessionData.map((session) => {
                        const isSelected = selectedSessions.includes(session.session);
                        
                        return (
                          <button
                            key={session.session}
                            onClick={() => {
                              if (isSelected) {
                                if (selectedSessions.length > 1) {
                                  setSelectedSessions(selectedSessions.filter(s => s !== session.session));
                                }
                              } else {
                                setSelectedSessions([...selectedSessions, session.session]);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? themeColors[session.session.toLowerCase()] : 'transparent',
                              borderColor: themeColors[session.session.toLowerCase()],
                              borderWidth: '2px',
                              borderStyle: 'solid'
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                              isSelected 
                                ? 'text-white shadow-lg scale-[1.02]' 
                                : 'text-gray-500 hover:bg-gray-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-600'}`}></div>
                              <span className="text-sm font-medium">{session.session}</span>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${!isSelected && 'opacity-50'}`}>{session.winRate}%</p>
                              <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{session.trades}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Weekday Analysis
                      </h3>
                      <span className="text-xs text-gray-400">
                        {selectedWeekdays.length}/7 Active
                      </span>
                    </div>
                    <div className="space-y-2">
                      {weekdayData.map((day, idx) => {
                        const isSelected = selectedWeekdays.includes(idx);
                        
                        return (
                          <button
                            key={day.day}
                            onClick={() => {
                              if (isSelected) {
                                if (selectedWeekdays.length > 1) {
                                  setSelectedWeekdays(selectedWeekdays.filter(d => d !== idx));
                                }
                              } else {
                                setSelectedWeekdays([...selectedWeekdays, idx]);
                              }
                            }}
                            style={{
                              backgroundColor: isSelected ? themeColors.primary : 'transparent',
                              borderColor: themeColors.primary,
                              borderWidth: '2px',
                              borderStyle: 'solid'
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                              isSelected 
                                ? 'text-white shadow-lg scale-[1.02]' 
                                : 'text-gray-500 hover:bg-gray-900/50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-gray-600'}`}></div>
                              <span className="text-sm font-medium">{day.day}</span>
                            </div>
                            <div className="text-right">
                              <p className={`text-sm font-bold ${!isSelected && 'opacity-50'}`}>{day.winRate}%</p>
                              <p className={`text-xs ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>{day.wins}/{day.total}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Filtered Results Section */}
                  {(selectedSessions.length < 4 || selectedWeekdays.length < 7 || selectedHours.length < 24 || deactivatedTags.length > 0) && (
                    <div className="glass-card rounded-xl p-4">
                      <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                        </svg>
                        Filtered Results
                      </h3>
                      
                      {/* Excluded Filters */}
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 mb-2">Active Filters</p>
                        <div className="flex flex-wrap gap-2">
                          {['Tokyo', 'London', 'NewYork', 'Sydney'].filter(s => !selectedSessions.includes(s)).map(session => (
                            <span key={session} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                              ✗ {session}
                            </span>
                          ))}
                          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
                            .filter((_, idx) => !selectedWeekdays.includes(idx))
                            .map(day => (
                              <span key={day} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                                ✗ {day}
                              </span>
                            ))}
                          {selectedHours.length < 24 && (
                            <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                              ✗ {24 - selectedHours.length} Hours
                            </span>
                          )}
                          {deactivatedTags.length > 0 && deactivatedTags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-medium">
                              ✗ {tag}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Stats Comparison */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Total Trades</p>
                          <p className="text-2xl font-bold">{stats.totalTrades}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            was {statsBeforeFilter.totalTrades}
                          </p>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Win Rate</p>
                          <p className={`text-2xl font-bold ${parseFloat(stats.winRate) >= parseFloat(statsBeforeFilter.winRate) ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.winRate}%
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            was {statsBeforeFilter.winRate}%
                          </p>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Total P&L</p>
                          <p className={`text-2xl font-bold ${parseFloat(stats.totalPnlPercent) >= parseFloat(statsBeforeFilter.totalPnlPercent) ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(stats.totalPnlPercent) >= 0 ? '+' : ''}{stats.totalPnlPercent}%
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            was {parseFloat(statsBeforeFilter.totalPnlPercent) >= 0 ? '+' : ''}{statsBeforeFilter.totalPnlPercent}%
                          </p>
                        </div>

                        <div className="bg-gray-900/50 rounded-lg p-3">
                          <p className="text-xs text-gray-400 mb-1">Wins / Losses</p>
                          <p className="text-lg font-bold">
                            <span className="text-green-400">{stats.wins}W</span>
                            <span className="text-gray-500"> / </span>
                            <span className="text-red-400">{stats.losses}L</span>
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            was {statsBeforeFilter.wins}W / {statsBeforeFilter.losses}L
                          </p>
                        </div>
                      </div>

                      {/* Impact Message */}
                      <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-blue-300">
                          <span className="font-bold">📊 Impact:</span>
                          {' '}
                          Filtering improved win rate by {(parseFloat(stats.winRate) - parseFloat(statsBeforeFilter.winRate)).toFixed(1)}%
                          {' '}
                          ({statsBeforeFilter.totalTrades - stats.totalTrades} trades excluded)
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="glass-card rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold flex items-center gap-2">
                        <Target className="w-4 h-4" />
                        Tag Analysis
                      </h3>
                      {allTagsData.length > 0 && (
                        <span className="text-xs text-gray-400">
                          {allTagsData.length - deactivatedTags.length}/{allTagsData.length} Active
                        </span>
                      )}
                    </div>
                    {allTagsData.length === 0 ? (
                      <div className="text-center py-8 text-gray-400 text-sm">No tag data available</div>
                    ) : (
                      <div>
                        <div className="space-y-2 mb-4">
                          {allTagsData.map((tag) => {
                            const isActive = !deactivatedTags.includes(tag.tag);

                            return (
                              <button
                                key={tag.tag}
                                onClick={() => {
                                  if (deactivatedTags.includes(tag.tag)) {
                                    // اگر غیرفعال بود، فعالش کن (حذف از لیست غیرفعال‌ها)
                                    setDeactivatedTags(deactivatedTags.filter(t => t !== tag.tag));
                                  } else {
                                    // اگر فعال بود، غیرفعالش کن (اضافه به لیست غیرفعال‌ها)
                                    setDeactivatedTags([...deactivatedTags, tag.tag]);
                                  }
                                }}
                                style={{
                                  backgroundColor: isActive ? themeColors.primary : 'transparent',
                                  borderColor: themeColors.primary,
                                  borderWidth: '2px',
                                  borderStyle: 'solid'
                                }}
                                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all cursor-pointer ${
                                  isActive
                                    ? 'text-white shadow-lg scale-[1.02]'
                                    : 'text-gray-500 hover:bg-gray-900/50'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full ${parseFloat(tag.winRate) >= 50 ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                  <span className="text-sm font-medium">{tag.tag}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className={`text-sm font-bold ${parseFloat(tag.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                      {tag.winRate}%
                                    </p>
                                    <p className="text-xs text-gray-400">{tag.trades}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className={`text-sm font-bold ${tag.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                      {tag.pnl >= 0 ? '+' : ''}${tag.pnl.toFixed(0)}
                                    </p>
                                    <p className="text-xs text-gray-400">P&L</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        {deactivatedTags.length > 0 && (
                          <button
                            onClick={() => setDeactivatedTags([])}
                            className="w-full text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded transition"
                          >
                            Reset All Tags (Show All)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Weekday & Time Analysis
                    </h3>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {selectedHours.length}/24 Hours Active
                      </span>
                      <button
                        onClick={() => {
                          if (selectedHours.length === 24) {
                            setSelectedHours([0]); // حداقل یکی باید فعال باشه
                          } else {
                            setSelectedHours(Array.from({ length: 24 }, (_, i) => i));
                          }
                        }}
                        className="text-xs px-3 py-1 bg-purple-500 hover:bg-purple-600 rounded transition"
                      >
                        {selectedHours.length === 24 ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <div className="inline-flex flex-col gap-1 min-w-full">
                      <div className="flex gap-1 mb-2">
                        <div className="w-12 text-xs text-gray-400"></div>
                        {timeHeatmapData.weekdays.map((day) => (
                          <div key={day} className="w-8 text-xs text-gray-400 text-center">{day}</div>
                        ))}
                        <div className="w-24 text-xs text-gray-400 text-center ml-2">Win Rate</div>
                        <div className="w-20 text-xs text-gray-400 text-center ml-1">Trades</div>
                      </div>
                      {timeHeatmapData.hours.map((hour) => {
                        const hourData = timeHeatmapData.data[hour];
                        const hourInt = parseInt(hour);
                        const isHourSelected = selectedHours.includes(hourInt);
                        const hourWinRate = hourData.totalCount > 0 
                          ? ((hourData.totalWins / hourData.totalCount) * 100).toFixed(0) 
                          : '0';
                        
                        return (
                          <div key={hour} className="flex gap-1">
                            <button
                              onClick={() => {
                                if (isHourSelected) {
                                  if (selectedHours.length > 1) {
                                    setSelectedHours(selectedHours.filter(h => h !== hourInt));
                                  }
                                } else {
                                  setSelectedHours([...selectedHours, hourInt].sort((a, b) => a - b));
                                }
                              }}
                              className="w-12 text-xs font-bold flex items-center justify-center rounded cursor-pointer hover:opacity-80 transition"
                              style={{
                                backgroundColor: isHourSelected ? themeColors.primary : '#630707ff',
                                color: 'white'
                              }}
                            >
                              {hour}
                            </button>
                            {hourData.days.map((dayData, dayIdx) => {
                              const dayWinRate = dayData.count > 0 
                                ? ((dayData.wins / dayData.count) * 100).toFixed(0) 
                                : '0';
                              
                              return (
                                <div
                                  key={dayIdx}
                                  className="w-8 h-6 rounded flex items-center justify-center text-xs relative group cursor-pointer transition-transform hover:scale-110"
                                  style={{
                                    backgroundColor: dayData.count === 0 ? '#1F2937' : 
                                      dayData.count === 1 ? '#374151' :
                                      dayData.count === 2 ? '#4B5563' :
                                      dayData.count >= 3 ? '#350b96ff' : '#1F2937'
                                  }}
                                >
                                  {dayData.count > 0 ? dayData.count : ''}
                                  
                                  {dayData.count > 0 && (
                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 whitespace-nowrap">
                                      <div className="text-xs font-bold text-white mb-1">{timeHeatmapData.weekdays[dayIdx]} at {hour}:00</div>
                                      <div className="text-xs text-gray-300">Trades: {dayData.count}</div>
                                      <div className="text-xs text-green-400">Wins: {dayData.wins}</div>
                                      <div className="text-xs text-red-400">Losses: {dayData.losses}</div>
                                      <div className="text-xs text-purple-400 font-bold mt-1">Win Rate: {dayWinRate}%</div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            <div className="flex items-center gap-1 ml-2">
                              <div className={`w-24 text-sm font-bold text-center py-1 rounded ${
                                hourData.totalCount > 0 
                                  ? parseFloat(hourWinRate) >= 50 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                  : 'text-gray-600'
                              }`}>
                                {hourData.totalCount > 0 ? `${hourWinRate}%` : '-'}
                              </div>
                              <div className="w-20 text-sm text-gray-300 text-center font-semibold py-1 bg-gray-800 rounded">
                                {hourData.totalCount > 0 ? `${hourData.totalWins}/${hourData.totalCount}` : '-'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gray-800"></div>
                      <span>Low activity</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-gray-600"></div>
                      <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded bg-purple-500"></div>
                      <span>High activity</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'stopAnalysis' && (
  <div className="space-y-6">
    <div className="text-center mb-8">
      <h2 className="text-3xl font-bold mb-2">Stop Loss Analysis</h2>
      <p className="text-gray-400">Analyze performance across different stop loss ranges</p>
    </div>

    {(() => {
      const ct = backtests[currentBacktest]?.trades || [];
      
      if (ct.length === 0) {
        return (
          <div className="text-center py-12">
            <p className="text-gray-400">No trading data available</p>
          </div>
        );
      }

      // پیدا کردن کمترین و بیشترین Stop Loss
      const minStop = Math.min(...ct.map(t => t.stopLoss));
      const maxStop = Math.max(...ct.map(t => t.stopLoss));
      
      // تقسیم‌بندی به 5 رنج با توجه به کمترین Stop Loss
      const rangeSize = (maxStop - minStop) / 5;
      const ranges = [];
      
      // اگر همه استاپ‌ها یکسان هستند
      if (minStop === maxStop) {
        ranges.push({
          start: minStop,
          end: minStop,
          label: `${minStop}%`,
          trades: ct
        });
        // باقی رنج‌ها خالی
        for (let i = 1; i < 5; i++) {
          ranges.push({ start: 0, end: 0, label: '-', trades: [] });
        }
      } else {
        // ایجاد 5 رنج از minStop تا maxStop
        for (let i = 0; i < 5; i++) {
          const start = minStop + (i * rangeSize);
          const end = i === 4 ? maxStop + 0.01 : minStop + ((i + 1) * rangeSize); // رنج آخر شامل maxStop
          ranges.push({
            start: start,
            end: end,
            label: `${start.toFixed(2)}%-${end.toFixed(2)}%`,
            trades: ct.filter(t => t.stopLoss >= start && t.stopLoss < end)
          });
        }
      }

      // محاسبه آمار برای هر رنج
      const rangeStats = ranges.map(range => {
        const trades = range.trades;
        const totalTrades = trades.length;
        const wins = trades.filter(t => t.result === 'profit').length;
        const losses = trades.filter(t => t.result === 'loss').length;
        const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';
        const totalPnl = trades.reduce((sum, t) => sum + t.pnl, 0);
        const avgStop = totalTrades > 0 ? (trades.reduce((sum, t) => sum + t.stopLoss, 0) / totalTrades).toFixed(2) : '0.0';
        
        const winTrades = trades.filter(t => t.result === 'profit');
        const lossTrades = trades.filter(t => t.result === 'loss');
        const avgWin = winTrades.length > 0 ? (winTrades.reduce((sum, t) => sum + t.pnl, 0) / winTrades.length) : 0;
        const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0) / lossTrades.length) : 0;
        
        const totalRWins = winTrades.reduce((sum, t) => sum + t.rrRatio, 0);
        const expectancy = totalTrades > 0 ? (totalRWins - losses) / totalTrades : 0;
        const profitPerDay = totalTrades > 0 ? totalPnl / totalTrades : 0;

        return {
          label: range.label,
          trades: totalTrades,
          winRate,
          expectancy: expectancy.toFixed(2),
          avgStop,
          pnl: totalPnl.toFixed(2),
          profitPerDay: profitPerDay.toFixed(2)
        };
      });

      // پیدا کردن بهترین رنج
      let bestRange = rangeStats[0];
      let maxWinRate = 0;
      rangeStats.forEach(stat => {
        if (stat.trades > 0 && parseFloat(stat.winRate) > maxWinRate) {
          maxWinRate = parseFloat(stat.winRate);
          bestRange = stat;
        }
      });

      // محاسبه آمار کلی
      const totalTrades = ct.length;
      const tradingDays = new Set(ct.map(t => t.date)).size;
      const totalPnl = ct.reduce((sum, t) => sum + t.pnl, 0);

      return (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Best Stop Range</p>
                  <p className="text-3xl font-bold text-green-400">{bestRange.label}</p>
                  <p className="text-xs text-gray-500 mt-1">{bestRange.trades} trades</p>
                </div>
                <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                  <Target className="w-6 h-6 text-green-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total Trades</p>
                  <p className="text-3xl font-bold">{totalTrades}</p>
                  <p className="text-xs text-gray-500 mt-1">Across all stop sizes</p>
                </div>
                <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-blue-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Trading Days</p>
                  <p className="text-3xl font-bold text-purple-400">{tradingDays}</p>
                  <p className="text-xs text-gray-500 mt-1">Active trading days</p>
                </div>
                <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Total P&L</p>
                  <p className={`text-3xl font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">All stop sizes combined</p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6 mb-6">
            <p className="text-sm text-gray-300">
              <span className="font-semibold text-purple-400">💡 Key Insight:</span> Small stop range ({minStop.toFixed(2)}%-{(minStop + rangeSize).toFixed(2)}%) shows the best balance between stability and profit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold">Win Rate by Stop Size</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rangeStats.filter(s => s.trades > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9CA3AF" 
                    style={{fontSize: '11px'}}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    style={{fontSize: '12px'}}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`${value}%`, 'Win Rate']}
                  />
                  <Bar dataKey="winRate" fill="#10B981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card rounded-xl p-6">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="text-xl font-bold">Profit per Day by Stop Size</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={rangeStats.filter(s => s.trades > 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9CA3AF" 
                    style={{fontSize: '11px'}}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#9CA3AF" 
                    style={{fontSize: '12px'}}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151', 
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value) => [`$${value}`, 'Profit/Day']}
                  />
                  <Bar dataKey="profitPerDay" fill="#0d2f65ff" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h3 className="text-xl font-bold">Stop Size Performance</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-sm text-gray-400 font-semibold">Stop Range</th>
                    <th className="text-center py-3 px-4 text-sm text-gray-400 font-semibold">Trades</th>
                    <th className="text-center py-3 px-4 text-sm text-gray-400 font-semibold">Win Rate</th>
                    <th className="text-center py-3 px-4 text-sm text-gray-400 font-semibold">Expectancy</th>
                    <th className="text-center py-3 px-4 text-sm text-gray-400 font-semibold">Avg Stop</th>
                    <th className="text-center py-3 px-4 text-sm text-gray-400 font-semibold">PnL</th>
                    <th className="text-center py-3 px-4 text-sm text-gray-400 font-semibold">Profit/Day</th>
                  </tr>
                </thead>
                <tbody>
                  {rangeStats.map((stat, idx) => (
                    stat.trades > 0 && (
                      <tr 
                        key={idx} 
                        className={`border-b border-gray-700/50 hover:bg-gray-700/30 transition ${
                          stat.label === bestRange.label ? 'bg-green-500/10' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <span className="font-medium">{stat.label}</span>
                        </td>
                        <td className="text-center py-3 px-4 font-semibold">{stat.trades}</td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-bold ${parseFloat(stat.winRate) >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {stat.winRate}%
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-bold ${parseFloat(stat.expectancy) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {parseFloat(stat.expectancy) >= 0 ? '+' : ''}{stat.expectancy}R
                          </span>
                        </td>
                        <td className="text-center py-3 px-4 text-purple-400 font-semibold">{stat.avgStop}%</td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-bold ${parseFloat(stat.pnl) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${stat.pnl}
                          </span>
                        </td>
                        <td className="text-center py-3 px-4">
                          <span className={`font-bold ${parseFloat(stat.profitPerDay) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            ${stat.profitPerDay}
                          </span>
                        </td>
                      </tr>
                    )
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    })()}
  </div>
)}
            {activeTab === 'allTrades' && (
              <div className="glass-card rounded-xl p-4">
                <div className="flex flex-col gap-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold">All Trades ({filteredTrades.length})</h3>
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 w-48 text-white" />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={dateFilter}
                      onChange={(e) => {
                        setDateFilter(e.target.value);
                        if (e.target.value !== 'dateRange') {
                          setDateRangeFrom('');
                          setDateRangeTo('');
                        }
                      }}
                      className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white"
                    >
                      <option value="all">All Dates ({backtests[currentBacktest]?.trades.length || 0})</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="thisWeek">This Week</option>
                      <option value="thisMonth">This Month</option>
                      <option value="lastMonth">Last Month</option>
                      <option value="dateRange">Date Range</option>
                    </select>
                    {dateFilter === 'dateRange' && (
                      <>
                        <label className="text-xs text-gray-400">From:</label>
                        <input
                          type="date"
                          value={dateRangeFrom}
                          onChange={(e) => setDateRangeFrom(e.target.value)}
                          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                        <label className="text-xs text-gray-400">To:</label>
                        <input
                          type="date"
                          value={dateRangeTo}
                          onChange={(e) => setDateRangeTo(e.target.value)}
                          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-purple-500 text-white"
                        />
                        {(dateRangeFrom || dateRangeTo) && (
                          <button
                            onClick={() => {
                              setDateRangeFrom('');
                              setDateRangeTo('');
                            }}
                            className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition"
                          >
                            Clear
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {filteredTrades.length === 0 ? (
                  <div className="text-center py-12"><p className="text-gray-400">No trades found</p></div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                    {filteredTrades.map((trade) => (
                      <div key={trade.id} className="p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900 transition flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-3">
                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                          <div className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center ${trade.result === 'profit' ? 'bg-green-500/20' : trade.result === 'riskfree' ? 'bg-blue-500/20' : 'bg-red-500/20'}`}>
                            {trade.result === 'profit' ? (
                              <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : trade.result === 'riskfree' ? (
                              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                            ) : (
                              <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-medium">{trade.date}</p>
                              <p className="text-xs text-gray-400">{trade.time}</p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mt-1">
                              <span className={`px-2 py-0.5 rounded ${trade.position === 'long' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {trade.position.toUpperCase()}
                              </span>
                              <span>• {trade.risk}%</span>
                              <span>• {trade.rrRatio}:1</span>
                              <span>• SL: -{trade.stopLoss}{trade.stopLossType === 'pips' ? ' pips' : '%'}</span>
                              {trade.tag && <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">#{trade.tag}</span>}
                              {trade.screenshotUrl && (
                                <button 
                                  onClick={() => window.open(trade.screenshotUrl, '_blank')}
                                  className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition flex items-center gap-1"
                                  title="View Screenshot"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span className="hidden sm:inline">Screenshot</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                          <p className={`text-base font-bold ${trade.pnl > 0 ? 'text-green-400' : trade.pnl < 0 ? 'text-red-400' : 'text-blue-400'}`}>
                            {trade.pnl > 0 ? '+' : trade.pnl < 0 ? '-' : ''}${trade.pnl === 0 ? '0' : Math.abs(trade.pnl).toFixed(0)}
                          </p>
                          {!false && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button
                                onClick={() => handleEditTrade(trade)}
                                className="text-blue-400 hover:text-blue-300 p-1"
                                title="Edit trade"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTrade(trade.id)}
                                className="text-red-400 hover:text-red-300 p-1"
                                title="Delete trade"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
              {activeTab === 'monthlyReport' && (
              <div className="space-y-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold mb-2">Monthly Performance Report</h2>
                  <p className="text-gray-400">Detailed month-by-month trading analysis</p>
                  <button 
                    onClick={handleExportCSV}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export CSV
                  </button>
                </div>

                {(() => {
                  const ct = backtests[currentBacktest]?.trades || [];
                  const monthlyData = {};
                  
                  ct.forEach(t => {
                    const date = new Date(t.date);
                    const monthKey = `${date.toLocaleString('en-US', { month: 'long' })} ${date.getFullYear()}`;
                    
                    if (!monthlyData[monthKey]) {
                      monthlyData[monthKey] = {
                        trades: [],
                        wins: 0,
                        losses: 0,
                        totalPnl: 0,
                        date: date
                      };
                    }
                    
                    monthlyData[monthKey].trades.push(t);
                    if (t.result === 'profit') monthlyData[monthKey].wins++;
                    else if (t.result === 'loss') monthlyData[monthKey].losses++;
                    monthlyData[monthKey].totalPnl += t.pnl;
                  });

                  const months = Object.entries(monthlyData).sort((a, b) => b[1].date - a[1].date);
                  
                  let bestMonth = null;
                  let worstMonth = null;
                  let maxPnl = -Infinity;
                  let minPnl = Infinity;
                  
                  months.forEach(([name, data]) => {
                    if (data.totalPnl > maxPnl) {
                      maxPnl = data.totalPnl;
                      bestMonth = name;
                    }
                    if (data.totalPnl < minPnl) {
                      minPnl = data.totalPnl;
                      worstMonth = name;
                    }
                  });

                  const totalWins = months.reduce((sum, [_, data]) => sum + data.wins, 0);
                  const totalLosses = months.reduce((sum, [_, data]) => sum + data.losses, 0);
                  const totalTrades = totalWins + totalLosses;
                  const overallWinRate = totalTrades > 0 ? ((totalWins / totalTrades) * 100).toFixed(1) : 0;
                  const totalPnl = months.reduce((sum, [_, data]) => sum + data.totalPnl, 0);
                  const totalPnlPercent = ((totalPnl / initialBalance) * 100).toFixed(1);

                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                        <div className="glass-card rounded-xl p-6">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-400">Overall Win Rate</p>
                            <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center">
                              <Target className="w-5 h-5 text-orange-400" />
                            </div>
                          </div>
                          <p className="text-4xl font-bold text-orange-400 mb-1">{overallWinRate}%</p>
                          <p className="text-sm text-gray-500">{totalWins} of {totalTrades} trades</p>
                        </div>

                        <div className="glass-card rounded-xl p-6">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-400">Total P&L</p>
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                          </div>
                          <p className={`text-4xl font-bold mb-1 ${Number(totalPnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(totalPnlPercent) >= 0 ? '+' : ''}{totalPnlPercent}%
                          </p>
                          <p className="text-sm text-gray-500">${totalPnl.toFixed(2)}</p>
                        </div>

                        <div className="glass-card rounded-xl p-6">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-400">Best Month</p>
                            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                              <TrendingUp className="w-5 h-5 text-green-400" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-green-400 mb-1">{bestMonth || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{bestMonth ? `+$${maxPnl.toFixed(2)}` : '-'}</p>
                        </div>

                        <div className="glass-card rounded-xl p-6">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-400">Worst Month</p>
                            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                              <TrendingDown className="w-5 h-5 text-red-400" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-red-400 mb-1">{worstMonth || 'N/A'}</p>
                          <p className="text-sm text-gray-500">{worstMonth ? `$${minPnl.toFixed(2)}` : '-'}</p>
                        </div>

                        <div className="glass-card rounded-xl p-6">
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-400">Avg Target</p>
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                              <Target className="w-5 h-5 text-purple-400" />
                            </div>
                          </div>
                          <p className="text-4xl font-bold text-purple-400 mb-1">{avgMonthlyTarget}%</p>
                          <p className="text-sm text-gray-500">80% months target</p>
                        </div>
                      </div>

                      <div className="glass-card rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-6">
                          <BarChart3 className="w-5 h-5 text-purple-400" />
                          <h3 className="text-xl font-bold">Monthly Breakdown</h3>
                        </div>

                        {months.length === 0 ? (
                          <div className="text-center py-12">
                            <p className="text-gray-400">No trading data available</p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {months.map(([monthName, data]) => {
                              const winRate = ((data.wins / data.trades.length) * 100).toFixed(1);
                              const pnlPercent = ((data.totalPnl / initialBalance) * 100).toFixed(2);
                              
                              const totalRWins = data.trades.filter(t => t.result === 'profit').reduce((sum, t) => sum + t.rrRatio, 0);
                              const totalRLosses = data.losses;
                              const profitFactor = totalRLosses > 0 ? (totalRWins / totalRLosses).toFixed(2) : totalRWins.toFixed(2);
                              
                              const winTrades = data.trades.filter(t => t.result === 'profit');
                              const lossTrades = data.trades.filter(t => t.result === 'loss');
                              const avgWin = winTrades.length > 0 ? (winTrades.reduce((sum, t) => sum + t.pnl, 0) / winTrades.length).toFixed(2) : '0.00';
                              const avgLoss = lossTrades.length > 0 ? Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0) / lossTrades.length).toFixed(2) : '0.00';
                              
                              let currentStreak = 0;
                              let maxStreak = 0;
                              data.trades.slice().reverse().forEach(t => {
                                if (t.result === 'profit') {
                                  currentStreak++;
                                  if (currentStreak > maxStreak) maxStreak = currentStreak;
                                } else {
                                  currentStreak = 0;
                                }
                              });
                              
                              const expectancy = data.trades.length > 0 
                                ? (((winTrades.reduce((sum, t) => sum + t.pnl, 0) / winTrades.length || 0) * data.wins - 
                                    (Math.abs(lossTrades.reduce((sum, t) => sum + t.pnl, 0) / lossTrades.length) || 0) * data.losses) / data.trades.length).toFixed(2)
                                : '0.00';

                              return (
                                <div key={monthName} className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                                  <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                      <div className="flex items-center gap-3">
                                        <Calendar className="w-5 h-5 text-gray-400" />
                                        <h4 className="text-lg font-bold">{monthName}</h4>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <div className={`px-4 py-1.5 rounded-full text-sm font-bold ${data.totalPnl >= 0 ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
                                          {data.totalPnl >= 0 ? '+' : ''}${data.totalPnl.toFixed(2)}
                                        </div>
                                        <div className={`text-lg font-bold ${parseFloat(pnlPercent) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          ({parseFloat(pnlPercent) >= 0 ? '+' : ''}{parseFloat(pnlPercent).toFixed(2)}%)
                                        </div>
                                      </div>
                                    </div>

                                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                      <div>
                                        <p className="text-xs text-gray-400 mb-1">Win Rate</p>
                                        <p className="text-2xl font-bold text-orange-400">{winRate}%</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-400 mb-1">Trades</p>
                                        <p className="text-2xl font-bold">{data.trades.length}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-400 mb-1">Profit Factor</p>
                                        <p className="text-2xl font-bold text-blue-400">{profitFactor}</p>
                                      </div>
                                      <div>
                                        <p className="text-xs text-gray-400 mb-1">Peak Profit</p>
                                        <p className="text-2xl font-bold text-green-400">
                                          +{(() => {
                                            let maxEquity = initialBalance;
                                            let currentEquity = initialBalance;
                                            
                                            const sortedTrades = [...data.trades].sort((a, b) => {
                                              const dateCompare = a.date.localeCompare(b.date);
                                              if (dateCompare !== 0) return dateCompare;
                                              return a.time.localeCompare(b.time);
                                            });
                                            
                                            sortedTrades.forEach(t => {
                                              currentEquity += t.pnl;
                                              if (currentEquity > maxEquity) {
                                                maxEquity = currentEquity;
                                              }
                                            });
                                            
                                            return (((maxEquity - initialBalance) / initialBalance) * 100).toFixed(2);
                                          })()}%
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-gray-400 mb-1.5">W/L</p>
                                        <p className="font-bold text-sm">
                                          <span className="text-green-400">{data.wins}W</span>
                                          <span className="text-gray-500"> / </span>
                                          <span className="text-red-400">{data.losses}L</span>
                                        </p>
                                      </div>
                                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-gray-400 mb-1.5">Streaks</p>
                                        <p className="font-bold text-sm">
                                          <span className="text-green-400">{maxStreak}W</span>
                                          <span className="text-gray-500"> / </span>
                                          <span className="text-red-400">{data.trades.length > 0 ? Math.max(...data.trades.map((_, i, arr) => {
                                            let streak = 0;
                                            let maxLossStreak = 0;
                                            arr.slice().reverse().forEach(t => {
                                              if (t.result === 'loss') {
                                                streak++;
                                                if (streak > maxLossStreak) maxLossStreak = streak;
                                              } else {
                                                streak = 0;
                                              }
                                            });
                                            return maxLossStreak;
                                          })) : 0}L</span>
                                        </p>
                                      </div>
                                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-gray-400 mb-1.5">Max DD</p>
                                        <p className="font-bold text-red-400 text-sm">
                                          -{(() => {
                                            // Sort trades by date and time
                                            const sortedTrades = [...data.trades].sort((a, b) => {
                                              const dateCompare = a.date.localeCompare(b.date);
                                              if (dateCompare !== 0) return dateCompare;
                                              return a.time.localeCompare(b.time);
                                            });

                                            // محاسبه بالانس اول ماه
                                            // همه تریدهای قبل از این ماه را پیدا کن
                                            const firstTradeOfMonth = sortedTrades[0];
                                            if (!firstTradeOfMonth) return '0.0';

                                            const monthStartDate = new Date(firstTradeOfMonth.date);
                                            monthStartDate.setDate(1);
                                            monthStartDate.setHours(0, 0, 0, 0);

                                            const allTrades = backtests[currentBacktest]?.trades || [];
                                            const tradesBeforeMonth = allTrades.filter(t => {
                                              const tradeDate = new Date(t.date);
                                              return tradeDate < monthStartDate;
                                            });

                                            const monthStartBalance = initialBalance + tradesBeforeMonth.reduce((sum, t) => sum + t.pnl, 0);

                                            // محاسبه Max DD - فقط وقتی که زیر بالانس اولیه ماه میره
                                            let currentEquity = monthStartBalance;
                                            let maxDDAmount = 0; // مقدار دلاری

                                            sortedTrades.forEach(t => {
                                              currentEquity += t.pnl;

                                              // محاسبه drawdown فقط اگر زیر بالانس اولیه ماه رفت
                                              if (currentEquity < monthStartBalance) {
                                                const ddAmount = monthStartBalance - currentEquity;
                                                if (ddAmount > maxDDAmount) {
                                                  maxDDAmount = ddAmount;
                                                }
                                              }
                                            });

                                            // تبدیل به درصد از بالانس اولیه (نه بالانس ماه)
                                            const maxDDPercent = (maxDDAmount / initialBalance) * 100;
                                            return maxDDPercent.toFixed(1);
                                          })()}%
                                        </p>
                                      </div>
                                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-gray-400 mb-1.5">Max Daily DD</p>
                                        <p className="font-bold text-red-400 text-sm">
                                          -{(() => {
                                            // گروه‌بندی تریدها بر اساس تاریخ
                                            const dailyTrades = {};
                                            data.trades.forEach(t => {
                                              if (!dailyTrades[t.date]) dailyTrades[t.date] = [];
                                              dailyTrades[t.date].push(t);
                                            });

                                            let maxDailyDD = 0;

                                            // محاسبه Max DD برای هر روز (peak-to-trough)
                                            Object.keys(dailyTrades).forEach(date => {
                                              const dayTrades = dailyTrades[date];
                                              // Sort trades by time
                                              dayTrades.sort((a, b) => a.time.localeCompare(b.time));

                                              // محاسبه بالانس اول روز (initial + تمام تریدهای قبل از این روز)
                                              const allTrades = backtests[currentBacktest]?.trades || [];
                                              const tradesBeforeDay = allTrades.filter(t => {
                                                return new Date(t.date) < new Date(date);
                                              });
                                              const dayStartBalance = initialBalance + tradesBeforeDay.reduce((sum, t) => sum + t.pnl, 0);

                                              // محاسبه drawdown - فقط وقتی که زیر بالانس اولیه روز میره
                                              let currentEquity = dayStartBalance;
                                              let maxDDAmountForDay = 0;

                                              dayTrades.forEach(t => {
                                                currentEquity += t.pnl;

                                                // محاسبه drawdown فقط اگر زیر بالانس اولیه روز رفت
                                                if (currentEquity < dayStartBalance) {
                                                  const ddAmount = dayStartBalance - currentEquity;
                                                  if (ddAmount > maxDDAmountForDay) {
                                                    maxDDAmountForDay = ddAmount;
                                                  }
                                                }
                                              });

                                              const currentDayDD = (maxDDAmountForDay / initialBalance) * 100;
                                              if (currentDayDD > maxDailyDD) {
                                                maxDailyDD = currentDayDD;
                                              }
                                            });

                                            return maxDailyDD.toFixed(1);
                                          })()}%
                                        </p>
                                      </div>
                                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-gray-400 mb-1.5">Avg W</p>
                                        <p className="font-bold text-green-400 text-sm">${avgWin}</p>
                                      </div>
                                      <div className="bg-gray-800/50 rounded-lg p-3 text-center">
                                        <p className="text-xs text-gray-400 mb-1.5">Avg L</p>
                                        <p className="font-bold text-red-400 text-sm">${avgLoss}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {activeTab === 'trackingTime' && (
              <div className="space-y-4">
                <div className="glass-card rounded-xl p-6 border border-gray-700">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                        Tracking Time
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">Monitor your daily backtesting sessions</p>
                    </div>
                    {isTrackingTime && (
                      <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 border border-red-500 rounded-xl px-5 py-3 backdrop-blur-sm">
                        <p className="text-xs text-gray-300 mb-1 flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                          Active Session
                        </p>
                        <p className="text-2xl font-bold text-red-400 font-mono">
                          {Math.floor(currentSessionTime / 3600000)}h {Math.floor((currentSessionTime % 3600000) / 60000)}m {Math.floor((currentSessionTime % 60000) / 1000)}s
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Month Selector */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-purple-400" />
                      <h4 className="text-lg font-semibold">
                        {new Date(selectedTrackingMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h4>
                    </div>
                    <select
                      value={selectedTrackingMonth}
                      onChange={(e) => setSelectedTrackingMonth(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500 text-white"
                    >
                      {(() => {
                        const months = [];
                        const now = new Date();
                        // Get unique months from tracking sessions
                        const uniqueMonths = new Set();
                        trackingSessions.forEach(s => {
                          const month = s.date.substring(0, 7);
                          uniqueMonths.add(month);
                        });
                        // Add current month if not in set
                        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                        uniqueMonths.add(currentMonth);

                        // Convert to sorted array
                        const sortedMonths = Array.from(uniqueMonths).sort().reverse();

                        return sortedMonths.map(month => {
                          const date = new Date(month + '-01');
                          return (
                            <option key={month} value={month}>
                              {date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </option>
                          );
                        });
                      })()}
                    </select>
                  </div>

                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-2 mb-3">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-center text-xs font-semibold text-gray-400 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Grid */}
                  <div className="grid grid-cols-7 gap-2 mb-6">
                    {(() => {
                      const [year, month] = selectedTrackingMonth.split('-').map(Number);
                      const firstDay = new Date(year, month - 1, 1);
                      const lastDay = new Date(year, month, 0);
                      const startDayOfWeek = firstDay.getDay();
                      const daysInMonth = lastDay.getDate();
                      // Use Iran time (UTC+3:30) to get today's date
                      const iranOffset = 3.5 * 60 * 60 * 1000;
                      const iranTime = new Date(Date.now() + iranOffset);
                      const today = iranTime.toISOString().split('T')[0];

                      const days = [];

                      // Empty cells for days before month starts
                      for (let i = 0; i < startDayOfWeek; i++) {
                        days.push(<div key={`empty-${i}`} className="aspect-square"></div>);
                      }

                      // Days of the month
                      for (let day = 1; day <= daysInMonth; day++) {
                        // Create date string directly to avoid timezone issues
                        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const session = trackingSessions.find(s => s.date === dateStr);
                        const duration = session ? session.duration : 0;

                        const hours = Math.floor(duration / 3600000);
                        const minutes = Math.floor((duration % 3600000) / 60000);
                        const isToday = dateStr === today;

                        days.push(
                          <div
                            key={dateStr}
                            className={`aspect-square p-3 rounded-xl border-2 transition-all hover:scale-105 ${
                              isToday
                                ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-500 shadow-lg shadow-purple-500/20'
                                : duration > 0
                                ? 'bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50'
                                : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'
                            }`}
                          >
                            <div className="flex flex-col h-full">
                              <div className="text-center mb-auto">
                                <p className={`text-2xl font-bold ${isToday ? 'text-purple-300' : 'text-white'}`}>
                                  {day}
                                </p>
                              </div>
                              {duration > 0 && (
                                <div className="text-center mt-auto">
                                  <p className="text-xs font-semibold text-green-400">
                                    {hours}h {minutes}m
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }

                      return days;
                    })()}
                  </div>

                  {/* Monthly Statistics */}
                  <div className="mt-6 p-6 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-xl border border-gray-700 backdrop-blur-sm">
                    <h4 className="text-lg font-bold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-blue-400" />
                      Monthly Statistics
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {(() => {
                        const monthSessions = trackingSessions.filter(s => s.date.startsWith(selectedTrackingMonth));
                        const totalDuration = monthSessions.reduce((sum, s) => sum + s.duration, 0);
                        const activeDays = monthSessions.filter(s => s.duration > 0).length;
                        const avgPerDay = activeDays > 0 ? totalDuration / activeDays : 0;

                        return (
                          <>
                            <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/30">
                              <p className="text-xs text-blue-300 mb-2 font-medium">Total Time</p>
                              <p className="text-3xl font-bold text-blue-400">
                                {Math.floor(totalDuration / 3600000)}h
                              </p>
                              <p className="text-sm text-blue-300 mt-1">
                                {Math.floor((totalDuration % 3600000) / 60000)}m
                              </p>
                            </div>
                            <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/30">
                              <p className="text-xs text-green-300 mb-2 font-medium">Active Days</p>
                              <p className="text-3xl font-bold text-green-400">{activeDays}</p>
                              <p className="text-sm text-green-300 mt-1">days tracked</p>
                            </div>
                            <div className="text-center p-4 bg-purple-500/10 rounded-lg border border-purple-500/30">
                              <p className="text-xs text-purple-300 mb-2 font-medium">Avg per Day</p>
                              <p className="text-3xl font-bold text-purple-400">
                                {Math.floor(avgPerDay / 60000)}m
                              </p>
                              <p className="text-sm text-purple-300 mt-1">average</p>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {showNewFolderModal && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Create New Folder</h2><button onClick={() => setShowNewFolderModal(false)} className="text-gray-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div><div><label className="text-sm text-gray-400 mb-2 block">Folder Name</label><input type="text" placeholder="e.g., ENA Strategies" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" autoFocus /></div><div className="flex gap-3 mt-6"><button onClick={() => setShowNewFolderModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium">Cancel</button><button onClick={handleCreateFolder} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium">Create</button></div></div></div>}

      {showMoveModal && backtestToMove && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Move Backtest</h2><button onClick={() => setShowMoveModal(false)} className="text-gray-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div><div className="space-y-3"><p className="text-sm text-gray-400">Move "<span className="text-white font-medium">{backtestToMove.name}</span>" to:</p>{folders.map(f => <button key={f.id} onClick={() => handleMoveBacktest(backtestToMove.id, f.id)} disabled={f.id === backtestToMove.folderId} className={`w-full flex items-center gap-3 p-3 rounded-lg text-left ${f.id === backtestToMove.folderId ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}><svg className="w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg><span className="flex-1">{f.name}</span>{f.id === backtestToMove.folderId && <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">Current</span>}</button>)}</div><button onClick={() => setShowMoveModal(false)} className="w-full mt-4 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium">Cancel</button></div></div>}

      {showEditFolderModal && editingFolder && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Edit Folder</h2><button onClick={() => setShowEditFolderModal(false)} className="text-gray-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div><div><label className="text-sm text-gray-400 mb-2 block">Folder Name</label><input type="text" value={editingFolder.name} onChange={(e) => setEditingFolder({...editingFolder, name: e.target.value})} onKeyPress={(e) => e.key === 'Enter' && handleSaveFolder()} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" autoFocus /></div><div className="flex gap-3 mt-6"><button onClick={() => setShowEditFolderModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium">Cancel</button><button onClick={handleSaveFolder} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium">Save</button></div></div></div>}

      {showEditBacktestModal && editingBacktest && <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full"><div className="flex items-center justify-between mb-6"><h2 className="text-xl font-bold">Edit Backtest</h2><button onClick={() => setShowEditBacktestModal(false)} className="text-gray-400 hover:text-white"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button></div><div className="space-y-4"><div><label className="text-sm text-gray-400 mb-2 block">Name</label><input type="text" value={editingBacktest.name} onChange={(e) => setEditingBacktest({...editingBacktest, name: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" /></div><div><label className="text-sm text-gray-400 mb-2 block">Balance ($)</label><input type="number" value={editingBacktest.balance} onChange={(e) => setEditingBacktest({...editingBacktest, balance: e.target.value})} className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500" /></div><div><label className="text-sm text-gray-400 mb-2 block">Type</label><div className="flex gap-3"><button onClick={() => setEditingBacktest({...editingBacktest, balanceType: 'fixed'})} className={`flex-1 py-2 rounded-lg font-medium transition ${editingBacktest.balanceType === 'fixed' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Fixed</button><button onClick={() => setEditingBacktest({...editingBacktest, balanceType: 'compound'})} className={`flex-1 py-2 rounded-lg font-medium transition ${editingBacktest.balanceType === 'compound' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>Compound</button></div></div></div><div className="flex gap-3 mt-6"><button onClick={() => setShowEditBacktestModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium">Cancel</button><button onClick={handleSaveBacktest} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium">Save</button></div></div></div>}

      {showBacktestModal && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-md w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Create New Backtest</h2>
        <button onClick={() => setShowBacktestModal(false)} className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-4">
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Name</label>
          <input 
            type="text" 
            placeholder="e.g., EUR/USD Strategy" 
            value={newBacktest.name} 
            onChange={(e) => setNewBacktest({...newBacktest, name: e.target.value})} 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" 
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Folder</label>
          <select 
            value={newBacktest.folderId} 
            onChange={(e) => setNewBacktest({...newBacktest, folderId: e.target.value})} 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Balance ($)</label>
          <input 
            type="number" 
            value={newBacktest.balance} 
            onChange={(e) => setNewBacktest({...newBacktest, balance: parseFloat(e.target.value)})} 
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500" 
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-2 block">Type</label>
          <div className="flex gap-3">
            <button 
              onClick={() => setNewBacktest({...newBacktest, balanceType: 'fixed'})} 
              className={`flex-1 py-2 rounded-lg font-medium ${newBacktest.balanceType === 'fixed' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Fixed
            </button>
            <button 
              onClick={() => setNewBacktest({...newBacktest, balanceType: 'dynamic'})} 
              className={`flex-1 py-2 rounded-lg font-medium ${newBacktest.balanceType === 'dynamic' ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Dynamic
            </button>
          </div>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button 
          onClick={() => setShowBacktestModal(false)} 
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button 
          onClick={handleCreateBacktest} 
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-medium"
        >
          Create
        </button>
      </div>
    </div>
  </div>
)}

{showEditModal && editingTrade && (
  <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Edit Trade</h2>
        <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Date</label>
            <input 
              type="date" 
              value={editingTrade.date} 
              onChange={(e) => setEditingTrade({...editingTrade, date: e.target.value})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Time</label>
            <input 
              type="text" 
              placeholder="14:30" 
              value={editingTrade.time} 
              onChange={(e) => {
                let value = e.target.value;
                value = value.replace(/[^\d:]/g, '');
                const parts = value.split(':');
                let hour = parts[0] || '';
                let minute = parts[1] || '';
                if (hour.length > 2) hour = hour.slice(0, 2);
                if (parseInt(hour) > 23) hour = '23';
                if (minute.length > 2) minute = minute.slice(0, 2);
                if (parseInt(minute) > 59) minute = '59';
                value = parts.length > 1 ? hour + ':' + minute : hour;
                setEditingTrade({...editingTrade, time: value});
              }}
              onFocus={(e) => {
                const input = e.target;
                const value = input.value;
                const cursorPos = input.selectionStart;
                const colonIndex = value.indexOf(':');
                if (colonIndex === -1 || cursorPos <= colonIndex) {
                  input.setSelectionRange(0, colonIndex === -1 ? value.length : colonIndex);
                } else {
                  input.setSelectionRange(colonIndex + 1, value.length);
                }
              }}
              onClick={(e) => {
                const input = e.target;
                const value = input.value;
                const cursorPos = input.selectionStart;
                const colonIndex = value.indexOf(':');
                if (colonIndex === -1 || cursorPos <= colonIndex) {
                  input.setSelectionRange(0, colonIndex === -1 ? value.length : colonIndex);
                } else {
                  input.setSelectionRange(colonIndex + 1, value.length);
                }
              }}
              onKeyDown={(e) => {
                const input = e.target;
                const value = input.value;
                const cursorPos = input.selectionStart;
                const colonIndex = value.indexOf(':');
                
                if (e.key >= '0' && e.key <= '9') {
                  const parts = value.split(':');
                  const hour = parts[0] || '';
                  const minute = parts[1] || '';
                  
                  if (colonIndex === -1 || cursorPos <= colonIndex) {
                    const selection = input.selectionEnd - input.selectionStart;
                    if (selection > 0) {
                      e.preventDefault();
                      setEditingTrade({...editingTrade, time: e.key + (minute ? ':' + minute : '')});
                      setTimeout(() => input.setSelectionRange(1, 1), 0);
                    } else if (hour.length === 2) {
                      e.preventDefault();
                      const newValue = hour + ':' + e.key;
                      setEditingTrade({...editingTrade, time: newValue});
                      setTimeout(() => input.setSelectionRange(newValue.length, newValue.length), 0);
                    }
                  } else if (colonIndex > -1 && cursorPos > colonIndex) {
                    const selection = input.selectionEnd - input.selectionStart;
                    if (selection > 0) {
                      e.preventDefault();
                      setEditingTrade({...editingTrade, time: hour + ':' + e.key});
                      setTimeout(() => input.setSelectionRange(colonIndex + 2, colonIndex + 2), 0);
                    } else if (minute.length >= 2) {
                      e.preventDefault();
                    }
                  }
                } else if (e.key === 'Backspace') {
                  if (cursorPos === colonIndex + 1 && colonIndex > -1) {
                    e.preventDefault();
                    setEditingTrade({...editingTrade, time: value.slice(0, -1)});
                    setTimeout(() => input.setSelectionRange(value.length - 1, value.length - 1), 0);
                  }
                } else if (e.key !== 'Tab' && e.key !== 'Enter' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Delete') {
                  if (e.key !== ':') {
                    e.preventDefault();
                  }
                }
              }}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Position</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditingTrade({...editingTrade, position: 'long'})}
              className={`flex-1 py-2 rounded-lg font-medium ${editingTrade.position === 'long' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Long
            </button>
            <button 
              onClick={() => setEditingTrade({...editingTrade, position: 'short'})}
              className={`flex-1 py-2 rounded-lg font-medium ${editingTrade.position === 'short' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Short
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Risk (%)</label>
            <input 
              type="number" 
              value={editingTrade.risk} 
              onChange={(e) => setEditingTrade({...editingTrade, risk: parseFloat(e.target.value) || 0})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">R:R</label>
            <input 
              type="number" 
              value={editingTrade.rrRatio} 
              onChange={(e) => setEditingTrade({...editingTrade, rrRatio: parseFloat(e.target.value) || 0})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Stop Loss</label>
            <input 
              type="number" 
              value={editingTrade.stopLoss} 
              onChange={(e) => setEditingTrade({...editingTrade, stopLoss: parseFloat(e.target.value) || 0})}
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" 
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Result</label>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditingTrade({...editingTrade, result: 'profit'})}
              className={`flex-1 py-2 rounded-lg font-medium ${editingTrade.result === 'profit' ? 'bg-green-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Profit
            </button>
            <button 
              onClick={() => setEditingTrade({...editingTrade, result: 'loss'})}
              className={`flex-1 py-2 rounded-lg font-medium ${editingTrade.result === 'loss' ? 'bg-red-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Loss
            </button>
            <button 
              onClick={() => setEditingTrade({...editingTrade, result: 'riskfree'})}
              className={`flex-1 py-2 rounded-lg font-medium ${editingTrade.result === 'riskfree' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-300'}`}
            >
              Risk Free
            </button>
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Tags</label>
          <div className="flex flex-wrap gap-1.5 w-full bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 text-sm focus-within:border-purple-500 min-h-[38px] items-center">
            {(editingTrade.selectedTags || []).map((tag, idx) => (
              <div
                key={idx}
                className="group relative flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/20 border border-purple-500/40 rounded text-xs text-purple-300"
              >
                <span>{tag}</span>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    const newTags = editingTrade.selectedTags.filter((_, i) => i !== idx);
                    setEditingTrade({...editingTrade, selectedTags: newTags});
                  }}
                  className="text-red-400 hover:text-red-300 transition"
                  type="button"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          {(() => {
            // ترکیب savedTags با تمام تگ‌های استفاده شده در تریدها
            const allUsedTags = new Set();

            // اضافه کردن savedTags
            savedTags.forEach(tag => allUsedTags.add(tag));

            // اضافه کردن تگ‌های موجود در تمام تریدها
            (backtests[currentBacktest]?.trades || []).forEach(trade => {
              if (trade.tag && trade.tag.trim()) {
                trade.tag.split(',').map(t => t.trim()).filter(t => t).forEach(tag => {
                  allUsedTags.add(tag);
                });
              }
            });

            const allTagsArray = Array.from(allUsedTags);

            return allTagsArray.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {allTagsArray.map((tag, idx) => {
                  const isPinned = pinnedTags.includes(tag);
                  const isSelected = editingTrade.selectedTags && editingTrade.selectedTags.includes(tag);
                  return (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!isSelected) {
                          const newTags = [...(editingTrade.selectedTags || []), tag];
                          setEditingTrade({...editingTrade, selectedTags: newTags});
                        }
                      }}
                      disabled={isSelected}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg transition ${
                        isPinned
                          ? 'bg-orange-500/20 border-2 border-orange-500 hover:bg-orange-500/30'
                          : 'bg-purple-500/20 border border-purple-500/40 hover:bg-purple-500/30'
                      } ${isSelected ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      type="button"
                    >
                      <span className={`text-sm ${isPinned ? 'text-orange-300 font-semibold' : 'text-purple-300'}`}>{tag}</span>
                      {isPinned && (
                        <svg className="w-3 h-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })()}
        </div>

        <div>
          <label className="text-sm text-gray-400 mb-2 block">Screenshot URL</label>
          <input 
            type="text" 
            value={editingTrade.screenshotUrl || ''} 
            onChange={(e) => setEditingTrade({...editingTrade, screenshotUrl: e.target.value})}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500" 
            placeholder="https://..."
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button 
          onClick={() => setShowEditModal(false)} 
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg font-medium"
        >
          Cancel
        </button>
        <button 
          onClick={handleSaveEditTrade} 
          className="flex-1 bg-purple-500 hover:bg-purple-600 text-white py-2 rounded-lg font-medium"
        >
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}

        {/* Notification Toast */}
        {notification.show && (
          <div className="fixed top-4 right-4 z-[60] animate-slide-in">
            <div className={`px-6 py-3 rounded-lg shadow-2xl border-2 flex items-center gap-3 ${
              notification.type === 'profit' ? 'bg-green-500/20 border-green-500 backdrop-blur-xl' :
              notification.type === 'loss' ? 'bg-red-500/20 border-red-500 backdrop-blur-xl' :
              'bg-blue-500/20 border-blue-500 backdrop-blur-xl'
            }`}>
              <span className="text-lg font-bold text-white">{notification.message}</span>
            </div>
          </div>
        )}
      </div>

      {/* Admin Panel Overlay */}
      {showAdminPanel && (
        <div className="fixed inset-0 z-[9999] bg-black">
          <div className="relative w-full h-full">
            <button
              onClick={() => setShowAdminPanel(false)}
              className="absolute top-4 right-4 z-[10000] bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white font-medium transition flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              بستن پنل ادمین
            </button>
            <AdminPanel />
          </div>
        </div>
      )}
    </>
  );
}
