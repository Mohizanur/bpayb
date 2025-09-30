// 🚀 ULTRA PERFORMANCE INTEGRATION
// Seamlessly integrates ultra performance optimizations with existing bot
// Maintains ALL existing features while maximizing performance

import { ultraMaxPerformance } from "./ultraMaxPerformance.js";
import { FirestoreOptimizerUltra } from "./firestoreOptimizerUltra.js";
import { ultraRequestHandler } from "./ultraRequestHandler.js";
import { performanceMonitor } from "./performanceMonitor.js";

class UltraPerformanceIntegration {
  constructor() {
    this.initialized = false;
    this.startTime = Date.now();
  }

  // Initialize ultra performance system
  async initialize() {
    if (this.initialized) {
      console.log("⚠️ Ultra performance already initialized");
      return;
    }

    console.log("🚀 Initializing Ultra Performance System...");

    try {
      // Start performance monitoring
      performanceMonitor.start();

      // Pre-warm caches with essential data
      await this.preWarmCaches();

      // Set up periodic maintenance
      this.setupMaintenance();

      this.initialized = true;
      console.log("✅ Ultra Performance System initialized successfully");
      console.log("📊 Performance Targets:");
      console.log("   - Response Time: 50-100ms");
      console.log("   - Concurrent Users: 2,000-3,000");
      console.log("   - Cache Hit Rate: 85-90%");
      console.log("   - Uptime: 99%+");
    } catch (error) {
      console.error("❌ Ultra performance initialization failed:", error);
    }
  }

  // Pre-warm caches with commonly accessed data
  async preWarmCaches() {
    console.log("🔥 Pre-warming caches...");

    try {
      // Pre-load services (rarely change, accessed frequently)
      await FirestoreOptimizerUltra.getServices();
      console.log("   ✅ Services cached");

      // Pre-compute admin stats
      await FirestoreOptimizerUltra.getAdminStats();
      console.log("   ✅ Admin stats cached");

      console.log("✅ Cache pre-warming complete");
    } catch (error) {
      console.error("⚠️ Cache pre-warming partial failure:", error);
    }
  }

  // Set up periodic maintenance tasks
  setupMaintenance() {
    // Flush pending database operations every 5 minutes
    setInterval(
      async () => {
        try {
          await ultraMaxPerformance.flush();
        } catch (error) {
          console.error("❌ Flush error:", error);
        }
      },
      5 * 60 * 1000
    );

    // Memory check every 2 minutes
    setInterval(
      () => {
        const memStats = ultraMaxPerformance.memoryPool.getMemoryStats();
        const percentage = parseInt(memStats.percentage);

        if (percentage > 85) {
          console.warn("⚠️ High memory usage:", memStats.percentage);
          ultraMaxPerformance.memoryPool.performCleanup();
        }
      },
      2 * 60 * 1000
    );

    // Performance report every 30 minutes
    setInterval(
      () => {
        this.logPerformanceReport();
      },
      30 * 60 * 1000
    );

    console.log("✅ Maintenance tasks scheduled");
  }

  // Log comprehensive performance report
  logPerformanceReport() {
    const stats = ultraMaxPerformance.getStats();
    const handlerStats = ultraRequestHandler.getStats();

    console.log("📊 === PERFORMANCE REPORT ===");
    console.log("⚡ Ultra Performance:");
    console.log(`   Cache Hit Rate: ${stats.cache.hitRate}`);
    console.log(`   L1 Cache: ${stats.cache.l1Size} items`);
    console.log(`   L2 Cache: ${stats.cache.l2Size} items`);
    console.log(`   Total Cache Size: ${stats.cache.totalSize} items`);
    console.log(`   Pending Batches: ${stats.batching.writeQueueSize} writes`);

    console.log("🚀 Request Handler:");
    console.log(`   Active Requests: ${handlerStats.activeRequests}`);
    console.log(`   Queued Requests: ${handlerStats.queuedRequests}`);
    console.log(`   Total Requests: ${handlerStats.totalRequests}`);
    console.log(`   Success Rate: ${handlerStats.successRate}`);
    console.log(`   Avg Response Time: ${handlerStats.avgResponseTime}`);
    console.log(`   Capacity: ${handlerStats.capacity.utilization}`);

    console.log("💾 Memory:");
    console.log(`   Heap Used: ${stats.memory.heapUsed}`);
    console.log(`   Heap Total: ${stats.memory.heapTotal}`);
    console.log(`   Usage: ${stats.memory.percentage}`);

    console.log("⏱️ Uptime:", stats.performance.uptime);
    console.log("=========================");
  }

  // Get comprehensive system statistics
  getSystemStats() {
    return {
      ultraPerformance: ultraMaxPerformance.getStats(),
      requestHandler: ultraRequestHandler.getStats(),
      performance: performanceMonitor.getMetrics(),
      uptime: Date.now() - this.startTime,
    };
  }

  // Health check for monitoring
  async healthCheck() {
    const stats = this.getSystemStats();

    // Calculate health score
    let healthScore = 100;

    // Check memory usage
    const memUsage = parseInt(stats.ultraPerformance.memory.percentage);
    if (memUsage > 90) healthScore -= 30;
    else if (memUsage > 80) healthScore -= 15;

    // Check cache hit rate
    const cacheHitRate = parseFloat(stats.ultraPerformance.cache.hitRate);
    if (cacheHitRate < 70) healthScore -= 20;
    else if (cacheHitRate < 80) healthScore -= 10;

    // Check success rate
    const successRate = parseFloat(stats.requestHandler.successRate);
    if (successRate < 90) healthScore -= 30;
    else if (successRate < 95) healthScore -= 15;

    // Check queue size
    if (stats.requestHandler.queuedRequests > 100) healthScore -= 20;
    else if (stats.requestHandler.queuedRequests > 50) healthScore -= 10;

    return {
      healthy: healthScore >= 70,
      score: healthScore,
      status:
        healthScore >= 90
          ? "excellent"
          : healthScore >= 70
            ? "good"
            : healthScore >= 50
              ? "degraded"
              : "critical",
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  // Emergency flush - force write all pending operations
  async emergencyFlush() {
    console.log("🚨 Emergency flush initiated...");
    try {
      await ultraMaxPerformance.flush();
      console.log("✅ Emergency flush complete");
      return true;
    } catch (error) {
      console.error("❌ Emergency flush failed:", error);
      return false;
    }
  }

  // Emergency cleanup - clear caches and free memory
  emergencyCleanup() {
    console.log("🚨 Emergency cleanup initiated...");
    try {
      ultraMaxPerformance.clearCache();
      ultraMaxPerformance.memoryPool.performCleanup();
      console.log("✅ Emergency cleanup complete");
      return true;
    } catch (error) {
      console.error("❌ Emergency cleanup failed:", error);
      return false;
    }
  }

  // Graceful shutdown
  async shutdown() {
    console.log("🛑 Initiating graceful shutdown...");

    try {
      // Flush all pending operations
      await ultraMaxPerformance.flush();

      // Clear rate limits
      ultraRequestHandler.clearRateLimits();

      // Log final stats
      this.logPerformanceReport();

      console.log("✅ Graceful shutdown complete");
    } catch (error) {
      console.error("❌ Shutdown error:", error);
    }
  }
}

// Create singleton instance
const ultraPerformanceIntegration = new UltraPerformanceIntegration();

// Export for use in main bot file
export {
  ultraPerformanceIntegration,
  ultraMaxPerformance,
  FirestoreOptimizerUltra,
  ultraRequestHandler,
};
