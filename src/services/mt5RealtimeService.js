import { doc, collection, onSnapshot, query, orderBy, limit, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Listen to MT5 account info updates in real-time
 */
export const listenToMT5AccountInfo = (userId, callback) => {
  const userRef = doc(db, 'users', userId);

  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const accountInfo = data.account_info || null;
      const lastUpdate = data.last_update?.toDate() || null;
      const connected = data.mt5_connected || false;

      callback({
        accountInfo,
        lastUpdate,
        connected
      });
    } else {
      callback({ accountInfo: null, lastUpdate: null, connected: false });
    }
  }, (error) => {
    console.error('Error listening to account info:', error);
    callback({ accountInfo: null, lastUpdate: null, connected: false });
  });

  return unsubscribe;
};

/**
 * Listen to open positions in real-time
 */
export const listenToOpenPositions = (userId, callback) => {
  const userRef = doc(db, 'users', userId);

  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const openPositions = data.open_positions || [];
      callback(openPositions);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error('Error listening to open positions:', error);
    callback([]);
  });

  return unsubscribe;
};

/**
 * Listen to trade history in real-time
 */
export const listenToTradeHistory = (userId, callback, limitCount = 100) => {
  const historyRef = collection(db, 'users', userId, 'trade_history');
  const q = query(historyRef, orderBy('time_close', 'desc'), limit(limitCount));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const trades = [];
    snapshot.forEach((doc) => {
      trades.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(trades);
  }, (error) => {
    console.error('Error listening to trade history:', error);
    callback([]);
  });

  return unsubscribe;
};

/**
 * Listen to sync status in real-time
 */
export const listenToSyncStatus = (userId, callback) => {
  const userRef = doc(db, 'users', userId);

  const unsubscribe = onSnapshot(userRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      const syncStatus = data.sync_status || null;
      callback(syncStatus);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error listening to sync status:', error);
    callback(null);
  });

  return unsubscribe;
};

/**
 * Listen to all MT5 data at once
 * Returns a function to unsubscribe from all listeners
 */
export const listenToAllMT5Data = (userId, callbacks) => {
  const unsubscribers = [];

  // Listen to account info
  if (callbacks.onAccountInfo) {
    const unsubAccountInfo = listenToMT5AccountInfo(userId, callbacks.onAccountInfo);
    unsubscribers.push(unsubAccountInfo);
  }

  // Listen to open positions
  if (callbacks.onOpenPositions) {
    const unsubOpenPositions = listenToOpenPositions(userId, callbacks.onOpenPositions);
    unsubscribers.push(unsubOpenPositions);
  }

  // Listen to trade history
  if (callbacks.onTradeHistory) {
    const unsubTradeHistory = listenToTradeHistory(userId, callbacks.onTradeHistory);
    unsubscribers.push(unsubTradeHistory);
  }

  // Listen to sync status
  if (callbacks.onSyncStatus) {
    const unsubSyncStatus = listenToSyncStatus(userId, callbacks.onSyncStatus);
    unsubscribers.push(unsubSyncStatus);
  }

  // Return a function that unsubscribes from all listeners
  return () => {
    unsubscribers.forEach(unsub => unsub());
  };
};

/**
 * Get MT5 setup status for a user (one-time read)
 */
export const getMT5SetupStatus = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        setupCompleted: data.mt5SetupCompleted || false,
        apiKey: data.apiKey || null,
        connected: data.mt5_connected || false
      };
    }
    return { setupCompleted: false, apiKey: null, connected: false };
  } catch (error) {
    console.error('Error getting MT5 setup status:', error);
    return { setupCompleted: false, apiKey: null, connected: false };
  }
};
