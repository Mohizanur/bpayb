// Simple health check test script
import { createServer } from 'http';

const testServer = createServer((req, res) => {
  const url = req.url;
  
  // Health check endpoint
  if (url === '/health' || url === '/health/' || url === '/') {
    try {
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        phoneVerification: 'enabled',
        botStatus: 'running',
        server: 'birrpay-bot',
        endpoints: {
          health: '/health',
          status: '/status',
          panel: '/panel'
        }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthStatus));
      console.log('✅ Health check passed');
    } catch (error) {
      console.error('❌ Health check error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString(),
        server: 'birrpay-bot'
      }));
    }
    return;
  }

  // Simple status endpoint
  if (url === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BirrPay Bot - Health Test</title>
    </head>
    <body>
        <h1>🚀 BirrPay Bot Health Test</h1>
        <p>Server is running!</p>
        <p><a href="/health">Health Check</a></p>
        <p><a href="/status">Status</a></p>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
testServer.listen(PORT, () => {
  console.log(`🚀 Test server listening on port ${PORT}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`📊 Status: http://localhost:${PORT}/status`);
});





