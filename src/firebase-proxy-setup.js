/**
 * Firebase Proxy Setup
 * این فایل fetch رو override می‌کنه تا Firebase requests از طریق Cloudflare Worker عبور کنن
 */

const WORKER_URL = 'https://patient-star-3d91.sarabisaleh.workers.dev';
const FIREBASE_DOMAINS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com',
  'firebasestorage.googleapis.com',
  'googleapis.com'
];

// ذخیره fetch اصلی
const originalFetch = window.fetch;

// Override fetch
window.fetch = function(url, options) {
  // تبدیل URL به string اگه Request object باشه
  const urlString = typeof url === 'string' ? url : url.url;

  try {
    const urlObj = new URL(urlString);

    // چک کردن اینکه آیا URL از Firebase domains هست
    const isFirebaseAPI = FIREBASE_DOMAINS.some(domain =>
      urlObj.hostname.includes(domain)
    );

    if (isFirebaseAPI) {
      // ساخت proxy URL
      const proxyUrl = `${WORKER_URL}/proxy/${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;

      console.log(`🔄 Proxying Firebase request: ${urlObj.hostname}${urlObj.pathname}`);

      // ارسال از طریق Worker
      return originalFetch(proxyUrl, options);
    }
  } catch (error) {
    console.warn('⚠️ Error parsing URL for proxy:', error);
  }

  // اگه Firebase نبود، fetch معمولی
  return originalFetch(url, options);
};

console.log('✅ Firebase Proxy initialized - Worker URL:', WORKER_URL);
