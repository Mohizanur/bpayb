import fetch from 'node-fetch';

async function testWebhookEndpoint() {
  try {
    console.log('🔍 Testing webhook endpoint accessibility...');
    
    const webhookUrl = 'https://bpayb.onrender.com/webhook';
    const healthUrl = 'https://bpayb.onrender.com/health';
    
    // Test health endpoint first
    console.log('🏥 Testing health endpoint...');
    try {
      const healthResponse = await fetch(healthUrl);
      console.log('Health Status:', healthResponse.status);
      if (healthResponse.ok) {
        const healthData = await healthResponse.json();
        console.log('Health Data:', JSON.stringify(healthData, null, 2));
      }
    } catch (error) {
      console.log('❌ Health endpoint error:', error.message);
    }
    
    // Test webhook endpoint
    console.log('🔗 Testing webhook endpoint...');
    try {
      const webhookResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          update_id: 123456789,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              first_name: 'Test',
              username: 'testuser'
            },
            chat: {
              id: 123456789,
              type: 'private'
            },
            date: Math.floor(Date.now() / 1000),
            text: '/start'
          }
        })
      });
      
      console.log('Webhook Status:', webhookResponse.status);
      console.log('Webhook Headers:', Object.fromEntries(webhookResponse.headers.entries()));
      
      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.text();
        console.log('Webhook Response:', webhookData);
      }
    } catch (error) {
      console.log('❌ Webhook endpoint error:', error.message);
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook endpoint:', error);
  }
}

testWebhookEndpoint();
