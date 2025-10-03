#!/usr/bin/env node

// 🚀 SIMPLE QUOTA-AWARE BOT
// Works with your current CockroachDB setup

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
console.log("   - Database: CockroachDB");
console.log("   - Quota Management: ENABLED");
console.log("");

try {
  console.log("🤖 Starting bot...");
  
  // Import the main bot (this should work with your current setup)
  await import("./complete-admin-bot.js");
  
  console.log("");
  console.log("✅ BOT STARTED SUCCESSFULLY!");
  console.log("🌐 Server: http://localhost:3002");
  console.log("🎯 Quota Management: ACTIVE");
  console.log("📊 Database: CockroachDB");
  console.log("");

} catch (error) {
  console.error("❌ Error:", error.message);
  console.error("Stack:", error.stack);
  process.exit(1);
}
