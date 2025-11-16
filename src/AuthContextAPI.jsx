import React, { createContext, useState, useEffect, useContext } from 'react';
import { authAPI } from './apiClient';
import { nanoid } from 'nanoid';

// لیست ایمیل‌های ادمین
const ADMIN_EMAILS = ['salehsarubi@gmail.com', 'sarabisaleh@gmail.com'];

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

// Export تابع چک ادمین
export { isAdminEmail };

// AuthProvider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // ثبت نام کاربر جدید
  const signup = async (email, password) => {
    const username = email.split('@')[0];
    const isAdmin = isAdminEmail(email);

    const result = await authAPI.signup(email, password, username, isAdmin);

    if (result.data?.user) {
      setCurrentUser(result.data.user);
      setUserProfile({
        email: email,
        isAdmin: isAdmin,
        displayName: username
      });
    }

    return result.data;
  };

  // ورود کاربر
  const login = async (email, password) => {
    console.log('🔐 Attempting login for:', email);

    const result = await authAPI.login(email, password);

    if (result.data?.user) {
      console.log('✅ Login successful for:', email);
      setCurrentUser(result.data.user);

      const isAdmin = isAdminEmail(email);
      setUserProfile({
        email: email,
        isAdmin: isAdmin,
        displayName: email.split('@')[0]
      });
    }

    return result.data;
  };

  // خروج کاربر
  const logout = async () => {
    await authAPI.logout();
    setCurrentUser(null);
    setUserProfile(null);
  };

  // بازیابی رمز عبور (فعلاً disabled)
  const resetPassword = async (email) => {
    throw new Error('Password reset not implemented yet');
  };

  // حذف اکانت (فعلاً disabled)
  const deleteAccount = async () => {
    throw new Error('Delete account not implemented yet');
  };

  // به‌روزرسانی پروفایل کاربر (فعلاً disabled)
  const updateUserProfile = async (updates) => {
    throw new Error('Update profile not implemented yet');
  };

  // Invite system (فعلاً disabled)
  const createInviteCode = async () => {
    throw new Error('Invite system not implemented yet');
  };

  const validateInvite = async (code) => {
    // For now, accept any code
    return { valid: true };
  };

  const markInviteUsed = async (code, userId) => {
    // No-op for now
  };

  const getInvites = async () => {
    return [];
  };

  const deleteInvite = async (inviteId) => {
    throw new Error('Delete invite not implemented yet');
  };

  const signInWithGoogle = async (inviteCode = null) => {
    throw new Error('Google sign-in not implemented yet');
  };

  // چک کردن session در شروع
  useEffect(() => {
    const checkSession = async () => {
      try {
        const result = await authAPI.getSession();

        if (result.data?.session?.user) {
          const user = result.data.session.user;
          setCurrentUser(user);

          const isAdmin = isAdminEmail(user.email);
          setUserProfile({
            email: user.email,
            isAdmin: isAdmin,
            displayName: user.email?.split('@')[0]
          });
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

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
