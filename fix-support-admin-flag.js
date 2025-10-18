/**
 * Fix admin flag for @birrpaysupportline
 */

import { firestore } from './src/utils/firestore.js';

async function fixAdminFlag() {
  try {
    console.log('🔧 Fixing admin flag for @birrpaysupportline...\n');
    
    // Find user
    const usersSnapshot = await firestore.collection('users')
      .where('username', '==', 'birrpaysupportline')
      .get();
    
    if (usersSnapshot.empty) {
      console.log('❌ User not found');
      return;
    }
    
    const userDoc = usersSnapshot.docs[0];
    const userId = userDoc.id;
    
    // Update user with admin flag
    await firestore.collection('users').doc(userId).update({
      isAdmin: true,
      adminSince: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Updated user profile with admin flag');
    
    // Verify the update
    const updatedDoc = await firestore.collection('users').doc(userId).get();
    const updatedData = updatedDoc.data();
    
    console.log('\n📊 VERIFICATION:');
    console.log(`   Username: @${updatedData.username}`);
    console.log(`   Telegram ID: ${updatedData.telegramId}`);
    console.log(`   Is Admin: ${updatedData.isAdmin ? '✅ YES' : '❌ NO'}`);
    console.log(`   Admin Since: ${updatedData.adminSince}`);
    
    console.log('\n🎯 STATUS: Admin access is now fully configured!');
    console.log('   The bot will recognize this user as admin after:');
    console.log('   ✅ Bot restart (immediate effect)');
    console.log('   ✅ OR within 1 hour (auto cache refresh)');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminFlag();

