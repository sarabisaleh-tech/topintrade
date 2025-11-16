const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Admin emails list
const ADMIN_EMAILS = ['sarabisaleh@gmail.com', 'salehsarubi@gmail.com', 'titteam.1404@gmail.com'];

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// SQLite Database Connection
const db = new Database('database.db', { verbose: console.log });

// Initialize database
function initDatabase() {
  try {
    // جدول کاربران
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration: اضافه کردن is_admin و email و name اگر وجود نداشته باشه
    try {
      const tableInfo = db.prepare("PRAGMA table_info(users)").all();
      const hasIsAdmin = tableInfo.some(col => col.name === 'is_admin');
      const hasEmail = tableInfo.some(col => col.name === 'email');
      const hasName = tableInfo.some(col => col.name === 'name');

      if (!hasIsAdmin) {
        console.log('⚠️  Adding is_admin column to existing users table...');
        db.exec('ALTER TABLE users ADD COLUMN is_admin INTEGER DEFAULT 0');
        console.log('✅ is_admin column added successfully');
      }

      if (!hasEmail) {
        console.log('⚠️  Adding email column to existing users table...');
        db.exec('ALTER TABLE users ADD COLUMN email TEXT');
        // اگر username وجود داشته باشه، اون رو به email کپی میکنیم
        const hasUsername = tableInfo.some(col => col.name === 'username');
        if (hasUsername) {
          db.exec('UPDATE users SET email = username WHERE email IS NULL');
          console.log('✅ Migrated username to email');
        }
        console.log('✅ email column added successfully');
      }

      if (!hasName) {
        console.log('⚠️  Adding name column to existing users table...');
        db.exec('ALTER TABLE users ADD COLUMN name TEXT');
        console.log('✅ name column added successfully');
      }
    } catch (migrationError) {
      console.error('❌ Error during migration:', migrationError);
    }

    // جدول دیتای کاربران
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id INTEGER PRIMARY KEY,
        data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // جدول کدهای دعوت
    db.exec(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        code TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL,
        used_by INTEGER,
        is_used INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        used_at DATETIME,
        FOREIGN KEY (created_by) REFERENCES users(id),
        FOREIGN KEY (used_by) REFERENCES users(id)
      );
    `);

    // جدول بک‌تست‌های به اشتراک گذاشته شده
    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_backtests (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        backtest_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );
    `);

    // Migration: اضافه کردن profile_photo به جدول users
    try {
      const tableInfo = db.prepare("PRAGMA table_info(users)").all();
      const hasProfilePhoto = tableInfo.some(col => col.name === 'profile_photo');

      if (!hasProfilePhoto) {
        console.log('⚠️  Adding profile_photo column to users table...');
        db.exec('ALTER TABLE users ADD COLUMN profile_photo TEXT');
        console.log('✅ profile_photo column added successfully');
      }
    } catch (migrationError) {
      console.error('❌ Error during profile_photo migration:', migrationError);
    }

    // ساخت یا آپدیت کاربر ادمین
    const adminUser = db.prepare('SELECT id, is_admin FROM users WHERE email = ?').get('sarabisaleh@gmail.com');
    if (!adminUser) {
      // ساخت کاربر ادمین
      const bcrypt = require('bcryptjs');
      const hashedPassword = bcrypt.hashSync('admin123', 10);
      db.prepare('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, 1)').run('صالح', 'sarabisaleh@gmail.com', hashedPassword);
      console.log('✅ Admin user created: sarabisaleh@gmail.com (password: admin123)');
    } else if (adminUser.is_admin !== 1) {
      // آپدیت کاربر موجود به ادمین
      db.prepare('UPDATE users SET is_admin = 1 WHERE email = ?').run('sarabisaleh@gmail.com');
      console.log('✅ Admin privileges granted to: sarabisaleh@gmail.com');
    } else {
      console.log('✅ Admin user already exists: sarabisaleh@gmail.com');
    }

    console.log('✅ Database initialized (SQLite)');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

initDatabase();

// ======================
// Middleware: Verify JWT Token
// ======================
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// ======================
// Authentication Endpoints
// ======================

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // چک کردن آیا ایمیل ادمین است
    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    // چک کردن کد دعوت (فقط برای non-admin)
    if (!isAdmin) {
      if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code required' });
      }

      const invite = db.prepare('SELECT * FROM invite_codes WHERE code = ?').get(inviteCode);
      if (!invite) {
        return res.status(400).json({ error: 'Invalid invite code' });
      }

      if (invite.is_used === 1) {
        return res.status(400).json({ error: 'Invite code already used' });
      }
    }

    // چک کردن اینکه آیا email قبلاً وجود داره
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash کردن password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ذخیره کاربر با is_admin flag
    const result = db.prepare('INSERT INTO users (name, email, password, is_admin) VALUES (?, ?, ?, ?)').run(name.trim(), email, hashedPassword, isAdmin ? 1 : 0);

    // علامت‌گذاری کد دعوت به عنوان استفاده شده (فقط برای non-admin)
    if (!isAdmin && inviteCode) {
      db.prepare('UPDATE invite_codes SET is_used = 1, used_by = ?, used_at = CURRENT_TIMESTAMP WHERE code = ?').run(result.lastInsertRowid, inviteCode);
    }

    // ساخت دیتای پیش‌فرض برای کاربر
    const defaultData = {
      backtests: [],
      journals: [],
      folders: [],
      currentBacktest: 0,
      currentJournal: 0,
      savedTags: [],
      pinnedTags: [],
      trackingSessions: [],
      todayAccumulatedTime: 0,
      todayAccumulatedDate: '',
      tradeFormDefaults: {}
    };

    db.prepare('INSERT INTO user_data (user_id, data) VALUES (?, ?)').run(result.lastInsertRowid, JSON.stringify(defaultData));

    // ساخت JWT token
    const token = jwt.sign({ id: result.lastInsertRowid, name: name.trim(), email }, JWT_SECRET, { expiresIn: '30d' });

    console.log(`✅ User registered: ${name} (${email})${isAdmin ? ' [ADMIN]' : ` with invite code: ${inviteCode}`}`);
    res.json({
      success: true,
      token,
      user: {
        id: result.lastInsertRowid,
        name: name.trim(),
        email
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // پیدا کردن کاربر
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // چک کردن password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // ساخت JWT token
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    console.log(`✅ User logged in: ${user.name || 'User'} (${email})`);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin === 1
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify Token (check if user is still logged in)
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  // بررسی اینکه کاربر ادمین هست یا نه
  const user = db.prepare('SELECT name, email, is_admin FROM users WHERE id = ?').get(req.user.id);

  res.json({
    success: true,
    user: {
      id: req.user.id,
      name: user?.name || req.user.name,
      email: user?.email || req.user.email,
      isAdmin: user?.is_admin === 1
    }
  });
});

// ======================
// Health Check
// ======================

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'SQLite',
    timestamp: new Date().toISOString()
  });
});

