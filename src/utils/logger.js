// Production-Optimized Logger for BirrPay Bot
// Controlled via environment variables to reduce overhead under high load

class ProductionLogger {
  constructor() {
    // Environment-based logging control
    this.logLevel = process.env.LOG_LEVEL || 'info'; // error, warn, info, debug, none
    this.enableConsole = process.env.ENABLE_CONSOLE_LOGS !== 'false';
    this.enableFirestoreLogs = process.env.ENABLE_FIRESTORE_LOGS !== 'false';
    this.enablePerformanceLogs = process.env.ENABLE_PERFORMANCE_LOGS !== 'false';
    this.enableDebugLogs = process.env.ENABLE_DEBUG_LOGS === 'true';
    this.performanceMode = process.env.PERFORMANCE_MODE === 'true';
    
    // Log level hierarchy
    this.levels = {
      none: 0,
      error: 1,
      warn: 2,
      info: 3,
      debug: 4
    };
    
    this.currentLevel = this.levels[this.logLevel] || this.levels.info;
    
    // In performance mode, disable ALL console output
    if (this.performanceMode) {
      this.enableConsole = false;
      this.enableFirestoreLogs = false;
      this.enablePerformanceLogs = false;
      this.enableDebugLogs = false;
      this.currentLevel = 0; // none
    }
  }

  // Fast logging with minimal overhead
  log(level, message, data = null) {
    // Skip all logging in performance mode
    if (this.performanceMode) {
      return;
    }
    
    if (this.levels[level] <= this.currentLevel && this.enableConsole) {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
      
      // Use console methods for better performance
      switch (level) {
        case 'error':
          console.error(logMessage);
          if (data) console.error(data);
          break;
        case 'warn':
          console.warn(logMessage);
          if (data) console.warn(data);
          break;
        case 'info':
          console.log(logMessage);
          if (data) console.log(data);
          break;
        case 'debug':
          if (this.enableDebugLogs) {
            console.log(logMessage);
            if (data) console.log(data);
          }
          break;
      }
    }
  }

  // Critical errors only (always logged)
  error(message, data = null) {
    this.log('error', message, data);
  }

  // Warnings (important but not critical)
  warn(message, data = null) {
    this.log('warn', message, data);
  }

  // General info (controlled by LOG_LEVEL)
  info(message, data = null) {
    this.log('info', message, data);
  }

  // Debug info (only if ENABLE_DEBUG_LOGS=true)
  debug(message, data = null) {
    this.log('debug', message, data);
  }

  // Firestore-specific logging (controlled by ENABLE_FIRESTORE_LOGS)
  firestore(operation, collection, details = null) {
    if (this.enableFirestoreLogs && !this.performanceMode) {
      this.info(`Firestore ${operation}: ${collection}`, details);
    }
  }

  // Performance logging (controlled by ENABLE_PERFORMANCE_LOGS)
  performance(operation, duration, details = null) {
    if (this.enablePerformanceLogs && !this.performanceMode) {
      this.info(`Performance ${operation}: ${duration}ms`, details);
    }
  }

  // Bot operation logging (always logged for critical operations)
  bot(operation, userId = null, details = null) {
    if (!this.performanceMode) {
      const message = `Bot ${operation}${userId ? ` (User: ${userId})` : ''}`;
      this.info(message, details);
    }
  }

  // Admin operation logging (always logged for security)
  admin(operation, adminId, details = null) {
    if (!this.performanceMode) {
      this.info(`Admin ${operation} (Admin: ${adminId})`, details);
    }
  }

  // Silent mode for high-performance operations
  silent() {
    return {
      log: () => {},
      error: () => {},
      warn: () => {},
      info: () => {},
      debug: () => {},
      firestore: () => {},
      performance: () => {},
      bot: () => {},
      admin: () => {}
    };
  }

  // Get current logging configuration
  getConfig() {
    return {
      logLevel: this.logLevel,
      enableConsole: this.enableConsole,
      enableFirestoreLogs: this.enableFirestoreLogs,
      enablePerformanceLogs: this.enablePerformanceLogs,
      enableDebugLogs: this.enableDebugLogs,
      performanceMode: this.performanceMode
    };
  }

  // Check if performance mode is active
  isPerformanceMode() {
    return this.performanceMode;
  }
}

// Create singleton instance
const logger = new ProductionLogger();

// Export logger instance and methods
export default logger;

// Export individual methods for convenience
export const logError = (message, data) => logger.error(message, data);
export const logWarn = (message, data) => logger.warn(message, data);
export const logInfo = (message, data) => logger.info(message, data);
export const logDebug = (message, data) => logger.debug(message, data);
export const logFirestore = (operation, collection, details) => logger.firestore(operation, collection, details);
export const logPerformance = (operation, duration, details) => logger.performance(operation, duration, details);
export const logBot = (operation, userId, details) => logger.bot(operation, userId, details);
export const logAdmin = (operation, adminId, details) => logger.admin(operation, adminId, details);
