import React, { useState, useEffect } from 'react';

/**
 * RegionDetector Component
 * تشخیص خودکار اینکه آیا Firebase از این منطقه قابل دسترسی هست یا نه
 */
export default function RegionDetector() {
  const [status, setStatus] = useState('checking'); // 'checking', 'accessible', 'blocked'
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    checkFirebaseAccess();
  }, []);

  async function checkFirebaseAccess() {
    try {
      // تلاش برای دسترسی به Firebase
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch('https://firestore.googleapis.com/', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      setStatus('accessible');
      console.log('✅ Firebase is accessible from your region');
    } catch (error) {
      // اگر خطا داد، احتمالاً Firebase block شده
      console.warn('⚠️ Firebase appears to be blocked from your region');
      setStatus('blocked');
      setShowBanner(true);
    }
  }

  // اگر Firebase در دسترس هست یا هنوز در حال چک کردن، چیزی نمایش نده
  if (status !== 'blocked' || !showBanner) {
    return null;
  }

  // Alternative URLs
  const alternativeUrls = [
    {
      name: 'Vercel (توصیه برای ایران)',
      url: 'https://dist-fpskqk08l-salehs-projects-de333ebf.vercel.app',
      icon: '▲',
      color: 'blue'
    },
    {
      name: 'Netlify (پشتیبان)',
      url: 'https://topintrade.netlify.app',
      icon: '🟢',
      color: 'green'
    },
    {
      name: 'Cloudflare Pages',
      url: 'https://topintrade.pages.dev',
      icon: '☁️',
      color: 'orange'
    }
  ];

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm">دسترسی محدود شده</p>
              <p className="text-xs opacity-90">
                به نظر می‌رسد Firebase از منطقه شما در دسترس نیست. لطفاً از لینک‌های جایگزین استفاده کنید:
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {alternativeUrls.map((alt) => (
              <a
                key={alt.url}
                href={alt.url}
                className="px-3 py-1.5 bg-white text-gray-900 rounded-lg text-xs font-medium hover:bg-gray-100 transition flex items-center gap-1.5"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{alt.icon}</span>
                <span className="hidden sm:inline">{alt.name}</span>
              </a>
            ))}

            <button
              onClick={() => setShowBanner(false)}
              className="p-1.5 hover:bg-white/20 rounded transition"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
