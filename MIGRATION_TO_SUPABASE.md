# راهنمای Migration از Firebase به Supabase

## چرا Supabase؟
- ✅ از ایران بدون VPN کار می‌کنه
- ✅ رایگان تا 500MB
- ✅ PostgreSQL (قدرتمندتر از Firestore)
- ✅ Open Source

---

## مرحله 1: نصب Supabase

```bash
npm install @supabase/supabase-js
```

---

## مرحله 2: ساخت فایل Supabase Config

فایل `src/supabase.js` بساز:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://YOUR-PROJECT.supabase.co'
const supabaseAnonKey = 'YOUR-ANON-KEY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

**URL و Key رو از کجا بگیرم؟**
1. برو به [app.supabase.com](https://app.supabase.com)
2. انتخاب پروژه
3. Settings > API
4. کپی کردن `Project URL` و `anon public key`

---

## مرحله 3: تغییر Authentication

### قبل (Firebase):
```javascript
import { auth } from './firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

await signInWithEmailAndPassword(auth, email, password);
```

### بعد (Supabase):
```javascript
import { supabase } from './supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email: email,
  password: password
})
```

---

## مرحله 4: تغییر Database Queries

### قبل (Firestore):
```javascript
import { db } from './firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

// اضافه کردن
await addDoc(collection(db, 'backtests'), {
  name: 'Test',
  createdAt: new Date()
});

// خواندن
const q = query(collection(db, 'backtests'), where('userId', '==', userId));
const snapshot = await getDocs(q);
const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
```

### بعد (Supabase):
```javascript
import { supabase } from './supabase';

// اضافه کردن
const { data, error } = await supabase
  .from('backtests')
  .insert({
    name: 'Test',
    created_at: new Date().toISOString()
  });

// خواندن
const { data, error } = await supabase
  .from('backtests')
  .select('*')
  .eq('user_id', userId);
```

---

## مرحله 5: ساخت جداول در Supabase

برو به SQL Editor در Supabase و این کوئری‌ها رو اجرا کن:

### جدول Users:
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  is_admin BOOLEAN DEFAULT FALSE
);

-- RLS (Row Level Security)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own data"
  ON users FOR SELECT
  USING (auth.uid() = id);
```

### جدول Backtests:
```sql
CREATE TABLE backtests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  trades JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own backtests"
  ON backtests FOR ALL
  USING (auth.uid() = user_id);
```

### جدول Journal Trades:
```sql
CREATE TABLE journal_trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  symbol TEXT NOT NULL,
  position TEXT CHECK (position IN ('long', 'short')),
  entry_price DECIMAL,
  exit_price DECIMAL,
  pnl DECIMAL,
  result TEXT CHECK (result IN ('profit', 'loss', 'breakeven')),
  trade_date DATE,
  trade_time TIME,
  tags TEXT[],
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE journal_trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD their own trades"
  ON journal_trades FOR ALL
  USING (auth.uid() = user_id);
```

---

## مرحله 6: تغییر AuthContext

فایل `src/AuthContext.jsx` رو به این شکل تغییر بده:

```javascript
import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // چک کردن session فعلی
    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      setLoading(false);
    });

    // گوش دادن به تغییرات auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signup = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const value = {
    currentUser,
    signup,
    login,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
```

---

## مرحله 7: Storage (آپلود عکس)

### قبل (Firebase Storage):
```javascript
import { storage } from './firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const storageRef = ref(storage, `images/${fileName}`);
await uploadBytes(storageRef, file);
const url = await getDownloadURL(storageRef);
```

### بعد (Supabase Storage):
```javascript
import { supabase } from './supabase';

const { data, error } = await supabase.storage
  .from('images')
  .upload(`public/${fileName}`, file);

const { data: { publicUrl } } = supabase.storage
  .from('images')
  .getPublicUrl(`public/${fileName}`);
```

**ساخت Bucket:**
1. برو به Storage در Supabase Dashboard
2. Create new bucket با نام `images`
3. Public bucket رو تیک بزن

---

## مرحله 8: Migration داده‌ها

برای انتقال داده‌های موجود از Firebase به Supabase:

```javascript
// اسکریپت migration
import { db as firebaseDb } from './firebase';
import { supabase } from './supabase';
import { collection, getDocs } from 'firebase/firestore';

async function migrateBacktests() {
  // خواندن از Firebase
  const snapshot = await getDocs(collection(firebaseDb, 'backtests'));
  const backtests = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  // نوشتن به Supabase
  for (const backtest of backtests) {
    const { error } = await supabase
      .from('backtests')
      .insert({
        user_id: backtest.userId,
        name: backtest.name,
        trades: backtest.trades,
        created_at: backtest.createdAt
      });

    if (error) {
      console.error('Migration error:', error);
    } else {
      console.log(`Migrated: ${backtest.name}`);
    }
  }
}

migrateBacktests();
```

---

## مزایای Supabase نسبت به Firebase

| ویژگی | Firebase | Supabase |
|-------|----------|----------|
| **از ایران** | ❌ | ✅ |
| **قیمت** | رایگان تا حدی | رایگان تا 500MB |
| **Database** | NoSQL (Firestore) | PostgreSQL (SQL) |
| **Query** | محدود | Full SQL |
| **Relations** | سخت | آسان (Foreign Keys) |
| **Transactions** | محدود | کامل |
| **Open Source** | ❌ | ✅ |
| **Self-Host** | ❌ | ✅ |

---

## هزینه‌ها

### Supabase Pricing:
- **Free Tier:**
  - 500MB database
  - 1GB file storage
  - 50,000 monthly active users
  - 2GB bandwidth

- **Pro ($25/month):**
  - 8GB database
  - 100GB file storage
  - 100,000 monthly active users
  - 50GB bandwidth

- **Team ($599/month):**
  - Unlimited resources

---

## زمان Migration

- **کوچک (< 100 user):** 1-2 روز
- **متوسط (100-1000 user):** 3-5 روز
- **بزرگ (> 1000 user):** 1-2 هفته

---

## نتیجه‌گیری

**Migration به Supabase ارزشش رو داره اگر:**
- ✅ کاربران زیادی از ایران داری
- ✅ می‌خوای از قدرت SQL استفاده کنی
- ✅ وقت داری برای migration (چند روز)

**بمون رو Firebase + Vercel اگر:**
- ✅ فعلاً کاربر کمی داری
- ✅ وقت نداری برای migration
- ✅ Vercel کار می‌کنه و مشکلی نیست

---

## پشتیبانی

اگه تصمیم گرفتی migrate کنی، بهم بگو تا کمکت کنم! 🚀
