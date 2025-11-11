// Firestore Data Management - مدیریت دیتای کاربر با Auto-save
import { db } from './firebase.js';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  addDoc
} from 'firebase/firestore';

// ======================
// Helper: دریافت Reference یک سند (با uid به جای email)
// ======================
function getUserDocRef(userId) {
  if (!userId) {
    throw new Error('User ID is required');
  }
  return doc(db, 'users', userId);
}

// ======================
// Auto-save Queue با Debounce
// ======================
let saveTimeout = null;
let pendingData = {};
let currentUserEmail = null;

/**
 * ذخیره خودکار با debounce (5 ثانیه بعد از آخرین تغییر)
 */
function queueAutoSave(userId, dataType, value) {
  currentUserEmail = userId;
  pendingData[dataType] = value;

  // پاک کردن timeout قبلی
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // تنظیم timeout جدید
  saveTimeout = setTimeout(async () => {
    await executeAutoSave();
  }, 5000); // 5 ثانیه
}

/**
 * اجرای ذخیره‌سازی
 */
async function executeAutoSave() {
  if (!currentUserEmail || Object.keys(pendingData).length === 0) return;

  try {
    console.log('\n🔄 ========== AUTO SAVE START ==========');
    console.log('🔑 User ID:', currentUserEmail);
    console.log('📂 Firestore path: users/' + currentUserEmail);
    console.log('📤 Data to save:', Object.keys(pendingData));
    console.log('📊 Data size:', JSON.stringify(pendingData).length, 'bytes');

    const userDocRef = getUserDocRef(currentUserEmail);
    const dataToSave = {
      ...pendingData,
      userId: currentUserEmail,
      lastUpdated: serverTimestamp(),
      _savedAt: new Date().toISOString()
    };

    console.log('⏳ Attempting setDoc with merge...');
    await setDoc(userDocRef, dataToSave, { merge: true });

    console.log('✅ ========== SAVE SUCCESS ==========');
    console.log('✅ Saved keys:', Object.keys(pendingData).join(', '));
    console.log('✅ Path: users/' + currentUserEmail + '\n');

    pendingData = {};
  } catch (error) {
    console.error('\n❌ ========== SAVE FAILED ==========');
    console.error('❌ Error:', error.message);
    console.error('❌ Code:', error.code);
    console.error('🔑 User ID:', currentUserEmail);
    console.error('📂 Path:', 'users/' + currentUserEmail);

    if (error.code === 'permission-denied') {
      console.error('\n⚠️ PERMISSION DENIED!');
      console.error('🔧 Fix: Update Firestore Rules in Firebase Console');
    }

    console.error('\nFull error:', error);
    console.error('========================================\n');
  }
}

// ======================
// Force Save (ذخیره فوری)
// ======================
export async function forceSave() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  await executeAutoSave();
}

// ======================
// 1️⃣ بارگذاری کل دیتای کاربر
// ======================
export async function loadUserData(userId) {
  if (!userId) {
    console.error('❌ userId الزامی است');
    return getDefaultUserData();
  }

  try {
    console.log('\n🔄 ========== LOAD START ==========');
    console.log('🔑 User ID:', userId);
    console.log('📂 Firestore path: users/' + userId);
    console.log('⏳ Attempting getDoc...');

    const userDocRef = getUserDocRef(userId);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('✅ ========== LOAD SUCCESS ==========');
      console.log('📦 Backtests:', data.backtests?.length || 0);
      console.log('📁 Folders:', data.folders?.length || 0);
      console.log('📊 Trades total:', (data.backtests || []).reduce((sum, bt) => sum + (bt.trades?.length || 0), 0));
      console.log('📅 Last saved:', data._savedAt || 'unknown');
      console.log('========================================\n');

      return {
        backtests: data.backtests || [],
        journals: data.journals || [], // دیتای جدا برای Journal
        folders: data.folders || [],
        currentBacktest: data.currentBacktest || 0,
        currentJournal: data.currentJournal || 0, // ایندکس جدا برای Journal
        savedTags: data.savedTags || [],
        pinnedTags: data.pinnedTags || [],
        trackingSessions: data.trackingSessions || [],
        todayAccumulatedTime: data.todayAccumulatedTime || 0,
        todayAccumulatedDate: data.todayAccumulatedDate || '',
        tradeFormDefaults: data.tradeFormDefaults || {},
        lastUpdated: data.lastUpdated
      };
    } else {
      console.log('⚠️ ========== NO DATA FOUND ==========');
      console.log('⚠️ Document does not exist');
      console.log('📂 Path checked: users/' + userId);
      console.log('🆕 Creating new document...');

      const defaultData = getDefaultUserData();
      await setDoc(userDocRef, {
        ...defaultData,
        userId: userId,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        _savedAt: new Date().toISOString()
      });

      console.log('✅ New user profile created');
      console.log('========================================\n');
      return defaultData;
    }

  } catch (error) {
    console.error('\n❌ ========== LOAD FAILED ==========');
    console.error('❌ Error:', error.message);
    console.error('❌ Code:', error.code);
    console.error('🔑 User ID:', userId);

    if (error.code === 'permission-denied') {
      console.error('\n⚠️ PERMISSION DENIED!');
      console.error('🔧 Fix: Update Firestore Rules in Firebase Console');
    }

    console.error('\nFull error:', error);
    console.error('========================================\n');
    return getDefaultUserData();
  }
}

