// This script should be run in the Firebase Console's Cloud Shell
// or with proper Firebase Admin credentials

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin with the default app
const app = initializeApp();
const db = getFirestore(app);

async function checkAndCreateAdmin() {
  try {
    console.log('Checking for admin users...');
    
    // Check if any admin exists
    const snapshot = await db.collection('users')
      .where('isAdmin', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.log('No admin users found. Creating an admin user...');
      
      // Create an admin user (replace with actual admin user ID)
      const adminId = '5186537254'; // Replace with actual admin Telegram ID
      
      await db.collection('users').doc(adminId).set({
        telegramId: adminId,
        username: 'Monursefa2',
        firstName: 'U',
        lastName: 'Mi2',
        isAdmin: true,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      console.log('✅ Admin user created successfully');
    } else {
      console.log('Admin users found:');
      snapshot.forEach(doc => {
        console.log(`- ${doc.id}:`, doc.data());
      });
    }
  } catch (error) {
    console.error('Error checking/creating admin user:', error);
  } finally {
    process.exit(0);
  }
}

checkAndCreateAdmin();
