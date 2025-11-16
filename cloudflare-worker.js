/**
 * Cloudflare Worker برای Proxy کردن Firebase Requests
 * این worker درخواست‌های Firebase رو از ایران و کشورهای تحریم شده عبور میده
 */

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, X-Client-Version, X-Firebase-GMPID',
  'Access-Control-Max-Age': '86400',
};

// Firebase domains که باید proxy بشن
const FIREBASE_DOMAINS = [
  'firebaseapp.com',
  'googleapis.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebase.googleapis.com',
  'firebasestorage.googleapis.com'
];

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }

  try {
    // مسیرهای مختلف
    if (url.pathname.startsWith('/firestore/')) {
      return proxyFirestore(request, url);
    } else if (url.pathname.startsWith('/auth/')) {
      return proxyAuth(request, url);
    } else if (url.pathname.startsWith('/storage/')) {
      return proxyStorage(request, url);
    } else if (url.pathname === '/') {
      return new Response(JSON.stringify({
        status: 'ok',
        message: 'Firebase Proxy Worker is running',
        endpoints: {
          firestore: '/firestore/*',
          auth: '/auth/*',
          storage: '/storage/*'
        }
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders
        }
      });
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders
      }
    });
  }
}

/**
 * Proxy Firestore Requests
 */
async function proxyFirestore(request, url) {
  // حذف /firestore/ از ابتدای path
  const path = url.pathname.replace('/firestore/', '');
  const targetUrl = `https://firestore.googleapis.com/${path}${url.search}`;

  // کپی کردن headers
  const headers = new Headers(request.headers);
  headers.set('Host', 'firestore.googleapis.com');

  // ارسال درخواست به Firebase
  const response = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined
  });

  // کپی کردن response
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  // اضافه کردن CORS headers
  Object.keys(corsHeaders).forEach(key => {
    newResponse.headers.set(key, corsHeaders[key]);
  });

  return newResponse;
}

/**
 * Proxy Authentication Requests
 */
async function proxyAuth(request, url) {
  const path = url.pathname.replace('/auth/', '');

  // تشخیص نوع درخواست auth
  let targetUrl;
  if (path.includes('identitytoolkit')) {
    targetUrl = `https://identitytoolkit.googleapis.com/${path}${url.search}`;
  } else if (path.includes('securetoken')) {
    targetUrl = `https://securetoken.googleapis.com/${path}${url.search}`;
  } else {
    // پیش‌فرض: identitytoolkit
    targetUrl = `https://identitytoolkit.googleapis.com/v1/${path}${url.search}`;
  }

  const headers = new Headers(request.headers);
  const targetHost = new URL(targetUrl).host;
  headers.set('Host', targetHost);

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined
  });

  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  Object.keys(corsHeaders).forEach(key => {
    newResponse.headers.set(key, corsHeaders[key]);
  });

  return newResponse;
}

/**
 * Proxy Storage Requests
 */
async function proxyStorage(request, url) {
  const path = url.pathname.replace('/storage/', '');
  const targetUrl = `https://firebasestorage.googleapis.com/${path}${url.search}`;

  const headers = new Headers(request.headers);
  headers.set('Host', 'firebasestorage.googleapis.com');

  const response = await fetch(targetUrl, {
    method: request.method,
    headers: headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? await request.arrayBuffer() : undefined
  });

  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });

  Object.keys(corsHeaders).forEach(key => {
    newResponse.headers.set(key, corsHeaders[key]);
  });

  return newResponse;
}