// ======================
// 2️⃣ ذخیره Backtests با Auto-save
// ======================
export function saveBacktests(userId, backtests) {
  if (!userId) return false;
  queueAutoSave(userId, 'backtests', backtests);
  return true;
}

// ======================
// 2️⃣-B ذخیره Journals با Auto-save (جدا از Backtests)
// ======================
export function saveJournals(userId, journals) {
  if (!userId) return false;
  queueAutoSave(userId, 'journals', journals);
  return true;
}

// ======================
// 3️⃣ ذخیره Folders با Auto-save
// ======================
export function saveFolders(userId, folders) {
  if (!userId) return false;
  queueAutoSave(userId, 'folders', folders);
  return true;
}

// ======================
// 4️⃣ ذخیره Current Backtest با Auto-save
// ======================
export function saveCurrentBacktest(userId, currentBacktest) {
  if (!userId) return false;
  queueAutoSave(userId, 'currentBacktest', currentBacktest);
  return true;
}

// ======================
// 4️⃣-B ذخیره Current Journal با Auto-save (جدا از Backtest)
// ======================
export function saveCurrentJournal(userId, currentJournal) {
  if (!userId) return false;
  queueAutoSave(userId, 'currentJournal', currentJournal);
  return true;
}

// ======================
// 5️⃣ ذخیره Tags با Auto-save
// ======================
export function saveTags(userId, savedTags, pinnedTags) {
  if (!userId) return false;
  queueAutoSave(userId, 'savedTags', savedTags || []);
  queueAutoSave(userId, 'pinnedTags', pinnedTags || []);
  return true;
}

// ======================
// 6️⃣ ذخیره Tracking Sessions با Auto-save
// ======================
export function saveTrackingSessions(userId, sessions, todayAccumulatedTime, todayAccumulatedDate, isTrackingTime, trackingStartTime) {
  if (!userId) return false;
  queueAutoSave(userId, 'trackingSessions', sessions || []);
  queueAutoSave(userId, 'todayAccumulatedTime', todayAccumulatedTime || 0);
  queueAutoSave(userId, 'todayAccumulatedDate', todayAccumulatedDate || '');
  queueAutoSave(userId, 'isTrackingTime', isTrackingTime || false);
  queueAutoSave(userId, 'trackingStartTime', trackingStartTime || null);
  return true;
}

// ======================
// 7️⃣ ذخیره تنظیمات Trade Form با Auto-save
// ======================
export function saveTradeFormDefaults(userId, formDefaults) {
  if (!userId) return false;
  queueAutoSave(userId, 'tradeFormDefaults', formDefaults);
  return true;
}

// ======================
// 8️⃣ ذخیره Shared Backtest (فوری)
// ======================
export async function saveSharedBacktest(backtestsArray, currentBacktestIndex) {
  try {
    const sharedCollectionRef = collection(db, 'sharedBacktests');
    const docRef = await addDoc(sharedCollectionRef, {
      backtests: backtestsArray,
      currentBacktest: currentBacktestIndex,
      createdAt: serverTimestamp(),
      expiresAt: null // یا می‌تونی یک تاریخ انقضا بذاری
    });
    console.log(`✅ Shared backtest ذخیره شد: ${docRef.id}`);
    return docRef.id; // برگرداندن ID ساخته شده توسط Firestore
  } catch (error) {
    console.error('❌ خطا در ذخیره shared backtest:', error.message);
    return null;
  }
}

