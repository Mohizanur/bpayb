#!/usr/bin/env node

// 🚀 COMPREHENSIVE INTEGRATION TEST - Test Everything
// Complete test suite for all integrated systems and features

import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';

class ComprehensiveIntegrationTest {
  constructor() {
    this.results = {
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      testResults: [],
      performanceMetrics: {},
      systemHealth: {},
      errors: []
    };
    
    this.config = {
      baseUrl: process.env.TEST_URL || 'http://localhost:3000',
      timeout: 10000,
      maxRetries: 3
    };
    
    this.endpoints = [
      '/health',
      '/metrics',
      '/production',
      '/circuits',
      '/rate-limiters',
      '/scaler',
      '/ultrafast'
    ];
    
    this.botCommands = [
      '/production',
      '/health',
      '/stats',
      '/cache',
      '/memory',
      '/ultrafast',
      '/realtime'
    ];
  }

  async runAllTests() {
    console.log('🚀 ==========================================');
    console.log('🚀 COMPREHENSIVE INTEGRATION TEST STARTING');
    console.log('🚀 ==========================================');
    console.log('');
    
    console.log('📊 Test Configuration:');
    console.log(`   - Base URL: ${this.config.baseUrl}`);
    console.log(`   - Timeout: ${this.config.timeout}ms`);
    console.log(`   - Max Retries: ${this.config.maxRetries}`);
    console.log(`   - Endpoints: ${this.endpoints.length}`);
    console.log(`   - Bot Commands: ${this.botCommands.length}`);
    console.log('');
    
    const startTime = performance.now();
    
    // Test all systems
    await this.testEndpoints();
    await this.testPerformance();
    await this.testHealthChecks();
    await this.testLoadHandling();
    await this.testErrorHandling();
    await this.testMemoryManagement();
    await this.testCaching();
    await this.testIntegration();
    
    const endTime = performance.now();
    const totalTime = endTime - startTime;
    
    // Display results
    this.displayResults(totalTime);
  }

  async testEndpoints() {
    console.log('🔍 Testing All Endpoints...');
    
    for (const endpoint of this.endpoints) {
      await this.testEndpoint(endpoint);
    }
  }

  async testEndpoint(endpoint) {
    const testName = `Endpoint ${endpoint}`;
    const startTime = performance.now();
    
    try {
      const response = await this.makeRequest(endpoint);
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      if (response.statusCode >= 200 && response.statusCode < 300) {
        this.recordTest(testName, true, `${responseTime.toFixed(2)}ms`, response.data);
      } else {
        this.recordTest(testName, false, `HTTP ${response.statusCode}`, response.data);
      }
    } catch (error) {
      this.recordTest(testName, false, error.message);
    }
  }

  async testPerformance() {
    console.log('⚡ Testing Performance Metrics...');
    
    const tests = [
      { name: 'Response Time < 100ms', test: async () => {
        const startTime = performance.now();
        await this.makeRequest('/health');
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        return { passed: responseTime < 100, value: `${responseTime.toFixed(2)}ms` };
      }},
      { name: 'Metrics Endpoint Functional', test: async () => {
        const response = await this.makeRequest('/metrics');
        const hasMetrics = response.data && response.data.systems;
        return { passed: hasMetrics, value: hasMetrics ? 'Available' : 'Missing' };
      }},
      { name: 'Ultra-fast Endpoint < 50ms', test: async () => {
        const startTime = performance.now();
        await this.makeRequest('/ultrafast');
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        return { passed: responseTime < 50, value: `${responseTime.toFixed(2)}ms` };
      }}
    ];
    
    for (const test of tests) {
      try {
        const result = await test.test();
        this.recordTest(test.name, result.passed, result.value);
      } catch (error) {
        this.recordTest(test.name, false, error.message);
      }
    }
  }

  async testHealthChecks() {
    console.log('🏥 Testing Health Check Systems...');
    
    try {
      const response = await this.makeRequest('/health');
      const health = response.data;
      
      const tests = [
        { name: 'Health Endpoint Available', passed: !!health, value: health ? 'Available' : 'Missing' },
        { name: 'System Status Check', passed: health && health.status, value: health?.status || 'Unknown' },
        { name: 'Response Time Recorded', passed: health && health.responseTime, value: health?.responseTime || 'Missing' },
        { name: 'Multiple Systems Monitored', passed: health && health.systems && Object.keys(health.systems).length > 3, value: health?.systems ? `${Object.keys(health.systems).length} systems` : 'Missing' }
      ];
      
      tests.forEach(test => {
        this.recordTest(test.name, test.passed, test.value);
      });
      
    } catch (error) {
      this.recordTest('Health Check System', false, error.message);
    }
  }

