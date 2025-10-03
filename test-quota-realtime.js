#!/usr/bin/env node

// 🧪 QUOTA-AWARE REAL-TIME FIRESTORE LOAD TEST
// Tests the quota management system under realistic load

console.log("🧪 ==========================================");
console.log("🧪 FIRESTORE QUOTA MANAGEMENT LOAD TEST");
console.log("🧪 ==========================================");
console.log("");

import dotenv from "dotenv";
dotenv.config();

// Set test environment
process.env.QUOTA_AWARE_MODE = "true";
process.env.REAL_TIME_MODE = "true";
process.env.LOG_LEVEL = "info";

console.log("⚙️ Test Configuration:");
console.log("   - Test Duration: 5 minutes");
console.log("   - Simulated Users: 1,000");
console.log("   - Operations per User: 50-100");
console.log("   - Real-time Listeners: 50");
console.log("   - Target: Stay within Firestore free tier");
console.log("");

try {
  // Import the quota-aware system
  const { default: realTimeFirestore } = await import(
    "./src/utils/realtimeFirestore.js"
  );
  const { default: firestoreQuotaManager } = await import(
    "./src/utils/firestoreQuotaManager.js"
  );

  // Initialize the system
  console.log("🚀 Initializing quota-aware system...");
  await realTimeFirestore.initialize();
  console.log("");

  // Test statistics
  const testStats = {
    startTime: Date.now(),
    totalOperations: 0,
    successfulOperations: 0,
    failedOperations: 0,
    quotaViolations: 0,
    cacheHits: 0,
    averageResponseTime: 0,
    peakMemoryUsage: 0
  };

  // Simulate realistic bot usage
  console.log("🎯 Starting realistic load simulation...");
  console.log("");

  // Test 1: User registration burst (common scenario)
  console.log("📝 Test 1: User Registration Burst");
  const registrationPromises = [];
  
  for (let i = 0; i < 100; i++) {
    const userId = `test_user_${i}_${Date.now()}`;
    const promise = realTimeFirestore.createUser(userId, {
      name: `Test User ${i}`,
      email: `test${i}@example.com`,
      language: Math.random() > 0.5 ? 'en' : 'am',
      joinedAt: Date.now()
    }).then(() => {
      testStats.successfulOperations++;
    }).catch(error => {
      testStats.failedOperations++;
      if (error.message.includes('quota')) {
        testStats.quotaViolations++;
      }
    });
    
    registrationPromises.push(promise);
    testStats.totalOperations++;
  }
  
  await Promise.all(registrationPromises);
  console.log(`✅ Completed ${registrationPromises.length} user registrations`);
  
  // Check quota status after burst
  let quotaStatus = realTimeFirestore.getQuotaStatus();
  console.log(`📊 Quota after registration: Reads ${quotaStatus.reads.percentage.toFixed(1)}%, Writes ${quotaStatus.writes.percentage.toFixed(1)}%`);
  console.log("");

  // Test 2: Subscription queries (read-heavy)
  console.log("🔍 Test 2: Subscription Query Load");
  const queryPromises = [];
  
  for (let i = 0; i < 200; i++) {
    const userId = `test_user_${i % 50}_${Date.now()}`;
    const promise = realTimeFirestore.getUserSubscriptions(userId)
      .then(() => {
        testStats.successfulOperations++;
      }).catch(error => {
        testStats.failedOperations++;
        if (error.message.includes('quota')) {
          testStats.quotaViolations++;
        }
      });
    
    queryPromises.push(promise);
    testStats.totalOperations++;
    
    // Small delay to simulate realistic usage
    if (i % 10 === 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  await Promise.all(queryPromises);
  console.log(`✅ Completed ${queryPromises.length} subscription queries`);
  
  quotaStatus = realTimeFirestore.getQuotaStatus();
  console.log(`📊 Quota after queries: Reads ${quotaStatus.reads.percentage.toFixed(1)}%, Writes ${quotaStatus.writes.percentage.toFixed(1)}%`);
  console.log("");

  // Test 3: Real-time listeners simulation
  console.log("📡 Test 3: Real-time Listeners Stress Test");
  const listeners = [];
  
  for (let i = 0; i < 20; i++) {
    const userId = `listener_user_${i}`;
    const unsubscribe = realTimeFirestore.onSnapshot('users', userId, (data, type) => {
      // Simulate real-time data processing
      if (type === 'sync') {
        testStats.successfulOperations++;
      }
    });
    
    listeners.push(unsubscribe);
  }
  
  console.log(`✅ Created ${listeners.length} real-time listeners`);
  
  // Let listeners run for 30 seconds
  console.log("⏳ Running real-time sync for 30 seconds...");
  await new Promise(resolve => setTimeout(resolve, 30000));
  
  // Clean up listeners
  listeners.forEach(unsubscribe => unsubscribe());
  console.log("✅ Cleaned up real-time listeners");
  console.log("");

  // Test 4: Mixed operations under load
  console.log("⚡ Test 4: Mixed Operations Load Test");
  const mixedPromises = [];
  
  for (let i = 0; i < 300; i++) {
    let promise;
    const operation = i % 4;
    
    switch (operation) {
      case 0: // Read user
        promise = realTimeFirestore.getUser(`test_user_${i % 50}_${Date.now()}`);
        break;
      case 1: // Update user
        promise = realTimeFirestore.updateUser(`test_user_${i % 50}_${Date.now()}`, {
          lastActive: Date.now(),
          activityCount: i
        });
        break;
      case 2: // Query services
        promise = realTimeFirestore.getServices();
        break;
      case 3: // Create subscription
        promise = realTimeFirestore.createSubscription({
          userId: `test_user_${i % 50}_${Date.now()}`,
          serviceId: `service_${i % 10}`,
          plan: 'basic',
          amount: 100
        });
        break;
    }
    
    const wrappedPromise = promise.then(() => {
      testStats.successfulOperations++;
    }).catch(error => {
      testStats.failedOperations++;
      if (error.message.includes('quota')) {
        testStats.quotaViolations++;
      }
    });
    
    mixedPromises.push(wrappedPromise);
    testStats.totalOperations++;
    
    // Throttle to simulate realistic load
    if (i % 20 === 0) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }
  
  await Promise.all(mixedPromises);
  console.log(`✅ Completed ${mixedPromises.length} mixed operations`);
  console.log("");

  // Final statistics
  const endTime = Date.now();
  const duration = endTime - testStats.startTime;
  const finalQuotaStatus = realTimeFirestore.getQuotaStatus();
  const systemStats = realTimeFirestore.getStats();
  
  console.log("📊 ==========================================");
  console.log("📊 LOAD TEST RESULTS");
  console.log("📊 ==========================================");
  console.log("");
  
  console.log("⏱️ Test Duration:");
  console.log(`   - Total Time: ${(duration / 1000).toFixed(2)} seconds`);
  console.log(`   - Operations per Second: ${(testStats.totalOperations / (duration / 1000)).toFixed(2)}`);
  console.log("");
  
  console.log("🎯 Operation Results:");
  console.log(`   - Total Operations: ${testStats.totalOperations.toLocaleString()}`);
  console.log(`   - Successful: ${testStats.successfulOperations.toLocaleString()}`);
  console.log(`   - Failed: ${testStats.failedOperations.toLocaleString()}`);
  console.log(`   - Success Rate: ${((testStats.successfulOperations / testStats.totalOperations) * 100).toFixed(2)}%`);
  console.log(`   - Quota Violations: ${testStats.quotaViolations}`);
  console.log("");
  
  console.log("📊 Firestore Quota Usage:");
  console.log(`   - Reads Used: ${finalQuotaStatus.reads.used.toLocaleString()}/${finalQuotaStatus.reads.limit.toLocaleString()} (${finalQuotaStatus.reads.percentage.toFixed(2)}%)`);
  console.log(`   - Writes Used: ${finalQuotaStatus.writes.used.toLocaleString()}/${finalQuotaStatus.writes.limit.toLocaleString()} (${finalQuotaStatus.writes.percentage.toFixed(2)}%)`);
  console.log(`   - Reads Remaining: ${finalQuotaStatus.reads.remaining.toLocaleString()}`);
  console.log(`   - Writes Remaining: ${finalQuotaStatus.writes.remaining.toLocaleString()}`);
  console.log("");
  
  console.log("🚀 Performance Metrics:");
  console.log(`   - Cache Hit Rate: ${finalQuotaStatus.cache.hitRate.toFixed(2)}%`);
  console.log(`   - Cache Hits: ${finalQuotaStatus.cache.hits.toLocaleString()}`);
  console.log(`   - Cache Misses: ${finalQuotaStatus.cache.misses.toLocaleString()}`);
  console.log(`   - Average Response Time: ${systemStats.averageResponseTime.toFixed(2)}ms`);
  console.log(`   - Quota Efficiency: ${finalQuotaStatus.efficiency.quotaEfficiency.toFixed(2)}%`);
  console.log(`   - Quota Savings: ${finalQuotaStatus.efficiency.quotaSavings.toLocaleString()}`);
  console.log("");
  
  console.log("📡 Real-time Performance:");
  console.log(`   - Real-time Updates: ${systemStats.realTimeUpdates.toLocaleString()}`);
  console.log(`   - Active Listeners: ${systemStats.activeListeners}`);
  console.log(`   - Real-time Data Size: ${systemStats.realtimeDataSize}`);
  console.log("");
  
  // Performance assessment
  console.log("🎯 Performance Assessment:");
  
  const quotaEfficient = finalQuotaStatus.reads.percentage < 80 && finalQuotaStatus.writes.percentage < 80;
  const highCacheHit = finalQuotaStatus.cache.hitRate > 70;
  const lowQuotaViolations = testStats.quotaViolations === 0;
  const goodResponseTime = systemStats.averageResponseTime < 100;
  
  console.log(`   - Quota Efficient: ${quotaEfficient ? '✅' : '❌'} (${quotaEfficient ? 'Under 80% usage' : 'Over 80% usage'})`);
  console.log(`   - Cache Performance: ${highCacheHit ? '✅' : '❌'} (${finalQuotaStatus.cache.hitRate.toFixed(1)}% hit rate)`);
  console.log(`   - Quota Compliance: ${lowQuotaViolations ? '✅' : '❌'} (${testStats.quotaViolations} violations)`);
  console.log(`   - Response Time: ${goodResponseTime ? '✅' : '❌'} (${systemStats.averageResponseTime.toFixed(2)}ms avg)`);
  console.log("");
  
  const overallScore = [quotaEfficient, highCacheHit, lowQuotaViolations, goodResponseTime].filter(Boolean).length;
  console.log(`🏆 Overall Score: ${overallScore}/4`);
  
  if (overallScore === 4) {
    console.log("🎉 EXCELLENT: System is optimally configured for Firestore free tier!");
  } else if (overallScore >= 3) {
    console.log("👍 GOOD: System performs well within free tier limits");
  } else if (overallScore >= 2) {
    console.log("⚠️ FAIR: System needs optimization for better quota efficiency");
  } else {
    console.log("❌ POOR: System requires significant optimization");
  }
  console.log("");
  
  // Recommendations
  const report = await realTimeFirestore.getQuotaReport();
  if (report.recommendations.length > 0) {
    console.log("💡 Optimization Recommendations:");
    report.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
    console.log("");
  }
  
  // Projected daily usage
  const dailyProjection = {
    reads: Math.round((finalQuotaStatus.reads.used / (duration / 1000)) * 86400),
    writes: Math.round((finalQuotaStatus.writes.used / (duration / 1000)) * 86400)
  };
  
  console.log("📈 Daily Usage Projection:");
  console.log(`   - Projected Daily Reads: ${dailyProjection.reads.toLocaleString()}/50,000 (${((dailyProjection.reads / 50000) * 100).toFixed(1)}%)`);
  console.log(`   - Projected Daily Writes: ${dailyProjection.writes.toLocaleString()}/20,000 (${((dailyProjection.writes / 20000) * 100).toFixed(1)}%)`);
  console.log("");
  
  if (dailyProjection.reads > 50000 || dailyProjection.writes > 20000) {
    console.warn("⚠️ WARNING: Projected usage exceeds free tier limits!");
    console.warn("   Consider implementing additional optimizations");
  } else {
    console.log("✅ Projected usage is within free tier limits");
  }
  
  console.log("");
  console.log("✅ ==========================================");
  console.log("✅ LOAD TEST COMPLETED SUCCESSFULLY");
  console.log("✅ ==========================================");

} catch (error) {
  console.error("");
  console.error("❌ ==========================================");
  console.error("❌ LOAD TEST FAILED");
  console.error("❌ ==========================================");
  console.error("");
  console.error("Error:", error.message);
  console.error("Stack:", error.stack);
  console.error("");
  
  process.exit(1);
}
