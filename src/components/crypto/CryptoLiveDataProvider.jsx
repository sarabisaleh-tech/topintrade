import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getExchangeInfo } from './exchangeAPI/exchangeFactory';

const CryptoLiveDataContext = createContext();

export const useCryptoLiveData = () => {
  const context = useContext(CryptoLiveDataContext);
  if (!context) {
    throw new Error('useCryptoLiveData must be used within CryptoLiveDataProvider');
  }
  return context;
};

export default function CryptoLiveDataProvider({ children, credentials }) {
  const [state, setState] = useState({
    balance: null,
    positions: [],
    trades: [],
    lastUpdate: null,
    loading: true,
    error: null,
    connected: false
  });

  const [refreshInterval, setRefreshInterval] = useState(10000); // 10 seconds default

  // دریافت داده‌ها از API
  const fetchData = useCallback(async () => {
    if (!credentials || !credentials.api) {
      setState(prev => ({ ...prev, loading: false, connected: false }));
      return;
    }

    try {
      // دریافت تمام داده‌ها به صورت موازی
      const accountInfo = await credentials.api.getAccountInfo();

      setState({
        balance: accountInfo.balance,
        positions: accountInfo.positions.positions || [],
        trades: accountInfo.trades.trades || [],
        lastUpdate: Date.now(),
        loading: false,
        error: null,
        connected: true
      });

    } catch (error) {
      console.error('Error fetching crypto live data:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'خطا در دریافت داده‌ها',
        connected: false
      }));
    }
  }, [credentials]);

  // Auto-refresh با interval
  useEffect(() => {
    if (!credentials || !credentials.api) return;

    // اولین بار بلافاصله fetch کن
    fetchData();

    // سپس هر چند ثانیه یکبار
    const intervalId = setInterval(fetchData, refreshInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [credentials, refreshInterval, fetchData]);

  // Manual refresh
  const refresh = useCallback(() => {
    setState(prev => ({ ...prev, loading: true }));
    fetchData();
  }, [fetchData]);

  // Disconnect
  const disconnect = useCallback(() => {
    setState({
      balance: null,
      positions: [],
      trades: [],
      lastUpdate: null,
      loading: false,
      error: null,
      connected: false
    });
  }, []);

  const value = {
    ...state,

    // Exchange info
    exchange: credentials?.exchange || null,
    exchangeInfo: credentials?.exchange ? getExchangeInfo(credentials.exchange) : null,

    // Helper computed values
    totalBalance: state.balance?.totalBalance || 0,
    totalEquity: state.balance?.totalEquity || 0,
    availableBalance: state.balance?.availableBalance || 0,
    unrealizedPnl: state.balance?.unrealizedPnl || 0,

    // Statistics
    totalPositions: state.positions.length,
    totalTrades: state.trades.length,

    // Actions
    refresh,
    disconnect,
    setRefreshInterval,
    refreshInterval
  };

  return (
    <CryptoLiveDataContext.Provider value={value}>
      {children}
    </CryptoLiveDataContext.Provider>
  );
}
