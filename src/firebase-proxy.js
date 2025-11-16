/**
 * Firebase Proxy Adapter
 * این فایل Firebase requests رو از طریق Cloudflare Worker عبور میده
 * برای دسترسی از ایران و کشورهای تحریم شده
 */

// Worker URL - این رو بعداً با Worker URL واقعی replace کن
const WORKER_URL = 'https://firebase-proxy.saleh.workers.dev'; // فعلاً placeholder

/**
 * Proxy fetch برای Firebase APIs
 */
export async function proxyFetch(url, options = {}) {
  try {
    // اگه URL از Firebase domains نیست، معمولی fetch کن
    const urlObj = new URL(url);
    const isFirebaseAPI =
      urlObj.hostname.includes('googleapis.com') ||
      urlObj.hostname.includes('firebaseapp.com') ||
      urlObj.hostname.includes('firebase.com');

    if (!isFirebaseAPI) {
      return await fetch(url, options);
    }

    // اگه Firebase API هست، از worker استفاده کن
    const proxyUrl = `${WORKER_URL}/proxy/${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;

    console.log('🔄 Proxying Firebase request through Cloudflare Worker:', proxyUrl);

    return await fetch(proxyUrl, options);
  } catch (error) {
    console.error('❌ Proxy fetch failed:', error);
    throw error;
  }
}

/**
 * تشخیص اینکه آیا نیاز به proxy هست یا نه
 * می‌تونه بر اساس location یا تست دسترسی تصمیم بگیره
 */
export async function shouldUseProxy() {
  try {
    // تست دسترسی مستقیم به Firebase
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch('https://firestore.googleapis.com/', {
      method: 'HEAD',
      mode: 'no-cors',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    console.log('✅ Direct Firebase access available');
    return false;
  } catch (error) {
    console.log('⚠️ Firebase blocked, using proxy');
    return true;
  }
}
