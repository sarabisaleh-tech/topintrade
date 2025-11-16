// Crypto Supabase Data Management - مدیریت دیتای Crypto با Auto-save
import { supabase } from './supabase.js';

// ======================
// Auto-save Queue با Debounce
// ======================
let saveTimeout = null;
let pendingData = {};
let currentUserId = null;

/**
 * ذخیره خودکار با debounce (5 ثانیه بعد از آخرین تغییر)
 */
function queueAutoSave(userId, dataType, value) {
  currentUserId = userId;
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
  if (!currentUserId || Object.keys(pendingData).length === 0) return;

  try {
    console.log('\n🔄 ========== CRYPTO AUTO SAVE START ==========');
    console.log('🔑 User ID:', currentUserId);
    console.log('📤 Data to save:', Object.keys(pendingData));

    const dataToSave = {
      ...pendingData,
      user_id: currentUserId,
      updated_at: new Date().toISOString()
    };

    // Update or insert
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: currentUserId,
        ...dataToSave
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;

    console.log('✅ ========== CRYPTO SAVE SUCCESS ==========\n');
    pendingData = {};
  } catch (error) {
    console.error('\n❌ ========== CRYPTO SAVE FAILED ==========');
    console.error('❌ Error:', error.message);
    console.error('========================================\n');
  }
}

// ======================
// Force Save (ذخیره فوری)
// ======================
export async function forceSaveCrypto() {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }
  await executeAutoSave();
}

// ======================
// 1️⃣ بارگذاری کل دیتای Crypto کاربر
// ======================
export async function loadCryptoUserData(userId) {
  if (!userId) {
    console.error('❌ userId الزامی است');
    return getDefaultCryptoData();
  }

  try {
    console.log('\n🔄 ========== CRYPTO LOAD START ==========');
    console.log('🔑 User ID:', userId);

    const { data, error } = await supabase
      .from('user_data')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw error;
    }

    if (data) {
      console.log('✅ ========== CRYPTO LOAD SUCCESS ==========');
      console.log('📦 Crypto Backtests:', data.crypto_backtests?.length || 0);
      console.log('========================================\n');

      return {
        backtests: data.crypto_backtests || [],
        folders: data.crypto_folders || [{ id: 'root', name: 'User', isExpanded: true, emoji: '🪐' }],
        currentBacktest: data.crypto_current_backtest || 0,
        tags: data.crypto_tags || [],
        trackingSessions: data.crypto_tracking_sessions || [],
        todayAccumulatedTime: data.crypto_today_accumulated_time || 0,
        todayAccumulatedDate: data.crypto_today_accumulated_date || '',
        isTrackingTime: data.crypto_is_tracking_time || false,
        trackingStartTime: data.crypto_tracking_start_time || null,
        tradeFormDefaults: data.crypto_trade_form_defaults || {},
        lastUpdated: data.updated_at
      };
    } else {
      console.log('⚠️ ========== NO CRYPTO DATA FOUND ==========');
      console.log('🆕 Creating new document...');

      const defaultData = getDefaultCryptoData();
      const { error: insertError } = await supabase
        .from('user_data')
        .insert({
          user_id: userId,
          crypto_backtests: defaultData.backtests,
          crypto_folders: defaultData.folders,
          crypto_current_backtest: defaultData.currentBacktest,
          crypto_tags: defaultData.tags,
          crypto_tracking_sessions: defaultData.trackingSessions,
          crypto_today_accumulated_time: defaultData.todayAccumulatedTime,
          crypto_today_accumulated_date: defaultData.todayAccumulatedDate,
          crypto_is_tracking_time: defaultData.isTrackingTime,
          crypto_tracking_start_time: defaultData.trackingStartTime,
          crypto_trade_form_defaults: defaultData.tradeFormDefaults
        });

      if (insertError) throw insertError;

      console.log('✅ New crypto profile created');
      console.log('========================================\n');
      return defaultData;
    }

  } catch (error) {
    console.error('\n❌ ========== CRYPTO LOAD FAILED ==========');
    console.error('❌ Error:', error.message);
    console.error('========================================\n');
    return getDefaultCryptoData();
  }
}

// ======================
// 2️⃣ ذخیره Crypto Backtests با Auto-save
// ======================
export function saveCryptoBacktests(userId, backtests) {
  if (!userId) return false;
  queueAutoSave(userId, 'crypto_backtests', backtests);
  return true;
}

// ======================
// 3️⃣ ذخیره Crypto Folders با Auto-save
// ======================
export function saveCryptoFolders(userId, folders) {
  if (!userId) return false;
  queueAutoSave(userId, 'crypto_folders', folders);
  return true;
}

