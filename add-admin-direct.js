/**
 * ✅ ZERO-READ ADMIN MANAGEMENT
 * 
 * This script directly updates the admin list without any database reads.
 * Perfect for adding admins when you already know their Telegram ID.
 * 
 * Cost: 0 reads + 1 write (optimal!)
 * 
 * USAGE:
 * 1. Edit ADMIN_IDS array below
 * 2. Run: node add-admin-direct.js
 * 3. Done!
 */

import { firestore } from './src/utils/firestore.js';

// ========================================
// CONFIGURATION - EDIT THIS
// ========================================

const ADMIN_IDS = [
  '5186537254',    // Main admin (you)
  '7302012664',    // @birrpaysupportline (Support)
  '1002016471',    // Admin 3
  '1311279699',    // Admin 4
  // Add more IDs here as needed
];

// ========================================
// EXECUTION - DO NOT EDIT
// ========================================

async function updateAdminList() {
  try {
    console.log('🚀 Updating admin list...\n');
    console.log(`📋 Admin IDs to configure: ${ADMIN_IDS.length}`);
    ADMIN_IDS.forEach((id, index) => {
      console.log(`   ${index + 1}. ${id}`);
    });
    
    // Direct update - ZERO reads, only 1 write!
    await firestore.collection('config').doc('admins').set(
      { userIds: ADMIN_IDS },
      { merge: true }
    );
    
    console.log('\n✅ Admin list updated successfully!');
    console.log('📊 Database cost: 0 reads + 1 write');
    console.log('\n🔄 Changes will take effect:');
    console.log('   ✅ Immediately after bot restart');
    console.log('   ✅ OR within 1 hour (auto cache refresh)');
    
    console.log('\n📝 Next steps:');
    console.log('   1. Restart bot (recommended for immediate effect)');
    console.log('   2. Have admins test /admin command');
    console.log('   3. If not working, check user profile has isAdmin flag');
    
  } catch (error) {
    console.error('❌ Error updating admin list:', error);
  } finally {
    process.exit(0);
  }
}

updateAdminList();

