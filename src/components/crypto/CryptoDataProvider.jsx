import React, { createContext, useContext, useState, useEffect } from 'react';

const CryptoDataContext = createContext();

export const useCryptoData = () => {
  const context = useContext(CryptoDataContext);
  if (!context) {
    throw new Error('useCryptoData must be used within CryptoDataProvider');
  }
  return context;
};

// Sample fake crypto data for demonstration
const generateSampleTrades = () => {
  const pairs = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'SOL/USDT', 'ADA/USDT', 'XRP/USDT'];
  const types = ['Long', 'Short'];
  const exchanges = ['Binance', 'Bybit', 'OKX', 'Coinbase'];

  const trades = [];
  const startDate = new Date('2024-01-01');
  const endDate = new Date();

  for (let i = 0; i < 50; i++) {
    const openTime = new Date(startDate.getTime() + Math.random() * (endDate.getTime() - startDate.getTime()));
    const closeTime = new Date(openTime.getTime() + Math.random() * 86400000 * 3); // 0-3 days

    const profit = (Math.random() - 0.45) * 1000; // Slight winning bias
    const isWin = profit > 0;

    trades.push({
      id: `crypto_${i + 1}`,
      pair: pairs[Math.floor(Math.random() * pairs.length)],
      type: types[Math.floor(Math.random() * types.length)],
      exchange: exchanges[Math.floor(Math.random() * exchanges.length)],
      openTime: openTime.toISOString(),
      closeTime: closeTime.toISOString(),
      openPrice: 20000 + Math.random() * 50000,
      closePrice: 20000 + Math.random() * 50000,
      volume: Math.random() * 2,
      profit: parseFloat(profit.toFixed(2)),
      profitPercent: parseFloat((Math.random() * 10 - 4).toFixed(2)),
      commission: parseFloat((Math.random() * 5).toFixed(2)),
      result: isWin ? 'Win' : 'Loss',
      setup: ['Breakout', 'Support/Resistance', 'Trend Following', 'Mean Reversion'][Math.floor(Math.random() * 4)],
      notes: Math.random() > 0.7 ? 'Good setup, followed the plan' : ''
    });
  }

  return trades.sort((a, b) => new Date(b.closeTime) - new Date(a.closeTime));
};

export const CryptoDataProvider = ({ children }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountInfo, setAccountInfo] = useState({
    balance: 10000,
    equity: 10000,
    currency: 'USDT',
    exchange: 'Demo Account'
  });

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setTrades(generateSampleTrades());
      setLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // Calculate statistics
  const stats = React.useMemo(() => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfit: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        largestWin: 0,
        largestLoss: 0
      };
    }

    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit < 0);

    const totalWinAmount = wins.reduce((sum, t) => sum + t.profit, 0);
    const totalLossAmount = Math.abs(losses.reduce((sum, t) => sum + t.profit, 0));

    return {
      totalTrades: trades.length,
      winningTrades: wins.length,
      losingTrades: losses.length,
      winRate: ((wins.length / trades.length) * 100).toFixed(2),
      totalProfit: trades.reduce((sum, t) => sum + t.profit, 0).toFixed(2),
      averageWin: wins.length > 0 ? (totalWinAmount / wins.length).toFixed(2) : 0,
      averageLoss: losses.length > 0 ? (totalLossAmount / losses.length).toFixed(2) : 0,
      profitFactor: totalLossAmount > 0 ? (totalWinAmount / totalLossAmount).toFixed(2) : 0,
      largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.profit)).toFixed(2) : 0,
      largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.profit)).toFixed(2) : 0
    };
  }, [trades]);

  const value = {
    trades,
    loading,
    error,
    accountInfo,
    stats,
    refreshData: () => {
      setLoading(true);
      setTimeout(() => {
        setTrades(generateSampleTrades());
        setLoading(false);
      }, 1000);
    }
  };

  return (
    <CryptoDataContext.Provider value={value}>
      {children}
    </CryptoDataContext.Provider>
  );
};
