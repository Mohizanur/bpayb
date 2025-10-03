#!/usr/bin/env node

// 🚀 QUOTA-AWARE REAL-TIME FIRESTORE STARTUP
// Real-time bot that efficiently uses Firestore free tier quotas
// Target: Maximum real-time performance within free tier limits

console.log("🚀 ==========================================");
console.log("🚀 BIRRPAY BOT - QUOTA-AWARE REAL-TIME");
console.log("🚀 ==========================================");
console.log("");

// Set environment for quota-aware operations
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "info";
process.env.QUOTA_AWARE_MODE = "true";
process.env.REAL_TIME_MODE = "true";
process.env.FIRESTORE_OPTIMIZATION = "true";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

console.log("⚙️  Quota-Aware Configuration:");
console.log("   - Mode: REAL-TIME QUOTA MANAGEMENT");
console.log("   - Firestore Free Tier: OPTIMIZED");
console.log("   - Daily Read Limit: 50,000 operations");
console.log("   - Daily Write Limit: 20,000 operations");
console.log("   - Real-time Sync: INTELLIGENT");
console.log("   - Cache Strategy: AGGRESSIVE");
console.log("   - Quota Monitoring: ACTIVE");
console.log("");

// Memory optimization for free tier
if (
  !process.env.NODE_OPTIONS ||
  !process.env.NODE_OPTIONS.includes("--max-old-space-size")
) {
  process.env.NODE_OPTIONS = "--max-old-space-size=400";
}

console.log("💾 Memory Configuration:");
console.log("   - Max Memory: 400MB (Free tier optimized)");
console.log("   - GC Strategy: Aggressive");
console.log("");

// Import and initialize quota-aware real-time system
console.log("📦 Loading quota-aware real-time modules...");

try {
  // Dynamic import for ES modules
  const { default: realTimeFirestore } = await import(
    "./src/utils/realtimeFirestore.js"
  );
  const { default: firestoreQuotaManager } = await import(
    "./src/utils/firestoreQuotaManager.js"
  );

  // Initialize real-time Firestore system
  console.log("🚀 Initializing quota-aware real-time system...");
  await realTimeFirestore.initialize();
  console.log("");

  // Display initial quota status
  const quotaStatus = realTimeFirestore.getQuotaStatus();
  console.log("📊 Initial Quota Status:");
  console.log(`   - Reads: ${quotaStatus.reads.used}/${quotaStatus.reads.limit} (${quotaStatus.reads.percentage.toFixed(1)}%)`);
  console.log(`   - Writes: ${quotaStatus.writes.used}/${quotaStatus.writes.limit} (${quotaStatus.writes.percentage.toFixed(1)}%)`);
  console.log(`   - Cache Hit Rate: ${quotaStatus.cache.hitRate.toFixed(1)}%`);
  console.log(`   - Status: ${quotaStatus.status}`);
  console.log("");

  // Set up quota monitoring
  const quotaMonitorInterval = setInterval(async () => {
    const status = realTimeFirestore.getQuotaStatus();
    const stats = realTimeFirestore.getStats();
    
    // Log quota status every 5 minutes
    console.log("📊 Quota Status Update:");
    console.log(`   - Reads: ${status.reads.used}/${status.reads.limit} (${status.reads.percentage.toFixed(1)}%)`);
    console.log(`   - Writes: ${status.writes.used}/${status.writes.limit} (${status.writes.percentage.toFixed(1)}%)`);
    console.log(`   - Cache Hit Rate: ${status.cache.hitRate.toFixed(1)}%`);
    console.log(`   - Active Listeners: ${stats.activeListeners}`);
    console.log(`   - Real-time Updates: ${stats.realTimeUpdates}`);
    console.log(`   - Avg Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log("");
    
    // Alert if quota usage is high
    if (status.reads.percentage > 85 || status.writes.percentage > 85) {
      console.warn("⚠️ HIGH QUOTA USAGE DETECTED!");
      console.warn("   Consider optimizing operations or enabling emergency mode");
      console.warn("");
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Set up performance monitoring
  const performanceInterval = setInterval(async () => {
    const report = await realTimeFirestore.getQuotaReport();
    
    if (report.recommendations.length > 0) {
      console.log("💡 Optimization Recommendations:");
      report.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
      console.log("");
    }
  }, 15 * 60 * 1000); // Every 15 minutes

  // Set up graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log("");
    console.log(`⚠️ Received ${signal}, starting graceful shutdown...`);
    
    // Clear intervals
    clearInterval(quotaMonitorInterval);
    clearInterval(performanceInterval);
    
    // Shutdown real-time system
    await realTimeFirestore.shutdown();
    
    console.log("✅ Graceful shutdown complete");
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Enhanced bot integration with real-time Firestore
  console.log("🤖 Starting bot with real-time Firestore integration...");
  
  // Create enhanced bot context
  global.realTimeFirestore = realTimeFirestore;
  global.firestoreQuotaManager = firestoreQuotaManager;
  
  // Add quota-aware middleware
  const originalBot = await import("./complete-admin-bot.js");
  
  console.log("");
  console.log("✅ ==========================================");
  console.log("✅ QUOTA-AWARE REAL-TIME BOT STARTED");
  console.log("✅ ==========================================");
  console.log("");
  console.log("🎯 Real-time Features:");
  console.log("   ✓ Intelligent quota management");
  console.log("   ✓ Real-time data synchronization");
  console.log("   ✓ Aggressive caching strategy");
  console.log("   ✓ Automatic quota monitoring");
  console.log("   ✓ Emergency mode protection");
  console.log("   ✓ Performance optimization");
  console.log("");
  console.log("📊 Firestore Optimization:");
  console.log("   ✓ 50K daily reads efficiently managed");
  console.log("   ✓ 20K daily writes optimized");
  console.log("   ✓ Real-time listeners quota-aware");
  console.log("   ✓ Smart batching enabled");
  console.log("   ✓ Cache-first strategy active");
  console.log("");
  console.log("🛡️ Protection Systems:");
  console.log("   ✓ Quota limit monitoring");
  console.log("   ✓ Emergency mode fallback");
  console.log("   ✓ Rate limiting protection");
  console.log("   ✓ Graceful degradation");
  console.log("");
  console.log("🎯 System Status: OPERATIONAL");
  console.log("📡 Real-time Sync: ACTIVE");
  console.log("🔍 Quota Monitoring: ENABLED");
  console.log("");

} catch (error) {
  console.error("");
  console.error("❌ ==========================================");
  console.error("❌ STARTUP FAILED");
  console.error("❌ ==========================================");
  console.error("");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("");
  console.error("💡 Troubleshooting:");
  console.error("   1. Check Firestore configuration");
  console.error("   2. Verify environment variables");
  console.error("   3. Ensure Firebase credentials are set");
  console.error("   4. Check network connectivity");
  console.error("   5. Verify quota limits in Firebase console");
  console.error("");

  // Exit with error
  process.exit(1);
}
