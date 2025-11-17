const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Admin emails list
const ADMIN_EMAILS = ['sarabisaleh@gmail.com', 'salehsarubi@gmail.com', 'titteam.1404@gmail.com'];

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// PostgreSQL Connection (Vercel Postgres will set POSTGRES_URL)
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database
async function initDatabase() {
  try {
    const client = await pool.connect();

    // جدول کاربران
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        profile_photo TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // جدول دیتای کاربران
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_data (
        user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // جدول کدهای دعوت
    await client.query(`
      CREATE TABLE IF NOT EXISTS invite_codes (
        id SERIAL PRIMARY KEY,
        code TEXT UNIQUE NOT NULL,
        created_by INTEGER NOT NULL REFERENCES users(id),
        used_by INTEGER REFERENCES users(id),
        is_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        used_at TIMESTAMP
      );
    `);

    // جدول بک‌تست‌های به اشتراک گذاشته شده
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_backtests (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        backtest_data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        views INTEGER DEFAULT 0
      );
    `);

    // ساخت یا آپدیت کاربر ادمین
    const adminResult = await client.query('SELECT id, is_admin FROM users WHERE email = $1', ['sarabisaleh@gmail.com']);

    if (adminResult.rows.length === 0) {
      // ساخت کاربر ادمین
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await client.query(
        'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4)',
        ['صالح', 'sarabisaleh@gmail.com', hashedPassword, true]
      );
      console.log('✅ Admin user created: sarabisaleh@gmail.com (password: admin123)');
    } else if (!adminResult.rows[0].is_admin) {
      // آپدیت کاربر موجود به ادمین
      await client.query('UPDATE users SET is_admin = TRUE WHERE email = $1', ['sarabisaleh@gmail.com']);
      console.log('✅ Admin privileges granted to: sarabisaleh@gmail.com');
    } else {
      console.log('✅ Admin user already exists: sarabisaleh@gmail.com');
    }

    client.release();
    console.log('✅ Database initialized (PostgreSQL)');
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
  const token = authHeader && authHeader.split(' ')[1];

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
  const client = await pool.connect();
  try {
    const { name, email, password, inviteCode } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({ error: 'Name must be at least 2 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

    // چک کردن کد دعوت (فقط برای non-admin)
    if (!isAdmin) {
      if (!inviteCode) {
        return res.status(400).json({ error: 'Invite code required' });
      }

      const inviteResult = await client.query('SELECT * FROM invite_codes WHERE code = $1', [inviteCode]);
      if (inviteResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid invite code' });
      }

      if (inviteResult.rows[0].is_used) {
        return res.status(400).json({ error: 'Invite code already used' });
      }
    }

    // چک کردن اینکه آیا email قبلاً وجود داره
    const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash کردن password
    const hashedPassword = await bcrypt.hash(password, 10);

    // ذخیره کاربر
    const userResult = await client.query(
      'INSERT INTO users (name, email, password, is_admin) VALUES ($1, $2, $3, $4) RETURNING id',
      [name.trim(), email, hashedPassword, isAdmin]
    );

    const userId = userResult.rows[0].id;

    // علامت‌گذاری کد دعوت (فقط برای non-admin)
    if (!isAdmin && inviteCode) {
      await client.query(
        'UPDATE invite_codes SET is_used = TRUE, used_by = $1, used_at = CURRENT_TIMESTAMP WHERE code = $2',
        [userId, inviteCode]
      );
    }

    // ساخت دیتای پیش‌فرض
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

    await client.query('INSERT INTO user_data (user_id, data) VALUES ($1, $2)', [userId, JSON.stringify(defaultData)]);

    // ساخت JWT token
    const token = jwt.sign({ id: userId, name: name.trim(), email }, JWT_SECRET, { expiresIn: '30d' });

    console.log(`✅ User registered: ${name} (${email})${isAdmin ? ' [ADMIN]' : ''}`);
    res.json({
      success: true,
      token,
      user: { id: userId, name: name.trim(), email }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const client = await pool.connect();
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = userResult.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '30d' });

    console.log(`✅ User logged in: ${user.name || 'User'} (${email})`);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        isAdmin: user.is_admin
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  } finally {
    client.release();
  }
});

// Verify Token
app.get('/api/auth/verify', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userResult = await client.query('SELECT name, email, is_admin FROM users WHERE id = $1', [req.user.id]);
    const user = userResult.rows[0];

    res.json({
      success: true,
      user: {
        id: req.user.id,
        name: user?.name || req.user.name,
        email: user?.email || req.user.email,
        isAdmin: user?.is_admin || false
      }
    });
  } catch (error) {
    console.error('❌ Verify error:', error);
    res.status(500).json({ error: 'Verification failed' });
  } finally {
    client.release();
  }
});

// ======================
// Health Check
// ======================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    database: 'PostgreSQL',
    timestamp: new Date().toISOString()
  });
});

// ======================
// Admin Endpoints
// ======================

// Middleware: چک ادمین
async function isAdmin(req, res, next) {
  const client = await pool.connect();
  try {
    const userResult = await client.query('SELECT is_admin FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0 || !userResult.rows[0].is_admin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authorization check failed' });
  } finally {
    client.release();
  }
}

// ساخت کد دعوت
app.post('/api/admin/invite-codes', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    await client.query('INSERT INTO invite_codes (code, created_by) VALUES ($1, $2)', [code, req.user.id]);

    console.log(`✅ Invite code created: ${code}`);
    res.json({ success: true, code });
  } catch (error) {
    console.error('❌ Error creating invite code:', error);
    res.status(500).json({ error: 'Failed to create invite code' });
  } finally {
    client.release();
  }
});

// لیست کدهای دعوت
app.get('/api/admin/invite-codes', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT
        ic.id, ic.code, ic.is_used, ic.created_at, ic.used_at,
        u.email as used_by_email
      FROM invite_codes ic
      LEFT JOIN users u ON ic.used_by = u.id
      ORDER BY ic.created_at DESC
    `);

    res.json({ success: true, codes: result.rows });
  } catch (error) {
    console.error('❌ Error fetching invite codes:', error);
    res.status(500).json({ error: 'Failed to fetch invite codes' });
  } finally {
    client.release();
  }
});

