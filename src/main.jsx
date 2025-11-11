import { StrictMode, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import Login from './Login.jsx'
import AdminPanel from './AdminPanel.jsx'
import { AuthProvider, useAuth, isAdminEmail } from './AuthContext.jsx'

// Import LoginPage
import LoginPage from './LoginPage.jsx'

// Component برای چک کردن Authentication
function AuthWrapper() {
  const { currentUser } = useAuth();
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  // چک کردن URL برای admin panel و گوش دادن به تغییرات
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentHash(window.location.hash);
    };

    // Listen to popstate for browser back/forward
    window.addEventListener('popstate', handleLocationChange);

    // Listen to hashchange for hash navigation
    window.addEventListener('hashchange', handleLocationChange);

    // Listen to custom navigation events
    window.addEventListener('pushstate', handleLocationChange);

    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('pushstate', handleLocationChange);
    };
  }, []);

  // 🔓 اجازه دسترسی بدون لاگین برای share links و MT5 setup
  const urlParams = new URLSearchParams(window.location.search);
  const hasShareLink = urlParams.has('share');
  const isMT5Path = currentPath === '/mt5' || currentPath === '/mt5-setup';

  // چک کردن hash routing برای share links
  const isShareBacktestHash = currentHash.startsWith('#/share/backtest/');
  const isShareBacktestPath = currentPath.startsWith('/share/backtest/');
  const isShareRoute = hasShareLink || isShareBacktestHash || isShareBacktestPath;

  // اگه مسیر MT5 باشه، LoginPage رو نشون بده (بدون نیاز به لاگین)
  if (isMT5Path) {
    return <LoginPage />;
  }

  // اگر کاربر لاگین نکرده، Login رو نشون بده (مگر اینکه share link داشته باشه)
  if (!currentUser && !isShareRoute) {
    return <Login />;
  }

  // اگر URL برابر /admin باشه و کاربر Admin باشه، Admin Panel رو نشون بده
  if (currentPath === '/admin' && isAdminEmail(currentUser?.email)) {
    return <AdminPanel />;
  }

  // در غیر این صورت App رو نشون بده
  return <App />;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <AuthWrapper />
    </AuthProvider>
  </StrictMode>,
)
