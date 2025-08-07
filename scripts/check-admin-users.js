// This script checks for admin users in Firestore
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../.env') });

// Get Firebase config from environment variables
const firebaseConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
};

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(firebaseConfig)
});

const db = getFirestore(app);

async function checkAdminUsers() {
  try {
    console.log('Checking for admin users...');
    
    // Query for admin users
    const snapshot = await db.collection('users')
      .where('isAdmin', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('❌ No admin users found in the database.');
      console.log('\nTo fix this, run the following command with your Telegram user ID:');
      console.log('node scripts/make-admin.js YOUR_TELEGRAM_ID');
    } else {
      console.log('✅ Admin users found:');
      snapshot.forEach(doc => {
        const user = doc.data();
        console.log(`- ID: ${doc.id}`);
        console.log(`  Name: ${user.firstName || ''} ${user.lastName || ''}`.trim());
        console.log(`  Username: @${user.username || 'N/A'}`);
        console.log(`  Admin: ${user.isAdmin ? '✅' : '❌'}`);
        console.log(`  Status: ${user.status || 'active'}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('❌ Error checking admin users:', error.message);
    console.error('\nMake sure you have set up Firebase Admin credentials correctly.');
    console.error('Set the GOOGLE_APPLICATION_CREDENTIALS environment variable:');
    console.error('  - Windows: $env:GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"');
    console.error('  - Linux/Mac: export GOOGLE_APPLICATION_CREDENTIALS="path/to/serviceAccountKey.json"');
  } finally {
    process.exit(0);
  }
}

checkAdminUsers();