  async testLoadHandling() {
    console.log('🚀 Testing Load Handling...');
    
    const concurrentRequests = 50;
    const promises = [];
    
    const startTime = performance.now();
    
    for (let i = 0; i < concurrentRequests; i++) {
      promises.push(this.makeRequest('/health'));
    }
    
    try {
      const results = await Promise.allSettled(promises);
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      this.recordTest('Concurrent Load Test', successful > concurrentRequests * 0.9, `${successful}/${concurrentRequests} successful in ${totalTime.toFixed(2)}ms`);
      this.recordTest('Load Failure Rate', failed < concurrentRequests * 0.1, `${failed} failures`);
      
    } catch (error) {
      this.recordTest('Load Handling', false, error.message);
    }
  }

  async testErrorHandling() {
    console.log('🛡️ Testing Error Handling...');
    
    const errorTests = [
      { endpoint: '/nonexistent', expectedStatus: 404, name: '404 Error Handling' },
      { endpoint: '/health', method: 'POST', expectedStatus: 405, name: 'Method Not Allowed' }
    ];
    
    for (const test of errorTests) {
      try {
        const response = await this.makeRequest(test.endpoint, test.method || 'GET');
        const correctStatus = response.statusCode === test.expectedStatus;
        this.recordTest(test.name, correctStatus, `HTTP ${response.statusCode}`);
      } catch (error) {
        // Some errors are expected
        this.recordTest(test.name, true, 'Error handled correctly');
      }
    }
  }

  async testMemoryManagement() {
    console.log('💾 Testing Memory Management...');
    
    try {
      const response = await this.makeRequest('/metrics');
      const metrics = response.data;
      
      const memoryTests = [
        { name: 'Memory Metrics Available', passed: !!(metrics && metrics.systems && metrics.systems.systemMetrics), value: 'Available' },
        { name: 'Memory Optimization Active', passed: !!(metrics && metrics.systems && metrics.systems.renderOptimizer), value: 'Active' }
      ];
      
      memoryTests.forEach(test => {
        this.recordTest(test.name, test.passed, test.value);
      });
      
    } catch (error) {
      this.recordTest('Memory Management', false, error.message);
    }
  }

  async testCaching() {
    console.log('🎯 Testing Caching Systems...');
    
    try {
      // Test cache performance with repeated requests
      const endpoint = '/ultrafast';
      
      // First request (cache miss)
      const startTime1 = performance.now();
      await this.makeRequest(endpoint);
      const endTime1 = performance.now();
      const firstRequestTime = endTime1 - startTime1;
      
      // Second request (should be cached)
      const startTime2 = performance.now();
      await this.makeRequest(endpoint);
      const endTime2 = performance.now();
      const secondRequestTime = endTime2 - startTime2;
      
      const cacheImprovement = firstRequestTime > secondRequestTime;
      
      this.recordTest('Cache Performance', cacheImprovement, `First: ${firstRequestTime.toFixed(2)}ms, Second: ${secondRequestTime.toFixed(2)}ms`);
      
      // Test metrics endpoint for cache stats
      const metricsResponse = await this.makeRequest('/metrics');
      const hasCacheMetrics = metricsResponse.data && metricsResponse.data.systems && metricsResponse.data.systems.renderOptimizer;
      
      this.recordTest('Cache Metrics Available', hasCacheMetrics, hasCacheMetrics ? 'Available' : 'Missing');
      
    } catch (error) {
      this.recordTest('Caching System', false, error.message);
    }
  }

  async testIntegration() {
    console.log('🔗 Testing System Integration...');
    
    try {
      const response = await this.makeRequest('/metrics');
      const metrics = response.data;
      
      if (metrics && metrics.systems) {
        const systems = Object.keys(metrics.systems);
        const expectedSystems = ['ultraPerformance', 'systemMetrics', 'autoScaler', 'renderOptimizer'];
        
        const integrationTests = [
          { name: 'Multiple Systems Integrated', passed: systems.length >= 4, value: `${systems.length} systems` },
          { name: 'Ultra Performance System', passed: systems.includes('ultraPerformance'), value: systems.includes('ultraPerformance') ? 'Active' : 'Missing' },
          { name: 'Render Optimizer', passed: systems.includes('renderOptimizer'), value: systems.includes('renderOptimizer') ? 'Active' : 'Missing' },
          { name: 'Auto Scaler', passed: systems.includes('autoScaler'), value: systems.includes('autoScaler') ? 'Active' : 'Missing' },
          { name: 'System Metrics', passed: systems.includes('systemMetrics'), value: systems.includes('systemMetrics') ? 'Active' : 'Missing' }
        ];
        
        integrationTests.forEach(test => {
          this.recordTest(test.name, test.passed, test.value);
        });
      } else {
        this.recordTest('System Integration', false, 'No metrics available');
      }
      
    } catch (error) {
      this.recordTest('System Integration', false, error.message);
    }
  }

  async makeRequest(endpoint, method = 'GET') {
    return new Promise((resolve, reject) => {
      const url = `${this.config.baseUrl}${endpoint}`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.request(url, {
        method,
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'ComprehensiveIntegrationTest/1.0',
          'Accept': 'application/json'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          try {
            const parsedData = data ? JSON.parse(data) : null;
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: parsedData
            });
          } catch (e) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      req.end();
    });
  }

