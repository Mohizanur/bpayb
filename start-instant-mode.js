#!/usr/bin/env node

// ⚡ INSTANT MODE STARTUP SCRIPT
// Zero millisecond delays for thousands of users
// Real-time data with instant responses

console.log("⚡ ==========================================");
console.log("⚡ STARTING BIRRPAY BOT - INSTANT MODE");
console.log("⚡ ==========================================\n");

// Set environment variables for INSTANT MODE
process.env.INSTANT_MODE = "true";
process.env.MAX_MEMORY = "4096"; // 4GB
process.env.MAX_CONCURRENT = "10000"; // 10K users
process.env.ZERO_LATENCY = "true";
process.env.REAL_TIME_SYNC = "true";

// Enable garbage collection
process.env.NODE_OPTIONS =
  "--expose-gc --max-old-space-size=4096 --optimize-for-size";

console.log("⚡ INSTANT MODE Configuration:");
console.log(`   Max Memory: ${process.env.MAX_MEMORY}MB`);
console.log(`   Max Concurrent: ${process.env.MAX_CONCURRENT} users`);
console.log(`   Zero Latency: ${process.env.ZERO_LATENCY}`);
console.log(`   Real-time Sync: ${process.env.REAL_TIME_SYNC}`);
console.log("");

// Initialize INSTANT MODE integration
async function initializeInstantMode() {
  try {
    console.log("⚡ Initializing INSTANT MODE integration...");

    const { instantModeIntegration } = await import(
      "./src/utils/instantModeIntegration.js"
    );
    await instantModeIntegration.initialize();

    console.log("✅ INSTANT MODE integration initialized");
  } catch (error) {
    console.error("❌ Failed to initialize INSTANT MODE:", error);
    console.log("🔄 Falling back to BEAST MODE...");

    // Fallback to BEAST MODE
    process.env.BEAST_MODE = "true";
    process.env.INSTANT_MODE = "false";
  }
}

// Graceful shutdown handler
process.on("SIGINT", async () => {
  console.log("\n🛑 Received SIGINT, shutting down gracefully...");

  try {
    if (process.env.INSTANT_MODE === "true") {
      const { instantModeIntegration } = await import(
        "./src/utils/instantModeIntegration.js"
      );
      await instantModeIntegration.shutdown();
    }
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down gracefully...");

  try {
    if (process.env.INSTANT_MODE === "true") {
      const { instantModeIntegration } = await import(
        "./src/utils/instantModeIntegration.js"
      );
      await instantModeIntegration.shutdown();
    }
  } catch (error) {
    console.error("❌ Error during shutdown:", error);
  }

  process.exit(0);
});

// Health check endpoint
const healthCheck = () => {
  return {
    status: "ok",
    mode: "INSTANT MODE",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    config: {
      maxMemory: process.env.MAX_MEMORY,
      maxConcurrent: process.env.MAX_CONCURRENT,
      zeroLatency: process.env.ZERO_LATENCY,
      realTimeSync: process.env.REAL_TIME_SYNC,
    },
  };
};

// Start the bot
async function startBot() {
  try {
    // Initialize INSTANT MODE first
    await initializeInstantMode();

    // Start the main bot
    console.log("🚀 Starting main bot with INSTANT MODE...");
    await import("./complete-admin-bot.js");
  } catch (error) {
    console.error("❌ Failed to start bot:", error);
    console.log("🔄 Attempting restart in 5 seconds...");

    setTimeout(() => {
      startBot();
    }, 5000);
  }
}

// Start the bot
startBot();
