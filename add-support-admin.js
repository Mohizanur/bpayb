/**
 * Script to add @birrpaysupportline as admin
 */

import { firestore } from './src/utils/firestore.js';

async function addSupportAsAdmin() {
  try {
    console.log('🔍 Searching for @birrpaysupportline...');
    
    // Search for user by username
    const usersSnapshot = await firestore.collection('users')
      .where('username', '==', 'birrpaysupportline')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User @birrpaysupportline not found in database');
      console.log('⚠️  The user must start the bot first before being made admin!');
      
      // List all users to help find the right one
      console.log('\n📋 Listing all users with usernames:');
      const allUsers = await firestore.collection('users').limit(50).get();
      allUsers.docs.forEach(doc => {
        const data = doc.data();
        if (data.username) {
          console.log(`  - @${data.username} (ID: ${doc.id})`);
        }
      });
      
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userData.telegramId || userDoc.id;
    
    console.log(`✅ Found user: @${userData.username}`);
    console.log(`   Name: ${userData.firstName || 'N/A'} ${userData.lastName || ''}`);
    console.log(`   Telegram ID: ${userId}`);
    
    // Get current admin list
    const adminDoc = await firestore.collection('config').doc('admins').get();
    const currentAdmins = adminDoc.exists ? (adminDoc.data().userIds || []) : [];
    
    // Check if already admin
    if (currentAdmins.includes(String(userId))) {
      console.log('ℹ️  User is already an admin!');
      return;
    }
    
    // Add to admin list
    const updatedAdmins = [...currentAdmins, String(userId)];
    await firestore.collection('config').doc('admins').set(
      { userIds: updatedAdmins },
      { merge: true }
    );
    
    console.log(`✅ Successfully added @${userData.username} as admin!`);
    console.log(`📊 Total admins: ${updatedAdmins.length}`);
    console.log(`👥 Admin list:`, updatedAdmins);
    
    // Also add admin role to user document
    await firestore.collection('users').doc(userDoc.id).update({
      isAdmin: true,
      adminSince: new Date().toISOString()
    });
    
    console.log('✅ Updated user profile with admin role');
    console.log('\n🔄 IMPORTANT: Bot will auto-refresh admin cache within 1 hour');
    console.log('   Or you can restart the bot for immediate effect');
    
  } catch (error) {
    console.error('❌ Error adding admin:', error);
  } finally {
    process.exit(0);
  }
}

addSupportAsAdmin();

