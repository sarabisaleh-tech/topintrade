/**
 * Encryption utilities for API Keys
 * استفاده از Web Crypto API برای رمزنگاری امن
 */

const STORAGE_KEY = 'crypto_exchange_credentials';

/**
 * تبدیل string به ArrayBuffer
 */
function str2ab(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * تبدیل ArrayBuffer به string
 */
function ab2str(buffer) {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

/**
 * ایجاد کلید رمزنگاری از password
 */
async function deriveKey(password) {
  const passwordBuffer = str2ab(password);

  // Import password as key material
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Derive AES key from password
  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: str2ab('top-in-trade-crypto-salt'), // Salt ثابت برای سادگی
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * رمزنگاری داده
 */
export async function encryptData(data, password) {
  try {
    const key = await deriveKey(password);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      str2ab(JSON.stringify(data))
    );

    // ترکیب IV و داده رمزشده
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);

    // تبدیل به Base64 برای ذخیره
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * رمزگشایی داده
 */
export async function decryptData(encryptedData, password) {
  try {
    const key = await deriveKey(password);

    // تبدیل از Base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // جدا کردن IV و داده رمزشده
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);

    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encrypted
    );

    return JSON.parse(ab2str(decrypted));
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data - possibly wrong password');
  }
}

/**
 * ذخیره credentials در localStorage (رمزشده)
 */
export async function saveCredentials(credentials, password) {
  try {
    const encrypted = await encryptData(credentials, password);
    localStorage.setItem(STORAGE_KEY, encrypted);
    return true;
  } catch (error) {
    console.error('Save credentials error:', error);
    return false;
  }
}

/**
 * بارگذاری credentials از localStorage
 */
export async function loadCredentials(password) {
  try {
    const encrypted = localStorage.getItem(STORAGE_KEY);
    if (!encrypted) {
      return null;
    }

    return await decryptData(encrypted, password);
  } catch (error) {
    console.error('Load credentials error:', error);
    return null;
  }
}

/**
 * حذف credentials از localStorage
 */
export function removeCredentials() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * بررسی وجود credentials ذخیره شده
 */
export function hasStoredCredentials() {
  return localStorage.getItem(STORAGE_KEY) !== null;
}

/**
 * ایجاد password تصادفی برای session (مثل MetaMask)
 */
export function generateSessionPassword() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

export default {
  encryptData,
  decryptData,
  saveCredentials,
  loadCredentials,
  removeCredentials,
  hasStoredCredentials,
  generateSessionPassword
};
