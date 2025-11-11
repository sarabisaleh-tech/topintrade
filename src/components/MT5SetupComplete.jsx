import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Download, Copy, Check, AlertCircle, Loader, ArrowRight, ExternalLink, BookOpen } from 'lucide-react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export default function MT5SetupComplete({ onGoToDashboard, onBack }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [pythonServerUrl, setPythonServerUrl] = useState('http://localhost:5179/api/mt5/update');

  useEffect(() => {
    loadOrGenerateApiKey();
  }, []);

  const loadOrGenerateApiKey = async () => {
    try {
      setLoading(true);
      const userRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userRef);

      if (userDoc.exists() && userDoc.data().apiKey) {
        setApiKey(userDoc.data().apiKey);
      } else {
        const newApiKey = generateApiKey();
        await setDoc(userRef, {
          apiKey: newApiKey,
          apiKeyCreatedAt: new Date(),
          mt5SetupCompleted: false
        }, { merge: true });
        setApiKey(newApiKey);
      }
    } catch (err) {
      console.error('Error loading/generating API Key:', err);
      setError('خطا در بارگذاری API Key');
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'tk_';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleDownloadEA = () => {
    const link = document.createElement('a');
    link.href = '/TradingMonitor.mq5';
    link.download = 'TradingMonitor.mq5';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGoToDashboard = async () => {
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, {
        mt5SetupCompleted: true
      }, { merge: true });

      if (onGoToDashboard) {
        onGoToDashboard();
      }
    } catch (err) {
      console.error('Error updating setup status:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <div className="text-center">
          <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6" style={{ background: '#000000' }}>
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
               style={{ background: '#331a6bff' }}>
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">راه‌اندازی اتصال MT5</h1>
          <p className="text-gray-400 text-lg">برای اتصال MetaTrader 5 به سایت، مراحل زیر را دنبال کنید</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl flex items-center gap-3" style={{ background: '#8e161620', border: '1px solid #8e1616ff' }}>
            <AlertCircle className="w-5 h-5" style={{ color: '#8e1616ff' }} />
            <p style={{ color: '#8e1616ff' }}>{error}</p>
          </div>
        )}

        {/* Step 1: Download EA */}
        <div className="mb-6 p-6 rounded-2xl" style={{ background: '#151516ff', border: '2px solid #18191bff' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                 style={{ background: '#331a6bff' }}>
              1
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">دانلود Expert Advisor</h3>
              <p className="text-gray-400 mb-4">
                ابتدا فایل Expert Advisor (EA) را دانلود کنید.
              </p>
              <button
                onClick={handleDownloadEA}
                className="px-6 py-3 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center gap-2"
                style={{ background: '#063022ff' }}
              >
                <Download className="w-5 h-5" />
                دانلود TradingMonitor.mq5
              </button>
            </div>
          </div>
        </div>

        {/* Step 2: API Key */}
        <div className="mb-6 p-6 rounded-2xl" style={{ background: '#151516ff', border: '2px solid #18191bff' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                 style={{ background: '#331a6bff' }}>
              2
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">API Key اختصاصی شما</h3>
              <p className="text-gray-400 mb-4">این API Key را کپی کنید.</p>

              <div className="p-4 rounded-xl mb-4" style={{ background: '#131414ff', border: '1px solid #18191bff' }}>
                <label className="text-sm text-gray-500 mb-2 block">API Key</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-white text-sm break-all bg-black px-4 py-3 rounded-lg font-mono">
                    {apiKey}
                  </code>
                  <button
                    onClick={() => copyToClipboard(apiKey, 'apiKey')}
                    className="px-4 py-3 rounded-lg text-white hover:opacity-80 flex items-center gap-2"
                    style={{ background: '#331a6bff' }}
                  >
                    {copied === 'apiKey' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied === 'apiKey' ? 'کپی شد!' : 'کپی'}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl" style={{ background: '#131414ff', border: '1px solid #18191bff' }}>
                <label className="text-sm text-gray-500 mb-2 block">آدرس سرور</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-white text-sm break-all bg-black px-4 py-3 rounded-lg font-mono">
                    {pythonServerUrl}
                  </code>
                  <button
                    onClick={() => copyToClipboard(pythonServerUrl, 'serverUrl')}
                    className="px-4 py-3 rounded-lg text-white hover:opacity-80 flex items-center gap-2"
                    style={{ background: '#331a6bff' }}
                  >
                    {copied === 'serverUrl' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied === 'serverUrl' ? 'کپی شد!' : 'کپی'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Installation */}
        <div className="mb-6 p-6 rounded-2xl" style={{ background: '#151516ff', border: '2px solid #18191bff' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                 style={{ background: '#331a6bff' }}>
              3
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-4">نصب در MT5</h3>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#063022ff' }}>✓</div>
                  <div>
                    <p className="text-white font-medium mb-1">File → Open Data Folder</p>
                    <p className="text-gray-400 text-sm">در MT5 از منوی بالا</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#063022ff' }}>✓</div>
                  <div>
                    <p className="text-white font-medium mb-1">کپی فایل</p>
                    <p className="text-gray-400 text-sm">فایل را در <code className="bg-black px-2 py-1 rounded text-xs">MQL5/Experts/</code> کپی کنید</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#063022ff' }}>✓</div>
                  <div>
                    <p className="text-white font-medium mb-1">Restart MT5</p>
                    <p className="text-gray-400 text-sm">MT5 را ببندید و دوباره باز کنید</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#063022ff' }}>✓</div>
                  <div>
                    <p className="text-white font-medium mb-1">اضافه کردن به چارت</p>
                    <p className="text-gray-400 text-sm">از Navigator روی چارت Drag کنید</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#063022ff' }}>✓</div>
                  <div>
                    <p className="text-white font-medium mb-1">وارد کردن API Key</p>
                    <p className="text-gray-400 text-sm">در تنظیمات EA، API Key را وارد کنید</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs" style={{ background: '#063022ff' }}>✓</div>
                  <div>
                    <p className="text-white font-medium mb-1">فعال‌سازی</p>
                    <p className="text-gray-400 text-sm">Allow WebRequests را فعال کنید</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 4: Dashboard */}
        <div className="mb-6 p-6 rounded-2xl" style={{ background: '#151516ff', border: '2px solid #18191bff' }}>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                 style={{ background: '#331a6bff' }}>
              4
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-2">ورود به داشبورد</h3>
              <p className="text-gray-400 mb-4">
                بعد از نصب EA، به داشبورد بروید.
              </p>
              <button
                onClick={handleGoToDashboard}
                className="px-8 py-4 rounded-xl font-bold text-white transition-all hover:scale-105 flex items-center gap-2"
                style={{ background: '#331a6bff' }}
              >
                <span>رفتن به داشبورد</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="w-full px-4 py-2 rounded-lg text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 transition-colors"
          >
            بازگشت
          </button>
        )}
      </div>
    </div>
  );
}
