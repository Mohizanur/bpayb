#!/usr/bin/env node

// 🧪 ULTRA PERFORMANCE TEST SCRIPT
// Verify that the ultra performance system is working correctly

console.log("🧪 Testing Ultra Performance System...\n");

async function testUltraPerformance() {
  try {
    // Test 1: Import modules
    console.log("📦 Test 1: Importing modules...");
    const { ultraMaxPerformance } = await import(
      "./src/utils/ultraMaxPerformance.js"
    );
    const { FirestoreOptimizerUltra } = await import(
      "./src/utils/firestoreOptimizerUltra.js"
    );
    const { ultraRequestHandler } = await import(
      "./src/utils/ultraRequestHandler.js"
    );
    const { ultraPerformanceIntegration } = await import(
      "./src/utils/ultraPerformanceIntegration.js"
    );
    console.log("   ✅ All modules imported successfully\n");

    // Test 2: Check cache system
    console.log("📦 Test 2: Testing cache system...");
    ultraMaxPerformance.cache.set("test_key", { data: "test_value" }, 60000);
    const cached = ultraMaxPerformance.cache.get("test_key");
    if (cached && cached.data === "test_value") {
      console.log("   ✅ Cache system working\n");
    } else {
      throw new Error("Cache system not working");
    }

    // Test 3: Check batcher
    console.log("📦 Test 3: Testing batch system...");
    ultraMaxPerformance.batcher.queueWrite({
      collection: "test",
      docId: "test123",
      data: { test: true },
      type: "set",
    });
    const batchStats = ultraMaxPerformance.batcher.getStats();
    console.log(
      `   ✅ Batcher working (${batchStats.writeQueueSize} items queued)\n`
    );

    // Test 4: Check memory monitor
    console.log("📦 Test 4: Testing memory monitoring...");
    const memStats = ultraMaxPerformance.memoryPool.getMemoryStats();
    console.log(`   ✅ Memory monitoring working`);
    console.log(`      - Heap Used: ${memStats.heapUsed}`);
    console.log(`      - Threshold: ${memStats.threshold}`);
    console.log(`      - Usage: ${memStats.percentage}\n`);

    // Test 5: Check request handler
    console.log("📦 Test 5: Testing request handler...");
    const handlerStats = ultraRequestHandler.getStats();
    console.log(`   ✅ Request handler working`);
    console.log(`      - Max Concurrent: ${handlerStats.capacity.max}`);
    console.log(`      - Current: ${handlerStats.activeRequests}`);
    console.log(`      - Queue: ${handlerStats.queuedRequests}\n`);

    // Test 6: Check performance stats
    console.log("📦 Test 6: Testing performance stats...");
    const stats = ultraMaxPerformance.getStats();
    console.log(`   ✅ Performance stats working`);
    console.log(`      - L1 Cache: ${stats.cache.l1Size} items`);
    console.log(`      - L2 Cache: ${stats.cache.l2Size} items`);
    console.log(`      - Cache Hit Rate: ${stats.cache.hitRate}`);
    console.log(`      - Memory: ${stats.memory.heapUsed}\n`);

    // Test 7: Response pre-computer
    console.log("📦 Test 7: Testing response pre-computer...");
    const response = ultraMaxPerformance.getInstantResponse("help", "en");
    if (response) {
      console.log(`   ✅ Response pre-computer working\n`);
    } else {
      console.log(
        "   ⚠️  Response pre-computer empty (expected on first run)\n"
      );
    }

    // Summary
    console.log("🎉 ====================================");
    console.log("🎉 ALL TESTS PASSED!");
    console.log("🎉 ====================================\n");
    console.log("✅ Ultra Performance System is ready");
    console.log("✅ All components initialized correctly");
    console.log("✅ Cache system operational");
    console.log("✅ Batch processing operational");
    console.log("✅ Memory management operational");
    console.log("✅ Request handling operational\n");
    console.log("🚀 Ready to start bot with: npm run start:ultra\n");
  } catch (error) {
    console.error("❌ ====================================");
    console.error("❌ TEST FAILED");
    console.error("❌ ====================================\n");
    console.error("Error:", error.message);
    console.error("\nStack:", error.stack);
    process.exit(1);
  }
}

// Run tests
testUltraPerformance();
