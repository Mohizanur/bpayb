import { firestore } from './firestore.js';

/**
 * 🚀 SMART BEAST MODE - Intelligent Performance Optimization
 * 
 * This system provides REALISTIC performance improvements through:
 * - Smart caching with intelligent invalidation
 * - Connection pooling and reuse
 * - Adaptive rate limiting
 * - Memory management
 * - Performance monitoring
 */

class SmartBeastMode {
    constructor() {
        this.cache = new Map();
        this.connectionPool = new Map();
        this.performanceMetrics = new Map();
        this.rateLimiters = new Map();
        this.isEnabled = false;
        this.maxCacheSize = 1000;
        this.maxConnections = 50;
        this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
        
        // Start cleanup process
        this.startCleanupProcess();
        
        console.log('🚀 Smart Beast Mode initialized');
    }

    /**
     * Enable Smart Beast Mode with performance optimizations
     */
    enable() {
        if (this.isEnabled) {
            console.log('⚠️ Smart Beast Mode already enabled');
            return;
        }

        this.isEnabled = true;
        console.log('🚀 Smart Beast Mode ENABLED - Performance optimizations active');
        
        // Apply optimizations
        this.optimizeFirestore();
        this.optimizeMemory();
        this.startPerformanceMonitoring();
    }

    /**
     * Disable Smart Beast Mode
     */
    disable() {
        if (!this.isEnabled) {
            console.log('⚠️ Smart Beast Mode already disabled');
            return;
        }

        this.isEnabled = false;
        console.log('🔄 Smart Beast Mode DISABLED - Returning to normal mode');
        
        // Cleanup optimizations
        this.cleanup();
    }

