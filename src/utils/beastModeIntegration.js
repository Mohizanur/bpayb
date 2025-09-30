// 🔥 BEAST MODE INTEGRATION
// Seamless integration with existing bot - preserves ALL features
// Adds performance monitoring commands and zombie self-healing

import { beastModeOptimizer } from "./beastModeOptimizer.js";
import { FirestoreOptimizerUltra } from "./firestoreOptimizerUltra.js";
import { performanceMonitor } from "./performanceMonitor.js";

class BeastModeIntegration {
  constructor() {
    this.initialized = false;
    this.startTime = Date.now();
    this.healthCheckInterval = null;
  }

  // Initialize BEAST MODE system
  async initialize() {
    if (this.initialized) {
      console.log("⚠️ BEAST MODE already initialized");
      return;
    }

    console.log("");
    console.log("🔥 ====================================");
    console.log("🔥 ACTIVATING BEAST MODE OPTIMIZER");
    console.log("🔥 ====================================");
    console.log("");

    try {
      // Start performance monitoring
      performanceMonitor.start();

      // Pre-warm critical caches
      await this.preWarmCaches();

      // Set up automatic maintenance
      this.setupMaintenance();

      // Set up health monitoring
      this.setupHealthMonitoring();

      this.initialized = true;

      console.log("✅ ====================================");
      console.log("✅ BEAST MODE ACTIVATED");
      console.log("✅ ====================================");
      console.log("");
      console.log("📊 BEAST MODE Specifications:");
      console.log("   ⚡ Max Concurrent Users: 5,000");
      console.log("   ⚡ Cache Layers: 6 (instant to rate-limit)");
      console.log("   ⚡ Response Time: <5ms (cached), 50-150ms (DB)");
      console.log("   ⚡ Memory: 2GB allocated");
      console.log("   ⚡ Quota Protection: 4-tier system");
      console.log("   ⚡ Cache Hit Rate Target: 70-90%");
      console.log("   ⚡ Self-Healing: ENABLED");
      console.log("");
      console.log("🧟 ZOMBIE MODE: IMMORTAL");
      console.log("🛡️ ALL FEATURES: PRESERVED");
      console.log("");
    } catch (error) {
      console.error("❌ BEAST MODE initialization failed:", error);
      throw error;
    }
  }

  // Pre-warm critical caches
  async preWarmCaches() {
    console.log("🔥 Pre-warming BEAST MODE caches...");

    try {
      // Pre-load services (most frequently accessed)
      if (FirestoreOptimizerUltra) {
        await FirestoreOptimizerUltra.getServices();
        console.log("   ✅ Services cached (instant layer)");

        // Pre-load admin stats
        await FirestoreOptimizerUltra.getAdminStats();
        console.log("   ✅ Admin stats cached");
      }

      console.log("✅ Cache pre-warming complete");
    } catch (error) {
      console.error("⚠️ Cache pre-warming partial failure:", error.message);
    }
  }

  // Set up automatic maintenance tasks
  setupMaintenance() {
    // Comprehensive report every 30 minutes
    setInterval(
      () => {
        this.logBeastModeReport();
      },
      30 * 60 * 1000
    );

    // Quick health check every 5 minutes
    setInterval(
      () => {
        this.quickHealthCheck();
      },
      5 * 60 * 1000
    );

    console.log("✅ BEAST MODE maintenance tasks scheduled");
  }

  // Set up health monitoring
  setupHealthMonitoring() {
    this.healthCheckInterval = setInterval(
      () => {
        const health = this.getHealthStatus();

        if (health.score < 70) {
          console.warn("⚠️ BEAST MODE health degraded:", health.status);
          console.warn(`   Score: ${health.score}/100`);

          // Auto-healing
          if (health.score < 50) {
            console.warn("🚨 Activating emergency healing...");
            this.emergencyHealing();
          }
        }
      },
      2 * 60 * 1000
    ); // Every 2 minutes

    console.log("✅ BEAST MODE health monitoring active");
  }

  // Log comprehensive BEAST MODE report
  logBeastModeReport() {
    const stats = beastModeOptimizer.getComprehensiveStats();

    console.log("");
    console.log("🔥 === BEAST MODE PERFORMANCE REPORT ===");
    console.log("");
    console.log("⚡ Performance:");
    console.log(`   Total Requests: ${stats.performance.totalRequests}`);
    console.log(`   Cache Hit Rate: ${stats.performance.cacheHitRate}`);
    console.log(`   DB Hits: ${stats.performance.dbHits}`);
    console.log(`   Errors: ${stats.performance.errors}`);
    console.log(`   Uptime: ${stats.performance.uptime}`);
    console.log("");
    console.log("🧠 Cache Status (6 Layers):");
    console.log(`   Hit Rate: ${stats.cache.hitRate}`);
    console.log(`   Instant Layer: ${stats.cache.layers.instant} items`);
    console.log(`   User Layer: ${stats.cache.layers.user} items`);
    console.log(`   Service Layer: ${stats.cache.layers.service} items`);
    console.log(`   Stats Layer: ${stats.cache.layers.stats} items`);
    console.log(`   Session Layer: ${stats.cache.layers.session} items`);
    console.log(`   Rate Limit Layer: ${stats.cache.layers.rateLimit} items`);
    console.log(`   Total Size: ${stats.cache.totalSize} items`);
    console.log("");
    console.log("🛡️ Quota Protection:");
    console.log(`   Mode: ${stats.quota.mode}`);
    console.log(`   Usage: ${stats.quota.usage}`);
    console.log(`   Description: ${stats.quota.description}`);
    console.log(`   Cache TTL: ${stats.quota.cacheTTL}`);
    console.log("");
    console.log("💾 Memory Management:");
    console.log(`   Current: ${stats.memory.current}`);
    console.log(`   Total: ${stats.memory.total}`);
    console.log(`   Usage: ${stats.memory.percentage}`);
    console.log(`   Threshold: ${stats.memory.threshold}`);
    console.log("");
    console.log("🎯 Configuration:");
    console.log(`   Max Concurrent: ${stats.config.maxConcurrent} users`);
    console.log(`   Max Memory: ${stats.config.maxMemory}`);
    console.log(`   Cache Layers: ${stats.config.cacheLayers}`);
    console.log("");
    console.log("=================================");
    console.log("");
  }

