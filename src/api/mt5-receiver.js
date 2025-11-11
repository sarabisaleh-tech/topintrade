// MT5 Data Receiver API
// این فایل داده‌های ارسالی از EA رو دریافت و در Firestore ذخیره میکنه

import { db } from '../firebase.js';
import { collection, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';

/**
 * دریافت و ذخیره داده‌های MT5 از Expert Advisor
 * @param {Object} data - داده‌های ارسال شده از EA
 * @returns {Promise<Object>} نتیجه عملیات
 */
export async function receiveMT5Data(data) {
  try {
    const { userEmail, apiKey, account, openPositions, closedPositions, timestamp } = data;

    // ✅ اعتبارسنجی
    if (!userEmail || !apiKey) {
      return {
        success: false,
        error: 'Missing userEmail or apiKey'
      };
    }

    // ✅ پیدا کردن کاربر با ایمیل
    const userQuery = await getDoc(doc(db, 'users', userEmail));

    if (!userQuery.exists()) {
      return {
        success: false,
        error: 'User not found'
      };
    }

    const userData = userQuery.data();

    // ✅ بررسی API Key
    if (userData.mt5ApiKey !== apiKey) {
      return {
        success: false,
        error: 'Invalid API Key'
      };
    }

    // ✅ ذخیره اطلاعات Account
    await setDoc(doc(db, `users/${userEmail}/mt5Accounts`, account.login.toString()), {
      ...account,
      lastSync: serverTimestamp(),
      syncTimestamp: timestamp
    }, { merge: true });

    // ✅ ذخیره پوزیشن‌های باز
    if (openPositions && openPositions.length > 0) {
      const openBatch = openPositions.map(pos => ({
        ref: doc(db, `users/${userEmail}/mt5Accounts/${account.login}/openPositions`, pos.ticket.toString()),
        data: {
          ...pos,
          accountLogin: account.login,
          lastUpdate: serverTimestamp(),
          syncTimestamp: timestamp
        }
      }));

      // ذخیره به صورت تک تک
      for (const item of openBatch) {
        await setDoc(item.ref, item.data, { merge: true });
      }
    }

    // ✅ ذخیره پوزیشن‌های بسته شده
    if (closedPositions && closedPositions.length > 0) {
      const closedBatch = closedPositions.map(pos => ({
        ref: doc(db, `users/${userEmail}/mt5Accounts/${account.login}/closedPositions`, pos.ticket.toString()),
        data: {
          ...pos,
          accountLogin: account.login,
          lastUpdate: serverTimestamp(),
          syncTimestamp: timestamp
        }
      }));

      // ذخیره به صورت تک تک
      for (const item of closedBatch) {
        await setDoc(item.ref, item.data, { merge: true });
      }
    }

    // ✅ آپدیت آخرین زمان همگام‌سازی کاربر
    await setDoc(doc(db, 'users', userEmail), {
      lastMT5Sync: serverTimestamp(),
      mt5Connected: true,
      mt5AccountLogin: account.login
    }, { merge: true });

    console.log('✅ MT5 data saved successfully for:', userEmail);

    return {
      success: true,
      message: 'Data synced successfully',
      openPositionsCount: openPositions?.length || 0,
      closedPositionsCount: closedPositions?.length || 0
    };

  } catch (error) {
    console.error('❌ Error receiving MT5 data:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * تولید API Key برای کاربر
 * @param {string} userId - شناسه کاربر
 * @returns {Promise<string>} API Key جدید
 */
export async function generateApiKey(userId) {
  try {
    // تولید یک API Key تصادفی
    const apiKey = 'tk_' + Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15) +
                   Math.random().toString(36).substring(2, 15);

    // ذخیره در Firestore
    await setDoc(doc(db, 'users', userId), {
      mt5ApiKey: apiKey,
      apiKeyCreatedAt: serverTimestamp()
    }, { merge: true });

    return apiKey;

  } catch (error) {
    console.error('Error generating API key:', error);
    throw error;
  }
}

/**
 * دریافت API Key کاربر
 * @param {string} userId - شناسه کاربر
 * @returns {Promise<string|null>} API Key یا null
 */
export async function getUserApiKey(userId) {
  try {
    const userDoc = await getDoc(doc(db, 'users', userId));

    if (userDoc.exists()) {
      return userDoc.data().mt5ApiKey || null;
    }

    return null;

  } catch (error) {
    console.error('Error getting API key:', error);
    return null;
  }
}