// ======================
// 4️⃣ ذخیره Current Crypto Backtest با Auto-save
// ======================
export function saveCryptoCurrentBacktest(userId, currentBacktest) {
  if (!userId) return false;
  queueAutoSave(userId, 'crypto_current_backtest', currentBacktest);
  return true;
}

// ======================
// 5️⃣ ذخیره Crypto Tags با Auto-save
// ======================
export function saveCryptoTags(userId, tags) {
  if (!userId) return false;
  queueAutoSave(userId, 'crypto_tags', tags || []);
  return true;
}

// ======================
// 6️⃣ ذخیره Crypto Tracking Sessions با Auto-save
// ======================
export function saveCryptoTrackingSessions(
  userId,
  trackingSessions,
  todayAccumulatedTime,
  todayAccumulatedDate,
  isTrackingTime,
  trackingStartTime
) {
  if (!userId) return false;
  queueAutoSave(userId, 'crypto_tracking_sessions', trackingSessions || []);
  queueAutoSave(userId, 'crypto_today_accumulated_time', todayAccumulatedTime || 0);
  queueAutoSave(userId, 'crypto_today_accumulated_date', todayAccumulatedDate || '');
  queueAutoSave(userId, 'crypto_is_tracking_time', isTrackingTime || false);
  queueAutoSave(userId, 'crypto_tracking_start_time', trackingStartTime || null);
  return true;
}

// ======================
// 7️⃣ ذخیره Crypto Trade Form Defaults با Auto-save
// ======================
export function saveCryptoTradeFormDefaults(userId, defaults) {
  if (!userId) return false;
  queueAutoSave(userId, 'crypto_trade_form_defaults', defaults);
  return true;
}

// ======================
// 8️⃣ Real-time Listener برای Crypto Data
// ======================
export function listenToCryptoUserData(userId, callback) {
  if (!userId || !callback) {
    console.error('❌ userId و callback الزامی است');
    return null;
  }

  const subscription = supabase
    .channel(`crypto-user-data-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 Crypto دیتای کاربر آپدیت شد');
        const data = payload.new;
        callback({
          backtests: data.crypto_backtests || [],
          folders: data.crypto_folders || [{ id: 'root', name: 'User', isExpanded: true, emoji: '🪐' }],
          currentBacktest: data.crypto_current_backtest || 0,
          tags: data.crypto_tags || [],
          trackingSessions: data.crypto_tracking_sessions || [],
          todayAccumulatedTime: data.crypto_today_accumulated_time || 0,
          todayAccumulatedDate: data.crypto_today_accumulated_date || '',
          isTrackingTime: data.crypto_is_tracking_time || false,
          trackingStartTime: data.crypto_tracking_start_time || null,
          tradeFormDefaults: data.crypto_trade_form_defaults || {}
        });
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
}

// ======================
// 🔧 Helper: دیتای پیش‌فرض Crypto
// ======================
function getDefaultCryptoData() {
  return {
    backtests: [],
    folders: [{ id: 'root', name: 'User', isExpanded: true, emoji: '🪐' }],
    currentBacktest: 0,
    tags: [],
    trackingSessions: [],
    todayAccumulatedTime: 0,
    todayAccumulatedDate: '',
    isTrackingTime: false,
    trackingStartTime: null,
    tradeFormDefaults: {}
  };
}

// ======================
// 🔧 Helper: مهاجرت از localStorage
// ======================
export async function migrateCryptoFromLocalStorage(userId) {
  if (!userId) return false;

  console.log('🔄 شروع مهاجرت Crypto از localStorage...');

  try {
    const localData = localStorage.getItem('cryptoBacktestData');
    if (!localData) return false;

    const data = JSON.parse(localData);

    // ذخیره در Supabase
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        crypto_backtests: data.backtests || [],
        crypto_folders: data.folders || [{ id: 'root', name: 'User', isExpanded: true, emoji: '🪐' }],
        crypto_current_backtest: data.currentBacktest || 0,
        crypto_tags: data.tags || [],
        crypto_tracking_sessions: data.trackingSessions || [],
        crypto_today_accumulated_time: data.todayAccumulatedTime || 0,
        crypto_today_accumulated_date: data.todayAccumulatedDate || '',
        crypto_is_tracking_time: data.isTrackingTime || false,
        crypto_tracking_start_time: data.trackingStartTime || null,
        crypto_trade_form_defaults: data.tradeFormDefaults || {}
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;

    localStorage.removeItem('cryptoBacktestData');
    console.log('✅ مهاجرت Crypto با موفقیت انجام شد!');
    return true;
  } catch (error) {
    console.error('❌ خطا در مهاجرت Crypto:', error.message);
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
