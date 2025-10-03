// 🚀 FIRESTORE QUOTA MANAGER - Real-time Quota Management for Free Tier
// Intelligent quota management that maximizes Firestore free tier usage

import { performance } from 'perf_hooks';

class FirestoreQuotaManager {
  constructor() {
    this.isInitialized = false;
    
    // Firestore Free Tier Limits (REAL LIMITS)
    this.quotaLimits = {
      // Daily limits
      reads: 50000,      // 50K reads per day
      writes: 20000,     // 20K writes per day
      deletes: 20000,    // 20K deletes per day
      
      // Per-second limits
      readsPerSecond: 1000,   // 1K reads per second
      writesPerSecond: 500,   // 500 writes per second
      deletesPerSecond: 500,  // 500 deletes per second
      
      // Storage limit
      storageGB: 1,      // 1GB storage
      
      // Network egress
      networkGB: 10      // 10GB per month
    };
    
    // Current usage tracking
    this.currentUsage = {
      reads: 0,
      writes: 0,
      deletes: 0,
      readsPerSecond: 0,
      writesPerSecond: 0,
      deletesPerSecond: 0,
      storageUsed: 0,
      networkUsed: 0
    };
    
    // Real-time tracking
    this.realtimeCounters = {
      reads: [],
      writes: [],
      deletes: []
    };
    
    // Quota management settings
    this.settings = {
      enableQuotaManagement: true,
      enableRealTimeTracking: true,
      enableSmartBatching: true,
      enableQuotaAlerts: true,
      safetyMargin: 0.8, // Use 80% of quota to stay safe
      batchSize: 500,    // Batch operations for efficiency
      cacheFirst: true,  // Always check cache first
      emergencyMode: false
    };
    
    // Performance tracking
    this.stats = {
      totalOperations: 0,
      cachedOperations: 0,
      firestoreOperations: 0,
      quotaSavings: 0,
      averageResponseTime: 0,
      quotaEfficiency: 0
    };
    
    this.startTime = Date.now();
    this.lastReset = Date.now();
    
    // Real-time cache for quota efficiency
    this.realtimeCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      hitRate: 0
    };
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Firestore Quota Manager...');
    
    // Start real-time tracking
    if (this.settings.enableRealTimeTracking) {
      this.startRealTimeTracking();
    }
    
    // Start quota monitoring
    if (this.settings.enableQuotaAlerts) {
      this.startQuotaMonitoring();
    }
    
    // Reset daily counters at midnight
    this.scheduleDailyReset();
    
