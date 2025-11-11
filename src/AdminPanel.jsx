import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth, isAdminEmail } from './AuthContext';
import { Users, Key, Plus, Trash2, CheckCircle, XCircle, Copy, Share2, Link as LinkIcon, BarChart3, Clock, Calendar, Lock, Unlock } from 'lucide-react';

export default function AdminPanel() {
  const { currentUser, createInviteCode, getInvites, deleteInvite } = useAuth();
  const [activeTab, setActiveTab] = useState('inviteCodes');
  const [inviteCodes, setInviteCodes] = useState([]);
  const [users, setUsers] = useState([]);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCodeCount, setNewCodeCount] = useState(1);
  const [copiedCode, setCopiedCode] = useState(null);

  // Tracking Stats States
  const [dateFrom, setDateFrom] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 7); // 7 days ago
    return date.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [datePreset, setDatePreset] = useState('week');

  // چک کردن Admin
  const isAdmin = isAdminEmail(currentUser?.email);

  // بارگذاری Invite Codes از AuthContext
  const loadInviteCodes = async () => {
    try {
      const codes = await getInvites();
      setInviteCodes(codes);
    } catch (error) {
      console.error('Error loading invite codes:', error);
    }
  };

  // بارگذاری Users
  const loadUsers = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // فیلتر کردن کاربران ناشناس (باید username یا email داشته باشند)
        .filter(user => user.username || user.email);

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // بارگذاری کاربران قفل شده
  const loadBlockedUsers = async () => {
    try {
      const accountLocksSnapshot = await getDocs(collection(db, 'accountLocks'));
      const blockedUsersData = accountLocksSnapshot.docs
        .map(doc => ({
          userId: doc.id,
          ...doc.data()
        }))
        .filter(lock => lock.isLocked === true);

      // بارگذاری تمام کاربران یک بار
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersMap = new Map();
      const emailToUserMap = new Map();

      usersSnapshot.docs.forEach(doc => {
        const data = doc.data();
        usersMap.set(doc.id, data);
        // ساخت نقشه ایمیل به اطلاعات کاربر
        if (data.email) {
          emailToUserMap.set(data.email, data);
        }
      });

      // ترکیب اطلاعات - جستجو با userId و email
      const enrichedBlockedUsers = await Promise.all(
        blockedUsersData.map(async (lock) => {
          // اول سعی کن با userId پیدا کنی
          let userData = usersMap.get(lock.userId);

          // اگر پیدا نشد، سعی کن با email پیدا کنی (اگر در accountLock ذخیره شده)
          if (!userData && lock.email) {
            userData = emailToUserMap.get(lock.email);
          }

          // اگر هنوز پیدا نشد، سعی کن مستقیم از auth بگیری
          if (!userData) {
            try {
              // گرفتن اطلاعات از auth (اگر امکان داشت)
              // فعلاً فقط userId رو داریم
              return {
                ...lock,
                email: lock.email || 'نامشخص',
                username: null,
                displayName: null
              };
            } catch (error) {
              console.error('Error fetching user from auth:', error);
            }
          }

          if (userData) {
            return {
              ...lock,
              email: userData.email,
              username: userData.username,
              displayName: userData.displayName
            };
          }

          return lock;
        })
      );

      setBlockedUsers(enrichedBlockedUsers);
    } catch (error) {
      console.error('Error loading blocked users:', error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadInviteCodes();
      loadUsers();
      loadBlockedUsers();
      setLoading(false);
    }
  }, [isAdmin]);

  // اضافه کردن Invite Code جدید با AuthContext
  const handleAddInviteCode = async () => {
    try {
      const newCodes = [];
      for (let i = 0; i < newCodeCount; i++) {
        const invite = await createInviteCode();
        newCodes.push(invite);
      }
      setInviteCodes([...newCodes, ...inviteCodes]);
      setNewCodeCount(1);
      alert(`${newCodeCount} کد دعوت جدید ساخته شد`);
    } catch (error) {
      console.error('Error adding invite code:', error);
      alert('خطا در ساخت کد دعوت: ' + error.message);
    }
  };

  // حذف Invite Code با AuthContext
  const handleDeleteInviteCode = async (codeId) => {
    if (!window.confirm('آیا مطمئن هستید؟')) return;

    try {
      await deleteInvite(codeId);
      setInviteCodes(inviteCodes.filter(code => code.id !== codeId));
      alert('کد دعوت حذف شد');
    } catch (error) {
      console.error('Error deleting invite code:', error);
      alert('خطا در حذف کد دعوت');
    }
  };

  // کپی کد
  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // باز کردن قفل کاربر
  const handleUnlockUser = async (userId) => {
    if (!window.confirm('آیا مطمئن هستید که می‌خواهید قفل این کاربر را باز کنید؟')) return;

    try {
      const accountLockRef = doc(db, 'accountLocks', userId);
      await updateDoc(accountLockRef, {
        isLocked: false,
        kickCount: 0
      });

      // بارگذاری مجدد لیست کاربران قفل شده
      await loadBlockedUsers();
      alert('قفل کاربر با موفقیت باز شد');
    } catch (error) {
      console.error('Error unlocking user:', error);
      alert('خطا در باز کردن قفل کاربر');
    }
  };

  // Handle date preset change
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const iranOffset = 3.5 * 60 * 60 * 1000;
    const iranNow = new Date(Date.now() + iranOffset);
    const today = iranNow.toISOString().split('T')[0];

    switch (preset) {
      case 'today':
        setDateFrom(today);
        setDateTo(today);
        break;
      case 'week':
        const weekAgo = new Date(iranNow);
        weekAgo.setDate(weekAgo.getDate() - 7);
        setDateFrom(weekAgo.toISOString().split('T')[0]);
        setDateTo(today);
        break;
      case 'month':
        const monthAgo = new Date(iranNow);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        setDateFrom(monthAgo.toISOString().split('T')[0]);
        setDateTo(today);
        break;
      case 'custom':
        // Keep current dates
        break;
      default:
        break;
    }
  };

  // Calculate tracking time for a user in the selected date range
  const calculateUserTrackingTime = (user) => {
    if (!user.trackingSessions || user.trackingSessions.length === 0) {
      return {
        totalTime: 0,
        activeDays: 0,
        avgPerDay: 0,
        todayTime: 0
      };
    }

    const iranOffset = 3.5 * 60 * 60 * 1000;
    const iranNow = new Date(Date.now() + iranOffset);
    const today = iranNow.toISOString().split('T')[0];

    // Filter sessions in date range
    const filteredSessions = user.trackingSessions.filter(session => {
      return session.date >= dateFrom && session.date <= dateTo;
    });

    const totalTime = filteredSessions.reduce((sum, session) => sum + (session.duration || 0), 0);
    const activeDays = filteredSessions.filter(s => s.duration > 0).length;
    const avgPerDay = activeDays > 0 ? totalTime / activeDays : 0;

    // Calculate today's time (including current session if tracking)
    let todayTime = 0;
    const todaySession = user.trackingSessions.find(s => s.date === today);
    if (todaySession) {
      todayTime = todaySession.duration || 0;
    }

    // Add accumulated time if tracking today
    if (user.todayAccumulatedDate === today && user.todayAccumulatedTime) {
      todayTime = user.todayAccumulatedTime;

      // Add current session time if tracking
      if (user.isTrackingTime && user.trackingStartTime) {
        const elapsed = Date.now() - user.trackingStartTime;
        todayTime += elapsed;
      }
    }

    return {
      totalTime,
      activeDays,
      avgPerDay,
      todayTime
    };
  };

  // Get users with tracking stats and sort by total time
  const getUsersWithTrackingStats = () => {
    return users
      .map(user => ({
        ...user,
        trackingStats: calculateUserTrackingTime(user)
      }))
      .sort((a, b) => b.trackingStats.totalTime - a.trackingStats.totalTime);
  };

  // Format duration in hours and minutes
  const formatDuration = (milliseconds) => {
    const hours = Math.floor(milliseconds / 3600000);
    const minutes = Math.floor((milliseconds % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen starry-bg flex items-center justify-center p-4">
        <div className="bg-red-500/20 backdrop-blur-md border border-red-500/30 rounded-2xl p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">دسترسی غیرمجاز</h2>
          <p className="text-gray-300">شما مجوز دسترسی به این صفحه را ندارید</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen starry-bg flex items-center justify-center">
        <div className="text-white text-xl">در حال بارگذاری...</div>
      </div>
    );
  }

  return (
    <div className="h-screen starry-bg text-white overflow-y-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-8 pb-20">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">پنل مدیریت</h1>
            <p className="text-gray-400">مدیریت کدهای دعوت و کاربران</p>
          </div>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              window.location.reload();
            }}
            className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition"
          >
            ← بازگشت به برنامه
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('inviteCodes')}
            className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'inviteCodes'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Key className="w-5 h-5" />
            کدهای دعوت
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Users className="w-5 h-5" />
            کاربران ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('trackingStats')}
            className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'trackingStats'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Clock className="w-5 h-5" />
            آمار Tracking
          </button>
          <button
            onClick={() => setActiveTab('blockedUsers')}
            className={`px-6 py-3 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'blockedUsers'
                ? 'bg-purple-600 text-white'
                : 'bg-white/10 text-gray-300 hover:bg-white/20'
            }`}
          >
            <Lock className="w-5 h-5" />
            کاربران قفل شده ({blockedUsers.length})
          </button>
        </div>

        {/* Invite Codes Tab */}
        {activeTab === 'inviteCodes' && (
          <div className="space-y-6">
            {/* Add New Code */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">ساخت کد دعوت جدید</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm text-gray-300 mb-2">تعداد کد</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={newCodeCount}
                    onChange={(e) => setNewCodeCount(parseInt(e.target.value) || 1)}
                    className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white"
                  />
                </div>
                <button
                  onClick={handleAddInviteCode}
                  className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium transition flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  ساخت کد
                </button>
              </div>
            </div>

            {/* Codes List */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4">
                لیست کدهای دعوت ({inviteCodes.length})
              </h3>
              <div className="space-y-3">
                {inviteCodes.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">کد دعوتی وجود ندارد</p>
                ) : (
                  inviteCodes.map((codeData) => (
                    <div
                      key={codeData.id}
                      className={`bg-black/30 border rounded-lg p-4 flex items-center justify-between ${
                        codeData.status === 'used' ? 'border-red-500/30' : 'border-green-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {codeData.status === 'used' ? (
                          <XCircle className="w-6 h-6 text-red-500" />
                        ) : (
                          <CheckCircle className="w-6 h-6 text-green-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-3">
                            <code className="text-xl font-mono font-bold">{codeData.code}</code>
                            <button
                              onClick={() => handleCopyCode(codeData.code)}
                              className="text-gray-400 hover:text-white transition"
                              title="کپی کد"
                            >
                              {copiedCode === codeData.code ? (
                                <CheckCircle className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {codeData.status === 'used' ? (
                              <>
                                <span className="text-red-400">
                                  استفاده شده توسط: {codeData.usedBy || 'نامشخص'}
                                </span>
                                {codeData.usedAt && (
                                  <span className="text-gray-500 mr-2">
                                    در {new Date(codeData.usedAt).toLocaleDateString('fa-IR')}
                                  </span>
                                )}
                              </>
                            ) : (
                              <>
                                <span className="text-green-400">آماده استفاده</span>
                                {codeData.createdAt && (
                                  <span className="text-gray-500 mr-2">
                                    ساخته شده در {new Date(codeData.createdAt).toLocaleDateString('fa-IR')}
                                  </span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteInviteCode(codeData.id)}
                        className="text-red-500 hover:text-red-400 transition p-2"
                        title="حذف کد"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">لیست کاربران ({users.length})</h3>
            <div className="space-y-3">
              {users.length === 0 ? (
                <p className="text-gray-400 text-center py-8">کاربری وجود ندارد</p>
              ) : (
                users.map((user) => (
                  <div
                    key={user.id}
                    className="bg-black/30 border border-white/20 rounded-lg p-4 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-lg">@{user.username || user.email}</div>
                      <div className="text-sm text-gray-400">
                        {user.email && <div>ایمیل: {user.email}</div>}
                        <div>تاریخ ثبت‌نام: {user.createdAt ? new Date(user.createdAt.toDate()).toLocaleDateString('fa-IR') : 'نامشخص'}</div>
                        {user.inviteCode && <div>کد دعوت: {user.inviteCode}</div>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {user.isAdmin && (
                        <span className="bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-xs font-medium">
                          Admin
                        </span>
                      )}
                      <div className="text-xs text-gray-500">
                        UID: {user.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}


        {/* Tracking Stats Tab */}
        {activeTab === 'trackingStats' && (
          <div className="space-y-6">
            {/* Date Filter */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6" />
                فیلتر زمانی
              </h3>

              {/* Preset Buttons */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <button
                  onClick={() => handlePresetChange('today')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    datePreset === 'today'
                      ? 'bg-purple-600 text-white'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  امروز
                </button>
                <button
                  onClick={() => handlePresetChange('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    datePreset === 'week'
                      ? 'bg-purple-600 text-white'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  هفته اخیر
                </button>
                <button
                  onClick={() => handlePresetChange('month')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    datePreset === 'month'
                      ? 'bg-purple-600 text-white'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  ماه اخیر
                </button>
                <button
                  onClick={() => handlePresetChange('custom')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    datePreset === 'custom'
                      ? 'bg-purple-600 text-white'
                      : 'bg-black/30 text-gray-300 hover:bg-black/50'
                  }`}
                >
                  سفارشی
                </button>
              </div>

              {/* Custom Date Range */}
              {datePreset === 'custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">از تاریخ</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">تا تاریخ</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Users Tracking Stats */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                آمار Tracking کاربران ({users.length})
              </h3>

              <p className="text-sm text-gray-400 mb-6">
                بازه زمانی: {new Date(dateFrom).toLocaleDateString('fa-IR')} تا {new Date(dateTo).toLocaleDateString('fa-IR')}
              </p>

              <div className="space-y-3">
                {users.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">کاربری وجود ندارد</p>
                ) : (
                  getUsersWithTrackingStats().map((user, index) => {
                    const stats = user.trackingStats;
                    const isTracking = user.isTrackingTime;

                    return (
                      <div
                        key={user.id}
                        className="bg-black/30 border border-white/20 rounded-lg p-5 hover:border-purple-500/50 transition"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl font-bold text-gray-500">
                              #{index + 1}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="font-bold text-lg text-white">
                                  @{user.username || user.email?.split('@')[0] || 'ناشناس'}
                                </div>
                                {isTracking && (
                                  <div className="flex items-center gap-1 bg-green-500/20 border border-green-500 rounded-full px-2 py-0.5">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-xs text-green-400 font-medium">فعال</span>
                                  </div>
                                )}
                              </div>
                              <div className="text-sm text-gray-400">{user.email}</div>
                            </div>
                          </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {/* Total Time */}
                          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-blue-400" />
                              <p className="text-xs text-blue-300 font-medium">کل زمان</p>
                            </div>
                            <p className="text-2xl font-bold text-blue-400">
                              {formatDuration(stats.totalTime)}
                            </p>
                          </div>

                          {/* Today Time */}
                          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Clock className="w-4 h-4 text-green-400" />
                              <p className="text-xs text-green-300 font-medium">امروز</p>
                            </div>
                            <p className="text-2xl font-bold text-green-400">
                              {formatDuration(stats.todayTime)}
                            </p>
                          </div>

                          {/* Active Days */}
                          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Calendar className="w-4 h-4 text-purple-400" />
                              <p className="text-xs text-purple-300 font-medium">روزهای فعال</p>
                            </div>
                            <p className="text-2xl font-bold text-purple-400">
                              {stats.activeDays}
                            </p>
                          </div>

                          {/* Avg per Day */}
                          <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border border-orange-500/30 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <BarChart3 className="w-4 h-4 text-orange-400" />
                              <p className="text-xs text-orange-300 font-medium">میانگین روزانه</p>
                            </div>
                            <p className="text-2xl font-bold text-orange-400">
                              {formatDuration(stats.avgPerDay)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Total Stats Summary */}
              {users.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-lg font-bold mb-4">خلاصه کل</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 text-center">
                      <p className="text-sm text-blue-300 mb-2">کل زمان همه کاربران</p>
                      <p className="text-3xl font-bold text-blue-400">
                        {formatDuration(
                          getUsersWithTrackingStats().reduce(
                            (sum, u) => sum + u.trackingStats.totalTime,
                            0
                          )
                        )}
                      </p>
                    </div>
                    <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4 text-center">
                      <p className="text-sm text-green-300 mb-2">میانگین زمان هر کاربر</p>
                      <p className="text-3xl font-bold text-green-400">
                        {formatDuration(
                          getUsersWithTrackingStats().reduce(
                            (sum, u) => sum + u.trackingStats.totalTime,
                            0
                          ) / users.length
                        )}
                      </p>
                    </div>
                    <div className="bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 text-center">
                      <p className="text-sm text-purple-300 mb-2">کاربران فعال امروز</p>
                      <p className="text-3xl font-bold text-purple-400">
                        {getUsersWithTrackingStats().filter(u => u.trackingStats.todayTime > 0).length}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Blocked Users Tab */}
        {activeTab === 'blockedUsers' && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Lock className="w-6 h-6 text-red-500" />
              کاربران قفل شده ({blockedUsers.length})
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              کاربرانی که به دلیل بیش از 10 بار kick شدن، قفل شده‌اند
            </p>
            <div className="space-y-3">
              {blockedUsers.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-400 text-lg">هیچ کاربر قفل شده‌ای وجود ندارد</p>
                  <p className="text-gray-500 text-sm mt-2">تمام کاربران دسترسی نرمال دارند</p>
                </div>
              ) : (
                blockedUsers.map((blockedUser) => (
                  <div
                    key={blockedUser.userId}
                    className="bg-red-500/10 border border-red-500/30 rounded-lg p-5 hover:border-red-500/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <Lock className="w-5 h-5 text-red-500" />
                          <div className="flex-1">
                            <div className="font-bold text-lg text-white mb-1">
                              {blockedUser.displayName || blockedUser.username || 'کاربر ناشناس'}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">ایمیل:</span>
                              <span className="text-sm font-medium text-yellow-400">
                                {blockedUser.email || 'ایمیل یافت نشد'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                          <div className="bg-black/30 border border-red-500/20 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-1">تعداد Kick شدن</p>
                            <p className="text-2xl font-bold text-red-400">
                              {blockedUser.kickCount || 0}
                            </p>
                          </div>
                          <div className="bg-black/30 border border-red-500/20 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-1">اولین Kick</p>
                            <p className="text-sm font-medium text-gray-300">
                              {blockedUser.firstKickAt
                                ? new Date(blockedUser.firstKickAt.toDate()).toLocaleDateString('fa-IR')
                                : 'نامشخص'}
                            </p>
                          </div>
                          <div className="bg-black/30 border border-red-500/20 rounded-lg p-3">
                            <p className="text-xs text-gray-400 mb-1">آخرین Kick</p>
                            <p className="text-sm font-medium text-gray-300">
                              {blockedUser.lastKickAt
                                ? new Date(blockedUser.lastKickAt.toDate()).toLocaleDateString('fa-IR')
                                : 'نامشخص'}
                            </p>
                          </div>
                        </div>

                        {/* User ID */}
                        <div className="text-xs text-gray-500 mb-3">
                          User ID: {blockedUser.userId}
                        </div>
                      </div>

                      {/* Unlock Button */}
                      <button
                        onClick={() => handleUnlockUser(blockedUser.userId)}
                        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium ml-4"
                        title="باز کردن قفل کاربر"
                      >
                        <Unlock className="w-4 h-4" />
                        باز کردن قفل
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
