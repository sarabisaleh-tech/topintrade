import React, { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../src/AuthContext';
import { doc, onSnapshot, collection, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../src/firebase';

const themeColors = {
  primary: '#331a6bff',
  primaryLight: '#350b96',
  success: '#063022ff',
  danger: '#8e1616ff',
  background: '#000000',
  surface: '#151516ff',
  surfaceLight: '#131414ff',
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  border: '#18191bff',
};

export default function LiveTradingDashboard() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [accountData, setAccountData] = useState(null);
  const [openPositions, setOpenPositions] = useState([]);
  const [tradeHistory, setTradeHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);

  // اتصال به Firebase و گوش دادن به تغییرات real-time
  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;
    const userDocRef = doc(db, 'liveTrading', userId);

    // گوش دادن به تغییرات account و positions
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        setAccountData(data.account || null);
        setOpenPositions(data.openPositions || []);
        setLastUpdate(data.lastUpdate?.toDate?.() || null);
        setIsConnected(data.status === 'active');
        setLoading(false);
      } else {
        setLoading(false);
        setIsConnected(false);
      }
    });

    // گوش دادن به تاریخچه معاملات
    const tradesRef = collection(db, 'liveTrading', userId, 'trades');
    const tradesQuery = query(tradesRef, orderBy('time', 'desc'), limit(100));

    const unsubscribeTrades = onSnapshot(tradesQuery, (snapshot) => {
      const trades = [];
      snapshot.forEach((doc) => {
        trades.push({ id: doc.id, ...doc.data() });
      });
      setTradeHistory(trades);
    });

    return () => {
      unsubscribe();
      unsubscribeTrades();
    };
  }, [currentUser]);

  // محاسبه آمار
  const stats = useMemo(() => {
    if (!tradeHistory.length) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        totalLoss: 0,
        netProfit: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0
      };
    }

    // فقط معاملات بسته شده (OUT)
    const closedTrades = tradeHistory.filter(t => t.entry === 'OUT');

    const winningTrades = closedTrades.filter(t => t.profit > 0);
    const losingTrades = closedTrades.filter(t => t.profit < 0);

    const totalProfit = winningTrades.reduce((sum, t) => sum + t.profit, 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.profit, 0));
    const netProfit = totalProfit - totalLoss;

    const avgWin = winningTrades.length > 0 ? totalProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;

    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    return {
      totalTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: closedTrades.length > 0 ? (winningTrades.length / closedTrades.length * 100) : 0,
      totalProfit,
      totalLoss,
      netProfit,
      avgWin,
      avgLoss,
      profitFactor
    };
  }, [tradeHistory]);

  // محاسبه equity curve
  const equityCurve = useMemo(() => {
    if (!tradeHistory.length || !accountData) return [];

    const closedTrades = tradeHistory
      .filter(t => t.entry === 'OUT')
      .sort((a, b) => new Date(a.time) - new Date(b.time));

    let balance = accountData.balance - stats.netProfit; // شروع از balance اولیه
    const curve = [{
      index: 0,
      balance: balance,
      date: 'Start'
    }];

    closedTrades.forEach((trade, index) => {
      balance += trade.profit;
      curve.push({
        index: index + 1,
        balance: balance,
        date: new Date(trade.time).toLocaleDateString('fa-IR')
      });
    });

    return curve;
  }, [tradeHistory, accountData, stats]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: themeColors.background,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: themeColors.text
      }}>
        <div style={{ textAlign: 'center' }}>
          <RefreshCw size={48} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
          <p>در حال بارگذاری...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: themeColors.background,
      color: themeColors.text,
      padding: '2rem'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            معاملات لایو
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              backgroundColor: isConnected ? 'rgba(6, 48, 34, 0.2)' : 'rgba(142, 22, 22, 0.2)',
              border: `1px solid ${isConnected ? themeColors.success : themeColors.danger}`,
              borderRadius: '8px'
            }}>
              {isConnected ? (
                <>
                  <CheckCircle size={20} color={themeColors.success} />
                  <span style={{ color: themeColors.success }}>متصل</span>
                </>
              ) : (
                <>
                  <AlertCircle size={20} color={themeColors.danger} />
                  <span style={{ color: themeColors.danger }}>قطع شده</span>
                </>
              )}
            </div>
            {lastUpdate && (
              <span style={{ color: themeColors.textSecondary, fontSize: '0.9rem' }}>
                آخرین به‌روزرسانی: {lastUpdate.toLocaleString('fa-IR')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        borderBottom: `1px solid ${themeColors.border}`,
        overflowX: 'auto'
      }}>
        {['dashboard', 'trades', 'positions', 'analysis'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '1rem 1.5rem',
              backgroundColor: 'transparent',
              color: activeTab === tab ? themeColors.primary : themeColors.textSecondary,
              border: 'none',
              borderBottom: `3px solid ${activeTab === tab ? themeColors.primary : 'transparent'}`,
              cursor: 'pointer',
              fontSize: '1rem',
              fontWeight: activeTab === tab ? 'bold' : 'normal',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'dashboard' && 'داشبورد'}
            {tab === 'trades' && 'معاملات'}
            {tab === 'positions' && 'پوزیشن‌های باز'}
            {tab === 'analysis' && 'تحلیل'}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div>
          {/* Account Stats */}
          {accountData && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginBottom: '2rem'
            }}>
              <StatCard
                title="موجودی"
                value={`$${accountData.balance?.toFixed(2) || 0}`}
                icon={<DollarSign size={24} />}
                color={themeColors.primary}
              />
              <StatCard
                title="Equity"
                value={`$${accountData.equity?.toFixed(2) || 0}`}
                icon={<Activity size={24} />}
                color={themeColors.success}
              />
              <StatCard
                title="سود/زیان فعلی"
                value={`$${accountData.profit?.toFixed(2) || 0}`}
                icon={accountData.profit >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                color={accountData.profit >= 0 ? themeColors.success : themeColors.danger}
              />
              <StatCard
                title="Margin Level"
                value={`${accountData.marginLevel?.toFixed(2) || 0}%`}
                icon={<Activity size={24} />}
                color={themeColors.primary}
              />
            </div>
          )}

          {/* Trading Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <SmallStatCard title="کل معاملات" value={stats.totalTrades} />
            <SmallStatCard title="برد" value={stats.winningTrades} color={themeColors.success} />
            <SmallStatCard title="باخت" value={stats.losingTrades} color={themeColors.danger} />
            <SmallStatCard title="Win Rate" value={`${stats.winRate.toFixed(1)}%`} />
            <SmallStatCard title="سود خالص" value={`$${stats.netProfit.toFixed(2)}`} color={stats.netProfit >= 0 ? themeColors.success : themeColors.danger} />
            <SmallStatCard title="Profit Factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} />
          </div>

          {/* Equity Curve */}
          {equityCurve.length > 0 && (
            <div style={{
              backgroundColor: themeColors.surface,
              borderRadius: '16px',
              padding: '1.5rem',
              border: `1px solid ${themeColors.border}`,
              marginBottom: '2rem'
            }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                نمودار Equity
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={equityCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                  <XAxis dataKey="index" stroke={themeColors.textSecondary} />
                  <YAxis stroke={themeColors.textSecondary} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: themeColors.surface,
                      border: `1px solid ${themeColors.border}`,
                      borderRadius: '8px',
                      color: themeColors.text
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke={themeColors.primary}
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Trades Tab */}
      {activeTab === 'trades' && (
        <div style={{
          backgroundColor: themeColors.surface,
          borderRadius: '16px',
          padding: '1.5rem',
          border: `1px solid ${themeColors.border}`,
          overflowX: 'auto'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            تاریخچه معاملات ({tradeHistory.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                <th style={tableHeaderStyle}>Ticket</th>
                <th style={tableHeaderStyle}>نماد</th>
                <th style={tableHeaderStyle}>نوع</th>
                <th style={tableHeaderStyle}>حجم</th>
                <th style={tableHeaderStyle}>قیمت</th>
                <th style={tableHeaderStyle}>سود/زیان</th>
                <th style={tableHeaderStyle}>Commission</th>
                <th style={tableHeaderStyle}>Swap</th>
                <th style={tableHeaderStyle}>زمان</th>
                <th style={tableHeaderStyle}>توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {tradeHistory.map((trade) => (
                <tr key={trade.id} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                  <td style={tableCellStyle}>{trade.ticket}</td>
                  <td style={tableCellStyle}>{trade.symbol}</td>
                  <td style={{
                    ...tableCellStyle,
                    color: trade.type === 'BUY' ? themeColors.success : themeColors.danger
                  }}>
                    {trade.type}
                  </td>
                  <td style={tableCellStyle}>{trade.volume}</td>
                  <td style={tableCellStyle}>{trade.price}</td>
                  <td style={{
                    ...tableCellStyle,
                    color: trade.profit >= 0 ? themeColors.success : themeColors.danger,
                    fontWeight: 'bold'
                  }}>
                    ${trade.profit?.toFixed(2)}
                  </td>
                  <td style={tableCellStyle}>${trade.commission?.toFixed(2)}</td>
                  <td style={tableCellStyle}>${trade.swap?.toFixed(2)}</td>
                  <td style={tableCellStyle}>
                    {new Date(trade.time).toLocaleString('fa-IR')}
                  </td>
                  <td style={tableCellStyle}>{trade.comment || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {tradeHistory.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: themeColors.textSecondary
            }}>
              <p>هنوز معامله‌ای ثبت نشده است</p>
            </div>
          )}
        </div>
      )}

      {/* Open Positions Tab */}
      {activeTab === 'positions' && (
        <div style={{
          backgroundColor: themeColors.surface,
          borderRadius: '16px',
          padding: '1.5rem',
          border: `1px solid ${themeColors.border}`,
          overflowX: 'auto'
        }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
            پوزیشن‌های باز ({openPositions.length})
          </h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${themeColors.border}` }}>
                <th style={tableHeaderStyle}>Ticket</th>
                <th style={tableHeaderStyle}>نماد</th>
                <th style={tableHeaderStyle}>نوع</th>
                <th style={tableHeaderStyle}>حجم</th>
                <th style={tableHeaderStyle}>قیمت باز</th>
                <th style={tableHeaderStyle}>قیمت فعلی</th>
                <th style={tableHeaderStyle}>SL</th>
                <th style={tableHeaderStyle}>TP</th>
                <th style={tableHeaderStyle}>سود/زیان</th>
                <th style={tableHeaderStyle}>Swap</th>
                <th style={tableHeaderStyle}>زمان باز</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((pos) => (
                <tr key={pos.ticket} style={{ borderBottom: `1px solid ${themeColors.border}` }}>
                  <td style={tableCellStyle}>{pos.ticket}</td>
                  <td style={tableCellStyle}>{pos.symbol}</td>
                  <td style={{
                    ...tableCellStyle,
                    color: pos.type === 'BUY' ? themeColors.success : themeColors.danger
                  }}>
                    {pos.type}
                  </td>
                  <td style={tableCellStyle}>{pos.volume}</td>
                  <td style={tableCellStyle}>{pos.openPrice}</td>
                  <td style={tableCellStyle}>{pos.currentPrice}</td>
                  <td style={tableCellStyle}>{pos.sl || '-'}</td>
                  <td style={tableCellStyle}>{pos.tp || '-'}</td>
                  <td style={{
                    ...tableCellStyle,
                    color: pos.profit >= 0 ? themeColors.success : themeColors.danger,
                    fontWeight: 'bold'
                  }}>
                    ${pos.profit?.toFixed(2)}
                  </td>
                  <td style={tableCellStyle}>${pos.swap?.toFixed(2)}</td>
                  <td style={tableCellStyle}>
                    {new Date(pos.openTime).toLocaleString('fa-IR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {openPositions.length === 0 && (
            <div style={{
              textAlign: 'center',
              padding: '3rem',
              color: themeColors.textSecondary
            }}>
              <p>هیچ پوزیشن بازی وجود ندارد</p>
            </div>
          )}
        </div>
      )}

      {/* Analysis Tab */}
      {activeTab === 'analysis' && (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {/* Win/Loss Distribution */}
          <div style={{
            backgroundColor: themeColors.surface,
            borderRadius: '16px',
            padding: '1.5rem',
            border: `1px solid ${themeColors.border}`
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              توزیع برد/باخت
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={[
                { name: 'برد', value: stats.winningTrades, fill: themeColors.success },
                { name: 'باخت', value: stats.losingTrades, fill: themeColors.danger }
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke={themeColors.border} />
                <XAxis dataKey="name" stroke={themeColors.textSecondary} />
                <YAxis stroke={themeColors.textSecondary} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: themeColors.surface,
                    border: `1px solid ${themeColors.border}`,
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Performance Metrics */}
          <div style={{
            backgroundColor: themeColors.surface,
            borderRadius: '16px',
            padding: '1.5rem',
            border: `1px solid ${themeColors.border}`
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>
              معیارهای عملکرد
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <MetricRow label="میانگین برد" value={`$${stats.avgWin.toFixed(2)}`} />
              <MetricRow label="میانگین باخت" value={`$${stats.avgLoss.toFixed(2)}`} />
              <MetricRow label="کل سود" value={`$${stats.totalProfit.toFixed(2)}`} color={themeColors.success} />
              <MetricRow label="کل زیان" value={`$${stats.totalLoss.toFixed(2)}`} color={themeColors.danger} />
              <MetricRow label="سود خالص" value={`$${stats.netProfit.toFixed(2)}`} color={stats.netProfit >= 0 ? themeColors.success : themeColors.danger} />
              <MetricRow label="Profit Factor" value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Component برای کارت‌های آماری بزرگ
function StatCard({ title, value, icon, color }) {
  return (
    <div style={{
      backgroundColor: themeColors.surface,
      borderRadius: '16px',
      padding: '1.5rem',
      border: `1px solid ${themeColors.border}`,
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        borderRadius: '12px',
        backgroundColor: `${color}30`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color
      }}>
        {icon}
      </div>
      <div>
        <p style={{ color: themeColors.textSecondary, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
          {title}
        </p>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// Component برای کارت‌های آماری کوچک
function SmallStatCard({ title, value, color = themeColors.text }) {
  return (
    <div style={{
      backgroundColor: themeColors.surface,
      borderRadius: '12px',
      padding: '1rem',
      border: `1px solid ${themeColors.border}`,
      textAlign: 'center'
    }}>
      <p style={{ color: themeColors.textSecondary, fontSize: '0.875rem', marginBottom: '0.5rem' }}>
        {title}
      </p>
      <p style={{ fontSize: '1.25rem', fontWeight: 'bold', color: color }}>
        {value}
      </p>
    </div>
  );
}

// Component برای نمایش متریک‌ها
function MetricRow({ label, value, color = themeColors.text }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.75rem',
      backgroundColor: themeColors.background,
      borderRadius: '8px'
    }}>
      <span style={{ color: themeColors.textSecondary }}>{label}</span>
      <span style={{ fontWeight: 'bold', color: color }}>{value}</span>
    </div>
  );
}

// استایل‌های جدول
const tableHeaderStyle = {
  padding: '1rem',
  textAlign: 'right',
  fontSize: '0.875rem',
  fontWeight: 'bold',
  color: themeColors.textSecondary
};

const tableCellStyle = {
  padding: '1rem',
  textAlign: 'right',
  fontSize: '0.875rem'
};