// ======================
// Admin Endpoints (فقط برای ادمین)
// ======================

// Middleware: چک کردن اینکه کاربر ادمین هست یا نه
function isAdmin(req, res, next) {
  const user = db.prepare('SELECT is_admin FROM users WHERE id = ?').get(req.user.id);
  if (!user || user.is_admin !== 1) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// ساخت کد دعوت جدید (فقط ادمین)
app.post('/api/admin/invite-codes', authenticateToken, isAdmin, (req, res) => {
  try {
    // ساخت کد تصادفی
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();

    db.prepare('INSERT INTO invite_codes (code, created_by) VALUES (?, ?)').run(code, req.user.id);

    console.log(`✅ Invite code created: ${code} by ${req.user.username}`);
    res.json({ success: true, code });
  } catch (error) {
    console.error('❌ Error creating invite code:', error);
    res.status(500).json({ error: 'Failed to create invite code' });
  }
});

// لیست همه کدهای دعوت (فقط ادمین)
app.get('/api/admin/invite-codes', authenticateToken, isAdmin, (req, res) => {
  try {
    const codes = db.prepare(`
      SELECT
        ic.id,
        ic.code,
        ic.is_used,
        ic.created_at,
        ic.used_at,
        u.email as used_by_email
      FROM invite_codes ic
      LEFT JOIN users u ON ic.used_by = u.id
      ORDER BY ic.created_at DESC
    `).all();

    res.json({ success: true, codes });
  } catch (error) {
    console.error('❌ Error fetching invite codes:', error);
    res.status(500).json({ error: 'Failed to fetch invite codes' });
  }
});

// حذف کد دعوت (فقط ادمین)
app.delete('/api/admin/invite-codes/:id', authenticateToken, isAdmin, (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM invite_codes WHERE id = ?').run(id);

    console.log(`✅ Invite code deleted: ${id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting invite code:', error);
    res.status(500).json({ error: 'Failed to delete invite code' });
  }
});

// ======================
// User Data Endpoints (با Authentication)
// ======================

// Get user data
app.get('/api/user/:userId/data', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id; // از token می‌گیریم نه از URL

    const stmt = db.prepare('SELECT data FROM user_data WHERE user_id = ?');
    const row = stmt.get(userId);

    if (!row) {
      // Return default empty data
      return res.json({
        backtests: [],
        journals: [],
        folders: [],
        currentBacktest: 0,
        currentJournal: 0,
        savedTags: [],
        pinnedTags: [],
        trackingSessions: [],
        todayAccumulatedTime: 0,
        todayAccumulatedDate: '',
        tradeFormDefaults: {}
      });
    }

    const data = JSON.parse(row.data);
    console.log(`✅ Loaded data for user: ${req.user.email}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  }
});

// Save user data
app.post('/api/user/:userId/data', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id; // از token می‌گیریم نه از URL
    const newData = req.body;

    // Get existing data first
    const existingStmt = db.prepare('SELECT data FROM user_data WHERE user_id = ?');
    const existingRow = existingStmt.get(userId);

    let finalData;
    if (existingRow) {
      // Merge with existing data
      const existing = JSON.parse(existingRow.data);
      finalData = { ...existing, ...newData };

      const updateStmt = db.prepare(
        'UPDATE user_data SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?'
      );
      updateStmt.run(JSON.stringify(finalData), userId);
      console.log(`✅ Updated data for user: ${req.user.email}`);
    } else {
      // Create new record
      finalData = newData;
      const insertStmt = db.prepare(
        'INSERT INTO user_data (user_id, data) VALUES (?, ?)'
      );
      insertStmt.run(userId, JSON.stringify(finalData));
      console.log(`✅ Created data for user: ${req.user.email}`);
    }

    res.json({ success: true, data: finalData });
  } catch (error) {
    console.error('❌ Error saving user data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  }
});

// ======================
// Share Endpoints (بدون نیاز به Authentication برای مشاهده)
// ======================

// Share a backtest (با Authentication)
app.post('/api/share/backtest', authenticateToken, (req, res) => {
  try {
    const { backtestData } = req.body;

    if (!backtestData) {
      return res.status(400).json({ error: 'Backtest data required' });
    }

    // ساخت شناسه یکتا برای اشتراک‌گذاری
    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    // ذخیره در دیتابیس
    db.prepare('INSERT INTO shared_backtests (id, user_id, backtest_data) VALUES (?, ?, ?)').run(
      shareId,
      req.user.id,
      JSON.stringify(backtestData)
    );

    console.log(`✅ Backtest shared: ${shareId} by ${req.user.email}`);
    res.json({
      success: true,
      shareId,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${shareId}`
    });
  } catch (error) {
    console.error('❌ Error sharing backtest:', error);
    res.status(500).json({ error: 'Failed to share backtest' });
  }
});

// Get shared backtest (بدون Authentication - عمومی)
app.get('/api/share/:shareId', (req, res) => {
  try {
    const { shareId } = req.params;

    const stmt = db.prepare('SELECT backtest_data, created_at FROM shared_backtests WHERE id = ?');
    const row = stmt.get(shareId);

    if (!row) {
      return res.status(404).json({ error: 'Shared backtest not found' });
    }

    // افزایش تعداد بازدیدها
    db.prepare('UPDATE shared_backtests SET views = views + 1 WHERE id = ?').run(shareId);

    const backtestData = JSON.parse(row.backtest_data);
    console.log(`✅ Shared backtest viewed: ${shareId}`);

    res.json({
      success: true,
      backtest: backtestData,
      createdAt: row.created_at
    });
  } catch (error) {
    console.error('❌ Error loading shared backtest:', error);
    res.status(500).json({ error: 'Failed to load shared backtest' });
  }
});

// ======================
// Profile Photo Endpoints
// ======================

// Get profile photo
app.get('/api/user/profile-photo', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT profile_photo FROM users WHERE id = ?');
    const row = stmt.get(req.user.id);

    if (!row) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      profilePhoto: row.profile_photo
    });
  } catch (error) {
    console.error('❌ Error loading profile photo:', error);
    res.status(500).json({ error: 'Failed to load profile photo' });
  }
});

// Upload profile photo
app.post('/api/user/profile-photo', authenticateToken, (req, res) => {
  try {
    const { profilePhoto } = req.body;

    if (!profilePhoto) {
      return res.status(400).json({ error: 'Profile photo required' });
    }

    // بررسی حجم base64 (حداکثر ~2.7MB که معادل 2MB فایل هست)
    if (profilePhoto.length > 3000000) {
      return res.status(400).json({ error: 'Profile photo too large (max 2MB)' });
    }

    db.prepare('UPDATE users SET profile_photo = ? WHERE id = ?').run(profilePhoto, req.user.id);

    console.log(`✅ Profile photo updated for user: ${req.user.email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving profile photo:', error);
    res.status(500).json({ error: 'Failed to save profile photo' });
  }
});

// ======================
// Serve Frontend (بعد از API routes)
// ======================

// Serve static files from the dist directory
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));

// Serve index.html for all other routes (SPA support)
app.use((req, res, next) => {
  // اگر فایل نبود، index.html رو برگردون
  const indexPath = path.join(distPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('❌ Error serving index.html:', err);
      res.status(500).send('Error loading application');
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close();
  console.log('\n👋 Database connection closed');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 ========== SERVER STARTED ==========`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`📊 Database: SQLite (database.db)`);
  console.log(`📁 Frontend: ${distPath}`);
  console.log(`💡 API: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth: Login/Register enabled`);
  console.log(`=======================================\n`);
});
