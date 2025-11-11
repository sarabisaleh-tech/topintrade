import React, { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut, Upload, Eye, EyeOff, Clock } from 'lucide-react';
import { useAuth } from './AuthContext';
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const ProfileMenu = ({ currentSessionTime = 0, isTrackingTime = false }) => {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const dropdownRef = useRef(null);

  // Profile form state
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [photoURL, setPhotoURL] = useState(currentUser?.photoURL || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get username from email or displayName
  const getUsername = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }
    return currentUser?.email?.split('@')[0] || 'User';
  };

  // Get initials for avatar
  const getInitials = () => {
    const username = getUsername();
    return username.substring(0, 2).toUpperCase();
  };

  const handleLogout = async () => {
    if (window.confirm('آیا می‌خواهید خارج شوید؟')) {
      try {
        await logout();
      } catch (error) {
        console.error('Logout error:', error);
        alert('خطا در خروج');
      }
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate passwords if provided
    if (newPassword || confirmPassword) {
      if (newPassword !== confirmPassword) {
        setError('رمز عبور و تکرار آن مطابقت ندارند');
        return;
      }
      if (newPassword.length < 6) {
        setError('رمز عبور باید حداقل 6 کاراکتر باشد');
        return;
      }
    }

    setLoading(true);

    try {
      const updates = {};

      if (displayName !== currentUser?.displayName) {
        updates.displayName = displayName;
      }

      if (photoURL !== currentUser?.photoURL) {
        updates.photoURL = photoURL;
      }

      if (newPassword) {
        updates.password = newPassword;
      }

      if (Object.keys(updates).length > 0) {
        await updateUserProfile(updates);
        setSuccess('پروفایل با موفقیت به‌روزرسانی شد');
        setNewPassword('');
        setConfirmPassword('');

        // Close modal after 2 seconds
        setTimeout(() => {
          setShowProfileModal(false);
          setSuccess('');
        }, 2000);
      } else {
        setError('هیچ تغییری اعمال نشده است');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      setError(error.message || 'خطا در به‌روزرسانی پروفایل');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // بررسی حجم فایل (مثلاً حداکثر 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('حجم عکس نباید بیشتر از 5MB باشد');
      return;
    }

    // بررسی نوع فایل
    if (!file.type.startsWith('image/')) {
      setError('فقط فایل‌های تصویری مجاز هستند');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // آپلود به Firebase Storage
      const storageRef = ref(storage, `profile-photos/${currentUser.uid}/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);

      // دریافت URL دانلود
      const downloadURL = await getDownloadURL(storageRef);

      // تنظیم URL جدید
      setPhotoURL(downloadURL);
      setSuccess('عکس با موفقیت آپلود شد');

      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('خطا در آپلود عکس. لطفاً دوباره تلاش کنید.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Profile Button with Avatar */}
      <div className="relative flex items-center" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="hover:opacity-90 transition p-0 border-0 bg-transparent outline-none flex items-center"
          title="پروفایل کاربری"
        >
          {/* Circular Avatar - هم اندازه و هم تراز دکمه + */}
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-lg cursor-pointer">
            {currentUser?.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={getUsername()}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials()
            )}
          </div>
        </button>

        {/* Dropdown Menu - دقیقا زیر آواتار باز میشه */}
        {showDropdown && (
          <div
            className="absolute w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl"
            style={{
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 9999
            }}
          >
            {/* User Info Section */}
            <div className="px-4 py-3 border-b border-gray-700 bg-gray-900">
              <p className="text-sm font-medium text-white truncate">
                {getUsername()}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {currentUser?.email}
              </p>

              {/* Today's Session Timer */}
              {isTrackingTime && currentSessionTime > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-xs text-gray-400">Today:</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs font-bold text-green-400 font-mono">
                        {Math.floor(currentSessionTime / 3600000)}h {Math.floor((currentSessionTime % 3600000) / 60000)}m
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Menu Items */}
            <div className="py-1 bg-gray-800">
              <button
                onClick={() => {
                  setShowProfileModal(true);
                  setShowDropdown(false);
                }}
                className="w-full px-4 py-2 text-sm text-left text-gray-300 hover:bg-gray-700 transition flex items-center gap-2 cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                پروفایل
              </button>

              <button
                onClick={() => {
                  setShowDropdown(false);
                  handleLogout();
                }}
                className="w-full px-4 py-2 text-sm text-left text-red-400 hover:bg-gray-700 transition flex items-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="glass-card rounded-xl p-6 max-w-md w-full border border-gray-700 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                تنظیمات پروفایل
              </h2>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-gray-400 hover:text-white transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-4">
              {/* Profile Photo */}
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-2xl border-4 border-purple-400 shadow-lg">
                  {photoURL ? (
                    <img
                      src={photoURL}
                      alt="Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    getInitials()
                  )}
                </div>
                <label className={`cursor-pointer px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${loading ? 'bg-gray-600 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  <Upload className="w-4 h-4" />
                  {loading ? 'در حال آپلود...' : 'انتخاب تصویر'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  نام کاربری
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500 transition"
                  placeholder="نام کاربری خود را وارد کنید"
                />
              </div>

              {/* Email - Disabled */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  ایمیل (غیر قابل تغییر)
                </label>
                <input
                  type="email"
                  value={currentUser?.email || ''}
                  disabled
                  className="w-full bg-gray-900/30 border border-gray-700 rounded-lg px-3 py-2 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  رمز عبور جدید (اختیاری)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-purple-500 transition"
                    placeholder="رمز عبور جدید"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              {newPassword && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    تکرار رمز عبور
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg pl-10 pr-3 py-2 text-white focus:outline-none focus:border-purple-500 transition"
                      placeholder="تکرار رمز عبور جدید"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-2 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Success Message */}
              {success && (
                <div className="bg-green-500/20 border border-green-500 text-green-400 px-4 py-2 rounded-lg text-sm">
                  {success}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  {loading ? 'در حال به‌روزرسانی...' : 'ذخیره تغییرات'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-700 hover:bg-gray-700 transition"
                >
                  انصراف
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfileMenu;
