// Firebase Cloud Sync - سیستم ذخیره‌سازی خودکار دیتا
import { db } from './firebase.js';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  getDocs,
  onSnapshot,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

// ======================
// Helper: تبدیل email به key معتبر برای Firestore
// ======================
function encodeEmail(email) {
  if (!email) return null;
  // تبدیل همه @ و . به _ برای استفاده در Firestore path
  return email.toLowerCase().replaceAll('.', '_').replaceAll('@', '_at_');
}

// Cache برای کاهش API calls
const cache = {
  userEmail: null,
  data: {},
  listeners: []
};

// وضعیت آنلاین/آفلاین
let isOnline = navigator.onLine;
let pendingWrites = []; // دیتاهایی که باید بعداً sync بشن

// تشخیص تغییر وضعیت اینترنت
window.addEventListener('online', () => {
  isOnline = true;
  console.log('✅ اینترنت متصل شد - شروع sync...');
  syncPendingData();
});

window.addEventListener('offline', () => {
  isOnline = false;
  console.log('⚠️ اینترنت قطع شد - دیتا local ذخیره می‌شه');
});

// ======================
// 1️⃣ ذخیره دیتا (Save)
// ======================
/**
 * ذخیره یک آیتم در Firestore
 * @param {string} userEmail - ایمیل کاربر
 * @param {string} dataType - نوع دیتا: 'backtests' | 'folders' | 'trades' | 'sessions'
 * @param {string} itemId - شناسه آیتم
 * @param {object} data - دیتای مورد نظر
 */
export async function saveUserData(userEmail, dataType, itemId, data) {
  if (!userEmail || !dataType || !itemId) {
    console.error('❌ خطا: email, dataType و itemId الزامی است');
    return false;
  }

  // اگر آفلاین بود، دیتا رو pending کن
  if (!isOnline) {
    pendingWrites.push({ userEmail, dataType, itemId, data });
    console.log(`📦 دیتا برای sync بعدی ذخیره شد: ${dataType}/${itemId}`);
    return true;
  }

  try {
    const encodedEmail = encodeEmail(userEmail);
    const docRef = doc(db, `users/${encodedEmail}/${dataType}/${itemId}`);

    // اضافه کردن timestamp
    const dataWithTimestamp = {
      ...data,
      updatedAt: serverTimestamp()
    };

    await setDoc(docRef, dataWithTimestamp, { merge: true });

    // آپدیت cache
    if (!cache.data[dataType]) cache.data[dataType] = {};
    cache.data[dataType][itemId] = dataWithTimestamp;

    console.log(`✅ ذخیره شد: ${dataType}/${itemId} برای ${userEmail}`);
    return true;

  } catch (error) {
    console.error(`❌ خطا در ذخیره ${dataType}:`, error.message);

    // اگر خطا داشت، برای بعد نگهش دار
    pendingWrites.push({ userEmail, dataType, itemId, data });
    return false;
  }
}

// ======================
// 2️⃣ بارگذاری دیتا (Load)
// ======================
/**
 * بارگذاری کل دیتای کاربر از Firestore
 * @param {string} userEmail - ایمیل کاربر
 * @returns {object} - کل دیتای کاربر
 */
export async function loadUserData(userEmail) {
  if (!userEmail) {
    console.error('❌ خطا: email الزامی است');
    return null;
  }

  // اگر cache داریم، برگردون
  if (cache.userEmail === userEmail && Object.keys(cache.data).length > 0) {
    console.log('📦 دیتا از cache بارگذاری شد');
    return cache.data;
  }

  try {
    cache.userEmail = userEmail;
    const userData = {};
    const encodedEmail = encodeEmail(userEmail);

    // بارگذاری profile
    const profileRef = doc(db, `users/${encodedEmail}`);
    const profileSnap = await getDoc(profileRef);

    if (profileSnap.exists()) {
      userData.profile = profileSnap.data();
    } else {
      // اگر profile نداشت، یکی بساز
      userData.profile = {
        email: userEmail,
        username: null,
        createdAt: serverTimestamp()
      };
      await setDoc(profileRef, userData.profile);
      console.log('✅ Profile جدید ساخته شد');
    }

    // بارگذاری collections (backtests, folders, trades, sessions)
    const collections = ['backtests', 'folders', 'trades', 'sessions'];

    for (const collectionName of collections) {
      const collectionRef = collection(db, `users/${encodedEmail}/${collectionName}`);
      const q = query(collectionRef);
      const querySnapshot = await getDocs(q);

      userData[collectionName] = {};
      querySnapshot.forEach((doc) => {
        userData[collectionName][doc.id] = doc.data();
      });

      console.log(`✅ ${collectionName}: ${querySnapshot.size} آیتم بارگذاری شد`);
    }

    // ذخیره در cache
    cache.data = userData;

    return userData;

  } catch (error) {
    console.error('❌ خطا در بارگذاری دیتا:', error.message);
    return null;
  }
}

