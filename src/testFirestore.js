// اسکریپت تست اتصال Firestore
import { db, auth } from './firebase.js';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

/**
 * تست اتصال به Firestore
 */
export async function testFirestoreConnection() {
  console.log('🔍 شروع تست اتصال Firestore...');

  // چک کردن auth
  if (!auth.currentUser) {
    console.error('❌ کاربر لاگین نکرده! اول لاگین کن');
    return false;
  }

  const userId = auth.currentUser.uid;
  console.log('✅ کاربر لاگین شده:', auth.currentUser.email);

  try {
    // تست 1: نوشتن یک document
    console.log('📝 تست 1: نوشتن document...');
    const testDocRef = doc(db, 'users', userId);
    await setDoc(testDocRef, {
      test: 'این یک تست است',
      timestamp: serverTimestamp()
    }, { merge: true });
    console.log('✅ نوشتن موفق بود!');

    // تست 2: خواندن document
    console.log('📖 تست 2: خواندن document...');
    const docSnap = await getDoc(testDocRef);
    if (docSnap.exists()) {
      console.log('✅ خواندن موفق بود!');
      console.log('📦 دیتا:', docSnap.data());
    } else {
      console.error('❌ Document پیدا نشد!');
      return false;
    }

    console.log('');
    console.log('🎉 همه تست‌ها موفق بودن! Firestore درست کار می‌کنه.');
    console.log('💡 اگر دیتا ذخیره نمیشه، مشکل از جای دیگه‌ست');
    return true;

  } catch (error) {
    console.error('❌ خطا در تست:', error.message);
    console.error('جزئیات کامل:', error);

    // تشخیص نوع خطا
    if (error.code === 'permission-denied') {
      console.error('');
      console.error('⚠️ خطای دسترسی (Permission Denied)');
      console.error('💡 Security Rules رو deploy کن:');
      console.error('   1. برو به Firebase Console');
      console.error('   2. Firestore Database → Rules');
      console.error('   3. کد Rules رو از firestore.rules کپی کن');
      console.error('   4. Publish کن');
    } else if (error.code === 'unavailable') {
      console.error('');
      console.error('⚠️ اینترنت قطع است یا Firebase در دسترس نیست');
    } else {
      console.error('');
      console.error('⚠️ خطای ناشناخته - جزئیات بالا رو چک کن');
    }

    return false;
  }
}

// اگر از Console مرورگر صدا زده شد
if (typeof window !== 'undefined') {
  window.testFirestore = testFirestoreConnection;
  console.log('💡 برای تست Firestore، در Console بنویس: testFirestore()');
}
