// اسکریپت برای درست کردن همه کاربران
// این اسکریپت باید با Firebase Admin SDK اجرا بشه

const admin = require('firebase-admin');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json'); // باید این فایل رو از Firebase Console دانلود کنی

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const auth = admin.auth();
const db = admin.firestore();

async function fixAllUsers() {
  console.log('🔍 در حال بررسی همه کاربران...\n');

  try {
    // گرفتن همه کاربران از Authentication
    const listUsersResult = await auth.listUsers();
    const users = listUsersResult.users;

    console.log(`📊 تعداد کل کاربران در Auth: ${users.length}\n`);

    let fixedCount = 0;
    let alreadyExistsCount = 0;

    for (const user of users) {
      console.log(`🔍 چک کاربر: ${user.email} (UID: ${user.uid})`);

      // چک کردن document در Firestore
      const userDocRef = db.collection('users').doc(user.uid);
      const userDoc = await userDocRef.get();

      if (!userDoc.exists) {
        console.log(`  ❌ Document وجود ندارد! در حال ساخت...`);

        // ساخت document
        await userDocRef.set({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || null,
          createdAt: admin.firestore.Timestamp.fromDate(new Date(user.metadata.creationTime)),
          lastLogin: admin.firestore.Timestamp.fromDate(new Date(user.metadata.lastSignInTime)),
          isAdmin: false,
          username: user.email.split('@')[0]
        });

        console.log(`  ✅ Document ساخته شد!`);
        fixedCount++;
      } else {
        console.log(`  ✅ Document قبلاً وجود داشت`);
        alreadyExistsCount++;
      }

      console.log('');
    }

    console.log('\n📊 خلاصه:');
    console.log(`  ✅ کاربران درست شده: ${fixedCount}`);
    console.log(`  ✓ کاربران که قبلاً document داشتند: ${alreadyExistsCount}`);
    console.log(`  📊 کل: ${users.length}`);

  } catch (error) {
    console.error('❌ خطا:', error);
  }
}

// اجرای اسکریپت
fixAllUsers();
