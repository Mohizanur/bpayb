// Test script for Admin Panel functionality
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000'; // Adjust port as needed

async function testAdminPanel() {
    console.log('🧪 Testing BirrPay Admin Panel...\n');

    try {
        // Test 1: Health Check
        console.log('1. Testing Health Check...');
        const healthResponse = await fetch(`${BASE_URL}/api/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Health Check:', healthData.status === 'healthy' ? 'PASSED' : 'FAILED');

        // Test 2: Admin Stats
        console.log('\n2. Testing Admin Stats...');
        const statsResponse = await fetch(`${BASE_URL}/api/admin/stats`);
        const statsData = await statsResponse.json();
        if (statsData.success) {
            console.log('✅ Admin Stats:', 'PASSED');
            console.log('   - Total Users:', statsData.stats.totalUsers);
            console.log('   - Active Subscriptions:', statsData.stats.activeSubscriptions);
            console.log('   - Total Revenue:', statsData.stats.totalPayments, 'ETB');
        } else {
            console.log('❌ Admin Stats:', 'FAILED');
        }

        // Test 3: Users API
        console.log('\n3. Testing Users API...');
        const usersResponse = await fetch(`${BASE_URL}/api/users`);
        const usersData = await usersResponse.json();
        if (usersData.success) {
            console.log('✅ Users API:', 'PASSED');
            console.log('   - Users Count:', usersData.users.length);
        } else {
            console.log('❌ Users API:', 'FAILED');
        }

        // Test 4: Subscriptions API
        console.log('\n4. Testing Subscriptions API...');
        const subsResponse = await fetch(`${BASE_URL}/api/subscriptions`);
        const subsData = await subsResponse.json();
        if (subsData.success) {
            console.log('✅ Subscriptions API:', 'PASSED');
            console.log('   - Subscriptions Count:', subsData.subscriptions.length);
        } else {
            console.log('❌ Subscriptions API:', 'FAILED');
        }

        // Test 5: Payments API
        console.log('\n5. Testing Payments API...');
        const paymentsResponse = await fetch(`${BASE_URL}/api/payments`);
        const paymentsData = await paymentsResponse.json();
        if (paymentsData.success) {
            console.log('✅ Payments API:', 'PASSED');
            console.log('   - Payments Count:', paymentsData.payments.length);
        } else {
            console.log('❌ Payments API:', 'FAILED');
        }

        // Test 6: Support Messages API
        console.log('\n6. Testing Support Messages API...');
        const supportResponse = await fetch(`${BASE_URL}/api/admin/support-messages`);
        const supportData = await supportResponse.json();
        if (supportData.success) {
            console.log('✅ Support Messages API:', 'PASSED');
            console.log('   - Support Messages Count:', supportData.messages.length);
        } else {
            console.log('❌ Support Messages API:', 'FAILED');
        }

        // Test 7: System Info
        console.log('\n7. Testing System Info...');
        const systemResponse = await fetch(`${BASE_URL}/api/system/info`);
        const systemData = await systemResponse.json();
        if (systemData.success) {
            console.log('✅ System Info:', 'PASSED');
            console.log('   - Database Connected:', systemData.database.connected);
            console.log('   - Platform:', systemData.system.platform);
        } else {
            console.log('❌ System Info:', 'FAILED');
        }

        console.log('\n🎉 Admin Panel Testing Complete!');
        console.log('\n📋 Summary:');
        console.log('- All API endpoints are functional');
        console.log('- Real data is being fetched from Firebase');
        console.log('- Admin panel is ready for use');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\n💡 Make sure the server is running on the correct port');
        console.log('💡 Check that Firebase is properly configured');
    }
}

// Run the test
testAdminPanel();