// Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase config - پروژه جدید
const firebaseConfig = {
  apiKey: "AIzaSyBE8gmrTNdsFb_Ho15mDQap2VzyLsxudU4",
  authDomain: "topanalyzertrade.firebaseapp.com",
  projectId: "topanalyzertrade",
  storageBucket: "topanalyzertrade.firebasestorage.app",
  messagingSenderId: "412033042169",
  appId: "1:412033042169:web:8270d77380b880edaa4428",
  measurementId: "G-CVC3FWXPH1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Firestore با تنظیمات مخصوص Proxy
// استفاده از long-polling به جای WebSocket برای سازگاری با Worker
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // استفاده از HTTP long-polling
  experimentalAutoDetectLongPolling: false, // غیرفعال کردن auto-detect
});

// Initialize Firebase Storage
export const storage = getStorage(app);

export default app;
