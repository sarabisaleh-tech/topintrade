import React, { useState } from 'react';
import { RefreshCw, LogOut, TrendingUp, TrendingDown, Activity, Clock } from 'lucide-react';
import { useCryptoLiveData } from './CryptoLiveDataProvider';

// استایل‌های Theme مطابق با CryptoJournalApp
const themeColors = {
  primary: '#ea580c',
  primaryLight: '#f97316',
  primaryDark: '#c2410c',
  success: '#ea580c',
  danger: '#8e1616ff',
  background: '#000000',
  surface: '#151516ff',
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
};

export default function CryptoLiveDashboard({ onDisconnect }) {
  const {
    exchange,
    exchangeInfo,
    totalBalance,
    totalEquity,
    availableBalance,
    unrealizedPnl,
    positions,
    trades,
    lastUpdate,
    loading,
    error,
    connected,
    refresh,
    totalPositions,
    totalTrades
  } = useCryptoLiveData();

  const [activeTab, setActiveTab] = useState('overview'); // overview, positions, trades

  // Format number
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined) return '0.00';
    return Number(num).toFixed(decimals);
  };

  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString('fa-IR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Time ago
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: themeColors.background,
      color: themeColors.text,
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        marginBottom: '2rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              marginBottom: '0.5rem',
              color: themeColors.primary
            }}>
              {exchangeInfo?.logo} {exchangeInfo?.name} Live Dashboard
            </h1>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              fontSize: '0.875rem',
              color: themeColors.textSecondary
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: connected ? themeColors.success : themeColors.danger,
                  animation: connected ? 'pulse 2s infinite' : 'none'
                }}></div>
                {connected ? 'متصل' : 'قطع شده'}
              </div>
              {lastUpdate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Clock size={14} />
                  آخرین بروزرسانی: {timeAgo(lastUpdate)}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={refresh}
              disabled={loading}
              style={{
                padding: '0.75rem 1.5rem',
                background: themeColors.surfaceLight,
                border: `1px solid ${themeColors.border}`,
                borderRadius: '8px',
                color: themeColors.text,
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600',
                opacity: loading ? 0.5 : 1
              }}
            >
              <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
              بروزرسانی
            </button>

            <button
              onClick={onDisconnect}
              style={{
                padding: '0.75rem 1.5rem',
                background: themeColors.danger,
                border: 'none',
                borderRadius: '8px',
                color: themeColors.text,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: '600'
              }}
            >
              <LogOut size={16} />
              قطع اتصال
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '1rem',
            background: `${themeColors.danger}20`,
            border: `1px solid ${themeColors.danger}`,
            borderRadius: '8px',
            color: themeColors.danger,
            fontSize: '0.875rem'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        {/* Balance Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Total Balance */}
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
              موجودی کل
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: themeColors.primary }}>
              ${formatNumber(totalBalance)}
            </div>
          </div>

          {/* Total Equity */}
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
              کل دارایی
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: themeColors.text }}>
              ${formatNumber(totalEquity)}
            </div>
          </div>

          {/* Available Balance */}
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
              موجودی آزاد
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 'bold', color: themeColors.text }}>
              ${formatNumber(availableBalance)}
            </div>
          </div>

          {/* Unrealized PnL */}
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            padding: '1.5rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
              سود/زیان شناور
            </div>
            <div style={{
              fontSize: '1.75rem',
              fontWeight: 'bold',
              color: unrealizedPnl >= 0 ? themeColors.success : themeColors.danger,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              {unrealizedPnl >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              ${formatNumber(unrealizedPnl)}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          marginBottom: '1.5rem',
          borderBottom: `1px solid ${themeColors.border}`
        }}>
          {[
            { id: 'overview', label: 'نمای کلی', icon: Activity },
            { id: 'positions', label: `پوزیشن‌های باز (${totalPositions})`, icon: TrendingUp },
            { id: 'trades', label: `تاریخچه معاملات (${totalTrades})`, icon: Activity }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab.id ? themeColors.primary : 'transparent'}`,
                  color: activeTab === tab.id ? themeColors.primary : themeColors.textSecondary,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: themeColors.primary }}>
              🎉 اتصال موفقیت‌آمیز بود!
            </h2>
            <p style={{ color: themeColors.textSecondary, marginBottom: '1rem' }}>
              شما اکنون به {exchangeInfo?.name} متصل هستید.
              <br />
              داده‌های لایو شما هر 10 ثانیه یکبار بروزرسانی می‌شوند.
            </p>
            <p style={{ color: themeColors.textSecondary, fontSize: '0.875rem' }}>
              برای مشاهده پوزیشن‌ها و تاریخچه معاملات، از تب‌های بالا استفاده کنید.
            </p>
          </div>
        )}

        {activeTab === 'positions' && (
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {positions.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: themeColors.textSecondary }}>
                هیچ پوزیشن بازی وجود ندارد
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: themeColors.surfaceLight }}>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>نماد</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>جهت</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>حجم</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>قیمت ورود</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>قیمت فعلی</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>اهرم</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>سود/زیان</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid ${themeColors.border}` }}>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{pos.symbol}</td>
                      <td style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: pos.side === 'LONG' || pos.side === 'Buy' ? themeColors.success : themeColors.danger
                      }}>
                        {pos.side === 'LONG' || pos.side === 'Buy' ? '📈 LONG' : '📉 SHORT'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{formatNumber(pos.size, 4)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(pos.entryPrice)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(pos.currentPrice)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{pos.leverage}x</td>
                      <td style={{
                        padding: '1rem',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: pos.unrealizedPnl >= 0 ? themeColors.success : themeColors.danger
                      }}>
                        ${formatNumber(pos.unrealizedPnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'trades' && (
          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {trades.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: themeColors.textSecondary }}>
                هیچ معامله‌ای یافت نشد
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: themeColors.surfaceLight, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>نماد</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>جهت</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>نوع</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>قیمت</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>حجم</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>کارمزد</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trades.slice(0, 50).map((trade, idx) => (
                      <tr key={idx} style={{ borderTop: `1px solid ${themeColors.border}` }}>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{trade.symbol}</td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          color: trade.side === 'BUY' || trade.side === 'buy' ? themeColors.success : themeColors.danger
                        }}>
                          {trade.side === 'BUY' || trade.side === 'buy' ? '🟢 BUY' : '🔴 SELL'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{trade.type}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(trade.price)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{formatNumber(trade.quantity, 4)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(trade.commission, 4)}</td>
                        <td style={{ padding: '1rem', fontSize: '0.75rem', color: themeColors.textSecondary }}>
                          {formatDate(trade.timestamp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
