// 🚀 ULTRA MAX PERFORMANCE OPTIMIZER
// Absolute maximum realistic performance for free tier
// Target: 2,000-3,000 concurrent users, 50-100ms responses, 24/7 stability

import { firestore } from "./firestore.js";
import { performanceMonitor } from "./performanceMonitor.js";

// REALISTIC CACHE TTL - Optimized for freshness + performance
const ULTRA_CACHE_TTL = {
  USERS: 15 * 60 * 1000, // 15 minutes - frequent enough for data freshness
  SERVICES: 60 * 60 * 1000, // 1 hour - services rarely change
  SUBSCRIPTIONS: 5 * 60 * 1000, // 5 minutes - active data needs freshness
  PAYMENTS: 5 * 60 * 1000, // 5 minutes - payment status
  STATS: 3 * 60 * 1000, // 3 minutes - admin needs relatively fresh data
  ADMIN_STATS: 5 * 60 * 1000, // 5 minutes
  USER_PAGES: 10 * 60 * 1000, // 10 minutes
  COLLECTION_COUNTS: 30 * 60 * 1000, // 30 minutes
  RESPONSES: 60 * 60 * 1000, // 1 hour - pre-computed responses
};

// Ultra-fast multi-layer cache system
class UltraCache {
  constructor() {
    // L1: Hot cache (instant access, 1000 most recent)
    this.l1Cache = new Map();
    this.l1MaxSize = 1000;

    // L2: Warm cache (fast access, 10000 items)
    this.l2Cache = new Map();
    this.l2MaxSize = 10000;

    // Access tracking for LRU
    this.accessTimes = new Map();

    // Statistics
    this.stats = {
      l1Hits: 0,
      l2Hits: 0,
      misses: 0,
      sets: 0,
    };

    // Cleanup every 60 seconds
    this.startCleanup();
  }

  get(key) {
    // L1: Check hot cache first
    const l1Item = this.l1Cache.get(key);
    if (l1Item && Date.now() < l1Item.expiry) {
      this.stats.l1Hits++;
      this.accessTimes.set(key, Date.now());
      return l1Item.data;
    }

    // L2: Check warm cache
    const l2Item = this.l2Cache.get(key);
    if (l2Item && Date.now() < l2Item.expiry) {
      this.stats.l2Hits++;
      this.accessTimes.set(key, Date.now());

      // Promote to L1 if frequently accessed
      this.promoteToL1(key, l2Item);

      return l2Item.data;
    }

    this.stats.misses++;
    return null;
  }

  set(key, data, ttl = 60000) {
    const item = {
      data,
      expiry: Date.now() + ttl,
      size: this.estimateSize(data),
    };

    // Always set in L2
    this.l2Cache.set(key, item);
    this.accessTimes.set(key, Date.now());
    this.stats.sets++;

    // Evict from L2 if too large
    if (this.l2Cache.size > this.l2MaxSize) {
      this.evictFromL2();
    }
  }

  promoteToL1(key, item) {
    this.l1Cache.set(key, item);

    // Evict from L1 if too large
    if (this.l1Cache.size > this.l1MaxSize) {
      this.evictFromL1();
    }
  }

  evictFromL1() {
    // Remove oldest entry
    const oldest = this.findOldestKey(this.l1Cache);
    if (oldest) {
      this.l1Cache.delete(oldest);
    }
  }

  evictFromL2() {
    // Remove oldest 10% of entries
    const toRemove = Math.ceil(this.l2MaxSize * 0.1);
    const entries = Array.from(this.accessTimes.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, toRemove);

    entries.forEach(([key]) => {
      this.l2Cache.delete(key);
      this.accessTimes.delete(key);
    });
  }

  findOldestKey(cache) {
    let oldest = null;
    let oldestTime = Infinity;

    for (const key of cache.keys()) {
      const time = this.accessTimes.get(key) || 0;
      if (time < oldestTime) {
        oldestTime = time;
        oldest = key;
      }
    }

    return oldest;
  }

  estimateSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000; // Default estimate
    }
  }

  startCleanup() {
    // DISABLED: This was causing excessive operations
    console.log('⚠️ Ultra max performance cleanup DISABLED (quota protection)');
    // setInterval(() => {
    //   const now = Date.now();
    //   // Clean L1, L2 caches...
    // }, 60000); // Every 60 seconds
  }

  getStats() {
    const total = this.stats.l1Hits + this.stats.l2Hits + this.stats.misses;
    const hitRate =
      total > 0
        ? (((this.stats.l1Hits + this.stats.l2Hits) / total) * 100).toFixed(2)
        : 0;

    return {
      l1Hits: this.stats.l1Hits,
      l2Hits: this.stats.l2Hits,
      misses: this.stats.misses,
      hitRate: hitRate + "%",
      l1Size: this.l1Cache.size,
      l2Size: this.l2Cache.size,
      totalSize: this.l1Cache.size + this.l2Cache.size,
    };
  }

  clear() {
    this.l1Cache.clear();
    this.l2Cache.clear();
    this.accessTimes.clear();
  }
}

// Smart batch processor with adaptive timing
class SmartBatcher {
  constructor() {
    this.writeQueue = [];
    this.readQueue = [];
    this.maxBatchSize = 100; // Firestore batch limit is 500, we use 100 for safety
    this.batchTimeout = 2000; // 2 seconds
    this.batchTimer = null;
    this.processing = false;
  }

  queueWrite(operation) {
    this.writeQueue.push({
      ...operation,
      timestamp: Date.now(),
    });

    // Process immediately if batch is large enough
    if (this.writeQueue.length >= this.maxBatchSize) {
      this.processWriteBatch();
    } else if (!this.batchTimer) {
      // Otherwise process after timeout
      this.batchTimer = setTimeout(
        () => this.processWriteBatch(),
        this.batchTimeout
      );
    }
  }

  async processWriteBatch() {
    if (this.processing || this.writeQueue.length === 0) return;

    this.processing = true;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const batch = this.writeQueue.splice(0, this.maxBatchSize);

      // Group by collection for efficiency
      const groups = {};
      batch.forEach((op) => {
        if (!groups[op.collection]) {
          groups[op.collection] = [];
        }
        groups[op.collection].push(op);
      });

      // Execute batches in parallel
      await Promise.all(
        Object.entries(groups).map(([collection, ops]) =>
          this.executeBatch(collection, ops)
        )
      );
    } catch (error) {
      console.error("❌ Batch processing error:", error);
    } finally {
      this.processing = false;

      // Process remaining items if any
      if (this.writeQueue.length > 0) {
        setTimeout(() => this.processWriteBatch(), 100);
      }
    }
  }

  async executeBatch(collection, operations) {
    try {
      const db = firestore;

      for (const op of operations) {
        const ref = db.collection(collection).doc(op.docId);

        if (op.type === "set") {
          await ref.set(op.data, { merge: true });
        } else if (op.type === "update") {
          await ref.update(op.data);
        } else if (op.type === "delete") {
          await ref.delete();
        }

        performanceMonitor.trackFirestoreOperation("write");
      }
    } catch (error) {
      console.error(`❌ Batch execution error for ${collection}:`, error);
      throw error;
    }
  }

  getStats() {
    return {
      writeQueueSize: this.writeQueue.length,
      readQueueSize: this.readQueue.length,
      processing: this.processing,
    };
  }
}

// Response pre-computation for instant replies
class ResponsePreComputer {
  constructor() {
    this.preComputed = new Map();
    this.initialize();
  }

  initialize() {
    // Pre-compute common bot responses
    const commonCommands = {
      start: { en: "welcome", am: "እንኳን ደህና መጡ" },
      help: { en: "help_text", am: "እርዳታ" },
      services: { en: "services_list", am: "አገልግሎቶች" },
      language: { en: "select_language", am: "ቋንቋ ይምረጡ" },
      support: { en: "support_text", am: "ድጋፍ" },
    };

    Object.entries(commonCommands).forEach(([cmd, translations]) => {
      this.preComputed.set(`response_${cmd}_en`, translations.en);
      this.preComputed.set(`response_${cmd}_am`, translations.am);
    });
  }

  get(command, language = "en") {
    return this.preComputed.get(`response_${command}_${language}`);
  }

  set(command, language, response) {
    this.preComputed.set(`response_${command}_${language}`, response);
  }
}

// Memory-efficient connection pool
class MemoryEfficientPool {
  constructor() {
    this.maxMemory = 400 * 1024 * 1024; // 400MB (80% of 512MB)
    this.cleanupInterval = 30000; // 30 seconds
    this.lastCleanup = Date.now();
    this.startMonitoring();
  }

