import React, { useState, useEffect } from 'react';
import { Download, Copy, Check, RefreshCw, Activity, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';

export default function MT5Setup({ onComplete, onBack }) {
  const { currentUser } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [mt5Status, setMt5Status] = useState({
    connected: false,
    lastSync: null,
    account: null,
    balance: null
  });

  // Load MT5 Status and use email as API Key
  useEffect(() => {
    if (!currentUser) return;

    // API Key is user's email
    setApiKey(currentUser.email);

    const userRef = doc(db, 'users', currentUser.uid);

    // Listen to real-time updates
    const unsubscribe = onSnapshot(userRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // Update MT5 status
        setMt5Status({
          connected: data.account_info ? true : false,
          lastSync: data.account_info?.last_update?.toDate() || null,
          account: data.account_info?.login || null,
          balance: data.account_info?.balance || null,
          equity: data.account_info?.equity || null
        });
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Copy API Key to clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download EA file
  const downloadEA = () => {
    window.location.href = '/TradingMonitor.mq5';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 rounded-xl p-6 border border-purple-500/30">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-6 h-6 text-purple-400" />
          <h2 className="text-2xl font-bold text-white">اتصال MetaTrader 5</h2>
        </div>
        <p className="text-gray-300 text-sm">
          با نصب Expert Advisor روی MT5 خود، تمام معاملات شما به صورت خودکار و لحظه‌ای به سایت منتقل می‌شود.
        </p>
      </div>

      {/* Connection Status */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">وضعیت اتصال</h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${mt5Status.connected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
            <span className={`text-sm ${mt5Status.connected ? 'text-green-400' : 'text-gray-400'}`}>
              {mt5Status.connected ? 'متصل' : 'قطع'}
            </span>
          </div>
        </div>

        {mt5Status.connected && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">حساب:</span>
              <p className="text-white font-mono">{mt5Status.account}</p>
            </div>
            <div>
              <span className="text-gray-400">موجودی:</span>
              <p className="text-white font-bold">
                ${mt5Status.balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div>
              <span className="text-gray-400">Equity:</span>
              <p className="text-white">${mt5Status.equity?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <span className="text-gray-400">آخرین همگام‌سازی:</span>
              <p className="text-white text-xs">
                {mt5Status.lastSync
                  ? new Date(mt5Status.lastSync).toLocaleString('fa-IR')
                  : 'هیچ‌گاه'}
              </p>
            </div>
          </div>
        )}

        {!mt5Status.connected && (
          <div className="flex items-center gap-2 text-yellow-500 bg-yellow-500/10 p-3 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">
              EA شما هنوز متصل نشده است. لطفاً مراحل زیر را دنبال کنید.
            </p>
          </div>
        )}
      </div>

      {/* API Key Section */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white">API Key شما (ایمیل شما)</h3>
          <p className="text-xs text-gray-400 mt-1">
            از ایمیل حساب کاربری خود به عنوان API Key استفاده می‌شود
          </p>
        </div>

        <div className="relative">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-purple-300 break-all">
            {apiKey}
          </div>
          <button
            onClick={copyToClipboard}
            className="absolute top-3 right-3 bg-gray-800 hover:bg-gray-700 p-2 rounded-lg transition"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          ⚠️ این ایمیل را در EA خود وارد کنید تا اتصال برقرار شود
        </p>
      </div>

      {/* Setup Instructions */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">مراحل نصب</h3>

        <div className="space-y-4">
          {/* Step 1 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              1
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-2">دانلود Expert Advisor</h4>
              <button
                onClick={downloadEA}
                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg transition"
              >
                <Download className="w-4 h-4" />
                دانلود TradingMonitor.mq5
              </button>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              2
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-2">کپی فایل به پوشه MT5</h4>
              <p className="text-sm text-gray-400">
                فایل دانلود شده را در مسیر زیر کپی کنید:
              </p>
              <code className="block mt-2 bg-gray-900 border border-gray-700 rounded p-2 text-xs text-purple-300 overflow-x-auto">
                C:\Users\YourName\AppData\Roaming\MetaQuotes\Terminal\[ID]\MQL5\Experts\
              </code>
              <p className="text-xs text-gray-500 mt-2">
                💡 یا از منوی MT5: File → Open Data Folder → MQL5 → Experts
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              3
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-2">فعال‌سازی WebRequest</h4>
              <p className="text-sm text-gray-400 mb-2">
                در MT5، به منوی زیر بروید:
              </p>
              <code className="block bg-gray-900 border border-gray-700 rounded p-2 text-xs text-purple-300">
                Tools → Options → Expert Advisors
              </code>
              <p className="text-sm text-gray-400 mt-2">
                گزینه "Allow WebRequest for listed URL" را فعال کنید و URL زیر را اضافه کنید:
              </p>
              <div className="relative mt-2">
                <code className="block bg-gray-900 border border-gray-700 rounded p-2 text-xs text-purple-300">
                  http://127.0.0.1:5000
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('http://127.0.0.1:5000');
                    alert('✓ URL کپی شد!');
                  }}
                  className="absolute top-2 left-2 bg-gray-800 hover:bg-gray-700 p-1 rounded transition"
                >
                  <Copy className="w-3 h-3 text-gray-400" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                ⚠️ حتماً این آدرس را دقیقاً همین‌طور وارد کنید
              </p>
            </div>
          </div>

          {/* Step 4 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
              4
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-2">اضافه کردن EA به چارت</h4>
              <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
                <li>در MT5، Navigator → Expert Advisors → TradingMonitor را پیدا کنید</li>
                <li>EA را روی هر چارتی Drag & Drop کنید</li>
                <li>در پنجره تنظیمات، API Key خود را وارد کنید</li>
                <li>Python Server URL را وارد کنید (پیش‌فرض: http://localhost:5000/api/mt5/update)</li>
                <li>Allow DLL imports و Allow WebRequest را فعال کنید</li>
                <li>روی OK کلیک کنید</li>
              </ul>
            </div>
          </div>

          {/* Step 5 */}
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
              ✓
            </div>
            <div className="flex-1">
              <h4 className="text-white font-medium mb-2">تمام!</h4>
              <p className="text-sm text-gray-400">
                حالا EA شما شروع به ارسال داده‌ها می‌کند. وضعیت اتصال در بالای این صفحه نمایش داده می‌شود.
              </p>
              <p className="text-xs text-green-400 mt-2">
                💡 تمام معاملات باز و تاریخچه معاملات شما به صورت خودکار همگام‌سازی می‌شود.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <details className="bg-gray-800/50 rounded-xl border border-gray-700 overflow-hidden">
        <summary className="p-4 cursor-pointer text-white font-medium hover:bg-gray-700/50 transition">
          عیب‌یابی و سوالات متداول
        </summary>
        <div className="p-4 space-y-3 text-sm text-gray-400 bg-gray-900/30">
          <div>
            <p className="text-white font-medium mb-1">❓ EA متصل نمی‌شود</p>
            <p>- مطمئن شوید WebRequest برای firestore.googleapis.com فعال است</p>
            <p>- API Key را دوباره چک کنید</p>
            <p>- اتصال اینترنت خود را بررسی کنید</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">❓ داده‌ها همگام نمی‌شوند</p>
            <p>- EA را از چارت حذف و دوباره اضافه کنید</p>
            <p>- MT5 را Restart کنید</p>
            <p>- در تب Experts ببینید چه خطایی دارد</p>
          </div>
          <div>
            <p className="text-white font-medium mb-1">❓ تاریخچه قدیمی sync نمی‌شود</p>
            <p>- گزینه "Sync History On Start" را در تنظیمات EA فعال کنید</p>
            <p>- EA را Restart کنید تا تاریخچه کامل sync شود</p>
          </div>
        </div>
      </details>

      {/* Action Buttons */}
      {(onComplete || onBack) && (
        <div className="flex gap-4 pt-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              بازگشت
            </button>
          )}
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-xl"
            >
              {mt5Status.connected ? 'ادامه به داشبورد' : 'بعداً اتصال می‌دهم، ادامه'}
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
