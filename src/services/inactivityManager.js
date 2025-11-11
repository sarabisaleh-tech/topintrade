/**
 * Inactivity Manager
 * مدیریت عدم فعالیت کاربر و خروج خودکار بعد از 15 دقیقه
 */

class InactivityManager {
  constructor() {
    this.inactivityTimeout = null;
    this.inactivityDuration = 15 * 60 * 1000; // 15 دقیقه به میلی‌ثانیه
    this.onLogoutCallback = null;
    this.isActive = false;

    // Event های مختلفی که نشان‌دهنده فعالیت کاربر هستند
    this.activityEvents = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'keydown'
    ];

    // Bind کردن متد برای حفظ this
    this.resetTimer = this.resetTimer.bind(this);
    this.handleInactivity = this.handleInactivity.bind(this);
  }

  /**
   * شروع monitoring عدم فعالیت
   */
  start(onLogoutCallback) {
    if (this.isActive) {
      console.warn('⚠️ Inactivity manager is already active');
      return;
    }

    this.onLogoutCallback = onLogoutCallback;
    this.isActive = true;

    // اضافه کردن event listeners برای تشخیص فعالیت
    this.activityEvents.forEach(event => {
      window.addEventListener(event, this.resetTimer, true);
    });

    // شروع timer اولیه
    this.resetTimer();

    console.log('✅ Inactivity manager started - Auto logout after 15 minutes of inactivity');
  }

  /**
   * توقف monitoring عدم فعالیت
   */
  stop() {
    if (!this.isActive) {
      return;
    }

    this.isActive = false;

    // پاک کردن timeout
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }

    // حذف event listeners
    this.activityEvents.forEach(event => {
      window.removeEventListener(event, this.resetTimer, true);
    });

    console.log('✅ Inactivity manager stopped');
  }

  /**
   * ریست کردن timer هر بار که کاربر فعالیتی انجام میدهد
   */
  resetTimer() {
    // پاک کردن timeout قبلی
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
    }

    // ایجاد timeout جدید
    this.inactivityTimeout = setTimeout(this.handleInactivity, this.inactivityDuration);
  }

  /**
   * هندل کردن عدم فعالیت - خروج خودکار کاربر
   */
  async handleInactivity() {
    console.warn('⏰ User inactive for 15 minutes - Auto logout triggered');

    // نمایش پیام به کاربر
    alert('شما به دلیل 15 دقیقه عدم فعالیت، از سیستم خارج می‌شوید.');

    // توقف inactivity manager
    this.stop();

    // فراخوانی callback خروج
    if (this.onLogoutCallback && typeof this.onLogoutCallback === 'function') {
      try {
        await this.onLogoutCallback();
      } catch (error) {
        console.error('❌ Error during auto logout:', error);
      }
    }

    // رفرش صفحه برای رفتن به Login
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }

  /**
   * چک کردن آیا manager فعال است
   */
  isManagerActive() {
    return this.isActive;
  }

  /**
   * تغییر مدت زمان عدم فعالیت (اختیاری - برای تست)
   */
  setInactivityDuration(minutes) {
    this.inactivityDuration = minutes * 60 * 1000;
    console.log(`⚙️ Inactivity duration set to ${minutes} minutes`);

    // اگر manager فعال است، timer را ریست کن
    if (this.isActive) {
      this.resetTimer();
    }
  }
}

// ایجاد instance واحد
const inactivityManager = new InactivityManager();

export default inactivityManager;
