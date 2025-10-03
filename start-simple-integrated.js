#!/usr/bin/env node

// 🚀 SIMPLE INTEGRATED SYSTEM - Working Version
// Simplified integration without problematic Worker threads

console.log("🚀 ==============================================");
console.log("🚀 BIRRPAY BOT - SIMPLE INTEGRATED SYSTEM");
console.log("🚀 ==============================================");
console.log("");

// Set environment variables
process.env.LOG_LEVEL = "info";
process.env.PERFORMANCE_MODE = "true";
process.env.INTEGRATED_MODE = "true";
process.env.ENABLE_CONSOLE_LOGS = "true";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

console.log("⚙️  Simple Integrated Configuration:");
console.log("   - Performance Mode: SIMPLE INTEGRATED");
console.log("   - Logging: ENABLED");
console.log("   - Worker Threads: DISABLED (for stability)");
console.log("");

try {
  // Import only working modules
  console.log("📦 Loading working modules...");
  
  const realisticPerformance = await import("./src/utils/realisticPerformance.js");
  console.log("   ✅ Realistic performance loaded");
  
  const realisticDatabase = await import("./src/utils/realisticDatabase.js");
  console.log("   ✅ Realistic database loaded");
  
  const renderOptimizer = await import("./src/utils/renderOptimizer.js");
  console.log("   ✅ Render optimizer loaded");

  console.log("🚀 Initializing systems...");
  
  // Initialize systems
  await realisticPerformance.default.initialize();
  console.log("   ✅ Realistic performance initialized");
  
  await realisticDatabase.default.initialize();
  console.log("   ✅ Realistic database initialized");
  
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
    const startTime = process.hrtime.bigint();
    
    const realisticHealth = realisticPerformance.default.getHealthStatus();
    const renderHealth = renderOptimizer.default.getHealthStatus();
    const dbHealth = realisticDatabase.default.getHealthStatus();
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000;
    
    const health = {
      status: 'SIMPLE_INTEGRATED_ACTIVE',
      timestamp: Date.now(),
      responseTime: `${responseTime.toFixed(3)}ms`,
      systems: {
        realisticPerformance: realisticHealth,
        renderOptimizer: renderHealth,
        database: dbHealth
      }
    };
    
    console.log(`Health check completed in ${responseTime.toFixed(3)}ms`);
    res.json(health);
  });

  // Metrics endpoint
  app.get('/metrics', (req, res) => {
    const startTime = process.hrtime.bigint();
    
    const realisticStats = realisticPerformance.default.getStats();
    const renderStats = renderOptimizer.default.getProductionStats();
    const dbStats = realisticDatabase.default.getStats();
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000;
    
    const metrics = {
      timestamp: Date.now(),
      responseTime: `${responseTime.toFixed(3)}ms`,
      mode: 'SIMPLE_INTEGRATED',
      systems: {
        realisticPerformance: realisticStats,
        renderOptimizer: renderStats,
        database: dbStats
      }
    };
    
    console.log(`Metrics generated in ${responseTime.toFixed(3)}ms`);
    res.json(metrics);
  });

  // Production endpoint
  app.get('/production', (req, res) => {
    const startTime = process.hrtime.bigint();
    
    const stats = renderOptimizer.default.getProductionStats();
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000;
    
    stats.responseTime = `${responseTime.toFixed(3)}ms`;
    
    console.log(`Production stats in ${responseTime.toFixed(3)}ms`);
    res.json(stats);
  });

  // Ultra-fast endpoint
  app.get('/ultrafast', (req, res) => {
    const startTime = process.hrtime.bigint();
    
    const response = renderOptimizer.default.getInstantResponse('ultrafast_test');
    
    if (!response) {
      const testResponse = {
        message: 'Ultra-fast response test',
        timestamp: Date.now(),
        mode: 'SIMPLE_INTEGRATED',
        cached: false
      };
      
      renderOptimizer.default.setInstantResponse('ultrafast_test', testResponse, 'precomputed');
    }
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1000000;
    
    const result = response || {
      message: 'Ultra-fast response test',
      timestamp: Date.now(),
      mode: 'SIMPLE_INTEGRATED',
      cached: true,
      responseTime: `${responseTime.toFixed(3)}ms`
    };
    
    console.log(`Ultra-fast test in ${responseTime.toFixed(3)}ms`);
    res.json(result);
  });

  // Mock endpoints for testing
  app.get('/circuits', (req, res) => {
    res.json({ status: 'mock', circuits: { total: 0, healthy: 0 } });
  });

  app.get('/rate-limiters', (req, res) => {
    res.json({ status: 'mock', limiters: { total: 0, active: 0 } });
  });

  app.get('/scaler', (req, res) => {
    res.json({ status: 'mock', instances: { current: 1, target: 1 } });
  });

  // Admin endpoints
  app.post('/admin/clearcache', (req, res) => {
    const renderResult = renderOptimizer.default.clearCache();
    realisticPerformance.default.cache.clear();
    
    res.json({
      renderOptimizer: renderResult,
      realisticPerformance: { cleared: 'cache cleared', message: 'Realistic cache cleared' }
    });
  });

  app.post('/admin/gc', (req, res) => {
    const result = renderOptimizer.default.forceGarbageCollection();
    res.json(result);
  });

  // Start server
  console.log("🚀 Starting server...");
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT} - SIMPLE INTEGRATED MODE`);
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
    console.log(`🚀 Production: http://localhost:${PORT}/production`);
    console.log(`⚡ Ultra-fast: http://localhost:${PORT}/ultrafast`);
  });

  // Set up graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`⚠️  Received ${signal}, shutting down gracefully...`);
    
    await Promise.all([
      realisticPerformance.default.shutdown(),
      realisticDatabase.default.shutdown(),
      renderOptimizer.default.shutdown()
    ]);
    
    server.close(() => {
      console.log("✅ Server closed");
      process.exit(0);
    });
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  // Import and start the main bot
  console.log("🤖 Starting main bot...");
  await import("./complete-admin-bot.js");

  console.log("");
  console.log("✅ ==============================================");
  console.log("✅ SIMPLE INTEGRATED SYSTEM ACTIVE");
  console.log("✅ ==============================================");
  console.log("");
  console.log("🏆 ACTIVE SYSTEMS:");
  console.log("   ✓ Realistic Performance System");
  console.log("   ✓ Realistic Database Layer");
  console.log("   ✓ Render Optimizer");
  console.log("   ✓ Express Server");
  console.log("   ✓ Telegram Bot");
  console.log("   ✓ Production Commands");
  console.log("");
  console.log("📊 Performance Targets:");
  console.log("   ✓ Response Time: 50-100ms");
  console.log("   ✓ Concurrent Users: 1,000-3,000");
  console.log("   ✓ Cache Hit Rate: 80-90%");
  console.log("   ✓ Memory: <1GB");
  console.log("   ✓ Uptime: 99%+");
  console.log("");
  console.log("🎯 SIMPLE INTEGRATED SYSTEM - STABLE & WORKING!");
  console.log("");

} catch (error) {
  console.error("");
  console.error("❌ ==============================================");
  console.error("❌ SIMPLE INTEGRATED STARTUP FAILED");
  console.error("❌ ==============================================");
  console.error("");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("");
  
  process.exit(1);
}
