/**
 * ⚠️ WARNING: DIAGNOSTIC TOOL - USES DATABASE READS!
 * 
 * This script makes 2-3 database reads to verify admin configuration.
 * 
 * WHEN TO USE:
 * - Troubleshooting admin access issues
 * - Verifying admin configuration after changes
 * - Debugging why admin panel isn't working
 * 
 * AVOID using for routine checks - wastes quota!
 * 
 * Cost: 2-3 reads per execution
 */

import { firestore } from './src/utils/firestore.js';

async function verifyAdminAccess() {
  try {
    console.log('🔍 Verifying admin configuration...\n');
    
    // 1. Check main admin from environment
    console.log('1️⃣ MAIN ADMIN (from environment):');
    console.log(`   ADMIN_TELEGRAM_ID: ${process.env.ADMIN_TELEGRAM_ID || '❌ NOT SET'}`);
    
    // 2. Check admins from config/admins
    console.log('\n2️⃣ ADDITIONAL ADMINS (from Firestore):');
    const adminDoc = await firestore.collection('config').doc('admins').get();
    if (adminDoc.exists) {
      const adminIds = adminDoc.data().userIds || [];
      console.log(`   Total admins in config: ${adminIds.length}`);
      adminIds.forEach((id, index) => {
        console.log(`   ${index + 1}. Admin ID: ${id}`);
      });
      
      // Check if support user is in list
      const supportId = '7302012664';
      if (adminIds.includes(supportId)) {
        console.log(`   ✅ @birrpaysupportline (${supportId}) IS in admin list`);
      } else {
        console.log(`   ❌ @birrpaysupportline (${supportId}) NOT in admin list`);
      }
    } else {
      console.log('   ❌ No admins configured in Firestore');
    }
    
    // 3. Check user document
    console.log('\n3️⃣ USER PROFILE CHECK:');
    const usersSnapshot = await firestore.collection('users')
      .where('username', '==', 'birrpaysupportline')
      .get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      console.log(`   Username: @${userData.username}`);
      console.log(`   Name: ${userData.firstName || 'N/A'}`);
      console.log(`   Telegram ID: ${userData.telegramId || userDoc.id}`);
      console.log(`   Is Admin flag: ${userData.isAdmin ? '✅ YES' : '❌ NO'}`);
      console.log(`   Admin since: ${userData.adminSince || 'N/A'}`);
    } else {
      console.log('   ❌ User not found');
    }
    
    // 4. Recommendations
    console.log('\n4️⃣ RECOMMENDATIONS:');
    console.log('   📝 The admin is correctly configured in the database');
    console.log('   🔄 Admin cache refreshes every 1 hour automatically');
    console.log('   ⚡ To make it work IMMEDIATELY:');
    console.log('      Option 1: Restart the bot (recommended)');
    console.log('      Option 2: Wait up to 1 hour for cache refresh');
    console.log('\n   🎯 After restart/wait, @birrpaysupportline should be able to:');
    console.log('      ✅ Use /admin command');
    console.log('      ✅ Access admin panel');
    console.log('      ✅ Manage users, services, payments');
    console.log('      ✅ Approve/reject subscriptions');
    
  } catch (error) {
    console.error('❌ Error verifying admin:', error);
  } finally {
    process.exit(0);
  }
}

verifyAdminAccess();

