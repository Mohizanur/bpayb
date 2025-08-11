// Fallback logger if the logger module is not available
const fallbackLogger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => process.env.NODE_ENV === 'development' && console.debug('[DEBUG]', ...args)
};

// Try to import the logger, use fallback if not available
let logger = fallbackLogger;

async function initLogger() {
  try {
    const loggerModule = await import('./logger.js');
    logger = loggerModule.logger || fallbackLogger;
  } catch (e) {
    logger = fallbackLogger;
    logger.warn('Using fallback logger. Could not import logger.js:', e.message);
  }
}

// Initialize logger asynchronously
initLogger();

// Import fetch
import nodeFetch from 'node-fetch';
const fetch = nodeFetch.default || nodeFetch;

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (less than 15min timeout)
// Use public URL in production, localhost in development
const PING_URL = process.env.SELF_PING_URL || 
  (process.env.NODE_ENV === 'production' 
    ? (process.env.WEB_APP_URL || process.env.RENDER_EXTERNAL_URL || `https://${process.env.RENDER_SERVICE_NAME || 'bpayb'}.onrender.com`)
    : `http://localhost:${process.env.PORT || 10000}`);

class KeepAlive {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
  }

  async ping() {
    try {
      const response = await fetch(`${PING_URL}/api/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      logger.info('Keep-alive ping successful');
    } catch (error) {
      logger.error('Keep-alive ping failed:', error.message);
      // Attempt to restart the server if ping fails
      if (process.env.NODE_ENV === 'production') {
        process.exit(1); // Let PM2 handle the restart
      }
    }
  }

  start() {
    if (this.isRunning) return;
    
    logger.info('Starting keep-alive service...');
    this.isRunning = true;
    
    // Initial ping
    this.ping();
    
    // Schedule regular pings
    this.intervalId = setInterval(() => {
      this.ping();
    }, PING_INTERVAL);
    
    // Handle process termination
    process.on('SIGINT', this.cleanup.bind(this));
    process.on('SIGTERM', this.cleanup.bind(this));
  }

  stop() {
    this.cleanup();
  }

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Keep-alive service stopped');
  }
}

const keepAlive = new KeepAlive();
export default keepAlive;