    /**
     * Smart caching with intelligent invalidation
     */
    async smartCache(key, fetchFunction, ttl = 300000) { // 5 minutes default
        if (!this.isEnabled) {
            return await fetchFunction();
        }

        const cacheKey = `smart_${key}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < ttl) {
            this.updateMetrics('cache_hit', key);
            return cached.data;
        }

        try {
            const data = await fetchFunction();
            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now(),
                ttl,
                accessCount: 1
            });
            
            this.updateMetrics('cache_miss', key);
            this.enforceCacheSize();
            return data;
        } catch (error) {
            console.error('Smart cache fetch error:', error);
            throw error;
        }
    }

    /**
     * Connection pooling for Firestore operations
     */
    async getOptimizedConnection(collectionName) {
        if (!this.isEnabled) {
            return firestore.collection(collectionName);
        }

        const poolKey = `conn_${collectionName}`;
        let connection = this.connectionPool.get(poolKey);
        
        if (!connection || this.isConnectionStale(connection)) {
            connection = {
                ref: firestore.collection(collectionName),
                lastUsed: Date.now(),
                useCount: 0
            };
            this.connectionPool.set(poolKey, connection);
        }
        
        connection.lastUsed = Date.now();
        connection.useCount++;
        
        return connection.ref;
    }

    /**
     * Adaptive rate limiting based on performance
     */
    async adaptiveRateLimit(operation, userId) {
        if (!this.isEnabled) {
            return true;
        }

        const limiterKey = `rate_${userId}_${operation}`;
        let limiter = this.rateLimiters.get(limiterKey);
        
        if (!limiter) {
            limiter = {
                count: 0,
                windowStart: Date.now(),
                windowSize: 60000, // 1 minute
                maxRequests: 10
            };
            this.rateLimiters.set(limiterKey, limiter);
        }

        const now = Date.now();
        if (now - limiter.windowStart > limiter.windowSize) {
            // Reset window
            limiter.count = 0;
            limiter.windowStart = now;
        }

        if (limiter.count >= limiter.maxRequests) {
            this.updateMetrics('rate_limit_hit', operation);
            return false;
        }

        limiter.count++;
        return true;
    }

    /**
     * Optimize Firestore operations
     */
    optimizeFirestore() {
        if (!this.isEnabled) return;

        // Enable offline persistence for better performance
        try {
            firestore.settings({
                cacheSizeBytes: 50 * 1024 * 1024, // 50MB cache
                ignoreUndefinedProperties: true
            });
            console.log('🔧 Firestore optimized with enhanced caching');
        } catch (error) {
            console.warn('⚠️ Firestore optimization failed:', error.message);
        }
    }

    /**
     * Memory management and cleanup
     */
    optimizeMemory() {
        if (!this.isEnabled) return;

        // Set memory limits
        this.maxCacheSize = Math.min(1000, Math.floor(process.memoryUsage().heapTotal / (1024 * 1024 * 10)));
        this.maxConnections = Math.min(50, Math.floor(process.memoryUsage().heapTotal / (1024 * 1024 * 5)));
        
        console.log(`🧠 Memory optimization: Cache limit ${this.maxCacheSize}, Connection limit ${this.maxConnections}`);
    }

    /**
     * Performance monitoring
     */
    startPerformanceMonitoring() {
        if (!this.isEnabled) return;

        // DISABLED: This was causing excessive operations
        console.log('⚠️ Smart beast performance logging DISABLED (quota protection)');
        // setInterval(() => {
        //     this.logPerformanceMetrics();
        // }, 60000); // Log every minute

        console.log('📊 Performance monitoring started');
    }

    /**
     * Update performance metrics
     */
    updateMetrics(type, operation) {
        if (!this.isEnabled) return;

        const key = `${type}_${operation}`;
        const current = this.performanceMetrics.get(key) || 0;
        this.performanceMetrics.set(key, current + 1);
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics() {
        if (!this.isEnabled || this.performanceMetrics.size === 0) return;

        console.log('📊 Smart Beast Mode Performance Metrics:');
        for (const [key, value] of this.performanceMetrics) {
            console.log(`  ${key}: ${value}`);
        }
        
        // Reset metrics
        this.performanceMetrics.clear();
    }

    /**
     * Enforce cache size limits
     */
    enforceCacheSize() {
        if (this.cache.size <= this.maxCacheSize) return;

        // Remove least recently used items
        const entries = Array.from(this.cache.entries());
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        
        const toRemove = entries.slice(0, Math.floor(this.maxCacheSize * 0.2)); // Remove 20%
        toRemove.forEach(([key]) => this.cache.delete(key));
        
        console.log(`🧹 Cache cleaned: ${toRemove.length} items removed`);
    }

    /**
     * Check if connection is stale
     */
    isConnectionStale(connection) {
        const staleThreshold = 5 * 60 * 1000; // 5 minutes
        return Date.now() - connection.lastUsed > staleThreshold;
    }

    /**
     * Start cleanup process
     */
    startCleanupProcess() {
        // DISABLED: This was causing excessive operations
        console.log('⚠️ Smart beast cleanup DISABLED (quota protection)');
        // setInterval(() => {
        //     this.cleanup();
        // }, this.cleanupInterval);
    }

    /**
     * Cleanup resources
     */
    cleanup() {
        // Clean stale connections
        for (const [key, connection] of this.connectionPool) {
            if (this.isConnectionStale(connection)) {
                this.connectionPool.delete(key);
            }
        }

        // Clean expired cache entries
        const now = Date.now();
        for (const [key, entry] of this.cache) {
            if (now - entry.timestamp > entry.ttl) {
                this.cache.delete(key);
            }
        }

        // Clean old rate limiters
        const rateLimitThreshold = 10 * 60 * 1000; // 10 minutes
        for (const [key, limiter] of this.rateLimiters) {
            if (now - limiter.windowStart > rateLimitThreshold) {
                this.rateLimiters.delete(key);
            }
        }
    }

    /**
     * Get system status
     */
    getStatus() {
        return {
            enabled: this.isEnabled,
            cacheSize: this.cache.size,
            maxCacheSize: this.maxCacheSize,
            connectionPoolSize: this.connectionPool.size,
            maxConnections: this.maxConnections,
            rateLimitersCount: this.rateLimiters.size,
            memoryUsage: process.memoryUsage(),
            uptime: process.uptime()
        };
    }

    /**
     * Emergency shutdown
     */
    emergencyShutdown() {
        console.log('🚨 Emergency shutdown initiated');
        this.isEnabled = false;
        this.cache.clear();
        this.connectionPool.clear();
        this.rateLimiters.clear();
        this.performanceMetrics.clear();
        console.log('✅ Emergency shutdown completed');
    }
}

// Create singleton instance
const smartBeastMode = new SmartBeastMode();

export default smartBeastMode;

// Export utility functions for easy use
export const {
    enable,
    disable,
    smartCache,
    getOptimizedConnection,
    adaptiveRateLimit,
    getStatus,
    emergencyShutdown
} = smartBeastMode;
