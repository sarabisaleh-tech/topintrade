import React from 'react';
import { BarChart3, Settings, Youtube, Instagram, BookOpen, LineChart, Globe, User } from 'lucide-react';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

export default function LandingPage({ onSelectMode }) {
  const { currentUser } = useAuth();
  const { language, toggleLanguage, t } = useLanguage();

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=2000&auto=format&fit=crop')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

      {/* Top Right Buttons */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-3">
        {/* Profile Button */}
        <button
          onClick={() => onSelectMode('profile')}
          className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg"
          title={t('profile')}
        >
          <User className="w-5 h-5" />
          <span>{t('profile')}</span>
        </button>

        {/* Admin Button (فقط برای ادمین) */}
        {currentUser?.isAdmin && (
          <button
            onClick={() => onSelectMode('admin')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 shadow-lg"
            title={t('adminPanel')}
          >
            <Settings className="w-5 h-5" />
            <span>{t('adminPanel')}</span>
          </button>
        )}
      </div>

      {/* Social Media Links + Language Switcher */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-3">
        <a
          href="https://youtube.com/@topintrade"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg transition shadow-lg flex items-center justify-center"
          title="یوتیوب"
        >
          <Youtube className="w-6 h-6 text-white" />
        </a>
        <a
          href="https://www.instagram.com/titopintrade?igsh=YTQwZjQ0NmI0OA%3D%3D"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white p-3 rounded-lg transition shadow-lg flex items-center justify-center"
          title="اینستاگرام"
        >
          <Instagram className="w-6 h-6 text-white" />
        </a>
        <button
          onClick={toggleLanguage}
          className="bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg transition shadow-lg flex items-center gap-2"
          title={language === 'fa' ? 'Switch to English' : 'تغییر به فارسی'}
        >
          <Globe className="w-6 h-6" />
          <span className="text-sm font-bold">{language === 'fa' ? 'EN' : 'FA'}</span>
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Logo + Title */}
        <div className="flex items-center justify-center gap-6 mb-4">
          <img
            src="/logo.png"
            alt="TopInTrade Logo"
            className="h-24 w-24 drop-shadow-2xl"
          />
          <h1 className="text-7xl font-bold text-white drop-shadow-2xl">
            Top In Trade
          </h1>
        </div>
        <p className="text-xl text-center mb-16 text-gray-200 drop-shadow-lg">
          {t('landingSubtitle')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* بک تست - فعال */}
          <button
            onClick={() => onSelectMode('backtest')}
            className="group relative bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 cursor-pointer
                     transform transition-all duration-500 hover:scale-105 hover:border-gray-600
                     hover:shadow-2xl hover:shadow-purple-500/20"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 opacity-0 group-hover:opacity-10
                          rounded-2xl transition-opacity duration-500"></div>

            <div className="relative z-10">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 p-0.5 mb-6 mx-auto
                            transform transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110">
                <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 text-center group-hover:text-transparent
                           group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:via-blue-400 group-hover:to-pink-400
                           group-hover:bg-clip-text transition-all duration-300">
                {t('backtest')}
              </h2>

              <p className="text-gray-400 text-lg text-center group-hover:text-gray-300 transition-colors duration-300">
                {t('backtestDesc')}
              </p>

              <div className="mt-6 flex items-center justify-center text-gray-500 group-hover:text-white transition-colors duration-300">
                <span className="mr-2">{t('clickToEnter')}</span>
                <svg
                  className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>

            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500 via-blue-500 to-pink-500 opacity-0
                          group-hover:opacity-20 blur-xl transition-opacity duration-500 -z-10"></div>
          </button>

          {/* ژورنال - به زودی */}
          <div className="relative bg-gray-800/30 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 opacity-60 cursor-not-allowed">
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-green-500 via-teal-500 to-cyan-500 p-0.5 mb-6 mx-auto opacity-50">
                <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 text-center">
                {t('journal')}
              </h2>

              <p className="text-gray-500 text-lg text-center">
                {t('journalDesc')}
              </p>

              <div className="mt-6 flex items-center justify-center">
                <span className="bg-yellow-600/20 text-yellow-400 px-4 py-2 rounded-lg text-sm font-medium border border-yellow-600/30">
                  {t('comingSoon')}
                </span>
              </div>
            </div>
          </div>

          {/* چارتینگ ویو - به زودی */}
          <div className="relative bg-gray-800/30 backdrop-blur-xl border border-gray-700/30 rounded-2xl p-8 opacity-60 cursor-not-allowed">
            <div className="relative z-10">
              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-pink-500 p-0.5 mb-6 mx-auto opacity-50">
                <div className="w-full h-full bg-gray-900 rounded-xl flex items-center justify-center">
                  <LineChart className="w-10 h-10 text-white" />
                </div>
              </div>

              <h2 className="text-3xl font-bold text-white mb-3 text-center">
                {t('chartingView')}
              </h2>

              <p className="text-gray-500 text-lg text-center">
                {t('chartingViewDesc')}
              </p>

              <div className="mt-6 flex items-center justify-center">
                <span className="bg-yellow-600/20 text-yellow-400 px-4 py-2 rounded-lg text-sm font-medium border border-yellow-600/30">
                  {t('comingSoon')}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
