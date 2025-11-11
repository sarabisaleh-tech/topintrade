import React, { createContext, useState, useEffect, useContext } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { nanoid } from 'nanoid';
import { auth, db } from './firebase';
import sessionManager from './services/sessionManager';

// لیست ایمیل‌های ادمین
const ADMIN_EMAILS = ['titteam.1404@gmail.com', 'salehsarubi@gmail.com'];

// تابع چک کردن ادمین
const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
};

// ایجاد Context
const AuthContext = createContext({});

// Hook برای استفاده از AuthContext
export const useAuth = () => {
  return useContext(AuthContext);
};

// Export تابع چک ادمین برای استفاده در فایل‌های دیگر
export { isAdminEmail };

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null); // اطلاعات کاربر از Firestore
  const [loading, setLoading] = useState(true);

  // ثبت نام کاربر جدید
  const signup = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // ورود کاربر
  const login = async (email, password) => {
    console.log('🔐 Attempting login for:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Firebase auth successful for:', userCredential.user.email);

    // چک کردن آیا admin است
    const isAdmin = isAdminEmail(userCredential.user.email);

    // چک کردن قفل بودن اکانت (فقط برای non-admin)
    if (!isAdmin) {
      const isLocked = await checkAccountLock(userCredential.user.uid);
      if (isLocked) {
        console.log('🔒 Account is locked! Signing out...');
        // خروج فوری و ارسال خطا
        await signOut(auth);
        const error = new Error('ACCOUNT_LOCKED');
        error.code = 'auth/account-locked';
        throw error;
      }

      console.log('✅ Account is not locked, creating session...');
      // ایجاد session برای کاربر
      await sessionManager.createSession(userCredential.user.uid, userCredential.user.email);
      console.log('✅ Session created successfully');
    } else {
      console.log('👑 Admin login - skipping session manager');
    }

    return userCredential;
  };

  // خروج کاربر
  const logout = async () => {
    // نابود کردن session قبل از خروج
    await sessionManager.destroySession();
    return signOut(auth);
  };

  // بازیابی رمز عبور
  const resetPassword = (email) => {
    return sendPasswordResetEmail(auth, email);
  };

  // Helper: تبدیل email به encoded format (مطابق با firestore.rules)
  const encodeEmail = (email) => {
    if (!email) return null;
    return email.toLowerCase().replaceAll('.', '_').replaceAll('@', '_at_');
  };

  // چک کردن قفل بودن اکانت
  const checkAccountLock = async (userId) => {
    try {
      const accountLockRef = doc(db, 'accountLocks', userId);
      const accountLockDoc = await getDoc(accountLockRef);

      console.log('🔍 Checking account lock for user:', userId);

      if (accountLockDoc.exists()) {
        const data = accountLockDoc.data();
        console.log('📊 Account lock data:', data);
        const isLocked = data.isLocked === true;
        console.log('🔒 Is locked:', isLocked);
        return isLocked;
      }

      console.log('✅ No lock record found - user is not locked');
      return false;
    } catch (error) {
      console.error('Error checking account lock:', error);
      return false;
    }
  };

  // ورود با Google
  const signInWithGoogle = async (inviteCode = null) => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      // تبدیل email به encoded format برای استفاده در Firestore path
      const encodedEmail = encodeEmail(result.user.email);

      // چک کردن admin
      const isAdmin = isAdminEmail(result.user.email);

      // ایجاد یا به‌روزرسانی پروفایل کاربر در Firestore
      // استفاده از encodedEmail به جای uid برای سازگاری با firebaseSync.js
      const userDocRef = doc(db, 'users', encodedEmail);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        // کاربر جدید است - باید کد دعوت داشته باشد (به جز admin)
        if (!isAdmin) {
          if (!inviteCode) {
            // حذف کاربر از Firebase Auth چون کد دعوت ندارد
            await result.user.delete();
            throw new Error('INVITE_CODE_REQUIRED');
          }

          // اعتبارسنجی کد دعوت
          const validation = await validateInvite(inviteCode);
          if (!validation.valid) {
            // حذف کاربر از Firebase Auth چون کد دعوت نامعتبر است
            await result.user.delete();
            throw new Error('INVALID_INVITE_CODE');
          }

          // علامت‌گذاری کد دعوت به عنوان استفاده شده
          await markInviteUsed(inviteCode, result.user.email);
        }

        // ایجاد پروفایل کاربر
        await setDoc(userDocRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isAdmin: isAdmin,
          inviteCode: isAdmin ? null : inviteCode?.toUpperCase()
        });
        console.log(`✅ پروفایل جدید ساخته شد برای: ${result.user.email}`);
      } else {
        // به‌روزرسانی زمان آخرین ورود
        await setDoc(userDocRef, {
          lastLogin: serverTimestamp()
        }, { merge: true });
      }

      // چک کردن قفل بودن اکانت (فقط برای non-admin)
      if (!isAdmin) {
        const isLocked = await checkAccountLock(result.user.uid);
        if (isLocked) {
          // خروج فوری و ارسال خطا
          await signOut(auth);
          const error = new Error('ACCOUNT_LOCKED');
          error.code = 'auth/account-locked';
          throw error;
        }

        // ایجاد session برای کاربر
        await sessionManager.createSession(result.user.uid, result.user.email);
      } else {
        console.log('👑 Admin login via Google - skipping session manager');
      }

      return result;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  // گوش دادن به تغییرات وضعیت authentication
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('👤 onAuthStateChanged triggered, user:', user?.email || 'null');
      setCurrentUser(user);

      if (user) {
        // چک کردن آیا admin است
        const isAdmin = isAdminEmail(user.email);

        // چک کردن اینکه آیا در shared view هستیم یا نه
        const pathname = window.location.pathname;
        const hash = window.location.hash;
        const isSharedView = pathname.startsWith('/share/') || hash.startsWith('#/share/');
        console.log('🔍 Is shared view?', isSharedView, 'pathname:', pathname, 'hash:', hash);

        // ایجاد session برای کاربر فقط اگر در shared view نیستیم و admin نباشد
        if (!isAdmin && !isSharedView && !sessionManager.isSessionActive()) {
          console.log('🔧 Creating session in onAuthStateChanged...');
          await sessionManager.createSession(user.uid, user.email);
        } else {
          console.log('ℹ️ Skipping session creation:', isAdmin ? 'admin user' : isSharedView ? 'shared view' : 'session already active');
        }

        // موقتاً Firestore Profile رو Skip میکنیم تا سایت کار کنه
        // بعداً وقتی Rules درست شد، این رو برمیگردونیم
        console.log('⚠️ Skipping Firestore profile load (temporarily disabled)');
        setUserProfile({
          email: user.email,
          isAdmin: isAdmin,
          displayName: user.displayName || user.email.split('@')[0]
        });
      } else {
        setUserProfile(null);
        // نابود کردن session هنگام خروج
        await sessionManager.destroySession();
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // حذف اکانت (برای دیلیت کردن کاربر)
  const deleteAccount = async () => {
    if (currentUser) {
      await currentUser.delete();
    }
  };

  // به‌روزرسانی پروفایل کاربر
  const updateUserProfile = async (updates) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const encodedEmail = encodeEmail(currentUser.email);
      const userDocRef = doc(db, 'users', encodedEmail);

      // به‌روزرسانی displayName در Firebase Auth
      if (updates.displayName !== undefined) {
        await firebaseUpdateProfile(currentUser, {
          displayName: updates.displayName
        });
      }

      // به‌روزرسانی photoURL در Firebase Auth
      if (updates.photoURL !== undefined) {
        await firebaseUpdateProfile(currentUser, {
          photoURL: updates.photoURL
        });
      }

      // به‌روزرسانی password
      if (updates.password) {
        await firebaseUpdatePassword(currentUser, updates.password);
      }

      // به‌روزرسانی Firestore
      const firestoreUpdates = {};
      if (updates.displayName !== undefined) firestoreUpdates.displayName = updates.displayName;
      if (updates.photoURL !== undefined) firestoreUpdates.photoURL = updates.photoURL;

      if (Object.keys(firestoreUpdates).length > 0) {
        await setDoc(userDocRef, {
          ...firestoreUpdates,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // ========== Invite System Functions ==========

  // تولید کد دعوت منحصر به فرد با nanoid
  const createInviteCode = async () => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const code = nanoid(8).toUpperCase();

    try {
      const inviteRef = await addDoc(collection(db, 'invites'), {
        code,
        createdBy: currentUser.email,
        createdAt: serverTimestamp(),
        usedBy: null,
        usedAt: null,
        status: 'active'
      });

      return {
        id: inviteRef.id,
        code,
        createdBy: currentUser.email,
        status: 'active'
      };
    } catch (error) {
      console.error('Error creating invite code:', error);
      throw error;
    }
  };

  // چک اعتبار کد دعوت
  const validateInvite = async (code) => {
    if (!code) {
      return { valid: false, message: 'کد دعوت ضروری است' };
    }

    try {
      const invitesQuery = query(
        collection(db, 'invites'),
        where('code', '==', code.toUpperCase()),
        where('status', '==', 'active')
      );

      const invitesSnapshot = await getDocs(invitesQuery);

      if (invitesSnapshot.empty) {
        return { valid: false, message: 'کد دعوت نامعتبر یا قبلاً استفاده شده است' };
      }

      const inviteDoc = invitesSnapshot.docs[0];
      return {
        valid: true,
        inviteId: inviteDoc.id,
        inviteData: inviteDoc.data()
      };
    } catch (error) {
      console.error('Error validating invite:', error);
      return { valid: false, message: 'خطا در بررسی کد دعوت' };
    }
  };

  // علامت‌گذاری کد دعوت به عنوان استفاده شده
  const markInviteUsed = async (code, userId) => {
    if (!code || !userId) {
      throw new Error('Code and userId are required');
    }

    try {
      const invitesQuery = query(
        collection(db, 'invites'),
        where('code', '==', code.toUpperCase()),
        where('status', '==', 'active')
      );

      const invitesSnapshot = await getDocs(invitesQuery);

      if (!invitesSnapshot.empty) {
        const inviteDoc = invitesSnapshot.docs[0];
        await updateDoc(doc(db, 'invites', inviteDoc.id), {
          usedBy: userId,
          usedAt: serverTimestamp(),
          status: 'used'
        });
      }
    } catch (error) {
      console.error('Error marking invite as used:', error);
      throw error;
    }
  };

  // دریافت لیست تمام کدهای دعوت (فقط برای ادمین)
  const getInvites = async () => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // چک ادمین بودن
    const isAdmin = isAdminEmail(currentUser.email);
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      const invitesSnapshot = await getDocs(collection(db, 'invites'));
      const invites = invitesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        // تبدیل Timestamp به Date برای نمایش راحت‌تر
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        usedAt: doc.data().usedAt?.toDate?.() || doc.data().usedAt
      }));

      // مرتب‌سازی بر اساس تاریخ ایجاد (جدیدترین اول)
      return invites.sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB - dateA;
      });
    } catch (error) {
      console.error('Error fetching invites:', error);
      throw error;
    }
  };

  // حذف کد دعوت (فقط برای ادمین)
  const deleteInvite = async (inviteId) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // چک ادمین بودن
    const isAdmin = isAdminEmail(currentUser.email);
    if (!isAdmin) {
      throw new Error('Unauthorized: Admin access required');
    }

    try {
      await deleteDoc(doc(db, 'invites', inviteId));
    } catch (error) {
      console.error('Error deleting invite:', error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userProfile,
    signup,
    login,
    logout,
    resetPassword,
    deleteAccount,
    signInWithGoogle,
    updateUserProfile,
    // Invite system functions
    createInviteCode,
    validateInvite,
    markInviteUsed,
    getInvites,
    deleteInvite
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
