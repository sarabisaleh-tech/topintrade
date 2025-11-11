import React, { useState } from 'react';

/**
 * فرم ساده برای درخواست اضافه کردن اکانت MT5
 * کاربر فقط اطلاعات رو وارد میکنه، شما بعداً دستی اضافه می‌کنید
 */
export default function AddAccountRequest() {
  const [formData, setFormData] = useState({
    account_number: '',
    investor_password: '',
    broker_server: ''
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const commonBrokers = [
    'ICMarkets-Live',
    'ICMarkets-Demo',
    'XM-Real',
    'XM-Demo',
    'Exness-Real',
    'FTMO-Demo',
    'MyForexFunds-Demo'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch('/api/account-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include', // برای cookie-based auth
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({
          type: 'success',
          text: '✅ درخواست شما ثبت شد! اکانت شما تا 24 ساعت آینده فعال می‌شود.'
        });

        // Reset form
        setFormData({
          account_number: '',
          investor_password: '',
          broker_server: ''
        });
      } else {
        setMessage({
          type: 'error',
          text: data.message || 'خطا در ثبت درخواست'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'خطا در ارتباط با سرور'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">
        درخواست اتصال اکانت MT5
      </h2>

      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-2xl">⚠️</span>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-bold text-yellow-800">
              فقط Investor Password وارد کنید!
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p className="mb-2">
                <strong>Investor Password</strong> یک پسورد جداگانه فقط-خواندنی است.
              </p>
              <p className="text-red-700 font-semibold">
                ⛔ هرگز Master Password (پسورد اصلی) خود را وارد نکنید!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">📝 نحوه کار:</h3>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Investor Password خود را بسازید (راهنما در پایین)</li>
          <li>اطلاعات را در فرم وارد کنید</li>
          <li>درخواست شما ثبت می‌شود</li>
          <li>تیم ما اکانت را تا 24 ساعت فعال می‌کند</li>
          <li>تریدهای شما خودکار همگام‌سازی می‌شوند</li>
        </ol>
      </div>

      {message.text && (
        <div
          className={`mb-4 p-4 rounded ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            شماره حساب *
          </label>
          <input
            type="text"
            required
            value={formData.account_number}
            onChange={(e) =>
              setFormData({ ...formData, account_number: e.target.value })
            }
            placeholder="12345678"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Login number اکانت MT5 شما
          </p>
        </div>

        {/* Investor Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Investor Password (فقط-خواندنی) *
          </label>
          <input
            type="password"
            required
            value={formData.investor_password}
            onChange={(e) =>
              setFormData({ ...formData, investor_password: e.target.value })
            }
            placeholder="پسورد Investor (نه Master Password!)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-2 flex items-start bg-red-50 border-l-4 border-red-400 p-2 rounded">
            <span className="text-red-600 mr-2">⛔</span>
            <p className="text-xs text-red-700">
              <strong>هشدار:</strong> فقط Investor Password وارد کنید، نه Master Password!
              <br />
              با Investor Password نمی‌توان ترید زد یا پول برداشت کرد.
            </p>
          </div>
        </div>

        {/* Broker Server */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            سرور بروکر *
          </label>
          <input
            type="text"
            required
            value={formData.broker_server}
            onChange={(e) =>
              setFormData({ ...formData, broker_server: e.target.value })
            }
            placeholder="ICMarkets-Live"
            list="broker-servers"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="broker-servers">
            {commonBrokers.map((broker) => (
              <option key={broker} value={broker} />
            ))}
          </datalist>
          <p className="text-xs text-gray-500 mt-1">
            نام دقیق سرور بروکر (مثلاً ICMarkets-Live)
          </p>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-md font-medium text-white transition-colors ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {loading ? '⏳ در حال ارسال...' : '📤 ارسال درخواست'}
        </button>
      </form>

      {/* راهنما */}
      <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
        <h3 className="font-bold text-blue-900 mb-3 text-lg flex items-center">
          <span className="text-2xl mr-2">💡</span>
          چطور Investor Password بسازم؟
        </h3>
        <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
          <li className="font-medium">
            در MT5 به <code className="bg-blue-100 px-2 py-1 rounded">Tools → Options</code> بروید
          </li>
          <li className="font-medium">
            به تب <code className="bg-blue-100 px-2 py-1 rounded">Server</code> بروید
          </li>
          <li className="font-medium">
            روی <code className="bg-blue-100 px-2 py-1 rounded">Change Investor Password</code> کلیک کنید
          </li>
          <li>
            <strong>Master Password</strong> فعلی خود را وارد کنید
            <br />
            <span className="text-xs text-red-600">(این پسورد را هرگز با ما به اشتراک نگذارید!)</span>
          </li>
          <li>
            یک <strong>Investor Password</strong> جدید تعیین کنید
            <br />
            <span className="text-xs text-gray-600">(مثلاً: MyView123! - این را به یاد داشته باشید)</span>
          </li>
          <li className="font-medium text-green-700">
            ✅ همان Investor Password را اینجا وارد کنید
          </li>
        </ol>

        <div className="mt-4 p-3 bg-white border border-blue-200 rounded">
          <p className="text-xs text-gray-600">
            <strong>نکته:</strong> اگر قبلاً Investor Password تنظیم کرده‌اید، همان را وارد کنید.
            اگر یادتان نیست، می‌توانید یک Investor Password جدید بسازید.
          </p>
        </div>
      </div>

      {/* امنیت */}
      <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
        <h3 className="font-medium text-green-900 mb-2">🔒 امنیت</h3>
        <p className="text-sm text-green-800">
          <strong>Investor Password</strong> فقط اجازه مشاهده تریدها را می‌دهد.
          با این پسورد نمی‌توان:
        </p>
        <ul className="text-sm text-green-800 mt-2 space-y-1 list-disc list-inside">
          <li>ترید باز یا بسته کرد</li>
          <li>پول برداشت کرد</li>
          <li>تنظیمات را تغییر داد</li>
        </ul>
      </div>
    </div>
  );
}
