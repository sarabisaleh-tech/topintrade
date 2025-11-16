// Supabase Data Management - مدیریت دیتای کاربر با Auto-save
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
    console.log('\n🔄 ========== AUTO SAVE START ==========');
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

    console.log('✅ ========== SAVE SUCCESS ==========\n');
    pendingData = {};
  } catch (error) {
    console.error('\n❌ ========== SAVE FAILED ==========');
    console.error('❌ Error:', error.message);
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
      console.log('✅ ========== LOAD SUCCESS ==========');
      console.log('📦 Backtests:', data.backtests?.length || 0);
      console.log('========================================\n');

      return {
        backtests: data.backtests || [],
        journals: data.journals || [],
        folders: data.folders || [],
        currentBacktest: data.current_backtest || 0,
        currentJournal: data.current_journal || 0,
        savedTags: data.saved_tags || [],
        pinnedTags: data.pinned_tags || [],
        trackingSessions: data.tracking_sessions || [],
        todayAccumulatedTime: data.today_accumulated_time || 0,
        todayAccumulatedDate: data.today_accumulated_date || '',
        tradeFormDefaults: data.trade_form_defaults || {},
        lastUpdated: data.updated_at
      };
    } else {
      console.log('⚠️ ========== NO DATA FOUND ==========');
      console.log('🆕 Creating new document...');

      const defaultData = getDefaultUserData();
      const { error: insertError } = await supabase
        .from('user_data')
        .insert({
          user_id: userId,
          backtests: defaultData.backtests,
          journals: defaultData.journals,
          folders: defaultData.folders,
          current_backtest: defaultData.currentBacktest,
          current_journal: defaultData.currentJournal,
          saved_tags: defaultData.savedTags,
          pinned_tags: defaultData.pinnedTags,
          tracking_sessions: defaultData.trackingSessions,
          today_accumulated_time: defaultData.todayAccumulatedTime,
          today_accumulated_date: defaultData.todayAccumulatedDate,
          trade_form_defaults: defaultData.tradeFormDefaults
        });

      if (insertError) throw insertError;

      console.log('✅ New user profile created');
      console.log('========================================\n');
      return defaultData;
    }

  } catch (error) {
    console.error('\n❌ ========== LOAD FAILED ==========');
    console.error('❌ Error:', error.message);
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
// 2️⃣-B ذخیره Journals با Auto-save
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
  queueAutoSave(userId, 'current_backtest', currentBacktest);
  return true;
}

// ======================
// 4️⃣-B ذخیره Current Journal با Auto-save
// ======================
export function saveCurrentJournal(userId, currentJournal) {
  if (!userId) return false;
  queueAutoSave(userId, 'current_journal', currentJournal);
  return true;
}

// ======================
// 5️⃣ ذخیره Tags با Auto-save
// ======================
export function saveTags(userId, savedTags, pinnedTags) {
  if (!userId) return false;
  queueAutoSave(userId, 'saved_tags', savedTags || []);
  queueAutoSave(userId, 'pinned_tags', pinnedTags || []);
  return true;
}

// ======================
// 6️⃣ ذخیره Tracking Sessions با Auto-save
// ======================
export function saveTrackingSessions(userId, sessions, todayAccumulatedTime, todayAccumulatedDate, isTrackingTime, trackingStartTime) {
  if (!userId) return false;
  queueAutoSave(userId, 'tracking_sessions', sessions || []);
  queueAutoSave(userId, 'today_accumulated_time', todayAccumulatedTime || 0);
  queueAutoSave(userId, 'today_accumulated_date', todayAccumulatedDate || '');
  queueAutoSave(userId, 'is_tracking_time', isTrackingTime || false);
  queueAutoSave(userId, 'tracking_start_time', trackingStartTime || null);
  return true;
}

// ======================
// 7️⃣ ذخیره تنظیمات Trade Form با Auto-save
// ======================
export function saveTradeFormDefaults(userId, formDefaults) {
  if (!userId) return false;
  queueAutoSave(userId, 'trade_form_defaults', formDefaults);
  return true;
}

// ======================
// 8️⃣ ذخیره Shared Backtest (فوری)
// ======================
export async function saveSharedBacktest(backtestsArray, currentBacktestIndex) {
  try {
    const { data, error } = await supabase
      .from('shared_backtests')
      .insert({
        backtests: backtestsArray,
        current_backtest: currentBacktestIndex
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Shared backtest ذخیره شد: ${data.id}`);
    return data.id;
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
    const { data, error } = await supabase
      .from('shared_backtests')
      .select('*')
      .eq('id', shareId)
      .single();

    if (error) throw error;

    console.log(`✅ Shared backtest بارگذاری شد: ${shareId}`);
    return data;
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
    const { data, error } = await supabase
      .from('shared_journals')
      .insert({
        data: journalData
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Shared journal ذخیره شد: ${data.id}`);
    return data.id;
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
    const { data, error } = await supabase
      .from('shared_journals')
      .select('*')
      .eq('id', shareId)
      .single();

    if (error) throw error;

    console.log(`✅ Shared journal بارگذاری شد: ${shareId}`);
    return data.data;
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

  const subscription = supabase
    .channel(`user-data-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'user_data',
        filter: `user_id=eq.${userId}`
      },
      (payload) => {
        console.log('🔔 دیتای کاربر آپدیت شد');
        const data = payload.new;
        callback({
          backtests: data.backtests || [],
          journals: data.journals || [],
          folders: data.folders || [],
          currentBacktest: data.current_backtest || 0,
          currentJournal: data.current_journal || 0,
          savedTags: data.saved_tags || [],
          pinnedTags: data.pinned_tags || [],
          trackingSessions: data.tracking_sessions || [],
          todayAccumulatedTime: data.today_accumulated_time || 0,
          todayAccumulatedDate: data.today_accumulated_date || '',
          tradeFormDefaults: data.trade_form_defaults || {}
        });
      }
    )
    .subscribe();

  return () => subscription.unsubscribe();
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
  if (!userId) return false;

  console.log('🔄 شروع مهاجرت از localStorage...');

  try {
    const localData = {
      backtests: JSON.parse(window.localStorage?.getItem('backtests') || '[]'),
      folders: JSON.parse(window.localStorage?.getItem('folders') || '[]'),
      current_backtest: parseInt(window.localStorage?.getItem('currentBacktest') || '0'),
      saved_tags: JSON.parse(window.localStorage?.getItem('savedTags') || '[]'),
      pinned_tags: JSON.parse(window.localStorage?.getItem('pinnedTags') || '[]'),
      tracking_sessions: JSON.parse(window.localStorage?.getItem('trackingSessions') || '[]'),
      today_accumulated_time: parseInt(window.localStorage?.getItem('todayAccumulatedTime') || '0'),
      today_accumulated_date: window.localStorage?.getItem('todayAccumulatedDate') || '',
      trade_form_defaults: {
        date: window.localStorage?.getItem('trade_date') || '',
        time: window.localStorage?.getItem('trade_time') || '',
        timeFormat: window.localStorage?.getItem('trade_timeFormat') || '24h',
        stopLossType: window.localStorage?.getItem('trade_stopLossType') || 'percent'
      }
    };

    // ذخیره در Supabase
    const { error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        ...localData
      }, {
        onConflict: 'user_id'
      });

    if (error) throw error;

    console.log('✅ مهاجرت با موفقیت انجام شد!');
    return true;
  } catch (error) {
    console.error('❌ خطا در مهاجرت:', error.message);
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
