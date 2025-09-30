// 🔥 BEAST MODE OPTIMIZER - ABSOLUTE MAXIMUM PERFORMANCE
// Target: 5,000 concurrent users, <5ms cache response, 24/7 immortal operation
// All bot features preserved, zero breaking changes

import { firestore } from "./firestore.js";
import { performanceMonitor } from "./performanceMonitor.js";

// BEAST MODE CONFIGURATION
const BEAST_CONFIG = {
  MAX_CONCURRENT_USERS: 5000,
  MAX_MEMORY_MB: 2048, // 2GB
  MEMORY_CLEANUP_THRESHOLD: 0.85, // 85%
  QUOTA_CHECK_INTERVAL: 60000, // 1 minute
  CACHE_CLEANUP_INTERVAL: 30000, // 30 seconds
  GC_INTERVAL: 300000, // 5 minutes
};

// QUOTA PROTECTION MODES
const QUOTA_MODES = {
  NORMAL: {
    name: "NORMAL",
    threshold: 0.7,
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    description: "Full functionality",
  },
  CONSERVATIVE: {
    name: "CONSERVATIVE",
    threshold: 0.8,
    cacheTTL: 10 * 60 * 1000, // 10 minutes
    description: "Reduced queries",
  },
  AGGRESSIVE: {
    name: "AGGRESSIVE",
    threshold: 0.9,
    cacheTTL: 30 * 60 * 1000, // 30 minutes
    description: "Minimal DB access",
  },
  EMERGENCY: {
    name: "EMERGENCY",
    threshold: 0.95,
    cacheTTL: 60 * 60 * 1000, // 1 hour
    description: "Cache-only responses",
  },
};

// 6-LAYER CACHING SYSTEM
class BeastModeCache {
  constructor() {
    // Layer 1: Instant Cache (ultra-fast, 1min TTL)
    this.instantCache = new Map();
    this.instantMaxSize = 1000;

    // Layer 2: User Cache (5min TTL)
    this.userCache = new Map();
    this.userMaxSize = 10000;

    // Layer 3: Company/Service Cache (10min TTL)
    this.serviceCache = new Map();
    this.serviceMaxSize = 5000;

    // Layer 4: Stats Cache (5min TTL)
    this.statsCache = new Map();
    this.statsMaxSize = 10000;

    // Layer 5: Session Cache (30min TTL)
    this.sessionCache = new Map();
    this.sessionMaxSize = 50000;

    // Layer 6: Rate Limit Cache (15min TTL)
    this.rateLimitCache = new Map();
    this.rateLimitMaxSize = 50000;

    // Access tracking for LRU
    this.accessTimes = new Map();

    // Statistics
    this.stats = {
      instantHits: 0,
      userHits: 0,
      serviceHits: 0,
      statsHits: 0,
      sessionHits: 0,
      rateLimitHits: 0,
      misses: 0,
      sets: 0,
      evictions: 0,
    };

    // Start automatic cleanup
    this.startAutomaticCleanup();
  }

