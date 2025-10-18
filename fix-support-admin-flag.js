/**
 * ⚠️ WARNING: REPAIR TOOL - USES DATABASE READS!
 * 
 * This script makes 2 reads + 1 write to fix missing admin flags.
 * 
 * WHEN TO USE:
 * - Admin is in config/admins but can't access panel
 * - User profile missing isAdmin flag
 * - After database restoration/migration
 * 
 * PREFERRED METHOD (0 reads):
 * 1. Go to Firebase Console → Firestore
 * 2. Navigate to: users → {userId}
 * 3. Add field: isAdmin = true
 * 4. Save (costs only 1 write, 0 reads)
 * 
 * Cost: 2 reads + 1 write per execution
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

