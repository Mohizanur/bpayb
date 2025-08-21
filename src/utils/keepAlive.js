import https from 'https';
import http from 'http';

class KeepAliveManager {
  constructor() {
    this.isRunning = false;
    this.interval = null;
    this.healthCheckUrl = process.env.HEALTH_CHECK_URL || 'http://localhost:3000/health';
    
    // Set keep-alive URL based on environment
    if (process.env.NODE_ENV === 'production') {
      this.keepAliveUrl = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL || 'https://bpayb.onrender.com';
    } else {
      this.keepAliveUrl = 'http://localhost:3000'; // Local development
    }
    
    this.intervalMs = 14 * 60 * 1000; // 14 minutes (Render timeout is 15 minutes)
  }

  start() {
    if (this.isRunning) return;
    
    const env = process.env.NODE_ENV || 'development';
    console.log(`🔄 Starting keep-alive system (${env} mode)...`);
    console.log(`📍 Health check URL: ${this.healthCheckUrl}`);
    console.log(`📍 Keep-alive URL: ${this.keepAliveUrl}`);
    this.isRunning = true;
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic keep-alive
    this.interval = setInterval(() => {
      this.performKeepAlive();
    }, this.intervalMs);
    
    // Also set up health check every 5 minutes
    setInterval(() => {
      this.performHealthCheck();
    }, 5 * 60 * 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    console.log('🛑 Keep-alive system stopped');
  }

  async performHealthCheck() {
    try {
      const response = await this.makeRequest(this.healthCheckUrl);
      if (response.status === 200) {
        console.log('✅ Health check passed');
      } else {
        console.warn('⚠️ Health check failed:', response.status);
      }
    } catch (error) {
      // Don't log errors in development if localhost is not accessible
      if (process.env.NODE_ENV === 'development' && error.message.includes('ECONNREFUSED')) {
        console.log('ℹ️ Health check skipped (local development)');
      } else {
        console.error('❌ Health check error:', error.message);
      }
    }
  }

  async performKeepAlive() {
    try {
      console.log('🔄 Performing keep-alive request...');
      const response = await this.makeRequest(this.keepAliveUrl);
      if (response.status === 200) {
        console.log('✅ Keep-alive successful');
      } else {
        console.warn('⚠️ Keep-alive failed:', response.status);
      }
    } catch (error) {
      // Don't log errors in development if localhost is not accessible
      if (process.env.NODE_ENV === 'development' && error.message.includes('ECONNREFUSED')) {
        console.log('ℹ️ Keep-alive skipped (local development)');
      } else {
        console.error('❌ Keep-alive error:', error.message);
      }
    }
  }

  makeRequest(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'BirrPay-Bot-KeepAlive/1.0'
        }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data
          });
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
    });
  }
}

export const keepAliveManager = new KeepAliveManager();
