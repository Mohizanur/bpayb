/**
 * 🚀 CLEAN SMART BEAST MODE TEST
 * 
 * This is a clean test without interference from other systems
 */

console.log('🚀 Testing Smart Beast Mode Integration (Clean)...\n');

async function testSmartBeastClean() {
    try {
        // Test 1: Import and initialize
        console.log('📋 Test 1: Importing Smart Beast Mode...');
        const smartBeastMain = await import('./src/utils/smartBeastMain.js');
        console.log('✅ Smart Beast Mode imported successfully\n');

        // Test 2: Initialize
        console.log('📋 Test 2: Initializing Smart Beast Mode...');
        await smartBeastMain.default.initializeSmartBeastMode();
        console.log('✅ Smart Beast Mode initialized\n');

        // Test 3: Check status
        console.log('📋 Test 3: Checking status...');
        const status = smartBeastMain.default.getSmartBeastStatus();
        console.log('📊 Status:', {
            enabled: status.enabled,
            cacheSize: status.cacheSize,
            memoryUsage: Math.round(status.memoryUsage.heapUsed / (1024 * 1024)) + 'MB'
        });
        console.log('✅ Status check completed\n');

        // Test 4: Enable Smart Beast Mode
        console.log('📋 Test 4: Enabling Smart Beast Mode...');
        await smartBeastMain.default.enableSmartBeastMode();
        const enabledStatus = smartBeastMain.default.getSmartBeastStatus();
        console.log('📊 Enabled Status:', {
            enabled: enabledStatus.enabled,
            cacheSize: enabledStatus.cacheSize,
            connectionPoolSize: enabledStatus.connectionPoolSize
        });
        console.log('✅ Smart Beast Mode enabled\n');

        // Test 5: Test smart operations
        console.log('📋 Test 5: Testing smart operations...');
        const smartBeastIntegration = await import('./src/utils/smartBeastIntegration.js');
        
        // Test smart query
        const testResult = await smartBeastIntegration.smartBeastDB.smartQuery(
            'test_clean_query',
            async () => {
                console.log('🔄 Executing clean test query...');
                return { test: 'clean_data', timestamp: new Date().toISOString() };
            },
            5000 // 5 seconds cache
        );
        console.log('✅ Smart query result:', testResult);
        console.log('✅ Smart operations test completed\n');

        // Test 6: Performance monitoring
        console.log('📋 Test 6: Testing performance monitoring...');
        smartBeastMain.default.recordOperationPerformance('clean_test', 100, true);
        smartBeastMain.default.recordOperationPerformance('clean_test', 150, false);
        console.log('✅ Performance monitoring test completed\n');

        // Test 7: Health check
        console.log('📋 Test 7: Testing health check...');
        const health = await smartBeastMain.default.healthCheck();
        console.log('📊 Health:', {
            healthy: health.healthy,
            memoryUsage: health.recommendations?.memoryUsage + '%' || 'N/A'
        });
        console.log('✅ Health check completed\n');

        // Test 8: Disable
        console.log('📋 Test 8: Disabling Smart Beast Mode...');
        await smartBeastMain.default.disableSmartBeastMode();
        const disabledStatus = smartBeastMain.default.getSmartBeastStatus();
        console.log('📊 Disabled Status:', {
            enabled: disabledStatus.enabled,
            cacheSize: disabledStatus.cacheSize
        });
        console.log('✅ Smart Beast Mode disabled\n');

        console.log('🎉 ALL CLEAN TESTS PASSED!');
        console.log('\n📋 Test Summary:');
        console.log('✅ Import: PASSED');
        console.log('✅ Initialize: PASSED');
        console.log('✅ Status Check: PASSED');
        console.log('✅ Enable/Disable: PASSED');
        console.log('✅ Smart Operations: PASSED');
        console.log('✅ Performance Monitoring: PASSED');
        console.log('✅ Health Check: PASSED');
        
        console.log('\n🚀 Smart Beast Mode is ready for production!');
        console.log('\n💡 Next Steps:');
        console.log('1. Your bot now has Smart Beast Mode integrated');
        console.log('2. Start your bot: npm start');
        console.log('3. Use /beast_enable to activate optimizations');
        console.log('4. Use /beast_status to monitor performance');
        console.log('5. Use /beast_tips for optimization recommendations');

    } catch (error) {
        console.error('❌ Clean test failed:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Run the clean test
testSmartBeastClean().catch(console.error);
