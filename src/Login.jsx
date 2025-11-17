import { useState } from 'react';
import { useAuth } from './AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    // Validation for registration
    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('رمز عبور و تایید رمز عبور یکسان نیستند');
        return;
      }
    }

    setLoading(true);

    const result = isLogin
      ? await login(email, password)
      : await register(name, email, password, inviteCode);

    setLoading(false);

    if (!result.success) {
      setError(result.error);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Stars Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(300)].map((_, i) => {
          const size = Math.random() * 2 + 0.5;
          const duration = Math.random() * 2 + 1;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: size + 'px',
                height: size + 'px',
                top: Math.random() * 100 + '%',
                left: Math.random() * 100 + '%',
                opacity: Math.random() * 0.3 + 0.1,
                animation: `twinkle ${duration}s ease-in-out infinite`,
                animationDelay: Math.random() * 3 + 's'
              }}
            />
          );
        })}
      </div>

      {/* CSS Animation for Twinkling */}
      <style>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 0.1;
            transform: scale(0.8);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.2);
          }
        }
      `}</style>

      <div className="w-full max-w-md relative z-10">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="TopInTrade Logo"
              className="h-32 w-32"
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">TopInTrade</h1>
          <p className="text-gray-400">پلتفرم تحلیل و بررسی معاملات</p>
        </div>

        {/* Login/Register Form */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-2xl p-8 border border-gray-700">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 bg-gray-900/50 rounded-lg p-1">
            <button
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md transition font-medium ${
                isLogin
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ورود
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
              className={`flex-1 py-2 px-4 rounded-md transition font-medium ${
                !isLogin
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ثبت‌نام
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (فقط برای ثبت‌نام) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-white drop-shadow-lg mb-2">
                  نام
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="نام شما"
                  required
                  minLength={2}
                  autoComplete="name"
                />
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white drop-shadow-lg mb-2">
                ایمیل
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder="example@gmail.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white drop-shadow-lg mb-2">
                رمز عبور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                placeholder="••••••••"
                required
                minLength={6}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              {!isLogin && (
                <p className="text-xs text-gray-500 mt-1">حداقل 6 کاراکتر</p>
              )}
            </div>

            {/* Confirm Password (فقط برای ثبت‌نام) */}
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-white drop-shadow-lg mb-2">
                  تایید رمز عبور
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            )}

            {/* Invite Code (فقط برای ثبت‌نام) */}
            {!isLogin && (
              <>
                {/* نمایش پیام ادمین */}
                {(email.toLowerCase() === 'sarabisaleh@gmail.com' ||
                  email.toLowerCase() === 'salehsarubi@gmail.com' ||
                  email.toLowerCase() === 'titteam.1404@gmail.com') ? (
                  <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
                    <p className="text-sm text-purple-300 text-center">✨ شما به عنوان Admin ثبت‌نام می‌کنید</p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-white drop-shadow-lg mb-2">
                      کد دعوت
                    </label>
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition uppercase"
                      placeholder="ABC123XY"
                      required
                      maxLength={8}
                    />
                    <p className="text-xs text-gray-500 mt-1">کد دعوت از ادمین بگیرید</p>
                  </div>
                )}
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-700 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-medium py-3 px-4 rounded-lg transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  در حال پردازش...
                </span>
              ) : (
                isLogin ? 'ورود' : 'ثبت‌نام'
              )}
            </button>
          </form>

          {/* Additional Info */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              {isLogin ? 'حساب کاربری ندارید؟' : 'قبلاً ثبت‌نام کرده‌اید؟'}
              {' '}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setConfirmPassword('');
                }}
                className="text-purple-400 hover:text-purple-300 font-medium transition"
              >
                {isLogin ? 'ثبت‌نام کنید' : 'وارد شوید'}
              </button>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-gray-500 text-sm">
            امنیت و حریم خصوصی شما برای ما مهم است
          </p>
        </div>
      </div>
    </div>
  );
}