    this.isInitialized = true;
    console.log('✅ Firestore Quota Manager initialized');
    console.log(`📊 Daily Limits: ${this.quotaLimits.reads.toLocaleString()} reads, ${this.quotaLimits.writes.toLocaleString()} writes`);
  }

  // Smart read operation with quota management
  async smartRead(collection, docId, options = {}) {
    const startTime = performance.now();
    const cacheKey = `read_${collection}_${docId}`;
    
    try {
      // Check cache first (saves quota)
      if (this.settings.cacheFirst) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.recordCacheHit();
          this.updateStats(startTime, true, true);
          return cached;
        }
        this.recordCacheMiss();
      }
      
      // Check quota before reading
      if (!this.canPerformRead()) {
        if (this.settings.emergencyMode) {
          // Return cached data or default in emergency mode
          const fallback = this.getFromCache(cacheKey) || { id: docId, exists: false, data: null };
          this.updateStats(startTime, true, true);
          return fallback;
        }
        throw new Error('Firestore read quota exceeded');
      }
      
      // Perform Firestore read
      const result = await this.executeFirestoreRead(collection, docId, options);
      
      // Cache the result for future requests
      this.setInCache(cacheKey, result, 300000); // 5 minute cache
      
      // Record quota usage
      this.recordRead();
      this.updateStats(startTime, true, false);
      
      return result;
      
    } catch (error) {
      this.updateStats(startTime, false, false);
      throw error;
    }
  }

  // Smart write operation with quota management
  async smartWrite(collection, docId, data, options = {}) {
    const startTime = performance.now();
    
    try {
      // Check quota before writing
      if (!this.canPerformWrite()) {
        if (this.settings.enableSmartBatching) {
          // Queue for batch processing
          return this.queueForBatch('write', { collection, docId, data, options });
        }
        throw new Error('Firestore write quota exceeded');
      }
      
      // Perform Firestore write
      const result = await this.executeFirestoreWrite(collection, docId, data, options);
      
      // Update cache
      const cacheKey = `read_${collection}_${docId}`;
      this.setInCache(cacheKey, { id: docId, exists: true, data }, 300000);
      
      // Record quota usage
      this.recordWrite();
      this.updateStats(startTime, true, false);
      
      return result;
      
    } catch (error) {
      this.updateStats(startTime, false, false);
      throw error;
    }
  }

  // Smart query with quota optimization
  async smartQuery(collection, filters = {}, options = {}) {
    const startTime = performance.now();
    const cacheKey = `query_${collection}_${JSON.stringify(filters)}`;
    
    try {
      // Check cache first
      if (this.settings.cacheFirst) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.recordCacheHit();
          this.updateStats(startTime, true, true);
          return cached;
        }
        this.recordCacheMiss();
      }
      
      // Check quota (queries count as reads)
      const estimatedReads = options.limit || 100; // Estimate reads needed
      if (!this.canPerformReads(estimatedReads)) {
        if (this.settings.emergencyMode) {
          const fallback = this.getFromCache(cacheKey) || { docs: [], size: 0 };
          this.updateStats(startTime, true, true);
          return fallback;
        }
        throw new Error('Firestore query quota exceeded');
      }
      
      // Perform Firestore query
      const result = await this.executeFirestoreQuery(collection, filters, options);
      
      // Cache the result
      this.setInCache(cacheKey, result, 180000); // 3 minute cache for queries
      
      // Record quota usage (actual reads from result)
      this.recordReads(result.size || result.docs?.length || 0);
      this.updateStats(startTime, true, false);
      
      return result;
      
    } catch (error) {
      this.updateStats(startTime, false, false);
      throw error;
    }
  }

  // Quota checking methods
  canPerformRead() {
    const dailyLimit = this.quotaLimits.reads * this.settings.safetyMargin;
    const secondLimit = this.quotaLimits.readsPerSecond * this.settings.safetyMargin;
    
    return this.currentUsage.reads < dailyLimit && 
           this.getCurrentSecondReads() < secondLimit;
  }

  canPerformWrite() {
    const dailyLimit = this.quotaLimits.writes * this.settings.safetyMargin;
    const secondLimit = this.quotaLimits.writesPerSecond * this.settings.safetyMargin;
    
    return this.currentUsage.writes < dailyLimit && 
           this.getCurrentSecondWrites() < secondLimit;
  }

  canPerformReads(count) {
    const dailyLimit = this.quotaLimits.reads * this.settings.safetyMargin;
    const secondLimit = this.quotaLimits.readsPerSecond * this.settings.safetyMargin;
    
    return (this.currentUsage.reads + count) < dailyLimit && 
           (this.getCurrentSecondReads() + count) < secondLimit;
  }

  // Real-time tracking
  startRealTimeTracking() {
    setInterval(() => {
      this.updateRealTimeCounters();
    }, 1000); // Update every second
  }

  updateRealTimeCounters() {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    
    // Clean old entries and count current second
    this.realtimeCounters.reads = this.realtimeCounters.reads.filter(time => time > oneSecondAgo);
    this.realtimeCounters.writes = this.realtimeCounters.writes.filter(time => time > oneSecondAgo);
    this.realtimeCounters.deletes = this.realtimeCounters.deletes.filter(time => time > oneSecondAgo);
    
    // Update current per-second usage
    this.currentUsage.readsPerSecond = this.realtimeCounters.reads.length;
    this.currentUsage.writesPerSecond = this.realtimeCounters.writes.length;
    this.currentUsage.deletesPerSecond = this.realtimeCounters.deletes.length;
  }

  getCurrentSecondReads() {
    return this.currentUsage.readsPerSecond;
  }

  getCurrentSecondWrites() {
    return this.currentUsage.writesPerSecond;
  }

  // Record quota usage
  recordRead() {
    this.currentUsage.reads++;
    this.realtimeCounters.reads.push(Date.now());
    this.stats.firestoreOperations++;
  }

  recordWrite() {
    this.currentUsage.writes++;
    this.realtimeCounters.writes.push(Date.now());
    this.stats.firestoreOperations++;
  }

  recordReads(count) {
    this.currentUsage.reads += count;
    const now = Date.now();
    for (let i = 0; i < count; i++) {
      this.realtimeCounters.reads.push(now);
    }
    this.stats.firestoreOperations += count;
  }

  // Cache management
  getFromCache(key) {
    const cached = this.realtimeCache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    
    if (cached) {
      this.realtimeCache.delete(key);
    }
    
    return null;
  }

  setInCache(key, data, ttl = 300000) {
    // Manage cache size for memory efficiency
    if (this.realtimeCache.size > 10000) {
      // Remove oldest entries
      const entries = Array.from(this.realtimeCache.entries());
      const toRemove = entries.slice(0, 1000);
      toRemove.forEach(([k]) => this.realtimeCache.delete(k));
    }
    
    this.realtimeCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  recordCacheHit() {
    this.cacheStats.hits++;
    this.stats.cachedOperations++;
    this.stats.quotaSavings++;
    this.updateCacheHitRate();
  }

  recordCacheMiss() {
    this.cacheStats.misses++;
    this.updateCacheHitRate();
  }

  updateCacheHitRate() {
    const total = this.cacheStats.hits + this.cacheStats.misses;
    this.cacheStats.hitRate = total > 0 ? (this.cacheStats.hits / total) * 100 : 0;
  }

  // Quota monitoring and alerts
  startQuotaMonitoring() {
    setInterval(() => {
      this.checkQuotaStatus();
    }, 30000); // Check every 30 seconds
  }

  checkQuotaStatus() {
    const readUsage = (this.currentUsage.reads / this.quotaLimits.reads) * 100;
    const writeUsage = (this.currentUsage.writes / this.quotaLimits.writes) * 100;
    
    // Alert at 70%, 85%, and 95% usage
    if (readUsage > 95 || writeUsage > 95) {
      this.settings.emergencyMode = true;
      console.warn(`🚨 QUOTA EMERGENCY: Reads ${readUsage.toFixed(1)}%, Writes ${writeUsage.toFixed(1)}%`);
    } else if (readUsage > 85 || writeUsage > 85) {
      console.warn(`⚠️ QUOTA WARNING: Reads ${readUsage.toFixed(1)}%, Writes ${writeUsage.toFixed(1)}%`);
    } else if (readUsage > 70 || writeUsage > 70) {
      console.log(`📊 QUOTA ALERT: Reads ${readUsage.toFixed(1)}%, Writes ${writeUsage.toFixed(1)}%`);
    }
  }

  // Daily reset
  scheduleDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyCounters();
      // Schedule next reset
      setInterval(() => {
        this.resetDailyCounters();
      }, 24 * 60 * 60 * 1000); // Every 24 hours
    }, msUntilMidnight);
  }

  resetDailyCounters() {
    console.log('🔄 Resetting daily Firestore quota counters...');
    this.currentUsage.reads = 0;
    this.currentUsage.writes = 0;
    this.currentUsage.deletes = 0;
    this.settings.emergencyMode = false;
    this.lastReset = Date.now();
    console.log('✅ Daily quota counters reset');
  }

  // Mock Firestore operations (replace with real Firestore calls)
  async executeFirestoreRead(collection, docId, options) {
    // Simulate Firestore read
    await new Promise(resolve => setTimeout(resolve, 10));
    return {
      id: docId,
      exists: true,
      data: { collection, docId, timestamp: Date.now() }
    };
  }

  async executeFirestoreWrite(collection, docId, data, options) {
    // Simulate Firestore write
    await new Promise(resolve => setTimeout(resolve, 15));
    return {
      id: docId,
      success: true,
      timestamp: Date.now()
    };
  }

  async executeFirestoreQuery(collection, filters, options) {
    // Simulate Firestore query
    await new Promise(resolve => setTimeout(resolve, 20));
    const limit = options.limit || 10;
    const docs = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      id: `doc_${i}`,
      data: { collection, filters, index: i }
    }));
    
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0
    };
  }

  // Statistics and monitoring
  updateStats(startTime, success, fromCache) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.stats.totalOperations++;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalOperations - 1) + responseTime) / 
      this.stats.totalOperations;
    
    if (fromCache) {
      this.stats.cachedOperations++;
    }
    
    // Calculate quota efficiency
    this.stats.quotaEfficiency = this.stats.totalOperations > 0 ? 
      (this.stats.cachedOperations / this.stats.totalOperations) * 100 : 0;
  }

  // Public API methods
  getQuotaStatus() {
    const readUsage = (this.currentUsage.reads / this.quotaLimits.reads) * 100;
    const writeUsage = (this.currentUsage.writes / this.quotaLimits.writes) * 100;
    
    return {
      reads: {
        used: this.currentUsage.reads,
        limit: this.quotaLimits.reads,
        percentage: readUsage,
        remaining: this.quotaLimits.reads - this.currentUsage.reads,
        perSecond: this.currentUsage.readsPerSecond
      },
      writes: {
        used: this.currentUsage.writes,
        limit: this.quotaLimits.writes,
        percentage: writeUsage,
        remaining: this.quotaLimits.writes - this.currentUsage.writes,
        perSecond: this.currentUsage.writesPerSecond
      },
      cache: {
        hitRate: this.cacheStats.hitRate,
        hits: this.cacheStats.hits,
        misses: this.cacheStats.misses,
        size: this.realtimeCache.size
      },
      efficiency: {
        quotaEfficiency: this.stats.quotaEfficiency,
        quotaSavings: this.stats.quotaSavings,
        averageResponseTime: this.stats.averageResponseTime
      },
      status: this.settings.emergencyMode ? 'EMERGENCY' : 
              (readUsage > 85 || writeUsage > 85) ? 'WARNING' : 'OPTIMAL'
    };
  }

  getStats() {
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      lastReset: this.lastReset,
      quotaStatus: this.getQuotaStatus()
    };
  }

  // Health check
  isHealthy() {
    const status = this.getQuotaStatus();
    return status.status !== 'EMERGENCY' && 
           status.reads.percentage < 95 && 
           status.writes.percentage < 95;
  }

  // Shutdown
  async shutdown() {
    console.log('🔄 Shutting down Firestore Quota Manager...');
    this.realtimeCache.clear();
    console.log('✅ Firestore Quota Manager shutdown complete');
  }
}

// Create singleton instance
const firestoreQuotaManager = new FirestoreQuotaManager();

export default firestoreQuotaManager;
