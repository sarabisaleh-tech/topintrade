// Backend Data API با Fallback به localStorage
// ======================
// سعی می‌کنه از Backend استفاده کنه، اگه نتونست از localStorage استفاده می‌کنه
// ======================

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STORAGE_KEY = 'backtest-app-data';
let useBackend = true; // شروع با Backend، اگه خطا داد localStorage

// Debounce helper to prevent excessive saves
let saveTimeout = null;
const SAVE_DELAY = 500; // 500ms delay (کمتر برای اطمینان از save)

// ======================
// Helper: localStorage functions
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

function setStoredData(data) {
  try {
    const existing = getStoredData();
    const merged = { ...existing, ...data };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    console.log('✅ Data saved to localStorage (fallback)');
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
  // سعی می‌کنیم از Backend استفاده کنیم
  if (useBackend) {
    try {
      console.log('\n🔄 ========== LOAD START (Backend) ==========');
      console.log('🔑 User ID:', userId);
      console.log('🌐 API URL:', `${API_URL}/api/user/${userId}/data`);

      const token = localStorage.getItem('authToken');
      const headers = {
        'Content-Type': 'application/json'
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/api/user/${userId}/data`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      console.log('✅ ========== LOAD SUCCESS (Backend) ==========');
      console.log('📦 Backtests:', data.backtests?.length || 0);
      console.log('📦 Journals:', data.journals?.length || 0);
      console.log('========================================\n');

      return data;
    } catch (error) {
      console.warn('⚠️ Backend not available, falling back to localStorage');
      console.error('Backend error:', error.message);
      useBackend = false; // غیرفعال کردن Backend برای درخواست‌های بعدی
    }
  }

  // Fallback: استفاده از localStorage
  console.log('📦 Using localStorage');
  return getStoredData();
}

// ======================
// Helper: ذخیره دیتا (با debounce)
// ======================
async function saveData(userId, data) {
  // Clear previous timeout
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  // Debounce save to prevent excessive requests
  return new Promise((resolve) => {
    saveTimeout = setTimeout(async () => {
      // سعی می‌کنیم روی Backend ذخیره کنیم
      if (useBackend) {
        try {
          const token = localStorage.getItem('authToken');
          const headers = {
            'Content-Type': 'application/json'
          };

          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          const response = await fetch(`${API_URL}/api/user/${userId}/data`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const result = await response.json();
          console.log('✅ Data saved to backend');
          resolve(result);
        } catch (error) {
          console.warn('⚠️ Backend not available, saving to localStorage');
          useBackend = false;
          setStoredData(data);
          resolve();
        }
      } else {
        // Fallback: ذخیره روی localStorage
        setStoredData(data);
        resolve();
      }
    }, SAVE_DELAY);
  });
}

// ======================
// 2️⃣ ذخیره Backtests
// ======================
export function saveBacktests(userId, backtests) {
  saveData(userId, { backtests }).catch(console.error);
  return true;
}

// ======================
// 2️⃣-B ذخیره Journals
// ======================
export function saveJournals(userId, journals) {
  saveData(userId, { journals }).catch(console.error);
  return true;
}

// ======================
// 3️⃣ ذخیره Folders
// ======================
export function saveFolders(userId, folders) {
  saveData(userId, { folders }).catch(console.error);
  return true;
}

// ======================
// 4️⃣ ذخیره Current Backtest
// ======================
export function saveCurrentBacktest(userId, currentBacktest) {
  saveData(userId, { currentBacktest }).catch(console.error);
  return true;
}

// ======================
// 4️⃣-B ذخیره Current Journal
// ======================
export function saveCurrentJournal(userId, currentJournal) {
  saveData(userId, { currentJournal }).catch(console.error);
  return true;
}

// ======================
// 5️⃣ ذخیره Tags
// ======================
export function saveTags(userId, savedTags, pinnedTags) {
  saveData(userId, {
    savedTags: savedTags || [],
    pinnedTags: pinnedTags || []
  }).catch(console.error);
  return true;
}

// ======================
// 6️⃣ ذخیره Tracking Sessions
// ======================
export function saveTrackingSessions(userId, sessions, todayAccumulatedTime, todayAccumulatedDate, isTrackingTime, trackingStartTime) {
  saveData(userId, {
    trackingSessions: sessions || [],
    todayAccumulatedTime: todayAccumulatedTime || 0,
    todayAccumulatedDate: todayAccumulatedDate || '',
    isTrackingTime: isTrackingTime || false,
    trackingStartTime: trackingStartTime || null
  }).catch(console.error);
  return true;
}

// ======================
// 7️⃣ ذخیره تنظیمات Trade Form
// ======================
export function saveTradeFormDefaults(userId, formDefaults) {
  saveData(userId, { tradeFormDefaults: formDefaults }).catch(console.error);
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
  console.warn('Real-time listeners not supported');
  return () => {};
}

// ======================
// Force Save (قبل از بستن صفحه)
// ======================
export async function forceSave() {
  // Clear debounce timeout and save immediately
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  console.log('✅ All pending saves completed');
  return true;
}

// Save before page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    forceSave();
  });
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
// 🔧 Helper: مهاجرت از localStorage
// ======================
export async function migrateFromLocalStorage(userId) {
  console.log('Checking for localStorage data to migrate...');

  try {
    const localData = localStorage.getItem(STORAGE_KEY);
    if (localData && useBackend) {
      const data = JSON.parse(localData);
      console.log('📦 Found localStorage data, migrating to backend...');
      await saveData(userId, data);

      // پاک کردن localStorage بعد از migration موفق
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('backtests'); // پاک کردن key قدیمی هم
      console.log('✅ Migration successful & localStorage cleared');
      return true;
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }

  return false;
}
