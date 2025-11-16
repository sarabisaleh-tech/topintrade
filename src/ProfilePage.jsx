import React, { useState, useEffect } from 'react';
import { User, Camera, Award, Calendar, BarChart3, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// تابع محاسبه لقب بر اساس تعداد بک‌تست‌ها
function getBadge(backtestCount, t) {
  if (backtestCount < 100) {
    return {
      title: t('badge_newcomer'),
      color: 'from-gray-600 to-gray-700',
      icon: '🌱'
    };
  } else if (backtestCount >= 100 && backtestCount < 300) {
    return {
      title: t('badge_talented'),
      color: 'from-blue-600 to-blue-700',
      icon: '⭐'
    };
  } else if (backtestCount >= 300 && backtestCount < 500) {
    return {
      title: t('badge_professional'),
      color: 'from-purple-600 to-purple-700',
      icon: '🏆'
    };
  } else if (backtestCount >= 500 && backtestCount < 1000) {
    return {
      title: t('badge_proTracker'),
      color: 'from-orange-600 to-orange-700',
      icon: '🔥'
    };
  } else {
    return {
      title: t('badge_master'),
      color: 'from-red-600 via-pink-600 to-purple-600',
      icon: '👑'
    };
  }
}

export default function ProfilePage({ onBack }) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [memberSince, setMemberSince] = useState(new Date());
  const [totalBacktests, setTotalBacktests] = useState(0);

  // بارگذاری عکس پروفایل و تعداد بک‌تست‌ها از Backend
  useEffect(() => {
    async function loadProfileData() {
      if (!currentUser) return;

      try {
        const token = localStorage.getItem('authToken');

        // بارگذاری عکس پروفایل
        const photoResponse = await fetch(`${API_URL}/api/user/profile-photo`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (photoResponse.ok) {
          const photoData = await photoResponse.json();
          if (photoData.profilePhoto) {
            setProfilePhoto(photoData.profilePhoto);
          }
        }

        // بارگذاری تعداد بک‌تست‌ها
        const dataResponse = await fetch(`${API_URL}/api/user/${currentUser.uid}/data`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (dataResponse.ok) {
          const userData = await dataResponse.json();
          const backtests = userData.backtests || [];
          setTotalBacktests(backtests.length);
        }
      } catch (error) {
        console.error('Error loading profile data:', error);
      }
    }

    loadProfileData();
  }, [currentUser]);

  // آپلود عکس پروفایل
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // بررسی حجم فایل (حداکثر 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('حجم فایل نباید بیشتر از 2 مگابایت باشد');
      return;
    }

    // تبدیل به base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setUploading(true);

      try {
        const token = localStorage.getItem('authToken');
        const response = await fetch(`${API_URL}/api/user/profile-photo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ profilePhoto: base64String })
        });

        if (response.ok) {
          setProfilePhoto(base64String);
          alert('✅ عکس پروفایل با موفقیت آپلود شد');
        } else {
          alert('❌ خطا در آپلود عکس پروفایل');
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('❌ خطا در آپلود عکس پروفایل');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const badge = getBadge(totalBacktests, t);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-3xl font-bold">{t('myProfile')}</h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="md:col-span-1">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              {/* Profile Photo */}
              <div className="relative mb-6">
                <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-16 h-16 text-gray-400" />
                  )}
                </div>

                {/* Upload Button */}
                <label className="absolute bottom-0 right-1/2 translate-x-1/2 translate-y-2 bg-purple-600 hover:bg-purple-700 p-2 rounded-full cursor-pointer transition shadow-lg">
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* User Info */}
              <div className="text-center">
                <h2 className="text-xl font-bold mb-1">{currentUser?.name || 'User'}</h2>
                <p className="text-gray-400 text-sm mb-4">{currentUser?.email}</p>

                {/* Badge */}
                <div className={`bg-gradient-to-r ${badge.color} p-3 rounded-lg mb-2`}>
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <span className="text-2xl">{badge.icon}</span>
                    <Award className="w-5 h-5" />
                  </div>
                  <p className="text-sm font-bold">{badge.title}</p>
                </div>

                <p className="text-xs text-gray-500 mt-2">{t('yourBadge')}</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="md:col-span-2 space-y-4">
            {/* Total Backtests */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{t('totalBacktests')}</p>
                  <p className="text-4xl font-bold">{totalBacktests}</p>
                </div>
                <div className="bg-purple-600/20 p-4 rounded-lg">
                  <BarChart3 className="w-8 h-8 text-purple-400" />
                </div>
              </div>
            </div>

            {/* Member Since */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm mb-1">{t('memberSince')}</p>
                  <p className="text-2xl font-bold">
                    {memberSince.toLocaleDateString('fa-IR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-blue-600/20 p-4 rounded-lg">
                  <Calendar className="w-8 h-8 text-blue-400" />
                </div>
              </div>
            </div>

            {/* Badge Progress */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-bold mb-4">پیشرفت شما</h3>
              <div className="space-y-3">
                {[
                  { min: 0, max: 100, label: t('badge_newcomer'), icon: '🌱' },
                  { min: 100, max: 300, label: t('badge_talented'), icon: '⭐' },
                  { min: 300, max: 500, label: t('badge_professional'), icon: '🏆' },
                  { min: 500, max: 1000, label: t('badge_proTracker'), icon: '🔥' },
                  { min: 1000, max: Infinity, label: t('badge_master'), icon: '👑' }
                ].map((level, index) => {
                  const isActive = totalBacktests >= level.min && totalBacktests < level.max;
                  const isPassed = totalBacktests >= level.max;

                  return (
                    <div key={index} className={`flex items-center justify-between p-3 rounded-lg ${isActive ? 'bg-purple-900/30 border border-purple-600' : isPassed ? 'bg-green-900/20' : 'bg-gray-800/50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{level.icon}</span>
                        <span className={`${isActive ? 'text-white font-bold' : 'text-gray-400'}`}>
                          {level.label}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {level.max === Infinity ? `${level.min}+` : `${level.min}-${level.max}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
