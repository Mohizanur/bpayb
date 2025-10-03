#!/usr/bin/env node

// 🚀 INTEGRATED SYSTEM DEBUG - Test with Logging Enabled
// Debug version to see what's happening during startup

console.log("🚀 ==============================================");
console.log("🚀 BIRRPAY BOT - INTEGRATED SYSTEM DEBUG");
console.log("🚀 ==============================================");
console.log("");

// Set debug environment variables
process.env.LOG_LEVEL = "info"; // Enable logging for debug
process.env.PERFORMANCE_MODE = "true";
process.env.INTEGRATED_MODE = "true";
process.env.ENABLE_CONSOLE_LOGS = "true"; // Enable console logs
process.env.ENABLE_ERROR_LOGS = "true"; // Enable error logs

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

console.log("⚙️  Debug Configuration:");
console.log("   - Performance Mode: INTEGRATED DEBUG");
console.log("   - Logging: ENABLED");
console.log("   - Error Reporting: ENABLED");
console.log("");

// Optimize Node.js
process.env.NODE_OPTIONS = "--max-old-space-size=1024 --expose-gc";

console.log("📦 Loading performance modules...");

try {
  // Import performance modules one by one to see which fails
  console.log("   Loading ultra performance integration...");
  const { ultraPerformanceIntegration } = await import("./src/utils/ultraPerformanceIntegration.js");
  console.log("   ✅ Ultra performance integration loaded");
  
  console.log("   Loading ultra database...");
  const ultraDatabase = await import("./src/utils/ultraDatabase.js");
  console.log("   ✅ Ultra database loaded");
  
  console.log("   Loading realistic performance...");
  const realisticPerformance = await import("./src/utils/realisticPerformance.js");
  console.log("   ✅ Realistic performance loaded");
  
  console.log("   Loading realistic database...");
  const realisticDatabase = await import("./src/utils/realisticDatabase.js");
  console.log("   ✅ Realistic database loaded");
  
  console.log("   Loading render optimizer...");
  const renderOptimizer = await import("./src/utils/renderOptimizer.js");
  console.log("   ✅ Render optimizer loaded");

  console.log("🚀 Initializing systems...");
  
  // Initialize systems one by one
  console.log("   Initializing ultra performance integration...");
  await ultraPerformanceIntegration.initialize();
  console.log("   ✅ Ultra performance integration initialized");
  
  console.log("   Initializing ultra database...");
  await ultraDatabase.default.initialize();
  console.log("   ✅ Ultra database initialized");
  
  console.log("   Initializing realistic performance...");
  await realisticPerformance.default.initialize();
  console.log("   ✅ Realistic performance initialized");
  
  console.log("   Initializing realistic database...");
  await realisticDatabase.default.initialize();
  console.log("   ✅ Realistic database initialized");
  
  console.log("   Initializing render optimizer...");
  await renderOptimizer.default.initialize();
  console.log("   ✅ Render optimizer initialized");

  console.log("🚀 Creating Express server...");
  
  // Create Express server
  const express = await import("express");
  const app = express.default();
  const PORT = process.env.PORT || 3000;

  // Middleware
  app.use(express.default.json({ limit: '1mb' }));
  app.use(express.default.urlencoded({ extended: true, limit: '1mb' }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    console.log("Health check requested");
    const health = {
      status: 'INTEGRATED_DEBUG_ACTIVE',
      timestamp: Date.now(),
      systems: {
        ultraPerformance: 'active',
        realisticPerformance: 'active',
        renderOptimizer: 'active'
      }
    };
    res.json(health);
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    console.log("Metrics requested");
    const metrics = {
      timestamp: Date.now(),
      mode: 'INTEGRATED_DEBUG',
      systems: {
        ultraPerformance: { status: 'active' },
        realisticPerformance: { status: 'active' },
        renderOptimizer: { status: 'active' }
      }
    };
    res.json(metrics);
  });

  // Production endpoint
  app.get('/production', (req, res) => {
    console.log("Production stats requested");
    const stats = renderOptimizer.default.getProductionStats();
    res.json(stats);
  });

  // Ultra-fast endpoint
  app.get('/ultrafast', (req, res) => {
    console.log("Ultra-fast test requested");
    const response = {
      message: 'Ultra-fast response test',
      timestamp: Date.now(),
      mode: 'INTEGRATED_DEBUG'
    };
    res.json(response);
  });

  // Start server
  console.log("🚀 Starting server...");
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT} - INTEGRATED DEBUG MODE`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
  });

  // Set up graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`⚠️  Received ${signal}, shutting down gracefully...`);
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  console.log("");
  console.log("✅ ==============================================");
  console.log("✅ INTEGRATED DEBUG SYSTEM ACTIVE");
  console.log("✅ ==============================================");
  console.log("");

} catch (error) {
  console.error("");
  console.error("❌ ==============================================");
  console.error("❌ INTEGRATED DEBUG STARTUP FAILED");
  console.error("❌ ==============================================");
  console.error("");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("");
  
  process.exit(1);
}