// ======================
// 3️⃣ Sync دیتاهای Pending
// ======================
async function syncPendingData() {
  if (pendingWrites.length === 0) return;

  console.log(`🔄 در حال sync ${pendingWrites.length} آیتم...`);

  const batch = writeBatch(db);
  const toSync = [...pendingWrites]; // کپی بگیر
  pendingWrites = []; // خالی کن

  try {
    for (const { userEmail, dataType, itemId, data } of toSync) {
      const encodedEmail = encodeEmail(userEmail);
      const docRef = doc(db, `users/${encodedEmail}/${dataType}/${itemId}`);
      batch.set(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    }

    await batch.commit();
    console.log('✅ همه دیتاهای pending sync شدن');

  } catch (error) {
    console.error('❌ خطا در sync:', error.message);
    // اگر خطا داشت، دوباره به pending اضافه کن
    pendingWrites.push(...toSync);
  }
}

// ======================
// 4️⃣ Real-time Listeners
// ======================
/**
 * شروع گوش دادن به تغییرات real-time
 * @param {string} userEmail - ایمیل کاربر
 * @param {string} dataType - نوع دیتا
 * @param {function} callback - تابعی که وقتی دیتا تغییر کرد اجرا بشه
 */
export function listenToCollection(userEmail, dataType, callback) {
  if (!userEmail || !dataType) {
    console.error('❌ خطا: email و dataType الزامی است');
    return null;
  }

  const encodedEmail = encodeEmail(userEmail);
  const collectionRef = collection(db, `users/${encodedEmail}/${dataType}`);

  // گوش دادن به تغییرات
  const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
    const items = {};
    snapshot.forEach((doc) => {
      items[doc.id] = doc.data();
    });

    // آپدیت cache
    if (!cache.data[dataType]) cache.data[dataType] = {};
    cache.data[dataType] = items;

    console.log(`🔔 ${dataType} آپدیت شد: ${snapshot.size} آیتم`);

    // اجرای callback
    if (callback) callback(items);
  }, (error) => {
    console.error(`❌ خطا در listener ${dataType}:`, error.message);
  });

  // ذخیره listener برای بعد
  cache.listeners.push(unsubscribe);

  return unsubscribe;
}

// ======================
// 5️⃣ Batch Save (چند آیتم یکجا)
// ======================
/**
 * ذخیره چند آیتم یکجا (بهینه‌تر)
 * @param {string} userEmail - ایمیل کاربر
 * @param {string} dataType - نوع دیتا
 * @param {object} items - آبجکتی از آیتم‌ها: { itemId: data, ... }
 */
export async function saveBatch(userEmail, dataType, items) {
  if (!userEmail || !dataType || !items) {
    console.error('❌ خطا: email, dataType و items الزامی است');
    return false;
  }

  try {
    const batch = writeBatch(db);
    const encodedEmail = encodeEmail(userEmail);

    Object.entries(items).forEach(([itemId, data]) => {
      const docRef = doc(db, `users/${encodedEmail}/${dataType}/${itemId}`);
      batch.set(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    console.log(`✅ ${Object.keys(items).length} آیتم batch save شد`);
    return true;

  } catch (error) {
    console.error('❌ خطا در batch save:', error.message);
    return false;
  }
}

// ======================
// 6️⃣ پاک کردن Listeners
// ======================
export function cleanupListeners() {
  cache.listeners.forEach(unsubscribe => unsubscribe());
  cache.listeners = [];
  console.log('🧹 همه listeners پاک شدن');
}

// ======================
// 7️⃣ پاک کردن Cache
// ======================
export function clearCache() {
  cache.userEmail = null;
  cache.data = {};
  cleanupListeners();
  console.log('🧹 Cache پاک شد');
}
