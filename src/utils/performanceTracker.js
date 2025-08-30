// Performance Tracker for AGGRESSIVE BEAST MODE
// Monitors cache hit rates, response times, and quota usage

import { FirestoreOptimizer } from './firestoreOptimizer.js';

class PerformanceTracker {
  constructor() {
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      responseTimes: [],
      quotaUsage: {
        reads: 0,
        writes: 0,
        deletes: 0
      },
      errors: 0
    };
    
    this.performanceMode = process.env.PERFORMANCE_MODE === 'true';
  }

  // Track request performance
  trackRequest(operation, duration, cacheHit = false) {
    this.metrics.requests++;
    this.metrics.responseTimes.push(duration);
    
    if (cacheHit) {
      this.metrics.cacheHits++;
    } else {
      this.metrics.cacheMisses++;
    }
    
    // Keep only last 1000 response times
    if (this.metrics.responseTimes.length > 1000) {
      this.metrics.responseTimes.shift();
    }
  }

  // Track quota usage
  trackQuotaUsage(operation, count = 1) {
    if (this.metrics.quotaUsage[operation] !== undefined) {
      this.metrics.quotaUsage[operation] += count;
    }
  }

  // Track errors
  trackError() {
    this.metrics.errors++;
  }

  // Get performance statistics
  getStats() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.responseTimes.length > 0 
      ? this.metrics.responseTimes.reduce((a, b) => a + b, 0) / this.metrics.responseTimes.length 
      : 0;
    
    const totalRequests = this.metrics.cacheHits + this.metrics.cacheMisses;
    const cacheHitRate = totalRequests > 0 
      ? (this.metrics.cacheHits / totalRequests * 100).toFixed(2) 
      : '0.00';
    
    const requestsPerMinute = (this.metrics.requests / (uptime / 60000)).toFixed(2);
    
    return {
      uptime: Math.floor(uptime / 1000),
      requests: this.metrics.requests,
      cacheHitRate: cacheHitRate + '%',
      avgResponseTime: avgResponseTime.toFixed(2) + 'ms',
      requestsPerMinute,
      quotaUsage: this.metrics.quotaUsage,
      errors: this.metrics.errors,
      cacheStats: FirestoreOptimizer.getCacheStats()
    };
  }

  // Get performance summary for admin
  getPerformanceSummary() {
    const stats = this.getStats();
    const cacheStats = stats.cacheStats;
    
    return `🚀 **AGGRESSIVE BEAST MODE PERFORMANCE**

📊 **Cache Performance:**
• Hit Rate: ${stats.cacheHitRate}
• Cache Size: ${cacheStats.size} items
• Hits: ${cacheStats.hits}
• Misses: ${cacheStats.misses}
• Batch Queue: ${cacheStats.batchQueue || 0}

⚡ **Response Times:**
• Average: ${stats.avgResponseTime}
• Requests/min: ${stats.requestsPerMinute}
• Total Requests: ${stats.requests}

🔥 **Quota Usage:**
• Reads: ${stats.quotaUsage.reads}
• Writes: ${stats.quotaUsage.writes}
• Deletes: ${stats.quotaUsage.deletes}

⏱️ **Uptime:** ${Math.floor(stats.uptime / 60)} minutes
❌ **Errors:** ${stats.errors}`;
  }

  // Log performance (only if not in performance mode)
  logPerformance() {
    if (!this.performanceMode) {
      const stats = this.getStats();
      console.log('🚀 Performance Stats:', {
        cacheHitRate: stats.cacheHitRate,
        avgResponseTime: stats.avgResponseTime,
        requestsPerMinute: stats.requestsPerMinute,
        quotaUsage: stats.quotaUsage
      });
    }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      startTime: Date.now(),
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      responseTimes: [],
      quotaUsage: {
        reads: 0,
        writes: 0,
        deletes: 0
      },
      errors: 0
    };
  }
}

const performanceTracker = new PerformanceTracker();

// Export tracking functions
export const trackRequest = (operation, duration, cacheHit) => {
  performanceTracker.trackRequest(operation, duration, cacheHit);
};

export const trackQuotaUsage = (operation, count) => {
  performanceTracker.trackQuotaUsage(operation, count);
};

export const trackError = () => {
  performanceTracker.trackError();
};

export const getPerformanceStats = () => {
  return performanceTracker.getStats();
};

export const getPerformanceSummary = () => {
  return performanceTracker.getPerformanceSummary();
};

export const logPerformance = () => {
  performanceTracker.logPerformance();
};

// Auto-log performance every 5 minutes
setInterval(() => {
  performanceTracker.logPerformance();
}, 5 * 60 * 1000);

export { performanceTracker };