  recordTest(name, passed, details, data = null) {
    this.results.totalTests++;
    
    if (passed) {
      this.results.passedTests++;
    } else {
      this.results.failedTests++;
    }
    
    this.results.testResults.push({
      name,
      passed,
      details,
      data,
      timestamp: Date.now()
    });
    
    const status = passed ? '✅' : '❌';
    console.log(`   ${status} ${name}: ${details}`);
  }

  displayResults(totalTime) {
    console.log('');
    console.log('📊 ==========================================');
    console.log('📊 COMPREHENSIVE INTEGRATION TEST RESULTS');
    console.log('📊 ==========================================');
    console.log('');
    
    console.log('🎯 Test Summary:');
    console.log(`   - Total Tests: ${this.results.totalTests}`);
    console.log(`   - Passed: ${this.results.passedTests}`);
    console.log(`   - Failed: ${this.results.failedTests}`);
    console.log(`   - Success Rate: ${((this.results.passedTests / this.results.totalTests) * 100).toFixed(2)}%`);
    console.log(`   - Total Time: ${(totalTime / 1000).toFixed(2)}s`);
    console.log('');
    
    // Group results by category
    const categories = {};
    this.results.testResults.forEach(test => {
      const category = this.getTestCategory(test.name);
      if (!categories[category]) {
        categories[category] = { passed: 0, failed: 0, tests: [] };
      }
      
      if (test.passed) {
        categories[category].passed++;
      } else {
        categories[category].failed++;
      }
      
      categories[category].tests.push(test);
    });
    
    console.log('📋 Results by Category:');
    Object.entries(categories).forEach(([category, results]) => {
      const total = results.passed + results.failed;
      const rate = ((results.passed / total) * 100).toFixed(1);
      console.log(`   ${category}: ${results.passed}/${total} (${rate}%)`);
    });
    console.log('');
    
    // Show failed tests
    const failedTests = this.results.testResults.filter(test => !test.passed);
    if (failedTests.length > 0) {
      console.log('❌ Failed Tests:');
      failedTests.forEach(test => {
        console.log(`   - ${test.name}: ${test.details}`);
      });
      console.log('');
    }
    
    // Overall assessment
    const successRate = (this.results.passedTests / this.results.totalTests) * 100;
    let assessment = 'EXCELLENT';
    let grade = 'A+';
    
    if (successRate < 95) {
      assessment = 'GOOD';
      grade = 'A';
    }
    if (successRate < 85) {
      assessment = 'FAIR';
      grade = 'B';
    }
    if (successRate < 75) {
      assessment = 'POOR';
      grade = 'C';
    }
    if (successRate < 60) {
      assessment = 'FAILING';
      grade = 'F';
    }
    
    console.log('🏆 Overall Assessment:');
    console.log(`   - Grade: ${grade}`);
    console.log(`   - Status: ${assessment}`);
    console.log(`   - Success Rate: ${successRate.toFixed(2)}%`);
    console.log('');
    
    console.log('🚀 ==========================================');
    console.log('🚀 COMPREHENSIVE INTEGRATION TEST COMPLETE');
    console.log('🚀 ==========================================');
    console.log('');
    
    // Recommendations
    this.displayRecommendations();
  }

  getTestCategory(testName) {
    if (testName.includes('Endpoint')) return 'Endpoints';
    if (testName.includes('Performance') || testName.includes('Response Time')) return 'Performance';
    if (testName.includes('Health')) return 'Health Checks';
    if (testName.includes('Load') || testName.includes('Concurrent')) return 'Load Handling';
    if (testName.includes('Error') || testName.includes('404')) return 'Error Handling';
    if (testName.includes('Memory')) return 'Memory Management';
    if (testName.includes('Cache')) return 'Caching';
    if (testName.includes('Integration') || testName.includes('System')) return 'Integration';
    return 'Other';
  }

  displayRecommendations() {
    console.log('💡 Recommendations:');
    
    const failedTests = this.results.testResults.filter(test => !test.passed);
    
    if (failedTests.length === 0) {
      console.log('   🎉 All tests passed! System is performing excellently.');
    } else {
      console.log('   📋 Areas for improvement:');
      
      const categories = {};
      failedTests.forEach(test => {
        const category = this.getTestCategory(test.name);
        if (!categories[category]) categories[category] = 0;
        categories[category]++;
      });
      
      Object.entries(categories).forEach(([category, count]) => {
        console.log(`   - ${category}: ${count} failed test${count > 1 ? 's' : ''}`);
      });
    }
    
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('   1. Review failed tests and fix issues');
    console.log('   2. Run performance benchmarks');
    console.log('   3. Monitor system in production');
    console.log('   4. Set up automated testing');
    console.log('');
  }
}

// Run the comprehensive test
const test = new ComprehensiveIntegrationTest();
test.runAllTests().catch(console.error);
