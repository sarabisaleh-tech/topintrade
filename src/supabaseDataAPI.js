// localStorage Data Management - مدیریت دیتای کاربر با localStorage
// ======================
// تمام دیتا مستقیماً روی localStorage ذخیره می‌شه
// ======================

const STORAGE_KEY = 'backtest-app-data';

// ======================
// Helper: خواندن دیتا از localStorage
// ======================
function getStoredData() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : getDefaultUserData();
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return getDefaultUserData();
  }
}

// ======================
// Helper: ذخیره دیتا در localStorage
// ======================
function setStoredData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('✅ Data saved to localStorage');
    return true;
  } catch (error) {
    console.error('❌ Error saving to localStorage:', error);
    return false;
  }
}

// ======================
// 1️⃣ بارگذاری کل دیتای کاربر
// ======================
export async function loadUserData(userId) {
  try {
    console.log('\n🔄 ========== LOAD START ==========');
    console.log('🔑 User ID:', userId);

    const data = getStoredData();

    console.log('✅ ========== LOAD SUCCESS ==========');
    console.log('📦 Backtests:', data.backtests?.length || 0);
    console.log('📦 Journals:', data.journals?.length || 0);
    console.log('========================================\n');

    return data;
  } catch (error) {
    console.error('\n❌ ========== LOAD FAILED ==========');
    console.error('❌ Error:', error.message);
    console.error('========================================\n');

    return getDefaultUserData();
  }
}

// ======================
// 2️⃣ ذخیره Backtests
// ======================
export function saveBacktests(userId, backtests) {
  const data = getStoredData();
  data.backtests = backtests;
  setStoredData(data);
  return true;
}

// ======================
// 2️⃣-B ذخیره Journals
// ======================
export function saveJournals(userId, journals) {
  const data = getStoredData();
  data.journals = journals;
  setStoredData(data);
  return true;
}

// ======================
// 3️⃣ ذخیره Folders
// ======================
export function saveFolders(userId, folders) {
  const data = getStoredData();
  data.folders = folders;
  setStoredData(data);
  return true;
}

// ======================
// 4️⃣ ذخیره Current Backtest
// ======================
export function saveCurrentBacktest(userId, currentBacktest) {
  const data = getStoredData();
  data.currentBacktest = currentBacktest;
  setStoredData(data);
  return true;
}

// ======================
// 4️⃣-B ذخیره Current Journal
// ======================
export function saveCurrentJournal(userId, currentJournal) {
  const data = getStoredData();
  data.currentJournal = currentJournal;
  setStoredData(data);
  return true;
}

// ======================
// 5️⃣ ذخیره Tags
// ======================
export function saveTags(userId, savedTags, pinnedTags) {
  const data = getStoredData();
  data.savedTags = savedTags || [];
  data.pinnedTags = pinnedTags || [];
  setStoredData(data);
  return true;
}

// ======================
// 6️⃣ ذخیره Tracking Sessions
// ======================
export function saveTrackingSessions(userId, sessions, todayAccumulatedTime, todayAccumulatedDate, isTrackingTime, trackingStartTime) {
  const data = getStoredData();
  data.trackingSessions = sessions || [];
  data.todayAccumulatedTime = todayAccumulatedTime || 0;
  data.todayAccumulatedDate = todayAccumulatedDate || '';
  data.isTrackingTime = isTrackingTime || false;
  data.trackingStartTime = trackingStartTime || null;
  setStoredData(data);
  return true;
}

// ======================
// 7️⃣ ذخیره تنظیمات Trade Form
// ======================
export function saveTradeFormDefaults(userId, formDefaults) {
  const data = getStoredData();
  data.tradeFormDefaults = formDefaults;
  setStoredData(data);
  return true;
}

// ======================
// 8️⃣ Shared Backtest (Disabled for now)
// ======================
export async function saveSharedBacktest(backtestsArray, currentBacktestIndex) {
  throw new Error('Shared backtest not implemented yet');
}

export async function loadSharedBacktest(shareId) {
  throw new Error('Shared backtest not implemented yet');
}

// ======================
// 9️⃣ Shared Journal (Disabled for now)
// ======================
export async function saveSharedJournal(journalData) {
  throw new Error('Shared journal not implemented yet');
}

export async function loadSharedJournal(shareId) {
  throw new Error('Shared journal not implemented yet');
}

// ======================
// 🔟 Real-time Listener (Disabled)
// ======================
export function listenToUserData(userId, callback) {
  console.warn('Real-time listeners not supported with localStorage');
  return () => {};
}

// ======================
// Force Save (ذخیره فوری)
// ======================
export async function forceSave() {
  console.log('✅ All data is automatically saved to localStorage');
  return true;
}

// ======================
// 🔧 Helper: دیتای پیش‌فرض
// ======================
function getDefaultUserData() {
  return {
    backtests: [],
    journals: [],
    folders: [],
    currentBacktest: 0,
    currentJournal: 0,
    savedTags: [],
    pinnedTags: [],
    trackingSessions: [],
    todayAccumulatedTime: 0,
    todayAccumulatedDate: '',
    tradeFormDefaults: {}
  };
}

// ======================
// 🔧 Helper: مهاجرت از localStorage قدیمی
// ======================
export async function migrateFromLocalStorage(userId) {
  console.log('Migration not needed - already using localStorage');
  return false;
}
