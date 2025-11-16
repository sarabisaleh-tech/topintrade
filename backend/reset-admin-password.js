const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');

const db = new Database('database.db');

// Reset admin password to 'admin123'
const newPassword = 'admin123';
const hashedPassword = bcrypt.hashSync(newPassword, 10);

const result = db.prepare('UPDATE users SET password = ? WHERE email = ?')
  .run(hashedPassword, 'sarabisaleh@gmail.com');

if (result.changes > 0) {
  console.log('✅ Password reset successfully!');
  console.log('📧 Email: sarabisaleh@gmail.com');
  console.log('🔑 New password: admin123');
} else {
  console.log('❌ User not found');
}

db.close();
