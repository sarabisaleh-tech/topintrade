import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { listenToAllMT5Data } from '../services/mt5RealtimeService';

const MT5DataContext = createContext();

export const useMT5Data = () => {
  const context = useContext(MT5DataContext);
  if (!context) {
    throw new Error('useMT5Data must be used within MT5DataProvider');
  }
  return context;
};

export default function MT5DataProvider({ children }) {
  const { currentUser } = useAuth();
  const [state, setState] = useState({
    accountInfo: null,
    openPositions: [],
    tradeHistory: [],
    syncStatus: null,
    lastUpdate: null,
    connected: false,
    loading: true
  });

  useEffect(() => {
    if (!currentUser) {
      setState({
        accountInfo: null,
        openPositions: [],
        tradeHistory: [],
        syncStatus: null,
        lastUpdate: null,
        connected: false,
        loading: false
      });
      return;
    }

    // Listen to all MT5 data
    const unsubscribe = listenToAllMT5Data(currentUser.uid, {
      onAccountInfo: ({ accountInfo, lastUpdate, connected }) => {
        setState(prev => ({
          ...prev,
          accountInfo,
          lastUpdate,
          connected,
          loading: false
        }));
      },
      onOpenPositions: (positions) => {
        setState(prev => ({
          ...prev,
          openPositions: positions
        }));
      },
      onTradeHistory: (trades) => {
        setState(prev => ({
          ...prev,
          tradeHistory: trades
        }));
      },
      onSyncStatus: (status) => {
        setState(prev => ({
          ...prev,
          syncStatus: status
        }));
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  const value = {
    ...state,
    // Helper computed values
    balance: state.accountInfo?.balance || 0,
    equity: state.accountInfo?.equity || 0,
    profit: state.accountInfo?.profit || 0,
    margin: state.accountInfo?.margin || 0,
    freeMargin: state.accountInfo?.margin_free || 0,
    marginLevel: state.accountInfo?.margin_level || 0,

    // Trade statistics
    totalTrades: state.tradeHistory.length,
    openTradesCount: state.openPositions.length
  };

  return (
    <MT5DataContext.Provider value={value}>
      {children}
    </MT5DataContext.Provider>
  );
}
