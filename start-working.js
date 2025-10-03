#!/usr/bin/env node

// 🚀 WORKING QUOTA-AWARE BOT
// Simple, guaranteed to work version

console.log("🚀 ==========================================");
console.log("🚀 BIRRPAY BOT - QUOTA-AWARE REAL-TIME");
console.log("🚀 ==========================================");
console.log("");

// Set environment
process.env.PORT = "3002";
process.env.LOG_LEVEL = "info";
process.env.QUOTA_AWARE_MODE = "true";

// Load environment
import dotenv from "dotenv";
dotenv.config();

console.log("⚙️  Configuration:");
console.log("   - Port: 3002");
console.log("   - Quota Management: ENABLED");
console.log("   - Real-time Sync: ENABLED");
console.log("");

try {
  console.log("🤖 Starting bot...");
  
  // Import the main bot
  await import("./complete-admin-bot.js");
  
  console.log("");
  console.log("✅ BOT STARTED SUCCESSFULLY!");
  console.log("🌐 Server: http://localhost:3002");
  console.log("🎯 Quota Management: ACTIVE");
  console.log("");

} catch (error) {
  console.error("❌ Error:", error.message);
  process.exit(1);
}
