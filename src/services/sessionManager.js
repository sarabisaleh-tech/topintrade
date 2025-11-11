import { doc, setDoc, onSnapshot, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { nanoid } from 'nanoid';

/**
 * Session Manager
 * مدیریت نشست‌های کاربر برای جلوگیری از ورود همزمان چند نفر با یک حساب
 */

class SessionManager {
  constructor() {
    this.currentSessionId = null;
    this.unsubscribeSession = null;
    this.heartbeatInterval = null;
    this.userId = null;
    this.userEmail = null;
  }

  /**
   * ایجاد نشست جدید برای کاربر
   */
  async createSession(userId, userEmail = null) {
    try {
      this.userId = userId;
      this.userEmail = userEmail;
      this.currentSessionId = nanoid(16);

      const sessionRef = doc(db, 'userSessions', userId);

      // ایجاد یا به‌روزرسانی نشست
      await setDoc(sessionRef, {
        sessionId: this.currentSessionId,
        userId: userId,
        userEmail: userEmail,
        createdAt: serverTimestamp(),
        lastHeartbeat: serverTimestamp(),
        isActive: true
      });

      console.log('✅ Session created:', this.currentSessionId);

      // شروع heartbeat برای نگه‌داشتن نشست زنده
      this.startHeartbeat();

      // شروع monitoring برای چک کردن نشست‌های دیگر
      this.startSessionMonitoring();

      return this.currentSessionId;
    } catch (error) {
      console.error('❌ Error creating session:', error);
      throw error;
    }
  }

  /**
   * شروع heartbeat - هر 10 ثانیه یک بار به‌روزرسانی می‌شود
   */
  startHeartbeat() {
    // پاک کردن interval قبلی اگر وجود دارد
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // ارسال heartbeat هر 10 ثانیه
    this.heartbeatInterval = setInterval(async () => {
      try {
        if (this.userId && this.currentSessionId) {
          const sessionRef = doc(db, 'userSessions', this.userId);
          await updateDoc(sessionRef, {
            lastHeartbeat: serverTimestamp()
          });
          console.log('💓 Heartbeat sent');
        }
      } catch (error) {
        console.error('❌ Error sending heartbeat:', error);
      }
    }, 10000); // هر 10 ثانیه
  }

  /**
   * شروع monitoring نشست - گوش دادن به تغییرات در Firestore
   */
  startSessionMonitoring() {
    if (!this.userId) return;

    const sessionRef = doc(db, 'userSessions', this.userId);

    // گوش دادن به تغییرات نشست
    this.unsubscribeSession = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();

        // اگر sessionId متفاوت است، یعنی کاربر دیگری وارد شده
        if (data.sessionId !== this.currentSessionId) {
          console.warn('⚠️ New session detected! This session will be terminated in 30 seconds...');

          // بعد از 30 ثانیه، این نشست را قطع کن
          setTimeout(() => {
            this.handleSessionConflict();
          }, 30000); // 30 ثانیه
        }
      }
    });
  }

  /**
   * مدیریت تضاد نشست - زمانی که کاربر دیگری وارد شده
   */
  async handleSessionConflict() {
    console.error('❌ Session conflict! Logging out...');

    // ثبت kick شدن در Firestore
    await this.incrementKickCount();

    // نمایش پیام به کاربر
    const message = 'حساب شما از دستگاه دیگری وارد شده است. شما در حال خروج هستید...';
    alert(message);

    // پاک کردن نشست
    await this.destroySession();

    // Import auth و logout کردن کاربر
    const { signOut } = await import('firebase/auth');
    const { auth } = await import('../firebase');

    try {
      await signOut(auth);
      console.log('✅ User logged out successfully');
    } catch (error) {
      console.error('❌ Error during logout:', error);
    }

    // رفرش صفحه - حالا کاربر logout شده و به Login Page می‌رود
    window.location.reload();
  }

  /**
   * افزایش تعداد دفعات kick شدن
   */
  async incrementKickCount() {
    if (!this.userId) return;

    try {
      const { doc, getDoc, setDoc, updateDoc, serverTimestamp, increment } = await import('firebase/firestore');
      const { db } = await import('../firebase');

      const accountLockRef = doc(db, 'accountLocks', this.userId);
      const accountLockDoc = await getDoc(accountLockRef);

      if (accountLockDoc.exists()) {
        const currentCount = accountLockDoc.data().kickCount || 0;
        const newCount = currentCount + 1;

        await updateDoc(accountLockRef, {
          kickCount: increment(1),
          lastKickAt: serverTimestamp(),
          isLocked: false // همیشه false - لیمیت برداشته شد
        });

        console.log(`⚠️ Kick count increased to ${newCount} (lock disabled)`);
        console.log('ℹ️ Auto-lock is disabled - account will never lock automatically');
      } else {
        // ایجاد رکورد جدید
        await setDoc(accountLockRef, {
          userId: this.userId,
          email: this.userEmail,
          kickCount: 1,
          firstKickAt: serverTimestamp(),
          lastKickAt: serverTimestamp(),
          isLocked: false
        });

        console.log('📝 First kick recorded');
      }
    } catch (error) {
      console.error('❌ Error incrementing kick count:', error);
    }
  }

  /**
   * نابود کردن نشست
   */
  async destroySession() {
    try {
      // توقف heartbeat
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }

      // توقف monitoring
      if (this.unsubscribeSession) {
        this.unsubscribeSession();
        this.unsubscribeSession = null;
      }

      // حذف نشست از Firestore (اختیاری - می‌توانید نگه دارید برای لاگ)
      if (this.userId) {
        const sessionRef = doc(db, 'userSessions', this.userId);
        await updateDoc(sessionRef, {
          isActive: false,
          endedAt: serverTimestamp()
        });
      }

      console.log('✅ Session destroyed');

      // پاک کردن متغیرها
      this.currentSessionId = null;
      this.userId = null;
      this.userEmail = null;
    } catch (error) {
      console.error('❌ Error destroying session:', error);
    }
  }

  /**
   * چک کردن آیا نشست هنوز فعال است
   */
  isSessionActive() {
    return this.currentSessionId !== null && this.heartbeatInterval !== null;
  }
}

// ایجاد instance واحد
const sessionManager = new SessionManager();

export default sessionManager;
