import fetch from 'node-fetch';

async function testLogin() {
    console.log('Testing admin login functionality...\n');
    
    try {
        // Test 1: Login with correct credentials
        console.log('Test 1: Login with correct credentials');
        const loginResponse = await fetch('http://localhost:8080/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const loginResult = await loginResponse.json();
        console.log('Login response status:', loginResponse.status);
        console.log('Login response:', loginResult);
        
        if (loginResult.success && loginResult.token) {
            console.log('✅ Login successful, token received\n');
            
            // Test 2: Use token to access protected endpoint
            console.log('Test 2: Access protected endpoint with token');
            const statsResponse = await fetch('http://localhost:8080/api/admin/stats', {
                method: 'GET',
                headers: {
                    'Authorization': 'Bearer ' + loginResult.token,
                    'Content-Type': 'application/json'
                }
            });
            
            const statsResult = await statsResponse.json();
            console.log('Stats response status:', statsResponse.status);
            console.log('Stats response:', statsResult);
            
            if (statsResponse.ok) {
                console.log('✅ Token validation successful\n');
            } else {
                console.log('❌ Token validation failed\n');
            }
        } else {
            console.log('❌ Login failed\n');
        }
        
        // Test 3: Login with wrong credentials
        console.log('Test 3: Login with wrong credentials');
        const wrongLoginResponse = await fetch('http://localhost:8080/api/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'admin',
                password: 'wrongpassword'
            })
        });
        
        const wrongLoginResult = await wrongLoginResponse.json();
        console.log('Wrong login response status:', wrongLoginResponse.status);
        console.log('Wrong login response:', wrongLoginResult);
        
        if (!wrongLoginResult.success) {
            console.log('✅ Wrong credentials properly rejected\n');
        } else {
            console.log('❌ Wrong credentials should have been rejected\n');
        }
        
    } catch (error) {
        console.error('Test failed with error:', error.message);
    }
}

// Run the test
testLogin();