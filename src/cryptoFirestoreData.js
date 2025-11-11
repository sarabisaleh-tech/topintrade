import { db } from './firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Crypto Firestore Data Management
 * Similar to firestoreData.js but for crypto trading data
 * Uses separate Firestore collections: crypto_backtests, crypto_folders, etc.
 */

// Load crypto user data from Firestore
export const loadCryptoUserData = async (userId) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        backtests: data.backtests || [],
        folders: data.folders || [{ id: 'root', name: 'User', isExpanded: true, emoji: '🪐' }],
        currentBacktest: data.currentBacktest || 0,
        tags: data.tags || [],
        trackingSessions: data.trackingSessions || [],
        todayAccumulatedTime: data.todayAccumulatedTime || 0,
        todayAccumulatedDate: data.todayAccumulatedDate || '',
        isTrackingTime: data.isTrackingTime || false,
        trackingStartTime: data.trackingStartTime || null,
        tradeFormDefaults: data.tradeFormDefaults || {}
      };
    }

    return null;
  } catch (error) {
    console.error('Error loading crypto user data:', error);
    return null;
  }
};

// Save crypto backtests
export const saveCryptoBacktests = async (userId, backtests) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, { backtests }, { merge: true });
  } catch (error) {
    console.error('Error saving crypto backtests:', error);
  }
};

// Save crypto folders
export const saveCryptoFolders = async (userId, folders) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, { folders }, { merge: true });
  } catch (error) {
    console.error('Error saving crypto folders:', error);
  }
};

// Save current crypto backtest index
export const saveCryptoCurrentBacktest = async (userId, currentBacktest) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, { currentBacktest }, { merge: true });
  } catch (error) {
    console.error('Error saving crypto current backtest:', error);
  }
};

// Save crypto tags
export const saveCryptoTags = async (userId, tags) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, { tags }, { merge: true });
  } catch (error) {
    console.error('Error saving crypto tags:', error);
  }
};

// Save crypto tracking sessions
export const saveCryptoTrackingSessions = async (
  userId,
  trackingSessions,
  todayAccumulatedTime,
  todayAccumulatedDate,
  isTrackingTime,
  trackingStartTime
) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, {
      trackingSessions,
      todayAccumulatedTime,
      todayAccumulatedDate,
      isTrackingTime,
      trackingStartTime
    }, { merge: true });
  } catch (error) {
    console.error('Error saving crypto tracking sessions:', error);
  }
};

// Save crypto trade form defaults
export const saveCryptoTradeFormDefaults = async (userId, defaults) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, { tradeFormDefaults: defaults }, { merge: true });
  } catch (error) {
    console.error('Error saving crypto trade form defaults:', error);
  }
};

// Listen to crypto user data changes
export const listenToCryptoUserData = (userId, callback) => {
  const userDocRef = doc(db, 'crypto_users', userId);
  return onSnapshot(userDocRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      callback(docSnapshot.data());
    }
  }, (error) => {
    console.error('Error listening to crypto user data:', error);
  });
};

// Migrate from localStorage to Firestore (if needed)
export const migrateCryptoFromLocalStorage = async (userId) => {
  const localData = localStorage.getItem('cryptoBacktestData');
  if (!localData) return false;

  try {
    const data = JSON.parse(localData);
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, data);
    localStorage.removeItem('cryptoBacktestData');
    return true;
  } catch (error) {
    console.error('Error migrating crypto data:', error);
    return false;
  }
};

// Force save all crypto data
export const forceSaveCrypto = async (userId, data) => {
  try {
    const userDocRef = doc(db, 'crypto_users', userId);
    await setDoc(userDocRef, data, { merge: true });
  } catch (error) {
    console.error('Error force saving crypto data:', error);
  }
};
