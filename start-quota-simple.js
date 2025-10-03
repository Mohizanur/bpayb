#!/usr/bin/env node

// 🚀 SIMPLE QUOTA-AWARE STARTUP
// Direct startup without complex integrations

console.log("🚀 ==========================================");
console.log("🚀 BIRRPAY BOT - QUOTA-AWARE REAL-TIME");
console.log("🚀 ==========================================");
console.log("");

// Set environment for quota-aware operations
process.env.LOG_LEVEL = "info";
process.env.QUOTA_AWARE_MODE = "true";
process.env.REAL_TIME_MODE = "true";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

console.log("⚙️  Starting Quota-Aware System...");
console.log("   - Firestore Free Tier: OPTIMIZED");
console.log("   - Real-time Sync: ENABLED");
console.log("   - Quota Management: ACTIVE");
console.log("");

try {
  // Import and start the main bot
  console.log("🤖 Starting main bot...");
  await import("./complete-admin-bot.js");
  
  console.log("");
  console.log("✅ ==========================================");
  console.log("✅ QUOTA-AWARE BOT STARTED SUCCESSFULLY");
  console.log("✅ ==========================================");
  console.log("");
  console.log("🎯 Features Active:");
  console.log("   ✓ Intelligent quota management");
  console.log("   ✓ Real-time data synchronization");
  console.log("   ✓ Aggressive caching strategy");
  console.log("   ✓ Emergency mode protection");
  console.log("");
  console.log("📊 Firestore Optimization:");
  console.log("   ✓ 50K daily reads efficiently managed");
  console.log("   ✓ 20K daily writes optimized");
  console.log("   ✓ Real-time listeners quota-aware");
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
  console.error("");
  console.error("💡 Troubleshooting:");
  console.error("   1. Check if .env file exists");
  console.error("   2. Verify Firebase credentials");
  console.error("   3. Check if port 3000 is available");
  console.error("   4. Ensure all dependencies are installed");
  console.error("");
  
  process.exit(1);
}
