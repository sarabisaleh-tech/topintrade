import { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { nanoid } from 'nanoid';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [user, setUser] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // بررسی لاگین بودن
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        // دریافت API Key
        const userDoc = await getDoc(doc(db, 'users', currentUser.email));
        if (userDoc.exists()) {
          setApiKey(userDoc.data().mt5ApiKey || '');
        }
      } else {
        setUser(null);
        setApiKey('');
      }
    });
    return unsubscribe;
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // لاگین
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        // ثبت‌نام
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newApiKey = nanoid(32);

        // ذخیره کاربر در Firestore
        await setDoc(doc(db, 'users', email), {
          email: email,
          mt5ApiKey: newApiKey,
          createdAt: new Date().toISOString(),
          mt5Connected: false
        });

        setApiKey(newApiKey);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(apiKey);
    alert('API Key copied!');
  };

  if (user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-2xl w-full">
          <h1 className="text-3xl font-bold text-white mb-6">Trade Analyzer Dashboard</h1>

          <div className="space-y-4">
            <div>
              <p className="text-gray-400 text-sm">Logged in as:</p>
              <p className="text-white font-medium">{user.email}</p>
            </div>

            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-400 text-sm mb-2">Your MT5 API Key:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={apiKey}
                  readOnly
                  className="flex-1 bg-gray-900 text-white px-4 py-2 rounded border border-gray-600 font-mono text-sm"
                />
                <button
                  onClick={copyApiKey}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-medium"
                >
                  Copy
                </button>
              </div>
              <p className="text-gray-500 text-xs mt-2">Use this API Key in your MT5 EA</p>
            </div>

            <div className="bg-yellow-900 border border-yellow-700 p-4 rounded-lg">
              <h3 className="text-yellow-400 font-bold mb-2">Next Steps:</h3>
              <ol className="text-yellow-200 text-sm space-y-2 list-decimal list-inside">
                <li>Download the MT5 EA from the link below</li>
                <li>Install it in MetaTrader 5</li>
                <li>Enter your email: <span className="font-mono bg-yellow-950 px-1">{user.email}</span></li>
                <li>Enter your API Key (copied above)</li>
                <li>Enable Auto Trading and attach EA to any chart</li>
              </ol>
            </div>

            <a
              href="/MT5-EA/TopInTrade-Sync.mq5"
              download
              className="block w-full bg-green-600 hover:bg-green-700 text-white text-center px-4 py-3 rounded font-medium"
            >
              Download MT5 EA
            </a>

            <button
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          {isLogin ? 'Login' : 'Sign Up'}
        </h1>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded font-medium"
          >
            {loading ? 'Loading...' : (isLogin ? 'Login' : 'Sign Up')}
          </button>
        </form>

        <p className="text-gray-400 text-sm text-center mt-4">
          {isLogin ? "Don't have an account?" : "Already have an account?"}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-blue-400 hover:text-blue-300 ml-2"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}
