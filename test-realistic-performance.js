#!/usr/bin/env node

// 🚀 REALISTIC PERFORMANCE TEST - Real-World Load Testing
// Tests the bot's ability to handle realistic concurrent load

import http from 'http';
import https from 'https';
import { performance } from 'perf_hooks';

class RealisticPerformanceTest {
  constructor() {
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      minResponseTime: Infinity,
      maxResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      requestsPerSecond: 0,
      concurrentUsers: 0,
      testDuration: 0,
      errors: []
    };
    
    this.responseTimes = [];
    this.startTime = 0;
    this.endTime = 0;
    this.isRunning = false;
    
    // Realistic test configuration
    this.config = {
      baseUrl: process.env.TEST_URL || 'http://localhost:3000',
      maxConcurrentUsers: 1000, // Realistic limit
      testDuration: 30000, // 30 seconds
      rampUpTime: 5000, // 5 seconds
      requestsPerUser: 10, // Realistic number
      endpoints: [
        '/health',
        '/metrics',
        '/',
        '/admin'
      ]
    };
  }

  async runTest() {
    console.log('🚀 ==========================================');
    console.log('🚀 REALISTIC PERFORMANCE TEST STARTING');
    console.log('🚀 ==========================================');
    console.log('');
    
    console.log('📊 Test Configuration:');
    console.log(`   - Base URL: ${this.config.baseUrl}`);
    console.log(`   - Max Concurrent Users: ${this.config.maxConcurrentUsers}`);
    console.log(`   - Test Duration: ${this.config.testDuration / 1000}s`);
    console.log(`   - Ramp Up Time: ${this.config.rampUpTime / 1000}s`);
    console.log(`   - Requests per User: ${this.config.requestsPerUser}`);
    console.log(`   - Endpoints: ${this.config.endpoints.join(', ')}`);
    console.log('');
    
    this.startTime = performance.now();
    this.isRunning = true;
    
    // Start the test
    await this.startLoadTest();
    
    this.endTime = performance.now();
    this.isRunning = false;
    
    // Calculate results
    this.calculateResults();
    
    // Display results
    this.displayResults();
  }

  async startLoadTest() {
    const promises = [];
    
    // Ramp up users gradually
    const rampUpInterval = this.config.rampUpTime / this.config.maxConcurrentUsers;
    
    for (let i = 0; i < this.config.maxConcurrentUsers; i++) {
      const userDelay = i * rampUpInterval;
      
      setTimeout(() => {
        const userPromise = this.simulateUser(i);
        promises.push(userPromise);
      }, userDelay);
    }
    
    // Wait for test duration
    await new Promise(resolve => setTimeout(resolve, this.config.testDuration));
    
    // Wait for all users to complete
    await Promise.allSettled(promises);
  }

  async simulateUser(userId) {
    const userStartTime = performance.now();
    let requestCount = 0;
    
    while (this.isRunning && requestCount < this.config.requestsPerUser) {
      try {
        const endpoint = this.config.endpoints[requestCount % this.config.endpoints.length];
        const responseTime = await this.makeRequest(endpoint);
        
        this.responseTimes.push(responseTime);
        this.results.totalRequests++;
        this.results.successfulRequests++;
        
        // Update min/max response times
        this.results.minResponseTime = Math.min(this.results.minResponseTime, responseTime);
        this.results.maxResponseTime = Math.max(this.results.maxResponseTime, responseTime);
        
        requestCount++;
        
        // Realistic delay between requests
        await new Promise(resolve => setTimeout(resolve, 100)); // 100ms delay
        
      } catch (error) {
        this.results.failedRequests++;
        this.results.errors.push({
          userId,
          requestCount,
          error: error.message,
          timestamp: Date.now()
        });
      }
    }
    
    const userEndTime = performance.now();
    const userDuration = userEndTime - userStartTime;
    
    if (userId % 100 === 0) { // Log every 100th user
      console.log(`👤 User ${userId} completed ${requestCount} requests in ${userDuration.toFixed(2)}ms`);
    }
  }

  async makeRequest(endpoint) {
    const startTime = performance.now();
    
    return new Promise((resolve, reject) => {
      const url = `${this.config.baseUrl}${endpoint}`;
      const isHttps = url.startsWith('https');
      const client = isHttps ? https : http;
      
      const req = client.request(url, {
        method: 'GET',
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'RealisticPerformanceTest/1.0',
          'Connection': 'keep-alive'
        }
      }, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          const endTime = performance.now();
          const responseTime = endTime - startTime;
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(responseTime);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
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

  calculateResults() {
    this.results.testDuration = this.endTime - this.startTime;
    this.results.requestsPerSecond = (this.results.totalRequests / this.results.testDuration) * 1000;
    
    // Calculate average response time
    if (this.responseTimes.length > 0) {
      this.results.averageResponseTime = this.responseTimes.reduce((a, b) => a + b, 0) / this.responseTimes.length;
      
      // Calculate percentiles
      const sortedTimes = this.responseTimes.sort((a, b) => a - b);
      const p95Index = Math.floor(sortedTimes.length * 0.95);
      const p99Index = Math.floor(sortedTimes.length * 0.99);
      
      this.results.p95ResponseTime = sortedTimes[p95Index] || 0;
      this.results.p99ResponseTime = sortedTimes[p99Index] || 0;
    }
    
    // Calculate success rate
    const successRate = (this.results.successfulRequests / this.results.totalRequests) * 100;
    this.results.successRate = successRate;
  }

  displayResults() {
    console.log('');
    console.log('📊 ==========================================');
    console.log('📊 REALISTIC PERFORMANCE TEST RESULTS');
    console.log('📊 ==========================================');
    console.log('');
    
    console.log('🎯 Test Summary:');
    console.log(`   - Test Duration: ${(this.results.testDuration / 1000).toFixed(2)}s`);
    console.log(`   - Total Requests: ${this.results.totalRequests.toLocaleString()}`);
    console.log(`   - Successful Requests: ${this.results.successfulRequests.toLocaleString()}`);
    console.log(`   - Failed Requests: ${this.results.failedRequests.toLocaleString()}`);
    console.log(`   - Success Rate: ${this.results.successRate.toFixed(2)}%`);
    console.log('');
    
    console.log('⚡ Performance Metrics:');
    console.log(`   - Requests/Second: ${this.results.requestsPerSecond.toFixed(2)}`);
    console.log(`   - Average Response Time: ${this.results.averageResponseTime.toFixed(2)}ms`);
    console.log(`   - Min Response Time: ${this.results.minResponseTime.toFixed(2)}ms`);
    console.log(`   - Max Response Time: ${this.results.maxResponseTime.toFixed(2)}ms`);
    console.log(`   - 95th Percentile: ${this.results.p95ResponseTime.toFixed(2)}ms`);
    console.log(`   - 99th Percentile: ${this.results.p99ResponseTime.toFixed(2)}ms`);
    console.log('');
    
    console.log('🎯 Performance Assessment:');
    
    // Realistic performance assessment
    let performanceGrade = 'A';
    let performanceStatus = 'EXCELLENT';
    
    if (this.results.averageResponseTime > 200) {
      performanceGrade = 'C';
      performanceStatus = 'NEEDS IMPROVEMENT';
    } else if (this.results.averageResponseTime > 100) {
      performanceGrade = 'B';
      performanceStatus = 'GOOD';
    } else if (this.results.averageResponseTime > 50) {
      performanceGrade = 'A';
      performanceStatus = 'VERY GOOD';
    }
    
    if (this.results.successRate < 95) {
      performanceGrade = 'D';
      performanceStatus = 'POOR';
    }
    
    console.log(`   - Performance Grade: ${performanceGrade}`);
    console.log(`   - Performance Status: ${performanceStatus}`);
    console.log('');
    
    if (this.results.errors.length > 0) {
      console.log('❌ Errors:');
      const errorSummary = {};
      this.results.errors.forEach(error => {
        errorSummary[error.error] = (errorSummary[error.error] || 0) + 1;
      });
      
      Object.entries(errorSummary).forEach(([error, count]) => {
        console.log(`   - ${error}: ${count} occurrences`);
      });
      console.log('');
    }
    
    console.log('🚀 ==========================================');
    console.log('🚀 REALISTIC PERFORMANCE TEST COMPLETE');
    console.log('🚀 ==========================================');
    console.log('');
    
    // Realistic performance recommendations
    this.displayRecommendations();
  }

  displayRecommendations() {
    console.log('💡 Realistic Performance Recommendations:');
    
    if (this.results.averageResponseTime > 100) {
      console.log('   - Consider implementing more aggressive caching');
      console.log('   - Optimize database queries');
      console.log('   - Check for memory leaks');
    }
    
    if (this.results.successRate < 99) {
      console.log('   - Improve error handling');
      console.log('   - Add retry logic for failed requests');
      console.log('   - Check server stability');
    }
    
    if (this.results.requestsPerSecond < 100) {
      console.log('   - Consider connection pooling');
      console.log('   - Optimize request processing');
      console.log('   - Check for bottlenecks');
    }
    
    if (this.results.p99ResponseTime > 500) {
      console.log('   - Optimize slow queries');
      console.log('   - Implement request queuing');
      console.log('   - Add performance monitoring');
    }
    
    console.log('');
    console.log('🎯 Realistic Expectations:');
    console.log('   - Response Time: 50-100ms (Good)');
    console.log('   - Success Rate: 99%+ (Excellent)');
    console.log('   - Requests/Second: 100+ (Good)');
    console.log('   - 99th Percentile: <500ms (Good)');
    console.log('');
  }
}

// Run the test
const test = new RealisticPerformanceTest();
test.runTest().catch(console.error);


