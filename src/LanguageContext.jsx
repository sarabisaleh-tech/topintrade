import React, { createContext, useState, useContext, useEffect } from 'react';

// Language Context
const LanguageContext = createContext();

// Hook برای استفاده از Language Context
export function useLanguage() {
  return useContext(LanguageContext);
}

// ترجمه‌ها
const translations = {
  fa: {
    // Landing Page
    landingTitle: 'Top In Trade',
    landingSubtitle: 'ابزار تحلیل و بررسی معاملات گذشته',
    backtest: 'بک تست',
    backtestDesc: 'تحلیل و بررسی معاملات گذشته، آمارگیری و بهبود استراتژی معاملاتی',
    journal: 'ژورنال',
    journalDesc: 'ثبت معاملات روزانه و تحلیل عملکرد',
    chartingView: 'چارتینگ ویو',
    chartingViewDesc: 'نمایش و تحلیل نمودارها به صورت تعاملی',
    comingSoon: 'به زودی',
    clickToEnter: 'کلیک کنید برای ورود',
    adminPanel: 'پنل مدیریت',

    // Login/Register
    login: 'ورود',
    register: 'ثبت‌نام',
    name: 'نام',
    email: 'ایمیل',
    password: 'رمز عبور',
    confirmPassword: 'تکرار رمز عبور',
    inviteCode: 'کد دعوت',
    platformSubtitle: 'پلتفرم تحلیل و بررسی معاملات',

    // Dashboard
    dashboard: 'داشبورد',
    stopAnalysis: 'تحلیل استاپ',
    monthlyReport: 'گزارش ماهانه',
    allTrades: 'همه معاملات',
    trackingTime: 'زمان‌بندی',

    // Stats
    totalTrades: 'تعداد معاملات',
    wins: 'برد',
    losses: 'باخت',
    winRate: 'نرخ برد',
    netProfit: 'سود خالص',
    profitFactor: 'فاکتور سود',
    avgWin: 'میانگین برد',
    avgLoss: 'میانگین باخت',
    equity: 'سرمایه',
    equityCurve: 'منحنی سرمایه',
    profit: 'سود',
    loss: 'ضرر',

    // Actions
    newBacktest: 'بک‌تست جدید',
    share: 'اشتراک‌گذاری',
    exportCSV: 'خروجی CSV',
    importCSV: 'ورودی CSV',
    back: 'بازگشت',

    // Profile
    profile: 'پروفایل',
    myProfile: 'پروفایل من',
    uploadPhoto: 'آپلود عکس',
    changePhoto: 'تغییر عکس',
    userInfo: 'اطلاعات کاربر',
    totalBacktests: 'تعداد بک‌تست‌ها',
    memberSince: 'عضو از',
    yourBadge: 'لقب شما',

    // Badges
    badge_newcomer: 'تازه وارد',
    badge_talented: 'با استعداد',
    badge_professional: 'حرفه ای',
    badge_proTracker: 'پیگیر حرفه ای',
    badge_master: 'خفن ترین بکتستر',
  },
  en: {
    // Landing Page
    landingTitle: 'Top In Trade',
    landingSubtitle: 'Trading Analysis and Review Tool',
    backtest: 'Backtest',
    backtestDesc: 'Analyze past trades, gather statistics, and improve your trading strategy',
    journal: 'Journal',
    journalDesc: 'Record daily trades and analyze performance',
    chartingView: 'Charting View',
    chartingViewDesc: 'Display and analyze charts interactively',
    comingSoon: 'Coming Soon',
    clickToEnter: 'Click to Enter',
    adminPanel: 'Admin Panel',

    // Login/Register
    login: 'Login',
    register: 'Register',
    name: 'Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    inviteCode: 'Invite Code',
    platformSubtitle: 'Trading Analysis Platform',

    // Dashboard
    dashboard: 'Dashboard',
    stopAnalysis: 'Stop Analysis',
    monthlyReport: 'Monthly Report',
    allTrades: 'All Trades',
    trackingTime: 'Tracking Time',

    // Stats
    totalTrades: 'Total Trades',
    wins: 'Wins',
    losses: 'Losses',
    winRate: 'Win Rate',
    netProfit: 'Net Profit',
    profitFactor: 'Profit Factor',
    avgWin: 'Avg Win',
    avgLoss: 'Avg Loss',
    equity: 'Equity',
    equityCurve: 'Equity Curve',
    profit: 'Profit',
    loss: 'Loss',

    // Actions
    newBacktest: 'New Backtest',
    share: 'Share',
    exportCSV: 'Export CSV',
    importCSV: 'Import CSV',
    back: 'Back',

    // Profile
    profile: 'Profile',
    myProfile: 'My Profile',
    uploadPhoto: 'Upload Photo',
    changePhoto: 'Change Photo',
    userInfo: 'User Info',
    totalBacktests: 'Total Backtests',
    memberSince: 'Member Since',
    yourBadge: 'Your Badge',

    // Badges
    badge_newcomer: 'Newcomer',
    badge_talented: 'Talented',
    badge_professional: 'Professional',
    badge_proTracker: 'Pro Tracker',
    badge_master: 'Ultimate Backtester',
  }
};

// Language Provider
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState('fa'); // پیش‌فرض فارسی

  // بارگذاری زبان از localStorage
  useEffect(() => {
    const savedLanguage = localStorage.getItem('app-language');
    if (savedLanguage && (savedLanguage === 'fa' || savedLanguage === 'en')) {
      setLanguage(savedLanguage);
    }
  }, []);

  // تعویض زبان
  const toggleLanguage = () => {
    const newLanguage = language === 'fa' ? 'en' : 'fa';
    setLanguage(newLanguage);
    localStorage.setItem('app-language', newLanguage);
  };

  // تابع ترجمه
  const t = (key) => {
    return translations[language][key] || key;
  };

  const value = {
    language,
    toggleLanguage,
    t,
    isRTL: language === 'fa' // برای راست‌چین کردن
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}
