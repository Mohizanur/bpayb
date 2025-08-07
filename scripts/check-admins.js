// This script checks for admin users in Firestore using the app's Firebase config
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

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

// Check for admin users
async function checkAdminUsers() {
  try {
    console.log('\n🔍 Checking for admin users...');
    
    // Query for admin users
    const snapshot = await db.collection('users')
      .where('isAdmin', '==', true)
      .limit(10)
      .get();

    if (snapshot.empty) {
      console.log('❌ No admin users found in the database.');
      console.log('\nTo make a user an admin, run:');
      console.log('  node scripts/make-admin.js TELEGRAM_USER_ID');
      console.log('\nExample:');
      console.log('  node scripts/make-admin.js 123456789');
    } else {
      console.log('✅ Admin users found:');
      snapshot.forEach(doc => {
        const user = doc.data();
        console.log('\n------------------------------');
        console.log(`ID: ${doc.id}`);
        console.log(`Name: ${user.firstName || ''} ${user.lastName || ''}`.trim());
        console.log(`Username: @${user.username || 'N/A'}`);
        console.log(`Admin: ${user.isAdmin ? '✅' : '❌'}`);
        console.log(`Status: ${user.status || 'active'}`);
        console.log(`Created: ${user.createdAt || 'N/A'}`);
      });
      console.log('\n------------------------------');
    }
  } catch (error) {
    console.error('❌ Error checking admin users:', error.message);
    console.error('\nMake sure you have the correct Firebase Admin permissions.');
  } finally {
    process.exit(0);
  }
}

// Run the check
checkAdminUsers();
