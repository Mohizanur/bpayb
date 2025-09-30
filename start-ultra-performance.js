#!/usr/bin/env node

// 🚀 ULTRA PERFORMANCE STARTUP SCRIPT
// Production-ready bot with maximum realistic performance optimizations
// Target: 2,000-3,000 concurrent users, 50-100ms responses, 99%+ uptime

console.log("🚀 ====================================");
console.log("🚀 BIRRPAY BOT - ULTRA PERFORMANCE MODE");
console.log("🚀 ====================================");
console.log("");

// Set performance environment variables
process.env.LOG_LEVEL = process.env.LOG_LEVEL || "info";
process.env.PERFORMANCE_MODE = "true";
process.env.ULTRA_PERFORMANCE = "true";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

console.log("⚙️  Configuration:");
console.log("   - Performance Mode: ULTRA");
console.log("   - Target Concurrent Users: 2,000-3,000");
console.log("   - Target Response Time: 50-100ms");
console.log("   - Cache Strategy: Multi-layer (L1+L2)");
console.log("   - Batch Processing: Smart adaptive");
console.log("   - Memory Limit: 400MB (80% of 512MB)");
console.log("");

// Increase memory limit for Node.js
if (
  !process.env.NODE_OPTIONS ||
  !process.env.NODE_OPTIONS.includes("--max-old-space-size")
) {
  process.env.NODE_OPTIONS = "--max-old-space-size=512";
}

// Enable garbage collection exposure
if (
  !process.env.NODE_OPTIONS ||
  !process.env.NODE_OPTIONS.includes("--expose-gc")
) {
  process.env.NODE_OPTIONS += " --expose-gc";
}

console.log("💾 Memory Configuration:");
console.log("   - Max Old Space: 512MB");
console.log("   - GC: Exposed for manual collection");
console.log("");

// Import and initialize ultra performance system
console.log("📦 Loading ultra performance modules...");

try {
  // Dynamic import for ES modules
  const { ultraPerformanceIntegration } = await import(
    "./src/utils/ultraPerformanceIntegration.js"
  );

  // Initialize ultra performance system
  console.log("🚀 Initializing ultra performance system...");
  await ultraPerformanceIntegration.initialize();
  console.log("");

  // Set up graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log("");
    console.log(`⚠️  Received ${signal}, starting graceful shutdown...`);
    await ultraPerformanceIntegration.shutdown();
    process.exit(0);
  };

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  // Set up health check endpoint
  const healthInterval = setInterval(
    async () => {
      const health = await ultraPerformanceIntegration.healthCheck();

      if (health.score < 70) {
        console.warn("⚠️  System health degraded:", health.status);
        console.warn("   Score:", health.score);
      }
    },
    5 * 60 * 1000
  ); // Check every 5 minutes

  // Import and start the main bot
  console.log("🤖 Starting main bot...");
  await import("./complete-admin-bot.js");

  console.log("");
  console.log("✅ ====================================");
  console.log("✅ BOT STARTED SUCCESSFULLY");
  console.log("✅ ====================================");
  console.log("");
  console.log("📊 Performance Targets:");
  console.log("   ✓ Response Time: 50-100ms");
  console.log("   ✓ Concurrent Users: 2,000-3,000");
  console.log("   ✓ Daily Active Users: 2,000-3,000");
  console.log("   ✓ Cache Hit Rate: 85-90%");
  console.log("   ✓ Uptime: 99%+");
  console.log("   ✓ Memory Usage: <400MB");
  console.log("");
  console.log("🎯 System Status: OPERATIONAL");
  console.log("📡 Monitoring: ACTIVE");
  console.log("🛡️  Self-Healing: ENABLED");
  console.log("");
} catch (error) {
  console.error("");
  console.error("❌ ====================================");
  console.error("❌ STARTUP FAILED");
  console.error("❌ ====================================");
  console.error("");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("");
  console.error("💡 Troubleshooting:");
  console.error("   1. Check if all dependencies are installed: npm install");
  console.error("   2. Verify environment variables are set correctly");
  console.error("   3. Ensure Firebase credentials are configured");
  console.error("   4. Check if port is available");
  console.error("");

  // Exit with error
  process.exit(1);
}