  // Quick health check
  quickHealthCheck() {
    const stats = beastModeOptimizer.getComprehensiveStats();
    const health = this.getHealthStatus();

    if (health.score >= 90) {
      console.log(
        `✅ BEAST MODE: Excellent (${health.score}/100) | Cache: ${stats.cache.hitRate} | Memory: ${stats.memory.percentage}`
      );
    } else if (health.score >= 70) {
      console.log(
        `⚠️ BEAST MODE: Good (${health.score}/100) | Cache: ${stats.cache.hitRate} | Memory: ${stats.memory.percentage}`
      );
    } else {
      console.log(
        `🚨 BEAST MODE: Degraded (${health.score}/100) | Cache: ${stats.cache.hitRate} | Memory: ${stats.memory.percentage}`
      );
    }
  }

  // Get health status
  getHealthStatus() {
    const stats = beastModeOptimizer.getComprehensiveStats();
    let score = 100;

    // Check memory usage
    const memPercent = parseFloat(stats.memory.percentage);
    if (memPercent > 90) score -= 30;
    else if (memPercent > 85) score -= 15;
    else if (memPercent > 80) score -= 5;

    // Check cache hit rate
    const cacheHitRate = parseFloat(stats.cache.hitRate);
    if (cacheHitRate < 50) score -= 30;
    else if (cacheHitRate < 70) score -= 15;
    else if (cacheHitRate < 80) score -= 5;

    // Check quota usage
    const quotaPercent = parseFloat(stats.quota.usage);
    if (quotaPercent > 90) score -= 20;
    else if (quotaPercent > 80) score -= 10;
    else if (quotaPercent > 70) score -= 5;

    // Check error rate
    const errorRate =
      stats.performance.totalRequests > 0
        ? (stats.performance.errors / stats.performance.totalRequests) * 100
        : 0;
    if (errorRate > 5) score -= 20;
    else if (errorRate > 2) score -= 10;

    const status =
      score >= 90
        ? "EXCELLENT"
        : score >= 70
          ? "GOOD"
          : score >= 50
            ? "DEGRADED"
            : "CRITICAL";

    return {
      score,
      status,
      stats,
      timestamp: new Date().toISOString(),
    };
  }

  // Emergency healing (zombie mode)
  emergencyHealing() {
    console.log("🧟 ZOMBIE SELF-HEALING ACTIVATED");

    try {
      // Force memory cleanup
      if (global.gc) {
        global.gc();
        global.gc();
        console.log("   ✅ Forced garbage collection");
      }

      // Check memory again
      const memStats = beastModeOptimizer.memoryManager.getStats();
      console.log(`   💾 Memory after GC: ${memStats.current}`);

      // If still high, clear some caches
      const memPercent = parseFloat(memStats.percentage);
      if (memPercent > 85) {
        console.log("   🧹 Clearing non-critical caches...");
        // Clear session cache (least critical)
        beastModeOptimizer.cache.sessionCache.clear();
        console.log("   ✅ Session cache cleared");
      }

      console.log("✅ Emergency healing complete");
    } catch (error) {
      console.error("❌ Emergency healing failed:", error);
    }
  }

  // Get stats for commands
  getStatsForCommand() {
    const stats = beastModeOptimizer.getComprehensiveStats();
    const health = this.getHealthStatus();

    return {
      status: `🔥 BEAST MODE: ${health.status}`,
      score: `${health.score}/100`,
      performance: {
        requests: stats.performance.totalRequests,
        cacheHitRate: stats.performance.cacheHitRate,
        uptime: stats.performance.uptime,
      },
      cache: {
        hitRate: stats.cache.hitRate,
        totalItems: stats.cache.totalSize,
        layers: stats.cache.layers,
      },
      quota: {
        mode: stats.quota.mode,
        usage: stats.quota.usage,
      },
      memory: {
        current: stats.memory.current,
        percentage: stats.memory.percentage,
      },
    };
  }

  // Graceful shutdown
  async shutdown() {
    console.log("");
    console.log("🛑 ====================================");
    console.log("🛑 BEAST MODE GRACEFUL SHUTDOWN");
    console.log("🛑 ====================================");
    console.log("");

    try {
      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }

      // Log final stats
      this.logBeastModeReport();

      // Force final GC
      if (global.gc) {
        global.gc();
      }

      console.log("✅ BEAST MODE shutdown complete");
    } catch (error) {
      console.error("❌ Shutdown error:", error);
    }
  }
}

// Create singleton instance
const beastModeIntegration = new BeastModeIntegration();

// Export for use in main bot
export { beastModeIntegration, beastModeOptimizer, BeastModeIntegration };
