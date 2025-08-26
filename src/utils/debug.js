// Performance-optimized debug utility
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

export const debug = {
  // Only for critical debugging - disabled in production
  log: (...args) => {
    if (DEBUG_MODE && LOG_LEVEL === 'debug') {
      console.log(...args);
    }
  },
  
  // Always log errors - critical for production
  error: (...args) => {
    console.error(...args);
  },
  
  // Log warnings - important for production
  warn: (...args) => {
    if (LOG_LEVEL !== 'error') {
      console.warn(...args);
    }
  },
  
  // Log important info - controlled by LOG_LEVEL
  info: (...args) => {
    if (LOG_LEVEL === 'info' || LOG_LEVEL === 'debug') {
      console.log(...args);
    }
  },
  
  // Performance-critical: Only log if explicitly enabled
  trace: (...args) => {
    if (DEBUG_MODE && LOG_LEVEL === 'debug') {
      console.log('🔍', ...args);
    }
  }
};
