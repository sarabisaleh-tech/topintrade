// مثال استفاده از Firebase Sync
import { auth } from './firebase.js';
import {
  loadUserData,
  saveUserData,
  listenToCollection,
  saveBatch,
  clearCache
} from './firebaseSync.js';

// ======================
// 1️⃣ راه‌اندازی اولیه - وقتی کاربر لاگین می‌کنه
// ======================
auth.onAuthStateChanged(async (user) => {
  if (user) {
    console.log(`👤 کاربر لاگین شد: ${user.email}`);

    // بارگذاری کل دیتای کاربر
    const userData = await loadUserData(user.uid);

    if (userData) {
      console.log('📦 دیتای کاربر:', userData);

      // حالا می‌تونی از دیتا استفاده کنی
      displayBacktests(userData.backtests);
      displayFolders(userData.folders);
    }

    // شروع Real-time Sync برای backtests
    listenToCollection(user.uid, 'backtests', (backtests) => {
      console.log('🔔 Backtests آپدیت شد!');
      displayBacktests(backtests);
    });

  } else {
    console.log('👋 کاربر لاگ‌اوت شد');
    clearCache(); // پاک کردن cache
  }
});

// ======================
// 2️⃣ ذخیره یک Backtest جدید
// ======================
async function addNewBacktest() {
  const user = auth.currentUser;
  if (!user) {
    alert('لطفاً ابتدا لاگین کنید');
    return;
  }

  const backtestData = {
    name: 'My Backtest',
    strategy: 'EMA Crossover',
    symbol: 'BTCUSDT',
    timeframe: '1h',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    initialCapital: 10000,
    trades: []
  };

  // ذخیره در Firestore
  const backtestId = `backtest_${Date.now()}`;
  const success = await saveUserData(user.uid, 'backtests', backtestId, backtestData);

  if (success) {
    console.log('✅ Backtest ذخیره شد!');
  }
}

// ======================
// 3️⃣ ذخیره چند Trade یکجا (بهینه)
// ======================
async function saveMultipleTrades() {
  const user = auth.currentUser;
  if (!user) return;

  const trades = {
    'trade_1': { symbol: 'BTCUSDT', side: 'buy', price: 50000, amount: 0.1 },
    'trade_2': { symbol: 'ETHUSDT', side: 'sell', price: 3000, amount: 1 },
    'trade_3': { symbol: 'BNBUSDT', side: 'buy', price: 400, amount: 5 }
  };

  // ذخیره همه یکجا (کمتر API call!)
  await saveBatch(user.uid, 'trades', trades);
  console.log('✅ همه Trades ذخیره شدن');
}

// ======================
// 4️⃣ Real-time Update برای Folders
// ======================
function setupFoldersSync() {
  const user = auth.currentUser;
  if (!user) return;

  // هر بار که folder عوض بشه، این اجرا می‌شه
  listenToCollection(user.uid, 'folders', (folders) => {
    console.log('📁 Folders آپدیت شد:', folders);

    // نمایش در UI
    const folderList = document.getElementById('folder-list');
    if (folderList) {
      folderList.innerHTML = '';
      Object.entries(folders).forEach(([id, folder]) => {
        const li = document.createElement('li');
        li.textContent = folder.name;
        folderList.appendChild(li);
      });
    }
  });
}

// ======================
// توابع کمکی برای نمایش (UI)
// ======================
function displayBacktests(backtests) {
  console.log('📊 نمایش Backtests:');
  Object.entries(backtests || {}).forEach(([id, backtest]) => {
    console.log(`- ${backtest.name} (${backtest.symbol})`);
  });
}

function displayFolders(folders) {
  console.log('📁 نمایش Folders:');
  Object.entries(folders || {}).forEach(([id, folder]) => {
    console.log(`- ${folder.name}`);
  });
}

// ======================
// Export برای استفاده در جاهای دیگه
// ======================
export {
  addNewBacktest,
  saveMultipleTrades,
  setupFoldersSync
};
