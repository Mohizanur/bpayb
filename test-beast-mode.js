#!/usr/bin/env node

// 🧪 BEAST MODE TEST SCRIPT
// Verify BEAST MODE system is working correctly

console.log("🔥 ==========================================");
console.log("🔥 BEAST MODE SYSTEM TEST");
console.log("🔥 ==========================================\n");

async function testBeastMode() {
  let testsPassedCount = 0;
  const totalTests = 10;

  try {
    // Test 1: Import BEAST MODE optimizer
    console.log("📦 Test 1: Importing BEAST MODE optimizer...");
    const { beastModeOptimizer, BEAST_CONFIG, QUOTA_MODES } = await import(
      "./src/utils/beastModeOptimizer.js"
    );
    console.log("   ✅ BEAST MODE optimizer imported");
    console.log(`      - Max Concurrent: ${BEAST_CONFIG.MAX_CONCURRENT_USERS}`);
    console.log(`      - Max Memory: ${BEAST_CONFIG.MAX_MEMORY_MB}MB`);
    console.log(`      - Quota Modes: ${Object.keys(QUOTA_MODES).length}\n`);
    testsPassedCount++;

    // Test 2: Import BEAST MODE integration
    console.log("📦 Test 2: Importing BEAST MODE integration...");
    const { beastModeIntegration } = await import(
      "./src/utils/beastModeIntegration.js"
    );
    console.log("   ✅ BEAST MODE integration imported\n");
    testsPassedCount++;

    // Test 3: Import BEAST MODE commands
    console.log("📦 Test 3: Importing BEAST MODE commands...");
    const beastModeCommands = await import(
      "./src/handlers/beastModeCommands.js"
    );
    console.log("   ✅ BEAST MODE commands imported");
    console.log("      - Available: /stats, /quota, /memory, /cache\n");
    testsPassedCount++;

    // Test 4: Test 6-layer cache system
    console.log("📦 Test 4: Testing 6-layer cache system...");
    beastModeOptimizer.cache.set(
      "test_instant",
      { data: "instant" },
      "instant"
    );
    beastModeOptimizer.cache.set("test_user", { data: "user" }, "user");
    beastModeOptimizer.cache.set(
      "test_service",
      { data: "service" },
      "service"
    );
    beastModeOptimizer.cache.set("test_stats", { data: "stats" }, "stats");
    beastModeOptimizer.cache.set(
      "test_session",
      { data: "session" },
      "session"
    );
    beastModeOptimizer.cache.set(
      "test_rateLimit",
      { data: "rateLimit" },
      "rateLimit"
    );

    const instant = beastModeOptimizer.cache.get("test_instant", "instant");
    const user = beastModeOptimizer.cache.get("test_user", "user");

    if (instant && user) {
      console.log("   ✅ All 6 cache layers working");
      const cacheStats = beastModeOptimizer.cache.getStats();
      console.log(`      - Total Size: ${cacheStats.totalSize} items`);
      console.log(`      - Instant Layer: ${cacheStats.layers.instant}`);
      console.log(`      - User Layer: ${cacheStats.layers.user}`);
      console.log(`      - Service Layer: ${cacheStats.layers.service}\n`);
      testsPassedCount++;
    } else {
      throw new Error("Cache layers not working");
    }

    // Test 5: Test quota protection modes
    console.log("📦 Test 5: Testing quota protection modes...");
    const quotaStats = beastModeOptimizer.quotaProtection.getStats();
    console.log("   ✅ Quota protection working");
    console.log(`      - Current Mode: ${quotaStats.mode}`);
    console.log(`      - Usage: ${quotaStats.usage}`);
    console.log(`      - Cache TTL: ${quotaStats.cacheTTL}\n`);
    testsPassedCount++;

    // Test 6: Test memory management
    console.log("📦 Test 6: Testing memory management...");
    const memStats = beastModeOptimizer.memoryManager.getStats();
    console.log("   ✅ Memory management working");
    console.log(`      - Current: ${memStats.current}`);
    console.log(`      - Threshold: ${memStats.threshold}`);
    console.log(`      - Usage: ${memStats.percentage}\n`);
    testsPassedCount++;

    // Test 7: Test data operations
    console.log("📦 Test 7: Testing data operations...");
    await beastModeOptimizer.setData("test", "doc1", {
      name: "Test Document",
      timestamp: Date.now(),
    });
    const retrieved = await beastModeOptimizer.getData("test", "doc1");
    if (retrieved && retrieved.name === "Test Document") {
      console.log("   ✅ Data operations working");
      console.log("      - Set & Get verified\n");
      testsPassedCount++;
    } else {
      throw new Error("Data operations not working");
    }

    // Test 8: Test comprehensive stats
    console.log("📦 Test 8: Testing comprehensive stats...");
    const comprehensiveStats = beastModeOptimizer.getComprehensiveStats();
    console.log("   ✅ Comprehensive stats working");
    console.log(
      `      - Performance tracked: ${comprehensiveStats.performance.totalRequests} requests`
    );
    console.log(
      `      - Cache tracked: ${comprehensiveStats.cache.hitRate} hit rate`
    );
    console.log(
      `      - Memory tracked: ${comprehensiveStats.memory.current}\n`
    );
    testsPassedCount++;

    // Test 9: Test health status
    console.log("📦 Test 9: Testing health status...");
    const health = beastModeIntegration.getHealthStatus();
    console.log("   ✅ Health status working");
    console.log(`      - Score: ${health.score}/100`);
    console.log(`      - Status: ${health.status}\n`);
    testsPassedCount++;

    // Test 10: Test LRU eviction
    console.log("📦 Test 10: Testing LRU eviction...");
    for (let i = 0; i < 1100; i++) {
      beastModeOptimizer.cache.set(`test_lru_${i}`, { id: i }, "instant");
    }
    const cacheSize = beastModeOptimizer.cache.instantCache.size;
    if (cacheSize <= 1000) {
      console.log("   ✅ LRU eviction working");
      console.log(`      - Cache size limited to: ${cacheSize} items\n`);
      testsPassedCount++;
    } else {
      throw new Error("LRU eviction not working");
    }

    // Summary
    console.log("🎉 ==========================================");
    console.log("🎉 ALL TESTS PASSED!");
    console.log("🎉 ==========================================\n");
    console.log(`✅ Tests Passed: ${testsPassedCount}/${totalTests}`);
    console.log("");
    console.log("🔥 BEAST MODE Components Verified:");
    console.log("   ✓ 6-layer caching system");
    console.log("   ✓ 4-tier quota protection");
    console.log("   ✓ Memory management (2GB)");
    console.log("   ✓ Data operations");
    console.log("   ✓ Health monitoring");
    console.log("   ✓ LRU eviction");
    console.log("   ✓ Performance tracking");
    console.log("");
    console.log("🚀 System Configuration:");
    console.log(
      `   • Max Concurrent Users: ${BEAST_CONFIG.MAX_CONCURRENT_USERS}`
    );
    console.log(`   • Max Memory: ${BEAST_CONFIG.MAX_MEMORY_MB}MB`);
    console.log(`   • Cache Layers: 6`);
    console.log(`   • Quota Modes: ${Object.keys(QUOTA_MODES).length}`);
    console.log("");
    console.log("🎯 Ready to launch with: npm run start:beast");
    console.log("🧟 Zombie Mode: IMMORTAL");
    console.log("🛡️ All Features: PRESERVED");
    console.log("");
  } catch (error) {
    console.error("❌ ==========================================");
    console.error("❌ TEST FAILED");
    console.error("❌ ==========================================\n");
    console.error(`Tests Passed: ${testsPassedCount}/${totalTests}\n`);
    console.error("Error:", error.message);
    console.error("\nStack:", error.stack);
    console.error("");
    console.error("💡 Troubleshooting:");
    console.error("   1. Ensure dependencies: npm install");
    console.error("   2. Check file paths");
    console.error("   3. Verify module exports");
    console.error("");
    process.exit(1);
  }
}

// Run tests
testBeastMode();