// حذف کد دعوت
app.delete('/api/admin/invite-codes/:id', authenticateToken, isAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM invite_codes WHERE id = $1', [req.params.id]);

    console.log(`✅ Invite code deleted: ${req.params.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error deleting invite code:', error);
    res.status(500).json({ error: 'Failed to delete invite code' });
  } finally {
    client.release();
  }
});

// ======================
// User Data Endpoints
// ======================

// Get user data
app.get('/api/user/:userId/data', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const result = await client.query('SELECT data FROM user_data WHERE user_id = $1', [userId]);

    if (result.rows.length === 0) {
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

    const data = result.rows[0].data;
    console.log(`✅ Loaded data for user: ${req.user.email}`);
    res.json(data);
  } catch (error) {
    console.error('❌ Error loading user data:', error);
    res.status(500).json({ error: 'Failed to load data' });
  } finally {
    client.release();
  }
});

// Save user data
app.post('/api/user/:userId/data', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const userId = req.user.id;
    const newData = req.body;

    const existingResult = await client.query('SELECT data FROM user_data WHERE user_id = $1', [userId]);

    let finalData;
    if (existingResult.rows.length > 0) {
      const existing = existingResult.rows[0].data;
      finalData = { ...existing, ...newData };

      await client.query(
        'UPDATE user_data SET data = $1, updated_at = CURRENT_TIMESTAMP WHERE user_id = $2',
        [JSON.stringify(finalData), userId]
      );
      console.log(`✅ Updated data for user: ${req.user.email}`);
    } else {
      finalData = newData;
      await client.query(
        'INSERT INTO user_data (user_id, data) VALUES ($1, $2)',
        [userId, JSON.stringify(finalData)]
      );
      console.log(`✅ Created data for user: ${req.user.email}`);
    }

    res.json({ success: true, data: finalData });
  } catch (error) {
    console.error('❌ Error saving user data:', error);
    res.status(500).json({ error: 'Failed to save data' });
  } finally {
    client.release();
  }
});

// ======================
// Share Endpoints
// ======================

// Share a backtest
app.post('/api/share/backtest', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { backtestData } = req.body;

    if (!backtestData) {
      return res.status(400).json({ error: 'Backtest data required' });
    }

    const shareId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    await client.query(
      'INSERT INTO shared_backtests (id, user_id, backtest_data) VALUES ($1, $2, $3)',
      [shareId, req.user.id, JSON.stringify(backtestData)]
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
  } finally {
    client.release();
  }
});

// Get shared backtest
app.get('/api/share/:shareId', async (req, res) => {
  const client = await pool.connect();
  try {
    const { shareId } = req.params;

    const result = await client.query('SELECT backtest_data, created_at FROM shared_backtests WHERE id = $1', [shareId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shared backtest not found' });
    }

    await client.query('UPDATE shared_backtests SET views = views + 1 WHERE id = $1', [shareId]);

    const backtestData = result.rows[0].backtest_data;
    console.log(`✅ Shared backtest viewed: ${shareId}`);

    res.json({
      success: true,
      backtest: backtestData,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    console.error('❌ Error loading shared backtest:', error);
    res.status(500).json({ error: 'Failed to load shared backtest' });
  } finally {
    client.release();
  }
});

// ======================
// Profile Photo Endpoints
// ======================

// Get profile photo
app.get('/api/user/profile-photo', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const result = await client.query('SELECT profile_photo FROM users WHERE id = $1', [req.user.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      profilePhoto: result.rows[0].profile_photo
    });
  } catch (error) {
    console.error('❌ Error loading profile photo:', error);
    res.status(500).json({ error: 'Failed to load profile photo' });
  } finally {
    client.release();
  }
});

// Upload profile photo
app.post('/api/user/profile-photo', authenticateToken, async (req, res) => {
  const client = await pool.connect();
  try {
    const { profilePhoto } = req.body;

    if (!profilePhoto) {
      return res.status(400).json({ error: 'Profile photo required' });
    }

    if (profilePhoto.length > 3000000) {
      return res.status(400).json({ error: 'Profile photo too large (max 2MB)' });
    }

    await client.query('UPDATE users SET profile_photo = $1 WHERE id = $2', [profilePhoto, req.user.id]);

    console.log(`✅ Profile photo updated for user: ${req.user.email}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error saving profile photo:', error);
    res.status(500).json({ error: 'Failed to save profile photo' });
  } finally {
    client.release();
  }
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('\n👋 Database connection closed');
  process.exit(0);
});

// Start server (فقط برای تست local - Vercel از serverless function استفاده میکنه)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`\n🚀 ========== SERVER STARTED ==========`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📊 Database: PostgreSQL`);
    console.log(`💡 API: http://localhost:${PORT}/health`);
    console.log(`=======================================\n`);
  });
}

// Export برای Vercel Serverless
module.exports = app;
