// Test script to verify admin system
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Load Firebase config
let firebaseConfig;
if (process.env.FIREBASE_CONFIG) {
  firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
} else {
  const configFile = fs.readFileSync('firebaseConfig.json', 'utf8');
  firebaseConfig = JSON.parse(configFile);
}

// Initialize Firebase
const app = initializeApp({
  credential: cert(firebaseConfig)
});

const firestore = getFirestore(app);

// Test admin check function
const isAuthorizedAdmin = async (userId) => {
  try {
    if (!userId) return false;
    
    // Check against environment variable first (for backward compatibility)
    if (process.env.ADMIN_TELEGRAM_ID && userId === process.env.ADMIN_TELEGRAM_ID) {
      return true;
    }
    
    // Check against Firestore config (old method)
    const adminDoc = await firestore.collection('config').doc('admins').get();
    if (adminDoc.exists) {
      const admins = adminDoc.data().userIds || [];
      if (admins.includes(userId)) {
        return true;
      }
    }
    
    // Check against user document (new method)
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData.isAdmin === true) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Test function
async function testAdminSystem() {
  console.log('🔍 Testing admin system...\n');
  
  // Test with a sample user ID (replace with actual user ID)
  const testUserId = process.argv[2] || '123456789';
  
  console.log(`Testing admin access for user: ${testUserId}`);
  
  const isAdmin = await isAuthorizedAdmin(testUserId);
  
  console.log(`\nResult: ${isAdmin ? '✅ ADMIN ACCESS' : '❌ NO ADMIN ACCESS'}`);
  
  if (isAdmin) {
    console.log('\n✅ User has admin privileges!');
    console.log('They should be able to:');
    console.log('- Use /admin command');
    console.log('- See admin button in main menu');
    console.log('- Access admin panel features');
  } else {
    console.log('\n❌ User does not have admin privileges.');
    console.log('\nTo make them an admin, run:');
    console.log(`node scripts/make-admin.js ${testUserId}`);
  }
  
  process.exit(0);
}

testAdminSystem();



