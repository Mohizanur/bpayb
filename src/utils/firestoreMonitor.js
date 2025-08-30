// Firestore Usage Monitor for BirrPay Bot
// Tracks database operations and prevents quota limits

import { FirestoreOptimizer, FirestoreCache } from './firestoreOptimizer.js';

class FirestoreMonitor {
  constructor() {
    this.usage = {
      reads: 0,
      writes: 0,
      deletes: 0,
      startTime: Date.now()
    };
    
    this.limits = {
      readsPerDay: 50000,      // Free tier: 50k reads/day
      writesPerDay: 20000,     // Free tier: 20k writes/day
      deletesPerDay: 20000     // Free tier: 20k deletes/day
    };
    
    this.alerts = {
      reads: 0.8,    // Alert at 80% of limit
      writes: 0.8,
      deletes: 0.8
    };
    
    this.hourlyStats = new Map();
    this.dailyStats = new Map();
  }

  // Track read operations
  trackRead(collection, operation = 'get') {
    this.usage.reads++;
    this.updateHourlyStats('reads');
    this.updateDailyStats('reads');
    this.checkLimits('reads');
    
    console.log(`📖 Firestore READ: ${collection}.${operation} (Total: ${this.usage.reads})`);
  }

  // Track write operations
  trackWrite(collection, operation = 'set') {
    this.usage.writes++;
    this.updateHourlyStats('writes');
    this.updateDailyStats('writes');
    this.checkLimits('writes');
    
    console.log(`✏️ Firestore WRITE: ${collection}.${operation} (Total: ${this.usage.writes})`);
  }

  // Track delete operations
  trackDelete(collection, operation = 'delete') {
    this.usage.deletes++;
    this.updateHourlyStats('deletes');
    this.updateDailyStats('deletes');
    this.checkLimits('deletes');
    
    console.log(`🗑️ Firestore DELETE: ${collection}.${operation} (Total: ${this.usage.deletes})`);
  }

  // Update hourly statistics
  updateHourlyStats(operation) {
    const hour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (!this.hourlyStats.has(hour)) {
      this.hourlyStats.set(hour, { reads: 0, writes: 0, deletes: 0 });
    }
    this.hourlyStats.get(hour)[operation]++;
  }

  // Update daily statistics
  updateDailyStats(operation) {
    const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    if (!this.dailyStats.has(day)) {
      this.dailyStats.set(day, { reads: 0, writes: 0, deletes: 0 });
    }
    this.dailyStats.get(day)[operation]++;
  }

  // Check if approaching limits
  checkLimits(operation) {
    const limit = this.limits[`${operation}sPerDay`];
    const current = this.usage[operation];
    const alertThreshold = limit * this.alerts[operation];
    
    if (current >= alertThreshold && current < limit) {
      console.warn(`⚠️ Firestore ${operation.toUpperCase()} approaching limit: ${current}/${limit} (${(current/limit*100).toFixed(1)}%)`);
    } else if (current >= limit) {
      console.error(`🚨 Firestore ${operation.toUpperCase()} limit reached: ${current}/${limit}`);
      this.handleLimitReached(operation);
    }
  }

  // Handle limit reached
  handleLimitReached(operation) {
    console.error(`🚨 CRITICAL: Firestore ${operation.toUpperCase()} daily limit reached!`);
    console.error(`📊 Current usage: ${this.usage[operation]}/${this.limits[`${operation}sPerDay`]}`);
    
    // Switch to read-only mode if reads are exhausted
    if (operation === 'reads') {
      console.warn('🔄 Switching to read-only mode - using cached data only');
      // Force cache-only mode
      this.enableCacheOnlyMode();
    }
  }

  // Enable cache-only mode
  enableCacheOnlyMode() {
    console.log('🔄 Enabling cache-only mode to prevent quota exhaustion');
    // This would be implemented in the optimizer
  }

  // Get current usage statistics
  getUsageStats() {
    const uptime = Date.now() - this.usage.startTime;
    const uptimeHours = uptime / (1000 * 60 * 60);
    
    return {
      current: {
        reads: this.usage.reads,
        writes: this.usage.writes,
        deletes: this.usage.deletes
      },
      limits: this.limits,
      percentages: {
        reads: (this.usage.reads / this.limits.readsPerDay * 100).toFixed(2) + '%',
        writes: (this.usage.writes / this.limits.writesPerDay * 100).toFixed(2) + '%',
        deletes: (this.usage.deletes / this.limits.deletesPerDay * 100).toFixed(2) + '%'
      },
      uptime: {
        hours: uptimeHours.toFixed(2),
        rate: {
          readsPerHour: (this.usage.reads / uptimeHours).toFixed(2),
          writesPerHour: (this.usage.writes / uptimeHours).toFixed(2),
          deletesPerHour: (this.usage.deletes / uptimeHours).toFixed(2)
        }
      },
      cache: FirestoreOptimizer.getCacheStats()
    };
  }

  // Get hourly breakdown
  getHourlyStats() {
    const stats = {};
    for (const [hour, data] of this.hourlyStats) {
      stats[hour] = data;
    }
    return stats;
  }

  // Get daily breakdown
  getDailyStats() {
    const stats = {};
    for (const [day, data] of this.dailyStats) {
      stats[day] = data;
    }
    return stats;
  }

  // Reset daily counters (call at midnight)
  resetDailyCounters() {
    this.usage.reads = 0;
    this.usage.writes = 0;
    this.usage.deletes = 0;
    console.log('🔄 Daily Firestore counters reset');
  }

  // Get quota status
  getQuotaStatus() {
    const stats = this.getUsageStats();
    const status = {
      healthy: true,
      warnings: [],
      critical: false
    };

    // Check each operation type
    ['reads', 'writes', 'deletes'].forEach(op => {
      const percentage = parseFloat(stats.percentages[op]);
      
      if (percentage >= 100) {
        status.critical = true;
        status.healthy = false;
        status.warnings.push(`${op.toUpperCase()} quota exceeded`);
      } else if (percentage >= 80) {
        status.warnings.push(`${op.toUpperCase()} approaching limit (${percentage}%)`);
      }
    });

    return status;
  }
}

// Create singleton instance
const firestoreMonitor = new FirestoreMonitor();

// Export monitoring functions
export const trackFirestoreRead = (collection, operation) => {
  firestoreMonitor.trackRead(collection, operation);
};

export const trackFirestoreWrite = (collection, operation) => {
  firestoreMonitor.trackWrite(collection, operation);
};

export const trackFirestoreDelete = (collection, operation) => {
  firestoreMonitor.trackDelete(collection, operation);
};

export const getFirestoreStats = () => {
  return firestoreMonitor.getUsageStats();
};

export const getQuotaStatus = () => {
  return firestoreMonitor.getQuotaStatus();
};

// Schedule daily reset at midnight
const scheduleDailyReset = () => {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  
  const timeUntilMidnight = midnight.getTime() - now.getTime();
  
  setTimeout(() => {
    firestoreMonitor.resetDailyCounters();
    // Schedule next reset
    scheduleDailyReset();
  }, timeUntilMidnight);
};

// Start monitoring
scheduleDailyReset();

export { firestoreMonitor };
