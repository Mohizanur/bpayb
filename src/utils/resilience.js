import { firestore } from './firestore.js';

class ResilienceManager {
  constructor() {
    this.errorCount = 0;
    this.lastErrorTime = 0;
    this.recoveryMode = false;
    this.maxErrors = 10;
    this.errorWindow = 5 * 60 * 1000; // 5 minutes
    this.healthChecks = new Map();
  }

  // Track errors and implement circuit breaker pattern
  trackError(error, context = 'unknown') {
    const now = Date.now();
    
    // Reset error count if window has passed
    if (now - this.lastErrorTime > this.errorWindow) {
      this.errorCount = 0;
    }
    
    this.errorCount++;
    this.lastErrorTime = now;
    
    console.error(`❌ Error in ${context}:`, error.message);
    
    // Log error to Firestore for monitoring
    this.logError(error, context);
    
    // Enter recovery mode if too many errors
    if (this.errorCount >= this.maxErrors && !this.recoveryMode) {
      this.enterRecoveryMode();
    }
  }

  // Circuit breaker pattern
  async executeWithRetry(operation, maxRetries = 3, context = 'operation') {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.recoveryMode) {
          await this.waitForRecovery();
        }
        
        const result = await operation();
        this.trackSuccess(context);
        return result;
      } catch (error) {
        this.trackError(error, context);
        
        if (attempt === maxRetries) {
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`🔄 Retrying ${context} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await this.sleep(delay);
      }
    }
  }

  // Database operation with resilience
  async firestoreOperation(operation, context = 'firestore') {
    return this.executeWithRetry(async () => {
      try {
        return await operation();
      } catch (error) {
        // Handle specific Firestore errors
        if (error.code === 'unavailable') {
          throw new Error('Firestore temporarily unavailable');
        }
        if (error.code === 'permission-denied') {
          throw new Error('Firestore permission denied');
        }
        throw error;
      }
    }, 3, context);
  }

  // Health check system
  registerHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, {
      check: checkFunction,
      lastCheck: 0,
      status: 'unknown'
    });
  }

  async performHealthChecks() {
    const results = {};
    
    for (const [name, healthCheck] of this.healthChecks) {
      try {
        const startTime = Date.now();
        await healthCheck.check();
        const duration = Date.now() - startTime;
        
        healthCheck.status = 'healthy';
        healthCheck.lastCheck = Date.now();
        
        results[name] = {
          status: 'healthy',
          duration,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        healthCheck.status = 'unhealthy';
        healthCheck.lastCheck = Date.now();
        
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        this.trackError(error, `health-check-${name}`);
      }
    }
    
    return results;
  }

  // Recovery mode management
  enterRecoveryMode() {
    this.recoveryMode = true;
    console.warn('🚨 Entering recovery mode due to multiple errors');
    
    // Log recovery mode entry
    this.logRecoveryEvent('entered');
  }

  async waitForRecovery() {
    if (!this.recoveryMode) return;
    
    console.log('⏳ Waiting for system recovery...');
    await this.sleep(30000); // Wait 30 seconds
    
    // Check if system has stabilized
    const healthResults = await this.performHealthChecks();
    const healthyChecks = Object.values(healthResults).filter(r => r.status === 'healthy').length;
    
    if (healthyChecks > Object.keys(healthResults).length * 0.7) {
      this.exitRecoveryMode();
    }
  }

  exitRecoveryMode() {
    this.recoveryMode = false;
    this.errorCount = 0;
    console.log('✅ Exited recovery mode');
    
    // Log recovery mode exit
    this.logRecoveryEvent('exited');
  }

  trackSuccess(context) {
    if (this.errorCount > 0) {
      this.errorCount = Math.max(0, this.errorCount - 1);
    }
  }

  // Logging functions
  async logError(error, context) {
    try {
      await firestore.collection('errorLogs').add({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date(),
        errorCount: this.errorCount,
        recoveryMode: this.recoveryMode
      });
    } catch (logError) {
      console.error('Failed to log error:', logError.message);
    }
  }

  async logRecoveryEvent(event) {
    try {
      await firestore.collection('recoveryLogs').add({
        event,
        timestamp: new Date(),
        errorCount: this.errorCount,
        healthChecks: await this.performHealthChecks()
      });
    } catch (logError) {
      console.error('Failed to log recovery event:', logError.message);
    }
  }

  // Utility functions
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get system status
  getStatus() {
    return {
      errorCount: this.errorCount,
      recoveryMode: this.recoveryMode,
      lastErrorTime: this.lastErrorTime,
      healthChecks: Array.from(this.healthChecks.entries()).map(([name, check]) => ({
        name,
        status: check.status,
        lastCheck: check.lastCheck
      }))
    };
  }
}

export const resilienceManager = new ResilienceManager();
