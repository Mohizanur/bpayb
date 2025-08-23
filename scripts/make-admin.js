// This script makes a user an admin in Firestore using the app's Firebase config
// Usage: node scripts/make-admin.js TELEGRAM_USER_ID

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Get Telegram user ID from command line arguments
const telegramId = process.argv[2];

if (!telegramId) {
  console.error('❌ Error: Please provide a Telegram user ID');
  console.log('\nUsage:');
  console.log('  node scripts/make-admin.js TELEGRAM_USER_ID');
  console.log('\nExample:');
  console.log('  node scripts/make-admin.js 123456789');
  process.exit(1);
}

// Set up paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Load environment variables
dotenv.config({ path: path.join(rootDir, '.env') });

// Load Firebase config
let firebaseConfig;

if (process.env.FIREBASE_CONFIG) {
  console.log("Loading Firebase config from environment variable...");
  firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
} else {
  // Fallback to config file
  console.log("Loading Firebase config from file...");
  const configPath = path.resolve(rootDir, 'firebaseConfig.json');
  
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    firebaseConfig = JSON.parse(configFile);
  } else {
    console.error('❌ Error: Firebase configuration not found');
    console.log('\nPlease set FIREBASE_CONFIG environment variable or provide firebaseConfig.json');
    process.exit(1);
  }
}

// Initialize Firebase
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

console.log('Initializing Firebase...');
const app = initializeApp({
  credential: cert(firebaseConfig),
  databaseURL: `https://${firebaseConfig.project_id}-default-rtdb.firebaseio.com/`
});

const db = getFirestore(app);
console.log('✅ Firebase initialized successfully');

async function makeUserAdmin() {
  try {
    console.log(`\n🔍 Making user ${telegramId} an admin...`);
    
    // Check if user exists
    const userRef = db.collection('users').doc(telegramId);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      console.error(`❌ Error: User with ID ${telegramId} not found`);
      console.log('\nPlease make sure the user has started a chat with the bot first.');
      process.exit(1);
    }
    
    // Get current user data
    const userData = userDoc.data();
    
    // Update user to be an admin
    await userRef.set({
      ...userData,
      isAdmin: true,
      status: 'active',
      updatedAt: new Date().toISOString()
    }, { merge: true });
    
    // Also add to config/admins collection for backward compatibility
    const configRef = db.collection('config').doc('admins');
    const configDoc = await configRef.get();
    
    if (configDoc.exists) {
      const configData = configDoc.data();
      const userIds = configData.userIds || [];
      if (!userIds.includes(telegramId)) {
        userIds.push(telegramId);
        await configRef.update({
          userIds: userIds,
          updatedAt: new Date().toISOString()
        });
      }
    } else {
      await configRef.set({
        userIds: [telegramId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`\n✅ Success! User is now an admin.`);
    console.log('\nUser details:');
    console.log('------------------------------');
    console.log(`ID: ${telegramId}`);
    console.log(`Name: ${userData.firstName || ''} ${userData.lastName || ''}`.trim());
    console.log(`Username: @${userData.username || 'N/A'}`);
    console.log(`Status: active`);
    console.log(`Admin: ✅`);
    console.log('------------------------------');
    
    console.log('\nYou may need to restart the bot for the changes to take effect.');
  } catch (error) {
    console.error('❌ Error making user admin:', error.message);
    console.error('\nMake sure you have the correct Firebase Admin permissions.');
  } finally {
    process.exit(0);
  }
}

// Run the function
makeUserAdmin();
