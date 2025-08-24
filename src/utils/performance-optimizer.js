// High-Performance Optimization System for BirrPay Bot
// Handles thousands of concurrent requests with Firestore quota management

import { firestore } from './firestore.js';

class PerformanceOptimizer {
  constructor() {
    this.requestQueue = new Map();
    this.cache = new Map();
    this.rateLimiters = new Map();
    this.batchOperations = new Map();
    this.performanceMetrics = {
      requestsPerSecond: 0,
      cacheHitRate: 0,
      firestoreReads: 0,
      firestoreWrites: 0,
      averageResponseTime: 0
    };
    
    // Firestore quota management
    this.quotaLimits = {
      readsPerSecond: 1000,
      writesPerSecond: 500,
      readsPerDay: 50000,
      writesPerDay: 20000
    };
    
    this.currentUsage = {
      readsThisSecond: 0,
      writesThisSecond: 0,
      readsToday: 0,
      writesToday: 0,
      lastReset: Date.now()
    };
    
    // Initialize performance monitoring
    this.startPerformanceMonitoring();
    this.startQuotaManagement();
  }

  // Request Queue Management
  async queueRequest(requestId, operation, priority = 'normal') {
    const request = {
      id: requestId,
      operation,
      priority,
      timestamp: Date.now(),
      status: 'queued'
    };

    this.requestQueue.set(requestId, request);
    
    // Process based on priority
    if (priority === 'high') {
      return this.processRequest(request);
    } else {
      // Batch normal priority requests
      this.batchOperations.set(requestId, request);
      return this.processBatch();
    }
  }

  // Intelligent Caching System
  async getCachedData(key, ttl = 300000) { // 5 minutes default TTL
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      this.performanceMetrics.cacheHitRate++;
      return cached.data;
    }
    
    return null;
  }

  async setCachedData(key, data, ttl = 300000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    // Cleanup expired cache entries
    this.cleanupCache();
  }

  // Firestore Quota Management
  async checkQuota(operationType) {
    const now = Date.now();
    
    // Reset counters if needed
    if (now - this.currentUsage.lastReset > 1000) {
      this.currentUsage.readsThisSecond = 0;
      this.currentUsage.writesThisSecond = 0;
      this.currentUsage.lastReset = now;
    }
    
    if (now - this.currentUsage.lastReset > 86400000) { // 24 hours
      this.currentUsage.readsToday = 0;
      this.currentUsage.writesToday = 0;
    }
    
    // Check limits
    if (operationType === 'read') {
      if (this.currentUsage.readsThisSecond >= this.quotaLimits.readsPerSecond ||
          this.currentUsage.readsToday >= this.quotaLimits.readsPerDay) {
        throw new Error('Firestore read quota exceeded');
      }
      this.currentUsage.readsThisSecond++;
      this.currentUsage.readsToday++;
      this.performanceMetrics.firestoreReads++;
    } else if (operationType === 'write') {
      if (this.currentUsage.writesThisSecond >= this.quotaLimits.writesPerSecond ||
          this.currentUsage.writesToday >= this.quotaLimits.writesPerDay) {
        throw new Error('Firestore write quota exceeded');
      }
      this.currentUsage.writesThisSecond++;
      this.currentUsage.writesToday++;
      this.performanceMetrics.firestoreWrites++;
    }
  }

  // Batch Operations for Efficiency
  async processBatch() {
    const batch = firestore.batch();
    const batchSize = 500; // Firestore batch limit
    const operations = Array.from(this.batchOperations.values()).slice(0, batchSize);
    
    for (const operation of operations) {
      try {
        await this.checkQuota(operation.operation.type);
        // Add to batch
        batch[operation.operation.method](operation.operation.ref, operation.operation.data);
        this.batchOperations.delete(operation.id);
      } catch (error) {
        console.error(`Batch operation failed for ${operation.id}:`, error);
      }
    }
    
    if (operations.length > 0) {
      await batch.commit();
    }
  }

  // Rate Limiting per User
  isRateLimited(userId, operation, limit = 10, window = 60000) { // 10 requests per minute
    const key = `${userId}_${operation}`;
    const now = Date.now();
    
    if (!this.rateLimiters.has(key)) {
      this.rateLimiters.set(key, []);
    }
    
    const requests = this.rateLimiters.get(key);
    const validRequests = requests.filter(time => now - time < window);
    
    if (validRequests.length >= limit) {
      return true;
    }
    
    validRequests.push(now);
    this.rateLimiters.set(key, validRequests);
    return false;
  }

  // Optimized Database Operations
  async optimizedGet(collection, docId, useCache = true) {
    const cacheKey = `${collection}_${docId}`;
    
    if (useCache) {
      const cached = await this.getCachedData(cacheKey);
      if (cached) return cached;
    }
    
    await this.checkQuota('read');
    const doc = await firestore.collection(collection).doc(docId).get();
    
    if (useCache && doc.exists) {
      await this.setCachedData(cacheKey, doc.data());
    }
    
    return doc.exists ? doc.data() : null;
  }

  async optimizedSet(collection, docId, data, useCache = true) {
    await this.checkQuota('write');
    
    const ref = firestore.collection(collection).doc(docId);
    await ref.set(data);
    
    if (useCache) {
      const cacheKey = `${collection}_${docId}`;
      await this.setCachedData(cacheKey, data);
    }
    
    return ref;
  }

  // Performance Monitoring
  startPerformanceMonitoring() {
    setInterval(() => {
      const now = Date.now();
      this.performanceMetrics.requestsPerSecond = this.requestQueue.size;
      
      // Calculate cache hit rate
      const totalRequests = this.performanceMetrics.firestoreReads + this.performanceMetrics.cacheHitRate;
      this.performanceMetrics.cacheHitRate = totalRequests > 0 ? 
        (this.performanceMetrics.cacheHitRate / totalRequests) * 100 : 0;
      
      console.log('📊 Performance Metrics:', {
        requestsPerSecond: this.performanceMetrics.requestsPerSecond,
        cacheHitRate: `${this.performanceMetrics.cacheHitRate.toFixed(2)}%`,
        firestoreReads: this.performanceMetrics.firestoreReads,
        firestoreWrites: this.performanceMetrics.firestoreWrites,
        quotaUsage: {
          readsPerSecond: this.currentUsage.readsThisSecond,
          writesPerSecond: this.currentUsage.writesThisSecond,
          readsToday: this.currentUsage.readsToday,
          writesToday: this.currentUsage.writesToday
        }
      });
    }, 5000); // Log every 5 seconds
  }

  startQuotaManagement() {
    setInterval(() => {
      // Reset per-second counters
      this.currentUsage.readsThisSecond = 0;
      this.currentUsage.writesThisSecond = 0;
      this.currentUsage.lastReset = Date.now();
    }, 1000);
  }

  // Cache Cleanup
  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // Get Performance Stats
  getPerformanceStats() {
    return {
      ...this.performanceMetrics,
      quotaUsage: this.currentUsage,
      queueSize: this.requestQueue.size,
      cacheSize: this.cache.size,
      batchSize: this.batchOperations.size
    };
  }
}

// Singleton instance
const performanceOptimizer = new PerformanceOptimizer();

export default performanceOptimizer;
