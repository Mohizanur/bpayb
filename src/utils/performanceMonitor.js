// Performance monitoring system for BirrPay Bot
// Tracks efficiency, Firestore usage, and provides optimization insights

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      firestore: { reads: 0, writes: 0, deletes: 0, estimatedCost: 0 },
      responseTime: { total: 0, count: 0, average: 0, min: Infinity, max: 0 },
      memory: { usage: 0, peak: 0 },
      errors: { total: 0, byType: new Map() },
      startTime: Date.now()
    };
    this.activeRequests = new Map();
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      this.updateMemoryUsage();
      this.logMetrics();
    }, 5 * 60 * 1000);
    console.log('📊 Performance monitoring started');
  }

  trackRequestStart(requestId, type) {
    this.metrics.requests.total++;
    this.activeRequests.set(requestId, { type, startTime: Date.now() });
  }

  trackRequestEnd(requestId, success = true, cached = false) {
    const request = this.activeRequests.get(requestId);
    if (!request) return;

    const duration = Date.now() - request.startTime;
    this.metrics.responseTime.total += duration;
    this.metrics.responseTime.count++;
    this.metrics.responseTime.average = this.metrics.responseTime.total / this.metrics.responseTime.count;
    this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, duration);
    this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, duration);

    if (success) this.metrics.requests.successful++;
    else this.metrics.requests.failed++;
    if (cached) this.metrics.requests.cached++;

    this.activeRequests.delete(requestId);
  }

  trackFirestoreOperation(type, count = 1) {
    const costs = { read: 0.0001, write: 0.00018, delete: 0.00018 };
    this.metrics.firestore[type + 's'] += count;
    this.metrics.firestore.estimatedCost += count * costs[type];
  }

  trackError(error, context = '') {
    this.metrics.errors.total++;
    const errorType = error.name || 'Unknown';
    const currentCount = this.metrics.errors.byType.get(errorType) || 0;
    this.metrics.errors.byType.set(errorType, currentCount + 1);
    console.error(`❌ Error tracked: ${errorType} in ${context}:`, error.message);
  }

  updateMemoryUsage() {
    if (global.gc) global.gc();
    const usage = process.memoryUsage();
    this.metrics.memory.usage = usage.heapUsed;
    this.metrics.memory.peak = Math.max(this.metrics.memory.peak, usage.heapUsed);
  }

  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    return {
      ...this.metrics,
      uptime: {
        milliseconds: uptime,
        seconds: Math.floor(uptime / 1000),
        minutes: Math.floor(uptime / 60000),
        hours: Math.floor(uptime / 3600000)
      },
      activeRequests: this.activeRequests.size,
      efficiency: {
        successRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.successful / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%',
        cacheHitRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.cached / this.metrics.requests.total * 100).toFixed(2) + '%' : '0%',
        averageResponseTime: this.metrics.responseTime.average.toFixed(2) + 'ms'
      },
      costAnalysis: {
        estimatedFirestoreCost: '$' + this.metrics.firestore.estimatedCost.toFixed(4),
        readsPerMinute: this.calculateRate(this.metrics.firestore.reads, uptime),
        writesPerMinute: this.calculateRate(this.metrics.firestore.writes, uptime)
      }
    };
  }

  calculateRate(total, uptimeMs) {
    const minutes = uptimeMs / 60000;
    return minutes > 0 ? (total / minutes).toFixed(2) : 0;
  }

  logMetrics() {
    const metrics = this.getMetrics();
    console.log('📊 Performance Metrics:', {
      uptime: `${metrics.uptime.hours}h ${metrics.uptime.minutes}m`,
      requests: {
        total: metrics.requests.total,
        successRate: metrics.efficiency.successRate,
        cacheHitRate: metrics.efficiency.cacheHitRate,
        avgResponseTime: metrics.efficiency.averageResponseTime
      },
      firestore: {
        reads: metrics.firestore.reads,
        writes: metrics.firestore.writes,
        estimatedCost: metrics.costAnalysis.estimatedFirestoreCost
      },
      memory: {
        usage: (metrics.memory.usage / 1024 / 1024).toFixed(2) + ' MB',
        peak: (metrics.memory.peak / 1024 / 1024).toFixed(2) + ' MB'
      },
      errors: metrics.errors.total
    });
  }

  getEfficiencyRecommendations() {
    const metrics = this.getMetrics();
    const recommendations = [];

    const cacheHitRate = parseFloat(metrics.efficiency.cacheHitRate);
    if (cacheHitRate < 50) {
      recommendations.push({
        type: 'cache',
        priority: 'high',
        message: 'Cache hit rate is low. Consider increasing cache TTL or implementing more aggressive caching.',
        impact: 'High - Reduces Firestore costs significantly'
      });
    }

    const avgResponseTime = parseFloat(metrics.efficiency.averageResponseTime);
    if (avgResponseTime > 1000) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Average response time is high. Consider optimizing database queries or implementing connection pooling.',
        impact: 'Medium - Improves user experience'
      });
    }

    const errorRate = metrics.errors.total / metrics.requests.total;
    if (errorRate > 0.05) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Error rate is high. Review error logs and implement better error handling.',
        impact: 'High - Affects user experience and reliability'
      });
    }

    const readsPerMinute = parseFloat(metrics.costAnalysis.readsPerMinute);
    if (readsPerMinute > 100) {
      recommendations.push({
        type: 'cost',
        priority: 'medium',
        message: 'High Firestore read rate. Consider implementing more aggressive caching or pagination.',
        impact: 'Medium - Reduces operational costs'
      });
    }

    return recommendations;
  }

  reset() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, cached: 0 },
      firestore: { reads: 0, writes: 0, deletes: 0, estimatedCost: 0 },
      responseTime: { total: 0, count: 0, average: 0, min: Infinity, max: 0 },
      memory: { usage: 0, peak: 0 },
      errors: { total: 0, byType: new Map() },
      startTime: Date.now()
    };
    this.activeRequests.clear();
    console.log('📊 Performance metrics reset');
  }
}

export const performanceMonitor = new PerformanceMonitor();
performanceMonitor.start();
export { PerformanceMonitor };