  // Get from appropriate cache layer
  get(key, layer = "user") {
    const cacheMap = this.getCacheMap(layer);
    const item = cacheMap.get(key);

    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Check expiry
    if (Date.now() > item.expiry) {
      cacheMap.delete(key);
      this.accessTimes.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update stats and access time
    this.updateLayerStats(layer);
    this.accessTimes.set(key, Date.now());

    return item.data;
  }

  // Set in appropriate cache layer
  set(key, data, layer = "user", ttl = null) {
    const cacheMap = this.getCacheMap(layer);
    const maxSize = this.getMaxSize(layer);
    const defaultTTL = this.getDefaultTTL(layer);

    // Check size and evict if needed
    if (cacheMap.size >= maxSize) {
      this.evictLRU(layer);
    }

    const item = {
      data,
      expiry: Date.now() + (ttl || defaultTTL),
      layer,
      size: this.estimateSize(data),
    };

    cacheMap.set(key, item);
    this.accessTimes.set(key, Date.now());
    this.stats.sets++;
  }

  // Get cache map for layer
  getCacheMap(layer) {
    switch (layer) {
      case "instant":
        return this.instantCache;
      case "user":
        return this.userCache;
      case "service":
        return this.serviceCache;
      case "stats":
        return this.statsCache;
      case "session":
        return this.sessionCache;
      case "rateLimit":
        return this.rateLimitCache;
      default:
        return this.userCache;
    }
  }

  // Get max size for layer
  getMaxSize(layer) {
    switch (layer) {
      case "instant":
        return this.instantMaxSize;
      case "user":
        return this.userMaxSize;
      case "service":
        return this.serviceMaxSize;
      case "stats":
        return this.statsMaxSize;
      case "session":
        return this.sessionMaxSize;
      case "rateLimit":
        return this.rateLimitMaxSize;
      default:
        return this.userMaxSize;
    }
  }

  // Get default TTL for layer
  getDefaultTTL(layer) {
    switch (layer) {
      case "instant":
        return 60 * 1000; // 1 minute
      case "user":
        return 5 * 60 * 1000; // 5 minutes
      case "service":
        return 10 * 60 * 1000; // 10 minutes
      case "stats":
        return 5 * 60 * 1000; // 5 minutes
      case "session":
        return 30 * 60 * 1000; // 30 minutes
      case "rateLimit":
        return 15 * 60 * 1000; // 15 minutes
      default:
        return 5 * 60 * 1000;
    }
  }

  // Update layer-specific stats
  updateLayerStats(layer) {
    switch (layer) {
      case "instant":
        this.stats.instantHits++;
        break;
      case "user":
        this.stats.userHits++;
        break;
      case "service":
        this.stats.serviceHits++;
        break;
      case "stats":
        this.stats.statsHits++;
        break;
      case "session":
        this.stats.sessionHits++;
        break;
      case "rateLimit":
        this.stats.rateLimitHits++;
        break;
    }
  }

  // Evict oldest entry from layer
  evictLRU(layer) {
    const cacheMap = this.getCacheMap(layer);
    let oldest = null;
    let oldestTime = Infinity;

    for (const [key, item] of cacheMap.entries()) {
      if (item.layer === layer) {
        const accessTime = this.accessTimes.get(key) || 0;
        if (accessTime < oldestTime) {
          oldestTime = accessTime;
          oldest = key;
        }
      }
    }

    if (oldest) {
      cacheMap.delete(oldest);
      this.accessTimes.delete(oldest);
      this.stats.evictions++;
    }
  }

  // Estimate data size
  estimateSize(data) {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000;
    }
  }

  // Automatic cleanup
  startAutomaticCleanup() {
    setInterval(() => {
      this.cleanupExpired();
    }, BEAST_CONFIG.CACHE_CLEANUP_INTERVAL);
  }

