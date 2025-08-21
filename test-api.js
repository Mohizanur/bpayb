// Simple API test
import fetch from 'node-fetch';

async function testAPI() {
  try {
    console.log('Testing API endpoints...');
    
    // Test health
    const health = await fetch('http://localhost:3000/health');
    console.log('Health:', await health.json());
    
    // Test stats
    const stats = await fetch('http://localhost:3000/api/admin/stats');
    console.log('Stats:', await stats.json());
    
    // Test users
    const users = await fetch('http://localhost:3000/api/admin/users');
    console.log('Users:', await users.json());
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAPI();



