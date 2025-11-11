import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { doc, onSnapshot, collection } from 'firebase/firestore';
import { TrendingUp, TrendingDown, Clock, Download, Copy, Check, AlertCircle } from 'lucide-react';

export default function MT5TradeLog() {
  const { currentUser } = useAuth();
  const [tradeHistory, setTradeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [apiKeyCopied, setApiKeyCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // Listen to MT5 trade history from new structure
  useEffect(() => {
    if (!currentUser) return;

    // Listen to new structure: users/{uid}/mt5_data/trade_history/
    const historyRef = collection(db, 'users', currentUser.uid, 'mt5_data', 'trade_history', 'documents');

    const unsubscribe = onSnapshot(historyRef, (snapshot) => {
      const deals = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

        // Parse Firestore document format (fields object)
        const parsedData = {};
        if (data.fields) {
          Object.keys(data.fields).forEach(key => {
            const field = data.fields[key];
            if (field.stringValue !== undefined) parsedData[key] = field.stringValue;
            else if (field.integerValue !== undefined) parsedData[key] = parseInt(field.integerValue);
            else if (field.doubleValue !== undefined) parsedData[key] = parseFloat(field.doubleValue);
            else if (field.booleanValue !== undefined) parsedData[key] = field.booleanValue;
            else if (field.timestampValue !== undefined) parsedData[key] = new Date(field.timestampValue);
          });
        } else {
          // Fallback to direct data (legacy)
          Object.assign(parsedData, data);
        }

        deals.push({ id: doc.id, ...parsedData });
      });

      // Sort by timeClose descending
      deals.sort((a, b) => {
        const timeA = a.timeClose instanceof Date ? a.timeClose : new Date(a.timeClose || 0);
        const timeB = b.timeClose instanceof Date ? b.timeClose : new Date(b.timeClose || 0);
        return timeB - timeA;
      });

      setTradeHistory(deals);
      setIsConnected(deals.length > 0);
      setLoading(false);

      if (deals.length > 0) {
        setShowInstructions(false);
      }
    }, (error) => {
      console.error('Error listening to trade history:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Copy API Key
  const copyApiKey = () => {
    navigator.clipboard.writeText(currentUser.uid);
    setApiKeyCopied(true);
    setTimeout(() => setApiKeyCopied(false), 2000);
  };

  // Download EA File
  const downloadEA = () => {
    const link = document.createElement('a');
    link.href = '/TradingMonitor.mq5';
    link.download = 'TradingMonitor.mq5';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format currency
  const formatCurrency = (value, currency = 'USD') => {
    if (value === null || value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  // Format date/time
  const formatDateTime = (date) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  // Show instructions if not connected
  if (!isConnected && showInstructions) {
    return (
      <div className="space-y-6">
        {/* Instructions Card */}
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-6 border border-purple-500/30">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-500/20 rounded-lg">
              <Download className="w-8 h-8 text-purple-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-3">اتصال به MetaTrader 5</h2>
              <p className="text-gray-300 mb-4">
                برای مشاهده معاملات خود در اینجا، Expert Advisor را دانلود و نصب کنید.
              </p>

              <div className="space-y-4">
                {/* API Key */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">API Key شما:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={currentUser.uid}
                      readOnly
                      className="flex-1 px-4 py-2 bg-black/30 border border-white/20 rounded-lg text-white font-mono"
                    />
                    <button
                      onClick={copyApiKey}
                      className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {apiKeyCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                      {apiKeyCopied ? 'کپی شد!' : 'کپی'}
                    </button>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={downloadEA}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-105"
                >
                  <Download className="w-5 h-5" />
                  دانلود Expert Advisor
                </button>

                {/* Installation Steps */}
                <div className="mt-4 p-4 bg-black/20 rounded-lg">
                  <h3 className="font-semibold text-white mb-2">مراحل نصب:</h3>
                  <ol className="list-decimal list-inside space-y-1 text-gray-300 text-sm">
                    <li>دانلود فایل EA</li>
                    <li>باز کردن MT5 → File → Open Data Folder</li>
                    <li>رفتن به MQL5 → Experts</li>
                    <li>کپی کردن فایل دانلود شده در این پوشه</li>
                    <li>ری‌استارت MT5</li>
                    <li>Drag & Drop کردن EA روی چارت</li>
                    <li>وارد کردن API Key در تنظیمات</li>
                    <li>فعال کردن AutoTrading</li>
                    <li>چک کردن وضعیت اتصال در اینجا</li>
                  </ol>
                </div>

                <button
                  onClick={() => setShowInstructions(false)}
                  className="text-purple-400 hover:text-purple-300 text-sm"
                >
                  بستن راهنما
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Placeholder */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-12 border border-white/10 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-white mb-2">در انتظار اتصال</h3>
          <p className="text-gray-300">
            پس از نصب و راه‌اندازی EA، معاملات شما به صورت خودکار در اینجا نمایش داده می‌شود.
          </p>
        </div>
      </div>
    );
  }

  // Show trade history
  return (
    <div className="space-y-6">
      {/* Header */}
      {!showInstructions && (
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">تاریخچه معاملات MT5</h2>
          <button
            onClick={() => setShowInstructions(true)}
            className="text-purple-400 hover:text-purple-300 text-sm"
          >
            نمایش راهنما
          </button>
        </div>
      )}

      {/* Trade History Table */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5">
              <tr className="border-b border-white/10">
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">تیکت</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">نماد</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">نوع</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">ورود/خروج</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">حجم</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">قیمت</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">سود/زیان</th>
                <th className="text-right py-4 px-6 text-gray-300 font-semibold">زمان</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.slice(0, 50).map((deal) => (
                <tr key={deal.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-6 text-white font-mono">{deal.ticket}</td>
                  <td className="py-4 px-6 text-white font-semibold">{deal.symbol}</td>
                  <td className="py-4 px-6">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                      deal.type === 'BUY'
                        ? 'bg-green-500/20 text-green-400'
                        : deal.type === 'SELL'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {deal.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">Open: {deal.priceOpen?.toFixed(5)}</span>
                      <span className="text-xs text-gray-400">Close: {deal.priceClose?.toFixed(5)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-white">{deal.volume?.toFixed(2)}</td>
                  <td className="py-4 px-6 text-white font-mono">{deal.priceClose?.toFixed(5)}</td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2">
                      {(deal.netProfit || deal.profit || 0) >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-400" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-400" />
                      )}
                      <span className={`font-bold ${
                        (deal.netProfit || deal.profit || 0) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(deal.netProfit || deal.profit || 0)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-white text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    {formatDateTime(deal.timeClose || deal.time)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {tradeHistory.length > 50 && (
          <div className="p-4 text-center border-t border-white/10">
            <p className="text-gray-400 text-sm">
              نمایش 50 معامله از {tradeHistory.length} معامله
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