  // Cleanup expired entries
  cleanupExpired() {
    const now = Date.now();
    const layers = [
      this.instantCache,
      this.userCache,
      this.serviceCache,
      this.statsCache,
      this.sessionCache,
      this.rateLimitCache,
    ];

    let cleaned = 0;
    layers.forEach((cache) => {
      for (const [key, item] of cache.entries()) {
        if (now > item.expiry) {
          cache.delete(key);
          this.accessTimes.delete(key);
          cleaned++;
        }
      }
    });

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired cache entries`);
    }
  }

  // Get comprehensive stats
  getStats() {
    const totalHits =
      this.stats.instantHits +
      this.stats.userHits +
      this.stats.serviceHits +
      this.stats.statsHits +
      this.stats.sessionHits +
      this.stats.rateLimitHits;
    const totalRequests = totalHits + this.stats.misses;
    const hitRate =
      totalRequests > 0 ? ((totalHits / totalRequests) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: hitRate + "%",
      totalSize:
        this.instantCache.size +
        this.userCache.size +
        this.serviceCache.size +
        this.statsCache.size +
        this.sessionCache.size +
        this.rateLimitCache.size,
      layers: {
        instant: this.instantCache.size,
        user: this.userCache.size,
        service: this.serviceCache.size,
        stats: this.statsCache.size,
        session: this.sessionCache.size,
        rateLimit: this.rateLimitCache.size,
      },
    };
  }

  // Clear all caches
  clearAll() {
    this.instantCache.clear();
    this.userCache.clear();
    this.serviceCache.clear();
    this.statsCache.clear();
    this.sessionCache.clear();
    this.rateLimitCache.clear();
    this.accessTimes.clear();
  }
}

// QUOTA PROTECTION SYSTEM
class QuotaProtection {
  constructor() {
    this.currentMode = QUOTA_MODES.NORMAL;
    this.quotaUsage = {
      reads: 0,
      writes: 0,
      deletes: 0,
      lastReset: Date.now(),
    };
    this.limits = {
      reads: 50000,
      writes: 20000,
      deletes: 20000,
    };

    // Start monitoring
    this.startMonitoring();
  }

  // Track operation
  trackOperation(type) {
    this.quotaUsage[type]++;

    // Check if need to reset (daily)
    const now = Date.now();
    if (now - this.quotaUsage.lastReset > 24 * 60 * 60 * 1000) {
      this.resetQuota();
    }
  }

  // Get current usage percentage
  getUsagePercentage() {
    const readPercent = this.quotaUsage.reads / this.limits.reads;
    const writePercent = this.quotaUsage.writes / this.limits.writes;
    const deletePercent = this.quotaUsage.deletes / this.limits.deletes;

    return Math.max(readPercent, writePercent, deletePercent);
  }

  // Update mode based on usage
  updateMode() {
    const usage = this.getUsagePercentage();

    if (usage >= QUOTA_MODES.EMERGENCY.threshold) {
      this.currentMode = QUOTA_MODES.EMERGENCY;
    } else if (usage >= QUOTA_MODES.AGGRESSIVE.threshold) {
      this.currentMode = QUOTA_MODES.AGGRESSIVE;
    } else if (usage >= QUOTA_MODES.CONSERVATIVE.threshold) {
      this.currentMode = QUOTA_MODES.CONSERVATIVE;
    } else {
      this.currentMode = QUOTA_MODES.NORMAL;
    }
  }

  // Get current cache TTL
  getCacheTTL() {
    return this.currentMode.cacheTTL;
  }

  // Check if can proceed with operation
  canProceed(type) {
    const usage = this.getUsagePercentage();

    // In emergency mode, block all non-critical operations
    if (this.currentMode === QUOTA_MODES.EMERGENCY && type === "reads") {
      return usage < 0.98; // Only proceed if under 98%
    }

    return usage < 0.95; // Block at 95% for safety
  }

  // Reset quota
  resetQuota() {
    this.quotaUsage = {
      reads: 0,
      writes: 0,
      deletes: 0,
      lastReset: Date.now(),
    };
    console.log("✅ Daily quota reset");
  }

  // Start monitoring
  startMonitoring() {
    setInterval(() => {
      this.updateMode();
    }, BEAST_CONFIG.QUOTA_CHECK_INTERVAL);
  }

  // Get stats
  getStats() {
    return {
      mode: this.currentMode.name,
      description: this.currentMode.description,
      usage: (this.getUsagePercentage() * 100).toFixed(2) + "%",
      quota: this.quotaUsage,
      limits: this.limits,
      cacheTTL: this.currentMode.cacheTTL / 1000 + "s",
    };
  }
}

// MEMORY MANAGEMENT SYSTEM
class MemoryManager {
  constructor() {
    this.maxMemoryBytes = BEAST_CONFIG.MAX_MEMORY_MB * 1024 * 1024;
    this.cleanupThreshold =
      this.maxMemoryBytes * BEAST_CONFIG.MEMORY_CLEANUP_THRESHOLD;
    this.history = [];
    this.maxHistory = 100;

    // Start monitoring
    this.startMonitoring();
  }

  // Get current memory usage
  getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      rss: usage.rss,
      external: usage.external,
      percentage: (usage.heapUsed / this.maxMemoryBytes) * 100,
    };
  }

  // Check if cleanup needed
  needsCleanup() {
    const usage = this.getMemoryUsage();
    return usage.heapUsed > this.cleanupThreshold;
  }

  // Perform cleanup
  performCleanup() {
    console.log("🧹 Performing memory cleanup...");

    // Force garbage collection
    if (global.gc) {
      global.gc();
      global.gc(); // Double GC for aggressive cleanup
    }

    const afterUsage = this.getMemoryUsage();
    console.log(
      `✅ Cleanup complete. Memory: ${(afterUsage.heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
  }

  // Start monitoring
  startMonitoring() {
    // Check memory every 30 seconds
    setInterval(() => {
      const usage = this.getMemoryUsage();

      // Add to history
      this.history.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        percentage: usage.percentage,
      });

      // Trim history
      if (this.history.length > this.maxHistory) {
        this.history.shift();
      }

      // Cleanup if needed
      if (this.needsCleanup()) {
        this.performCleanup();
      }
    }, BEAST_CONFIG.CACHE_CLEANUP_INTERVAL);

    // Aggressive GC every 5 minutes
    setInterval(() => {
      if (global.gc) {
        global.gc();
      }
    }, BEAST_CONFIG.GC_INTERVAL);
  }