// ======================
// 9️⃣ بارگذاری Shared Backtest
// ======================
export async function loadSharedBacktest(shareId) {
  if (!shareId) return null;

  try {
    const sharedRef = doc(db, 'sharedBacktests', shareId);
    const docSnap = await getDoc(sharedRef);

    if (docSnap.exists()) {
      console.log(`✅ Shared backtest بارگذاری شد: ${shareId}`);
      return docSnap.data().data;
    } else {
      console.log(`⚠️ Shared backtest پیدا نشد: ${shareId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ خطا در بارگذاری shared backtest:', error.message);
    return null;
  }
}

// ======================
// 🔟 ذخیره Shared Journal (فوری)
// ======================
export async function saveSharedJournal(journalData) {
  try {
    const sharedCollectionRef = collection(db, 'sharedJournals');
    const docRef = await addDoc(sharedCollectionRef, {
      data: journalData,
      createdAt: serverTimestamp()
    });
    console.log(`✅ Shared journal ذخیره شد: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('❌ خطا در ذخیره shared journal:', error.message);
    return null;
  }
}

// ======================
// 🔟-B بارگذاری Shared Journal
// ======================
export async function loadSharedJournal(shareId) {
  if (!shareId) return null;

  try {
    const sharedRef = doc(db, 'sharedJournals', shareId);
    const docSnap = await getDoc(sharedRef);

    if (docSnap.exists()) {
      console.log(`✅ Shared journal بارگذاری شد: ${shareId}`);
      return docSnap.data().data;
    } else {
      console.log(`⚠️ Shared journal پیدا نشد: ${shareId}`);
      return null;
    }
  } catch (error) {
    console.error('❌ خطا در بارگذاری shared journal:', error.message);
    return null;
  }
}

// ======================
// 🔟 Real-time Listener
// ======================
export function listenToUserData(userId, callback) {
  if (!userId || !callback) {
    console.error('❌ userId و callback الزامی است');
    return null;
  }

  const userDocRef = getUserDocRef(userId);

  const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('🔔 دیتای کاربر آپدیت شد');
      callback({
        backtests: data.backtests || [],
        journals: data.journals || [], // دیتای جدا برای Journal
        folders: data.folders || [],
        currentBacktest: data.currentBacktest || 0,
        currentJournal: data.currentJournal || 0, // ایندکس جدا برای Journal
        savedTags: data.savedTags || [],
        pinnedTags: data.pinnedTags || [],
        trackingSessions: data.trackingSessions || [],
        todayAccumulatedTime: data.todayAccumulatedTime || 0,
        todayAccumulatedDate: data.todayAccumulatedDate || '',
        tradeFormDefaults: data.tradeFormDefaults || {}
      });
    }
  }, (error) => {
    console.error('❌ خطا در listener:', error.message);
  });

  return unsubscribe;
}

// ======================
// 🔧 Helper: دیتای پیش‌فرض
// ======================
function getDefaultUserData() {
  return {
    backtests: [],
    journals: [], // دیتای جدا برای Journal
    folders: [],
    currentBacktest: 0,
    currentJournal: 0, // ایندکس جدا برای Journal
    savedTags: [],
    pinnedTags: [],
    trackingSessions: [],
    todayAccumulatedTime: 0,
    todayAccumulatedDate: '',
    tradeFormDefaults: {}
  };
}

// ======================
// 🔧 Helper: مهاجرت از localStorage
// ======================
export async function migrateFromLocalStorage(userId) {
  if (!userId) return false;

  console.log('🔄 شروع مهاجرت از localStorage...');

  try {
    const localData = {
      backtests: JSON.parse(window.localStorage?.getItem('backtests') || '[]'),
      folders: JSON.parse(window.localStorage?.getItem('folders') || '[]'),
      currentBacktest: parseInt(window.localStorage?.getItem('currentBacktest') || '0'),
      savedTags: JSON.parse(window.localStorage?.getItem('savedTags') || '[]'),
      pinnedTags: JSON.parse(window.localStorage?.getItem('pinnedTags') || '[]'),
      trackingSessions: JSON.parse(window.localStorage?.getItem('trackingSessions') || '[]'),
      todayAccumulatedTime: parseInt(window.localStorage?.getItem('todayAccumulatedTime') || '0'),
      todayAccumulatedDate: window.localStorage?.getItem('todayAccumulatedDate') || '',
      tradeFormDefaults: {
        date: window.localStorage?.getItem('trade_date') || '',
        time: window.localStorage?.getItem('trade_time') || '',
        timeFormat: window.localStorage?.getItem('trade_timeFormat') || '24h',
        stopLossType: window.localStorage?.getItem('trade_stopLossType') || 'percent'
      }
    };

    // ذخیره در Firestore
    const userDocRef = getUserDocRef(userId);
    await setDoc(userDocRef, {
      ...localData,
      userId: userId,
      migratedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      _savedAt: new Date().toISOString()
    }, { merge: true });

    console.log('✅ مهاجرت با موفقیت انجام شد!');
    console.log('📦 دیتای مهاجرت شده:', localData);

    return true;
  } catch (error) {
    console.error('❌ خطا در مهاجرت:', error.message);
    console.error('جزئیات:', error);
    return false;
  }
}

// ======================
// Cleanup on window unload
// ======================
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // ذخیره فوری قبل از بستن صفحه
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      executeAutoSave();
    }
  });
}
