import { logger } from '../utils/logger.js';
import nodeFetch from 'node-fetch';

// Use node-fetch in Node.js, or window.fetch in the browser
const fetch = typeof window === 'undefined' ? nodeFetch : window.fetch.bind(window);

const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes (less than 15min timeout)
const PING_URL = process.env.SELF_PING_URL || 'http://localhost:3000';

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

export const keepAlive = new KeepAlive();
