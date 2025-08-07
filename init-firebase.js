import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
let app;
try {
  const serviceAccount = JSON.parse(
    await readFile(join(__dirname, 'serviceAccountKey.json'), 'utf8')
  );
  
  console.log('ℹ️  Initializing Firebase Admin with project:', serviceAccount.project_id);
  
  app = initializeApp({
    credential: cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
  
  console.log('✅ Firebase Admin initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin:');
  console.error(error);
  process.exit(1);
}

const auth = getAuth(app);

async function createAdminUser(uid) {
  try {
    console.log(`\n🔍 Checking user ${uid}...`);
    
    // 1. Try to get the user
    try {
      const existingUser = await auth.getUser(uid);
      console.log('✅ User exists:', existingUser.uid);
      return existingUser;
    } catch (error) {
      if (error.code !== 'auth/user-not-found') throw error;
    }
    
    // 2. Create new user if not exists
    console.log('ℹ️  Creating new admin user...');
    const userRecord = await auth.createUser({
      uid: uid.toString(),
      email: `admin-${uid}@birrpay.com`,
      emailVerified: true,
      password: Math.random().toString(36).slice(-10),
      displayName: `Admin-${uid}`
    });
    
    console.log('✅ User created successfully:', userRecord.uid);
    return userRecord;
    
  } catch (error) {
    console.error('❌ Error in createAdminUser:', error.code || error.message);
    if (error.errorInfo) console.error('Details:', error.errorInfo);
    throw error;
  }
}

async function setAdminClaims(uid) {
  try {
    // 1. Create or get the user
    const user = await createAdminUser(uid);
    
    // 2. Set admin claims
    console.log('\n🛠  Setting admin claims...');
    await auth.setCustomUserClaims(uid, { 
      admin: true,
      telegramId: uid,
      role: 'super-admin',
      createdAt: new Date().toISOString()
    });
    
    // 3. Verify the claims
    const updatedUser = await auth.getUser(uid);
    
    console.log('\n✅ Admin Setup Complete!');
    console.log('========================');
    console.log('User ID:', updatedUser.uid);
    console.log('Email:', updatedUser.email);
    console.log('Admin Status:', updatedUser.customClaims?.admin ? '✅ Yes' : '❌ No');
    console.log('Custom Claims:', JSON.stringify(updatedUser.customClaims || {}, null, 2));
    
    return updatedUser;
    
  } catch (error) {
    console.error('\n❌ Failed to set admin claims:');
    console.error(error.code || error.message);
    if (error.errorInfo) console.error('Details:', error.errorInfo);
    process.exit(1);
  }
}

// Run the script
const args = process.argv.slice(2);
if (args.length > 0) {
  console.log('🚀 Starting admin setup...');
  await setAdminClaims(args[0]);
} else {
  console.log('❌ Error: Please provide a user UID');
  console.log('Usage: node init-firebase.js <USER_UID>');
  console.log('Example: node init-firebase.js 5186537254');
  process.exit(1);
}