  startMonitoring() {
    // DISABLED: This was causing excessive operations
    console.log('⚠️ Ultra max performance monitoring DISABLED (quota protection)');
    // setInterval(() => {
    //   const usage = process.memoryUsage();
    //   if (usage.heapUsed > this.maxMemory) {
    //     this.performCleanup();
    //   }
    // }, this.cleanupInterval);
  }

  performCleanup() {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    this.lastCleanup = Date.now();
  }

  getMemoryStats() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + "MB",
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + "MB",
      rss: Math.round(usage.rss / 1024 / 1024) + "MB",
      external: Math.round(usage.external / 1024 / 1024) + "MB",
      threshold: Math.round(this.maxMemory / 1024 / 1024) + "MB",
      percentage: Math.round((usage.heapUsed / this.maxMemory) * 100) + "%",
    };
  }
}

// Main Ultra Max Performance Optimizer
class UltraMaxPerformance {
  constructor() {
    this.cache = new UltraCache();
    this.batcher = new SmartBatcher();
    this.preComputer = new ResponsePreComputer();
    this.memoryPool = new MemoryEfficientPool();

    // Statistics
    this.stats = {
      requests: 0,
      cacheHits: 0,
      dbQueries: 0,
      avgResponseTime: 0,
      startTime: Date.now(),
    };
  }

  // Get data with ultra-fast caching
  async getData(collection, docId, ttl = ULTRA_CACHE_TTL.USERS) {
    const cacheKey = `${collection}_${docId}`;

    // Try cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    // Fetch from database
    try {
      const doc = await firestore.collection(collection).doc(docId).get();
      const data = doc.exists ? doc.data() : null;

      // Cache the result
      if (data) {
        this.cache.set(cacheKey, data, ttl);
      }

      this.stats.dbQueries++;
      performanceMonitor.trackFirestoreOperation("read");

      return data;
    } catch (error) {
      console.error(`❌ Error fetching ${collection}/${docId}:`, error);
      return null;
    }
  }

  // Set data with smart batching
  async setData(collection, docId, data) {
    const cacheKey = `${collection}_${docId}`;

    // Update cache immediately for instant response
    this.cache.set(cacheKey, data, ULTRA_CACHE_TTL.USERS);

    // Queue database write for batch processing
    this.batcher.queueWrite({
      collection,
      docId,
      data,
      type: "set",
    });

    return true;
  }

  // Update data with smart batching
  async updateData(collection, docId, updates) {
    const cacheKey = `${collection}_${docId}`;

    // Get current cached data
    const current = this.cache.get(cacheKey);
    if (current) {
      // Update cache immediately
      const updated = { ...current, ...updates };
      this.cache.set(cacheKey, updated, ULTRA_CACHE_TTL.USERS);
    }

    // Queue database update for batch processing
    this.batcher.queueWrite({
      collection,
      docId,
      data: updates,
      type: "update",
    });

    return true;
  }

  // Get pre-computed response
  getInstantResponse(command, language = "en") {
    return this.preComputer.get(command, language);
  }

  // Get comprehensive statistics
  getStats() {
    const cacheStats = this.cache.getStats();
    const batchStats = this.batcher.getStats();
    const memoryStats = this.memoryPool.getMemoryStats();

    const uptime = Date.now() - this.stats.startTime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);

    return {
      performance: {
        totalRequests: this.stats.requests,
        cacheHits: this.stats.cacheHits,
        dbQueries: this.stats.dbQueries,
        cacheHitRate:
          this.stats.requests > 0
            ? ((this.stats.cacheHits / this.stats.requests) * 100).toFixed(2) +
              "%"
            : "0%",
        avgResponseTime: this.stats.avgResponseTime.toFixed(2) + "ms",
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      },
      cache: cacheStats,
      batching: batchStats,
      memory: memoryStats,
    };
  }

  // Force flush all pending operations
  async flush() {
    await this.batcher.processWriteBatch();
  }

  // Clear all caches
  clearCache() {
    this.cache.clear();
  }
}

// Create singleton instance
const ultraMaxPerformance = new UltraMaxPerformance();

export { ultraMaxPerformance, UltraMaxPerformance, ULTRA_CACHE_TTL };
