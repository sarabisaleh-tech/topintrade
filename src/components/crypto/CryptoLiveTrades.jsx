import React, { useState, useMemo } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Activity, DollarSign, Clock, Filter } from 'lucide-react';
import { useCryptoLiveData } from './CryptoLiveDataProvider';

// Theme colors matching CryptoJournalApp
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

export default function CryptoLiveTrades() {
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

  const [activeView, setActiveView] = useState('overview'); // overview, positions, trades
  const [filterSymbol, setFilterSymbol] = useState('all');

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

  // Time ago helper
  const timeAgo = (timestamp) => {
    if (!timestamp) return '';
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} ثانیه پیش`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} دقیقه پیش`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ساعت پیش`;
    const days = Math.floor(hours / 24);
    return `${days} روز پیش`;
  };

  // Get unique symbols from trades
  const symbols = useMemo(() => {
    const uniqueSymbols = new Set(trades.map(t => t.symbol));
    return ['all', ...Array.from(uniqueSymbols)];
  }, [trades]);

  // Filter trades by symbol
  const filteredTrades = useMemo(() => {
    if (filterSymbol === 'all') return trades;
    return trades.filter(t => t.symbol === filterSymbol);
  }, [trades, filterSymbol]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalProfit = trades.reduce((sum, t) => sum + (t.realizedPnl || 0), 0);
    const totalCommission = trades.reduce((sum, t) => sum + (t.commission || 0), 0);
    const winningTrades = trades.filter(t => (t.realizedPnl || 0) > 0).length;
    const losingTrades = trades.filter(t => (t.realizedPnl || 0) < 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;

    return {
      totalProfit,
      totalCommission,
      winningTrades,
      losingTrades,
      winRate,
      netProfit: totalProfit - totalCommission
    };
  }, [trades, totalTrades]);

  if (!connected) {
    return (
      <div style={{
        padding: '3rem',
        textAlign: 'center',
        background: themeColors.surface,
        border: `1px solid ${themeColors.border}`,
        borderRadius: '12px'
      }}>
        <Activity size={48} style={{ color: themeColors.textSecondary, margin: '0 auto 1rem' }} />
        <h3 style={{ color: themeColors.text, marginBottom: '0.5rem' }}>
          به صرافی متصل نیستید
        </h3>
        <p style={{ color: themeColors.textSecondary, fontSize: '0.875rem' }}>
          لطفاً از بخش "Live Trading" به صرافی خود متصل شوید
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header with Connection Status */}
      <div style={{
        background: themeColors.surface,
        border: `1px solid ${themeColors.border}`,
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: themeColors.primary,
              marginBottom: '0.5rem'
            }}>
              {exchangeInfo?.logo} {exchangeInfo?.name} - Live Trading
            </h2>
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
                  {timeAgo(lastUpdate)}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem',
              background: themeColors.primaryLight,
              border: 'none',
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
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            padding: '0.75rem',
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

      {/* Balance Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            موجودی کل
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: themeColors.primary }}>
            ${formatNumber(totalBalance)}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            کل دارایی
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: themeColors.text }}>
            ${formatNumber(totalEquity)}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            موجودی آزاد
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: themeColors.text }}>
            ${formatNumber(availableBalance)}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1.25rem'
        }}>
          <div style={{ fontSize: '0.875rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            سود/زیان شناور
          </div>
          <div style={{
            fontSize: '1.5rem',
            fontWeight: 'bold',
            color: unrealizedPnl >= 0 ? themeColors.success : themeColors.danger,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            {unrealizedPnl >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            ${formatNumber(unrealizedPnl)}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            سود خالص
          </div>
          <div style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: stats.netProfit >= 0 ? themeColors.success : themeColors.danger
          }}>
            ${formatNumber(stats.netProfit)}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            نرخ برد
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: themeColors.text }}>
            {formatNumber(stats.winRate, 1)}%
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            معاملات برنده
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: themeColors.success }}>
            {stats.winningTrades}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            معاملات بازنده
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: themeColors.danger }}>
            {stats.losingTrades}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            کل کارمزد
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: themeColors.text }}>
            ${formatNumber(stats.totalCommission)}
          </div>
        </div>

        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '1rem'
        }}>
          <div style={{ fontSize: '0.75rem', color: themeColors.textSecondary, marginBottom: '0.5rem' }}>
            پوزیشن‌های باز
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: themeColors.text }}>
            {totalPositions}
          </div>
        </div>
      </div>

      {/* View Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1rem',
        borderBottom: `1px solid ${themeColors.border}`
      }}>
        {[
          { id: 'overview', label: 'نمای کلی', icon: Activity },
          { id: 'positions', label: `پوزیشن‌ها (${totalPositions})`, icon: TrendingUp },
          { id: 'trades', label: `تاریخچه (${totalTrades})`, icon: DollarSign }
        ].map(view => {
          const Icon = view.icon;
          return (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                border: 'none',
                borderBottom: `2px solid ${activeView === view.id ? themeColors.primary : 'transparent'}`,
                color: activeView === view.id ? themeColors.primary : themeColors.textSecondary,
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
              {view.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeView === 'overview' && (
        <div style={{
          background: themeColors.surface,
          border: `1px solid ${themeColors.border}`,
          borderRadius: '12px',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <Activity size={48} style={{ color: themeColors.primary, margin: '0 auto 1rem' }} />
          <h3 style={{ fontSize: '1.25rem', color: themeColors.text, marginBottom: '0.5rem' }}>
            داشبورد معاملات زنده
          </h3>
          <p style={{ color: themeColors.textSecondary, fontSize: '0.875rem' }}>
            اطلاعات حساب شما به صورت خودکار هر 10 ثانیه یکبار بروزرسانی می‌شود.
            <br />
            از تب‌های بالا برای مشاهده جزئیات استفاده کنید.
          </p>
        </div>
      )}

      {activeView === 'positions' && (
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
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: themeColors.surfaceLight }}>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>نماد</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>جهت</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>حجم</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>قیمت ورود</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>قیمت فعلی</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>اهرم</th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>PnL</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((pos, idx) => (
                    <tr key={idx} style={{ borderTop: `1px solid ${themeColors.border}` }}>
                      <td style={{ padding: '1rem', fontWeight: '600' }}>{pos.symbol}</td>
                      <td style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: pos.side === 'LONG' || pos.side === 'Buy' ? themeColors.success : themeColors.danger,
                        fontWeight: '600'
                      }}>
                        {pos.side === 'LONG' || pos.side === 'Buy' ? '📈 LONG' : '📉 SHORT'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>{formatNumber(pos.size, 4)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(pos.entryPrice)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(pos.currentPrice)}</td>
                      <td style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>{pos.leverage}x</td>
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
            </div>
          )}
        </div>
      )}

      {activeView === 'trades' && (
        <div>
          {/* Filter */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <Filter size={16} style={{ color: themeColors.textSecondary }} />
            <select
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                background: themeColors.surface,
                border: `1px solid ${themeColors.border}`,
                borderRadius: '8px',
                color: themeColors.text,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>
                  {symbol === 'all' ? 'همه نمادها' : symbol}
                </option>
              ))}
            </select>
            <span style={{ fontSize: '0.875rem', color: themeColors.textSecondary }}>
              {filteredTrades.length} معامله
            </span>
          </div>

          <div style={{
            background: themeColors.surface,
            border: `1px solid ${themeColors.border}`,
            borderRadius: '12px',
            overflow: 'hidden'
          }}>
            {filteredTrades.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: themeColors.textSecondary }}>
                هیچ معامله‌ای یافت نشد
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, background: themeColors.surfaceLight, zIndex: 1 }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>نماد</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>جهت</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>نوع</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>قیمت</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>حجم</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>کارمزد</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>PnL</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTrades.map((trade, idx) => (
                      <tr key={idx} style={{ borderTop: `1px solid ${themeColors.border}` }}>
                        <td style={{ padding: '1rem', fontWeight: '600' }}>{trade.symbol}</td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          color: (trade.side === 'BUY' || trade.side === 'buy') ? themeColors.success : themeColors.danger,
                          fontWeight: '600'
                        }}>
                          {(trade.side === 'BUY' || trade.side === 'buy') ? '🟢 BUY' : '🔴 SELL'}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.875rem' }}>{trade.type || '-'}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(trade.price)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>{formatNumber(trade.quantity, 4)}</td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>${formatNumber(trade.commission, 4)}</td>
                        <td style={{
                          padding: '1rem',
                          textAlign: 'center',
                          fontWeight: 'bold',
                          color: (trade.realizedPnl || 0) >= 0 ? themeColors.success : themeColors.danger
                        }}>
                          {trade.realizedPnl ? `$${formatNumber(trade.realizedPnl)}` : '-'}
                        </td>
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
        </div>
      )}

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
