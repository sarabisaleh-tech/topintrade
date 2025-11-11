import React, { useState } from 'react';
import { useAuth, isAdminEmail } from './AuthContext';
import { BarChart3 } from 'lucide-react';
import { collection, query, where, getDocs, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [emailOrUsername, setEmailOrUsername] = useState(''); // برای login
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const { login, signup, resetPassword, signInWithGoogle, validateInvite, markInviteUsed } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (isLogin) {
      if (!emailOrUsername || !password) {
        setError('لطفاً تمام فیلدها را پر کنید');
        return;
      }
    } else {
      if (!username || !email || !password || !confirmPassword) {
        setError('لطفاً تمام فیلدها را پر کنید');
        return;
      }

      if (password !== confirmPassword) {
        setError('رمز عبور و تکرار آن مطابقت ندارند');
        return;
      }

      // کد دعوت اجباری است (به جز برای Admin)
      const isAdminUser = isAdminEmail(email);
      console.log('🔍 Admin Check:', { email, isAdminUser, inviteCode });

      if (!isAdminUser && !inviteCode) {
        setError(`لطفاً کد دعوت را وارد کنید (ایمیل: ${email}, Admin: ${isAdminUser})`);
        return;
      }
    }

    if (password.length < 6) {
      setError('رمز عبور باید حداقل 6 کاراکتر باشد');
      return;
    }

    try {
      setError('');
      setLoading(true);

      if (isLogin) {
        // Login با username یا email
        let loginEmail = emailOrUsername;

        // اگر username وارد شده، باید email رو از Firestore بگیریم
        if (!emailOrUsername.includes('@')) {
          const usersQuery = query(
            collection(db, 'users'),
            where('username', '==', emailOrUsername)
          );
          const usersSnapshot = await getDocs(usersQuery);

          if (usersSnapshot.empty) {
            setError('نام کاربری یافت نشد');
            setLoading(false);
            return;
          }

          loginEmail = usersSnapshot.docs[0].data().email;
        }

        await login(loginEmail, password);
      } else {
        // Signup
        const isAdminUser = isAdminEmail(email);

        // چک کردن یکتا بودن username
        const usernameQuery = query(
          collection(db, 'users'),
          where('username', '==', username)
        );
        const usernameSnapshot = await getDocs(usernameQuery);

        if (!usernameSnapshot.empty) {
          setError('این نام کاربری قبلاً استفاده شده است');
          setLoading(false);
          return;
        }

        // اگر Admin نیست، کد دعوت را با AuthContext چک کن
        if (!isAdminUser) {
          const validation = await validateInvite(inviteCode);

          if (!validation.valid) {
            setError(validation.message);
            setLoading(false);
            return;
          }
        }

        // ثبت‌نام کاربر
        const userCredential = await signup(email, password);

        // ذخیره اطلاعات کاربر در Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          username: username,
          email: email,
          createdAt: new Date(),
          isAdmin: isAdminUser,
          inviteCode: isAdminUser ? null : inviteCode.toUpperCase()
        });

        // علامت‌گذاری کد دعوت به عنوان استفاده شده (با AuthContext)
        if (!isAdminUser && inviteCode) {
          await markInviteUsed(inviteCode, email);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);

      // Error messages in Persian
      if (err.code === 'auth/account-locked') {
        setError('🔒 حساب شما به دلیل ورودهای غیرمجاز متعدد قفل شده است. برای اطلاعات بیشتر به آیدی ادمین در تلگرام پیام دهید: @TopinTradeadmin');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('این ایمیل قبلاً ثبت شده است');
      } else if (err.code === 'auth/invalid-email') {
        setError('فرمت ایمیل نامعتبر است');
      } else if (err.code === 'auth/user-not-found') {
        setError('کاربری با این ایمیل یافت نشد');
      } else if (err.code === 'auth/wrong-password') {
        setError('رمز عبور اشتباه است');
      } else if (err.code === 'auth/weak-password') {
        setError('رمز عبور ضعیف است');
      } else if (err.code === 'auth/too-many-requests') {
        setError('تعداد درخواست‌ها زیاد است. لطفاً بعداً تلاش کنید');
      } else {
        setError('خطایی رخ داد: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!resetEmail) {
      setError('لطفاً ایمیل خود را وارد کنید');
      return;
    }

    try {
      setError('');
      setResetMessage('');
      setLoading(true);
      await resetPassword(resetEmail);
      setResetMessage('✅ لینک بازیابی رمز عبور به ایمیل شما ارسال شد');
      setTimeout(() => {
        setShowResetPassword(false);
        setResetMessage('');
        setResetEmail('');
      }, 3000);
    } catch (err) {
      console.error('Reset password error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('کاربری با این ایمیل یافت نشد');
      } else if (err.code === 'auth/invalid-email') {
        setError('فرمت ایمیل نامعتبر است');
      } else {
        setError('خطایی رخ داد');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);

      // اگر در حالت ثبت نام هستیم، کد دعوت را بررسی می‌کنیم
      if (!isLogin && !inviteCode) {
        setError('لطفاً ابتدا کد دعوت را وارد کنید');
        setLoading(false);
        return;
      }

      await signInWithGoogle(isLogin ? null : inviteCode);
    } catch (err) {
      console.error('Google Sign-In error:', err);
      if (err.code === 'auth/account-locked') {
        setError('🔒 حساب شما به دلیل ورودهای غیرمجاز متعدد قفل شده است. برای اطلاعات بیشتر به آیدی ادمین در تلگرام پیام دهید: @TopinTradeadmin');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('ورود لغو شد');
      } else if (err.code === 'auth/popup-blocked') {
        setError('پاپ‌آپ مسدود شده است. لطفاً مسدودسازی پاپ‌آپ را غیرفعال کنید');
      } else if (err.message === 'INVITE_CODE_REQUIRED') {
        setError('برای ثبت نام با Google باید کد دعوت داشته باشید');
      } else if (err.message === 'INVALID_INVITE_CODE') {
        setError('کد دعوت نامعتبر یا قبلاً استفاده شده است');
      } else {
        setError('خطا در ورود با Google: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        .starry-bg {
          background: #000000;
          position: relative;
        }
        .starry-bg::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          background-image:
            radial-gradient(1px 1px at 20px 30px, #ffffff, transparent),
            radial-gradient(1px 1px at 60px 70px, #e0e0e0, transparent),
            radial-gradient(2px 2px at 50px 160px, #ffffff, transparent),
            radial-gradient(1px 1px at 130px 80px, #c0c0c0, transparent),
            radial-gradient(1px 1px at 140px 150px, #ffffff, transparent),
            radial-gradient(2px 2px at 200px 50px, #f0f0f0, transparent),
            radial-gradient(1px 1px at 230px 140px, #d0d0d0, transparent),
            radial-gradient(2px 2px at 280px 100px, #ffffff, transparent),
            radial-gradient(1px 1px at 300px 190px, #e8e8e8, transparent),
            radial-gradient(1px 1px at 350px 120px, #ffffff, transparent);
          background-repeat: repeat;
          background-size: 400px 250px;
          animation: twinkle 3s ease-in-out infinite;
        }
        .glass-card {
          background: rgba(17, 24, 39, 0.4);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
        }
      `}</style>

      <div className="min-h-screen starry-bg text-white flex items-center justify-center p-4">
        <div className="glass-card rounded-2xl p-8 max-w-md w-full border border-gray-700">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 flex items-center justify-center">
              <img
                src="/logo-dark.png"
                alt="Top In Trade"
                className="w-full h-full object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Top In Trade
            </h1>
            <p className="text-gray-400 text-sm mt-2">Professional Backtest Platform</p>
          </div>

          {!showResetPassword ? (
            <>
              {/* Tab Switcher */}
              <div className="flex gap-2 mb-6 bg-gray-800/50 p-1 rounded-lg">
                <button
                  onClick={() => {
                    setIsLogin(true);
                    setError('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    isLogin ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ورود
                </button>
                <button
                  onClick={() => {
                    setIsLogin(false);
                    setError('');
                  }}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    !isLogin ? 'bg-purple-500 text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  ثبت نام
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="text-sm text-gray-400 mb-2 block">نام کاربری</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                      placeholder="username"
                      disabled={loading}
                    />
                  </div>
                )}

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">
                    {isLogin ? 'ایمیل یا نام کاربری' : 'ایمیل'}
                  </label>
                  <input
                    type={isLogin ? "text" : "email"}
                    value={isLogin ? emailOrUsername : email}
                    onChange={(e) => isLogin ? setEmailOrUsername(e.target.value) : setEmail(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                    placeholder={isLogin ? "example@email.com یا username" : "example@email.com"}
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-400 mb-2 block">رمز عبور</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                    placeholder="حداقل 6 کاراکتر"
                    disabled={loading}
                  />
                </div>

                {!isLogin && (
                  <>
                    <div>
                      <label className="text-sm text-gray-400 mb-2 block">تکرار رمز عبور</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                        placeholder="تکرار رمز عبور"
                        disabled={loading}
                      />
                    </div>

                    {(email.toLowerCase() === 'titteam.1404@gmail.com' || email.toLowerCase() === 'salehsarubi@gmail.com') ? (
                      <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
                        <p className="text-sm text-purple-300 text-center">✨ شما به عنوان Admin ثبت نام می‌کنید</p>
                        {email.toLowerCase() === 'salehsarubi@gmail.com' && (
                          <p className="text-xs text-purple-400 text-center mt-2">پسورد: TopInAdmin@2025!</p>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-sm text-gray-400 mb-2 block">کد دعوت <span className="text-red-400">*</span></label>
                        <input
                          type="text"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                          className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition font-mono tracking-wider"
                          placeholder="کد دعوت 8 کاراکتری"
                          maxLength={8}
                          disabled={loading}
                          required
                        />
                        <p className="text-xs text-gray-500 mt-1">برای ثبت نام به کد دعوت نیاز دارید</p>
                      </div>
                    )}
                  </>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg transition ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'در حال پردازش...' : isLogin ? 'ورود' : 'ثبت نام'}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-400 text-sm">یا</span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>

              {/* Google Sign-In Button */}
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className={`w-full bg-white hover:bg-gray-100 text-gray-800 font-medium py-3 rounded-lg transition flex items-center justify-center gap-3 ${
                  loading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                ورود با Google
              </button>

              {/* Forgot Password */}
              {isLogin && (
                <button
                  onClick={() => setShowResetPassword(true)}
                  className="w-full mt-4 text-sm text-gray-400 hover:text-purple-400 transition"
                >
                  رمز عبور خود را فراموش کرده‌اید؟
                </button>
              )}
            </>
          ) : (
            <>
              {/* Reset Password Form */}
              <div className="mb-6">
                <button
                  onClick={() => {
                    setShowResetPassword(false);
                    setError('');
                    setResetMessage('');
                  }}
                  className="text-gray-400 hover:text-white transition flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  بازگشت
                </button>
              </div>

              <h2 className="text-xl font-bold mb-2">بازیابی رمز عبور</h2>
              <p className="text-gray-400 text-sm mb-6">
                ایمیل خود را وارد کنید تا لینک بازیابی رمز عبور برای شما ارسال شود
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
                  {error}
                </div>
              )}

              {resetMessage && (
                <div className="mb-4 p-3 bg-green-500/20 border border-green-500/50 rounded-lg text-green-400 text-sm text-center">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 mb-2 block">ایمیل</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition"
                    placeholder="example@email.com"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium py-3 rounded-lg transition ${
                    loading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {loading ? 'در حال ارسال...' : 'ارسال لینک بازیابی'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