  // Get stats
  getStats() {
    const usage = this.getMemoryUsage();
    return {
      current: (usage.heapUsed / 1024 / 1024).toFixed(2) + "MB",
      total: (usage.heapTotal / 1024 / 1024).toFixed(2) + "MB",
      rss: (usage.rss / 1024 / 1024).toFixed(2) + "MB",
      percentage: usage.percentage.toFixed(2) + "%",
      threshold: (this.cleanupThreshold / 1024 / 1024).toFixed(2) + "MB",
      max: BEAST_CONFIG.MAX_MEMORY_MB + "MB",
    };
  }
}

// MAIN BEAST MODE OPTIMIZER
class BeastModeOptimizer {
  constructor() {
    this.cache = new BeastModeCache();
    this.quotaProtection = new QuotaProtection();
    this.memoryManager = new MemoryManager();

    // Statistics
    this.stats = {
      requests: 0,
      cacheHits: 0,
      dbHits: 0,
      errors: 0,
      startTime: Date.now(),
    };

    console.log("🔥 BEAST MODE OPTIMIZER ACTIVATED");
    console.log(
      `   Max Concurrent Users: ${BEAST_CONFIG.MAX_CONCURRENT_USERS}`
    );
    console.log(`   Max Memory: ${BEAST_CONFIG.MAX_MEMORY_MB}MB`);
    console.log(`   Cache Layers: 6`);
    console.log(`   Quota Protection: ENABLED`);
  }

  // Get data with beast mode optimization
  async getData(collection, docId, layer = "user") {
    const cacheKey = `${collection}_${docId}`;
    this.stats.requests++;

    // Try cache first
    const cached = this.cache.get(cacheKey, layer);
    if (cached) {
      this.stats.cacheHits++;
      return cached;
    }

    // Check quota before database hit
    if (!this.quotaProtection.canProceed("reads")) {
      console.warn("⚠️ Quota limit reached, returning null");
      return null;
    }

    // Fetch from database
    try {
      const doc = await firestore.collection(collection).doc(docId).get();
      const data = doc.exists ? doc.data() : null;

      // Track quota
      this.quotaProtection.trackOperation("reads");
      this.stats.dbHits++;

      // Cache the result
      if (data) {
        const ttl = this.quotaProtection.getCacheTTL();
        this.cache.set(cacheKey, data, layer, ttl);
      }

      return data;
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error fetching ${collection}/${docId}:`, error);
      return null;
    }
  }

  // Set data with beast mode optimization
  async setData(collection, docId, data, layer = "user") {
    const cacheKey = `${collection}_${docId}`;

    // Update cache immediately
    const ttl = this.quotaProtection.getCacheTTL();
    this.cache.set(cacheKey, data, layer, ttl);

    // Check quota before database write
    if (!this.quotaProtection.canProceed("writes")) {
      console.warn("⚠️ Quota limit reached, only cached");
      return { cached: true, written: false };
    }

    // Write to database
    try {
      await firestore
        .collection(collection)
        .doc(docId)
        .set(data, { merge: true });
      this.quotaProtection.trackOperation("writes");
      return { cached: true, written: true };
    } catch (error) {
      this.stats.errors++;
      console.error(`❌ Error writing ${collection}/${docId}:`, error);
      return { cached: true, written: false };
    }
  }

  // Get comprehensive stats
  getComprehensiveStats() {
    const totalRequests = this.stats.requests;
    const cacheHitRate =
      totalRequests > 0
        ? ((this.stats.cacheHits / totalRequests) * 100).toFixed(2)
        : 0;

    const uptime = Date.now() - this.stats.startTime;
    const uptimeHours = Math.floor(uptime / 3600000);
    const uptimeMinutes = Math.floor((uptime % 3600000) / 60000);

    return {
      performance: {
        totalRequests: this.stats.requests,
        cacheHits: this.stats.cacheHits,
        dbHits: this.stats.dbHits,
        errors: this.stats.errors,
        cacheHitRate: cacheHitRate + "%",
        uptime: `${uptimeHours}h ${uptimeMinutes}m`,
      },
      cache: this.cache.getStats(),
      quota: this.quotaProtection.getStats(),
      memory: this.memoryManager.getStats(),
      config: {
        maxConcurrent: BEAST_CONFIG.MAX_CONCURRENT_USERS,
        maxMemory: BEAST_CONFIG.MAX_MEMORY_MB + "MB",
        cacheLayers: 6,
      },
    };
  }

  // Emergency flush
  clearAllCaches() {
    this.cache.clearAll();
    console.log("🚨 All caches cleared");
  }
}

// Create singleton instance
const beastModeOptimizer = new BeastModeOptimizer();

export { beastModeOptimizer, BeastModeOptimizer, BEAST_CONFIG, QUOTA_MODES };
