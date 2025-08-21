// Test script to verify admin panel is working
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testAdminPanel() {
    console.log('🧪 Testing BirrPay Admin Panel...\n');

    try {
        // Test 1: Check if server is running
        console.log('1. Testing server health...');
        const healthResponse = await fetch(`${BASE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log('✅ Server is running:', healthData.status);
        console.log('   Environment:', healthData.env);
        console.log('   Node version:', healthData.node);

        // Test 2: Check admin panel routes
        console.log('\n2. Testing admin panel routes...');
        
        const adminRoutes = ['/admin', '/panel'];
        for (const route of adminRoutes) {
            try {
                const response = await fetch(`${BASE_URL}${route}`);
                if (response.ok) {
                    console.log(`✅ ${route} - Status: ${response.status}`);
                } else {
                    console.log(`❌ ${route} - Status: ${response.status}`);
                }
            } catch (error) {
                console.log(`❌ ${route} - Error: ${error.message}`);
            }
        }

        // Test 3: Check admin API endpoints
        console.log('\n3. Testing admin API endpoints...');
        
        // Test login endpoint (should work without auth)
        try {
            const loginResponse = await fetch(`${BASE_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123'
                })
            });
            
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                console.log('✅ Login endpoint working');
                console.log('   Response:', loginData.success ? 'Success' : 'Failed');
            } else {
                console.log('❌ Login endpoint failed:', loginResponse.status);
            }
        } catch (error) {
            console.log('❌ Login endpoint error:', error.message);
        }

        // Test stats endpoint (should require auth)
        try {
            const statsResponse = await fetch(`${BASE_URL}/api/admin/stats`);
            if (statsResponse.status === 401) {
                console.log('✅ Stats endpoint properly protected (requires auth)');
            } else {
                console.log('⚠️ Stats endpoint response:', statsResponse.status);
            }
        } catch (error) {
            console.log('❌ Stats endpoint error:', error.message);
        }

        console.log('\n🎉 Admin Panel Test Complete!');
        console.log('\n📋 Access URLs:');
        console.log(`   Main Admin: ${BASE_URL}/admin`);
        console.log(`   Alt Admin: ${BASE_URL}/panel`);
        console.log('\n🔑 Default Credentials:');
        console.log('   Username: admin');
        console.log('   Password: admin123');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
testAdminPanel();



