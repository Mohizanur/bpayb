// 🚀 HEALTH MONITOR - Comprehensive Health Checks and Monitoring
// Real-time health monitoring with automatic recovery and alerting

import { performance } from 'perf_hooks';
import EventEmitter from 'events';

class HealthMonitor extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default';
    this.interval = options.interval || 30000; // 30 seconds
    this.timeout = options.timeout || 5000; // 5 seconds
    this.retries = options.retries || 3;
    this.retryDelay = options.retryDelay || 1000; // 1 second
    
    // Health checks
    this.checks = new Map();
    this.results = new Map();
    this.isRunning = false;
    this.intervalId = null;
    
    // Health status
    this.overallHealth = 'unknown';
    this.lastCheck = null;
    this.consecutiveFailures = 0;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
    
    // Statistics
    this.stats = {
      totalChecks: 0,
      successfulChecks: 0,
      failedChecks: 0,
      averageResponseTime: 0,
      totalResponseTime: 0,
      uptime: 0,
      lastFailure: null,
      lastSuccess: null
    };
    
    this.startTime = Date.now();
  }

  // Add a health check
  addCheck(name, checkFunction, options = {}) {
    const check = {
      name,
      function: checkFunction,
      interval: options.interval || this.interval,
      timeout: options.timeout || this.timeout,
      retries: options.retries || this.retries,
      retryDelay: options.retryDelay || this.retryDelay,
      critical: options.critical !== false,
      enabled: options.enabled !== false,
      lastRun: null,
      consecutiveFailures: 0,
      stats: {
        totalRuns: 0,
        successfulRuns: 0,
        failedRuns: 0,
        averageResponseTime: 0,
        totalResponseTime: 0
      }
    };
    
    this.checks.set(name, check);
    this.results.set(name, { status: 'unknown', lastCheck: null, error: null });
    
    return this;
  }

  // Remove a health check
  removeCheck(name) {
    this.checks.delete(name);
    this.results.delete(name);
    return this;
  }

  // Start health monitoring
  start() {
    if (this.isRunning) return;
    
    console.log(`🚀 Starting Health Monitor: ${this.name}`);
    
    this.isRunning = true;
    this.startTime = Date.now();
    
    // Run initial health check
    this.runAllChecks();
    
    // Set up interval
    this.intervalId = setInterval(() => {
      this.runAllChecks();
    }, this.interval);
    
    this.emit('started', { name: this.name });
  }

  // Stop health monitoring
  stop() {
    if (!this.isRunning) return;
    
    console.log(`🔄 Stopping Health Monitor: ${this.name}`);
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    this.emit('stopped', { name: this.name });
  }

  // Run all health checks
  async runAllChecks() {
    const startTime = performance.now();
    const checkPromises = [];
    
    for (const [name, check] of this.checks) {
      if (check.enabled) {
        checkPromises.push(this.runCheck(name, check));
      }
    }
    
    try {
      await Promise.allSettled(checkPromises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      this.updateOverallHealth();
      this.updateStats(totalTime);
      
      this.emit('healthCheckComplete', {
        name: this.name,
        overallHealth: this.overallHealth,
        totalTime,
        results: this.getResults()
      });
      
    } catch (error) {
      console.error(`❌ Health check error for ${this.name}:`, error);
      this.emit('healthCheckError', { name: this.name, error: error.message });
    }
  }

  // Run a single health check
  async runCheck(name, check) {
    const startTime = performance.now();
    let lastError = null;
    
    for (let attempt = 1; attempt <= check.retries; attempt++) {
      try {
        const result = await this.executeCheck(check, attempt);
        
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        // Record success
        this.recordCheckSuccess(name, check, responseTime, result);
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        if (attempt < check.retries) {
          await this.delay(check.retryDelay);
        }
      }
    }
    
    // All attempts failed
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.recordCheckFailure(name, check, responseTime, lastError);
    
    throw lastError;
  }

  // Execute a health check with timeout
  async executeCheck(check, attempt) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Health check timeout after ${check.timeout}ms`));
      }, check.timeout);
      
      Promise.resolve(check.function())
        .then(result => {
          clearTimeout(timeout);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          reject(error);
        });
    });
  }

  // Record successful check
  recordCheckSuccess(name, check, responseTime, result) {
    check.lastRun = Date.now();
    check.consecutiveFailures = 0;
    check.stats.totalRuns++;
    check.stats.successfulRuns++;
    check.stats.totalResponseTime += responseTime;
    check.stats.averageResponseTime = check.stats.totalResponseTime / check.stats.successfulRuns;
    
    this.results.set(name, {
      status: 'healthy',
      lastCheck: check.lastRun,
      responseTime,
      result,
      error: null
    });
    
    this.emit('checkSuccess', {
      name: this.name,
      checkName: name,
      responseTime,
      result
    });
  }

  // Record failed check
  recordCheckFailure(name, check, responseTime, error) {
    check.lastRun = Date.now();
    check.consecutiveFailures++;
    check.stats.totalRuns++;
    check.stats.failedRuns++;
    check.stats.totalResponseTime += responseTime;
    
    this.results.set(name, {
      status: 'unhealthy',
      lastCheck: check.lastRun,
      responseTime,
      result: null,
      error: error.message
    });
    
    this.emit('checkFailure', {
      name: this.name,
      checkName: name,
      responseTime,
      error: error.message,
      consecutiveFailures: check.consecutiveFailures
    });
  }

  // Update overall health status
  updateOverallHealth() {
    const results = Array.from(this.results.values());
    const criticalChecks = Array.from(this.checks.values()).filter(check => check.critical);
    
    let healthyCount = 0;
    let unhealthyCount = 0;
    let criticalUnhealthyCount = 0;
    
    for (const result of results) {
      if (result.status === 'healthy') {
        healthyCount++;
      } else if (result.status === 'unhealthy') {
        unhealthyCount++;
      }
    }
    
    // Check critical checks
    for (const check of criticalChecks) {
      const result = this.results.get(check.name);
      if (result && result.status === 'unhealthy') {
        criticalUnhealthyCount++;
      }
    }
    
    const previousHealth = this.overallHealth;
    
    if (criticalUnhealthyCount > 0) {
      this.overallHealth = 'critical';
      this.consecutiveFailures++;
    } else if (unhealthyCount > 0) {
      this.overallHealth = 'degraded';
      this.consecutiveFailures++;
    } else {
      this.overallHealth = 'healthy';
      this.consecutiveFailures = 0;
    }
    
    // Emit health change event
    if (previousHealth !== this.overallHealth) {
      this.emit('healthChange', {
        name: this.name,
        previousHealth,
        currentHealth: this.overallHealth,
        consecutiveFailures: this.consecutiveFailures
      });
    }
    
    this.lastCheck = Date.now();
  }

  // Update statistics
  updateStats(totalTime) {
    this.stats.totalChecks++;
    this.stats.uptime = Date.now() - this.startTime;
    
    if (this.overallHealth === 'healthy') {
      this.stats.successfulChecks++;
      this.stats.lastSuccess = Date.now();
    } else {
      this.stats.failedChecks++;
      this.stats.lastFailure = Date.now();
    }
    
    this.stats.totalResponseTime += totalTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalChecks;
  }

  // Get health status
  getHealthStatus() {
    const results = {};
    for (const [name, result] of this.results) {
      results[name] = { ...result };
    }
    
    return {
      name: this.name,
      overallHealth: this.overallHealth,
      lastCheck: this.lastCheck,
      consecutiveFailures: this.consecutiveFailures,
      results,
      stats: this.getStats()
    };
  }

  // Get statistics
  getStats() {
    const successRate = this.stats.totalChecks > 0 ? 
      (this.stats.successfulChecks / this.stats.totalChecks) * 100 : 0;
    
    return {
      ...this.stats,
      successRate,
      isRunning: this.isRunning,
      totalChecks: this.checks.size,
      enabledChecks: Array.from(this.checks.values()).filter(check => check.enabled).length
    };
  }

  // Get results for all checks
  getResults() {
    const results = {};
    for (const [name, result] of this.results) {
      results[name] = { ...result };
    }
    return results;
  }

  // Get result for a specific check
  getCheckResult(name) {
    return this.results.get(name);
  }

  // Run a specific check manually
  async runCheckManually(name) {
    const check = this.checks.get(name);
    if (!check) {
      throw new Error(`Health check '${name}' not found`);
    }
    
    return await this.runCheck(name, check);
  }

  // Enable/disable a check
  setCheckEnabled(name, enabled) {
    const check = this.checks.get(name);
    if (check) {
      check.enabled = enabled;
    }
  }

  // Set check as critical/non-critical
  setCheckCritical(name, critical) {
    const check = this.checks.get(name);
    if (check) {
      check.critical = critical;
    }
  }

  // Utility methods
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check factory methods
  static createDatabaseCheck(connection) {
    return async () => {
      const startTime = performance.now();
      await connection.ping();
      const endTime = performance.now();
      return {
        status: 'healthy',
        responseTime: endTime - startTime,
        timestamp: Date.now()
      };
    };
  }

  static createHttpCheck(url, options = {}) {
    return async () => {
      const startTime = performance.now();
      const response = await fetch(url, {
        method: 'GET',
        timeout: options.timeout || 5000,
        ...options
      });
      const endTime = performance.now();
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return {
        status: 'healthy',
        responseTime: endTime - startTime,
        statusCode: response.status,
        timestamp: Date.now()
      };
    };
  }

  static createMemoryCheck(threshold = 0.9) {
    return async () => {
      const memUsage = process.memoryUsage();
      const totalMem = memUsage.heapTotal;
      const usedMem = memUsage.heapUsed;
      const usageRatio = usedMem / totalMem;
      
      if (usageRatio > threshold) {
        throw new Error(`Memory usage too high: ${(usageRatio * 100).toFixed(2)}%`);
      }
      
      return {
        status: 'healthy',
        memoryUsage: {
          used: usedMem,
          total: totalMem,
          ratio: usageRatio,
          percentage: (usageRatio * 100).toFixed(2)
        },
        timestamp: Date.now()
      };
    };
  }

  static createDiskSpaceCheck(path, threshold = 0.9) {
    return async () => {
      const fs = await import('fs');
      const stats = await fs.promises.statfs(path);
      const totalSpace = stats.bavail + stats.bfree;
      const usedSpace = stats.blocks - stats.bavail;
      const usageRatio = usedSpace / stats.blocks;
      
      if (usageRatio > threshold) {
        throw new Error(`Disk usage too high: ${(usageRatio * 100).toFixed(2)}%`);
      }
      
      return {
        status: 'healthy',
        diskUsage: {
          used: usedSpace,
          total: stats.blocks,
          available: stats.bavail,
          ratio: usageRatio,
          percentage: (usageRatio * 100).toFixed(2)
        },
        timestamp: Date.now()
      };
    };
  }
}

// Health Monitor Manager
class HealthMonitorManager {
  constructor() {
    this.monitors = new Map();
    this.globalStats = {
      totalMonitors: 0,
      healthyMonitors: 0,
      degradedMonitors: 0,
      criticalMonitors: 0
    };
  }

  createMonitor(name, options = {}) {
    if (this.monitors.has(name)) {
      return this.monitors.get(name);
    }
    
    const monitor = new HealthMonitor({ name, ...options });
    
    // Set up event listeners
    monitor.on('healthChange', (data) => {
      this.updateGlobalStats();
      this.emit('monitorHealthChange', data);
    });
    
    monitor.on('checkFailure', (data) => {
      this.emit('monitorCheckFailure', data);
    });
    
    this.monitors.set(name, monitor);
    this.globalStats.totalMonitors++;
    this.updateGlobalStats();
    
    return monitor;
  }

  getMonitor(name) {
    return this.monitors.get(name);
  }

  removeMonitor(name) {
    const monitor = this.monitors.get(name);
    if (monitor) {
      monitor.stop();
      monitor.removeAllListeners();
      this.monitors.delete(name);
      this.globalStats.totalMonitors--;
      this.updateGlobalStats();
    }
  }

  updateGlobalStats() {
    let healthyMonitors = 0;
    let degradedMonitors = 0;
    let criticalMonitors = 0;
    
    for (const monitor of this.monitors.values()) {
      switch (monitor.overallHealth) {
        case 'healthy':
          healthyMonitors++;
          break;
        case 'degraded':
          degradedMonitors++;
          break;
        case 'critical':
          criticalMonitors++;
          break;
      }
    }
    
    this.globalStats.healthyMonitors = healthyMonitors;
    this.globalStats.degradedMonitors = degradedMonitors;
    this.globalStats.criticalMonitors = criticalMonitors;
  }

  getGlobalStats() {
    this.updateGlobalStats();
    return { ...this.globalStats };
  }

  getAllMonitors() {
    return Array.from(this.monitors.values());
  }

  getGlobalHealthStatus() {
    const monitors = Array.from(this.monitors.values());
    const results = {};
    
    for (const monitor of monitors) {
      results[monitor.name] = monitor.getHealthStatus();
    }
    
    return {
      globalStats: this.getGlobalStats(),
      monitors: results
    };
  }

  startAll() {
    for (const monitor of this.monitors.values()) {
      monitor.start();
    }
  }

  stopAll() {
    for (const monitor of this.monitors.values()) {
      monitor.stop();
    }
  }
}

// Create singleton instance
const healthMonitorManager = new HealthMonitorManager();

export { HealthMonitor, healthMonitorManager };


