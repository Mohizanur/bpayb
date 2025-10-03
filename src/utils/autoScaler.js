// 🚀 AUTO SCALER - Automatic Horizontal Scaling
// Intelligent auto-scaling based on load, performance metrics, and resource utilization

import { performance } from 'perf_hooks';
import EventEmitter from 'events';

class AutoScaler extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default';
    this.minInstances = options.minInstances || 1;
    this.maxInstances = options.maxInstances || 10;
    this.currentInstances = this.minInstances;
    this.targetInstances = this.minInstances;
    
    // Scaling policies
    this.scalingPolicies = {
      scaleUp: {
        enabled: options.scaleUp !== false,
        threshold: options.scaleUpThreshold || 0.8, // 80% utilization
        cooldown: options.scaleUpCooldown || 300000, // 5 minutes
        step: options.scaleUpStep || 1,
        maxStep: options.scaleUpMaxStep || 3
      },
      scaleDown: {
        enabled: options.scaleDown !== false,
        threshold: options.scaleDownThreshold || 0.3, // 30% utilization
        cooldown: options.scaleDownCooldown || 600000, // 10 minutes
        step: options.scaleDownStep || 1,
        maxStep: options.scaleDownMaxStep || 2
      }
    };
    
    // Metrics collection
    this.metrics = {
      cpu: [],
      memory: [],
      requests: [],
      responseTime: [],
      errorRate: []
    };
    
    this.metricsWindow = options.metricsWindow || 300000; // 5 minutes
    this.metricsInterval = options.metricsInterval || 30000; // 30 seconds
    
    // Scaling history
    this.scalingHistory = [];
    this.lastScaleUp = 0;
    this.lastScaleDown = 0;
    
    // Statistics
    this.stats = {
      totalScalingEvents: 0,
      scaleUpEvents: 0,
      scaleDownEvents: 0,
      averageScalingTime: 0,
      totalScalingTime: 0,
      currentLoad: 0,
      targetLoad: 0.5 // 50% target utilization
    };
    
    // Instance management
    this.instances = new Map();
    this.instanceId = 0;
    
    // Health monitoring
    this.healthChecks = new Map();
    this.unhealthyInstances = new Set();
    
    this.isRunning = false;
    this.intervalId = null;
  }

  // Start auto-scaling
  start() {
    if (this.isRunning) return;
    
    console.log(`🚀 Starting Auto Scaler: ${this.name}`);
    
    this.isRunning = true;
    
    // Initialize instances
    this.initializeInstances();
    
    // Start metrics collection
    this.startMetricsCollection();
    
    // Start scaling evaluation
    this.startScalingEvaluation();
    
    this.emit('started', { name: this.name, instances: this.currentInstances });
  }

  // Stop auto-scaling
  stop() {
    if (!this.isRunning) return;
    
    console.log(`🔄 Stopping Auto Scaler: ${this.name}`);
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    // Cleanup instances
    this.cleanupInstances();
    
    this.emit('stopped', { name: this.name });
  }

  // Initialize instances
  initializeInstances() {
    for (let i = 0; i < this.minInstances; i++) {
      this.createInstance();
    }
  }

  // Create a new instance
  createInstance() {
    const instanceId = ++this.instanceId;
    const instance = {
      id: instanceId,
      createdAt: Date.now(),
      status: 'starting',
      metrics: {
        cpu: 0,
        memory: 0,
        requests: 0,
        responseTime: 0,
        errorRate: 0
      },
      health: 'unknown',
      lastHealthCheck: null
    };
    
    this.instances.set(instanceId, instance);
    
    // Simulate instance startup
    setTimeout(() => {
      instance.status = 'running';
      instance.health = 'healthy';
      instance.lastHealthCheck = Date.now();
      
      this.emit('instanceCreated', { instanceId, instance });
    }, 5000); // 5 second startup time
    
    return instanceId;
  }

  // Remove an instance
  removeInstance(instanceId) {
    const instance = this.instances.get(instanceId);
    if (!instance) return false;
    
    instance.status = 'terminating';
    
    // Simulate instance termination
    setTimeout(() => {
      this.instances.delete(instanceId);
      this.unhealthyInstances.delete(instanceId);
      
      this.emit('instanceRemoved', { instanceId, instance });
    }, 3000); // 3 second termination time
    
    return true;
  }

  // Start metrics collection
  startMetricsCollection() {
    setInterval(() => {
      this.collectMetrics();
    }, this.metricsInterval);
  }

  // Collect metrics from all instances
  collectMetrics() {
    const now = Date.now();
    const cutoff = now - this.metricsWindow;
    
    // Clean old metrics
    for (const metricType of Object.keys(this.metrics)) {
      this.metrics[metricType] = this.metrics[metricType].filter(m => m.timestamp > cutoff);
    }
    
    // Collect current metrics
    const currentMetrics = this.getCurrentMetrics();
    
    // Store metrics
    for (const [type, value] of Object.entries(currentMetrics)) {
      this.metrics[type].push({
        value,
        timestamp: now
      });
    }
    
    // Update instance metrics
    for (const [instanceId, instance] of this.instances) {
      if (instance.status === 'running') {
        instance.metrics = {
          cpu: this.getRandomMetric(20, 80),
          memory: this.getRandomMetric(30, 70),
          requests: this.getRandomMetric(10, 100),
          responseTime: this.getRandomMetric(50, 200),
          errorRate: this.getRandomMetric(0, 5)
        };
        
        instance.lastHealthCheck = now;
      }
    }
    
    this.emit('metricsCollected', { metrics: currentMetrics, instances: this.instances.size });
  }

  // Get current system metrics
  getCurrentMetrics() {
    const instances = Array.from(this.instances.values()).filter(i => i.status === 'running');
    
    if (instances.length === 0) {
      return {
        cpu: 0,
        memory: 0,
        requests: 0,
        responseTime: 0,
        errorRate: 0
      };
    }
    
    const totals = instances.reduce((acc, instance) => {
      acc.cpu += instance.metrics.cpu;
      acc.memory += instance.metrics.memory;
      acc.requests += instance.metrics.requests;
      acc.responseTime += instance.metrics.responseTime;
      acc.errorRate += instance.metrics.errorRate;
      return acc;
    }, { cpu: 0, memory: 0, requests: 0, responseTime: 0, errorRate: 0 });
    
    return {
      cpu: totals.cpu / instances.length,
      memory: totals.memory / instances.length,
      requests: totals.requests / instances.length,
      responseTime: totals.responseTime / instances.length,
      errorRate: totals.errorRate / instances.length
    };
  }

  // Get random metric for simulation
  getRandomMetric(min, max) {
    return Math.random() * (max - min) + min;
  }

  // Start scaling evaluation
  startScalingEvaluation() {
    this.intervalId = setInterval(() => {
      this.evaluateScaling();
    }, this.metricsInterval);
  }

  // Evaluate if scaling is needed
  evaluateScaling() {
    const currentLoad = this.calculateCurrentLoad();
    const now = Date.now();
    
    this.stats.currentLoad = currentLoad;
    
    // Check scale up conditions
    if (this.shouldScaleUp(currentLoad, now)) {
      this.scaleUp();
    }
    // Check scale down conditions
    else if (this.shouldScaleDown(currentLoad, now)) {
      this.scaleDown();
    }
    
    // Check for unhealthy instances
    this.checkUnhealthyInstances();
  }

  // Calculate current load
  calculateCurrentLoad() {
    const recentMetrics = this.getRecentMetrics();
    
    if (recentMetrics.length === 0) return 0;
    
    const avgCpu = recentMetrics.reduce((sum, m) => sum + m.cpu, 0) / recentMetrics.length;
    const avgMemory = recentMetrics.reduce((sum, m) => sum + m.memory, 0) / recentMetrics.length;
    const avgRequests = recentMetrics.reduce((sum, m) => sum + m.requests, 0) / recentMetrics.length;
    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
    
    // Weighted load calculation
    const load = (
      avgCpu * 0.3 +
      avgMemory * 0.2 +
      Math.min(avgRequests / 100, 1) * 0.3 +
      Math.min(avgResponseTime / 200, 1) * 0.1 +
      Math.min(avgErrorRate / 10, 1) * 0.1
    );
    
    return Math.min(load, 1);
  }

  // Get recent metrics
  getRecentMetrics() {
    const now = Date.now();
    const cutoff = now - this.metricsWindow;
    
    const recentMetrics = [];
    const metricCount = Math.min(
      this.metrics.cpu.length,
      this.metrics.memory.length,
      this.metrics.requests.length,
      this.metrics.responseTime.length,
      this.metrics.errorRate.length
    );
    
    for (let i = 0; i < metricCount; i++) {
      if (this.metrics.cpu[i].timestamp > cutoff) {
        recentMetrics.push({
          cpu: this.metrics.cpu[i].value,
          memory: this.metrics.memory[i].value,
          requests: this.metrics.requests[i].value,
          responseTime: this.metrics.responseTime[i].value,
          errorRate: this.metrics.errorRate[i].value,
          timestamp: this.metrics.cpu[i].timestamp
        });
      }
    }
    
    return recentMetrics;
  }

  // Check if should scale up
  shouldScaleUp(currentLoad, now) {
    const policy = this.scalingPolicies.scaleUp;
    
    if (!policy.enabled) return false;
    if (this.currentInstances >= this.maxInstances) return false;
    if (now - this.lastScaleUp < policy.cooldown) return false;
    
    return currentLoad > policy.threshold;
  }

  // Check if should scale down
  shouldScaleDown(currentLoad, now) {
    const policy = this.scalingPolicies.scaleDown;
    
    if (!policy.enabled) return false;
    if (this.currentInstances <= this.minInstances) return false;
    if (now - this.lastScaleDown < policy.cooldown) return false;
    
    return currentLoad < policy.threshold;
  }

  // Scale up
  scaleUp() {
    const policy = this.scalingPolicies.scaleUp;
    const instancesToAdd = Math.min(
      policy.step,
      policy.maxStep,
      this.maxInstances - this.currentInstances
    );
    
    const startTime = performance.now();
    
    for (let i = 0; i < instancesToAdd; i++) {
      this.createInstance();
    }
    
    this.currentInstances += instancesToAdd;
    this.targetInstances = this.currentInstances;
    this.lastScaleUp = Date.now();
    
    const endTime = performance.now();
    const scalingTime = endTime - startTime;
    
    this.recordScalingEvent('scaleUp', instancesToAdd, scalingTime);
    
    this.emit('scaledUp', {
      instancesAdded: instancesToAdd,
      currentInstances: this.currentInstances,
      scalingTime
    });
  }

  // Scale down
  scaleDown() {
    const policy = this.scalingPolicies.scaleDown;
    const instancesToRemove = Math.min(
      policy.step,
      policy.maxStep,
      this.currentInstances - this.minInstances
    );
    
    const startTime = performance.now();
    
    // Remove least loaded instances
    const instancesToTerminate = this.selectInstancesToTerminate(instancesToRemove);
    
    for (const instanceId of instancesToTerminate) {
      this.removeInstance(instanceId);
    }
    
    this.currentInstances -= instancesToRemove;
    this.targetInstances = this.currentInstances;
    this.lastScaleDown = Date.now();
    
    const endTime = performance.now();
    const scalingTime = endTime - startTime;
    
    this.recordScalingEvent('scaleDown', instancesToRemove, scalingTime);
    
    this.emit('scaledDown', {
      instancesRemoved: instancesToRemove,
      currentInstances: this.currentInstances,
      scalingTime
    });
  }

  // Select instances to terminate
  selectInstancesToTerminate(count) {
    const runningInstances = Array.from(this.instances.entries())
      .filter(([id, instance]) => instance.status === 'running')
      .sort((a, b) => {
        // Sort by load (lower load first)
        const loadA = a[1].metrics.cpu + a[1].metrics.memory;
        const loadB = b[1].metrics.cpu + b[1].metrics.memory;
        return loadA - loadB;
      });
    
    return runningInstances.slice(0, count).map(([id]) => id);
  }

  // Check for unhealthy instances
  checkUnhealthyInstances() {
    const now = Date.now();
    const healthCheckTimeout = 60000; // 1 minute
    
    for (const [instanceId, instance] of this.instances) {
      if (instance.status === 'running') {
        if (now - instance.lastHealthCheck > healthCheckTimeout) {
          instance.health = 'unhealthy';
          this.unhealthyInstances.add(instanceId);
          
          this.emit('instanceUnhealthy', { instanceId, instance });
          
          // Replace unhealthy instance
          this.replaceUnhealthyInstance(instanceId);
        }
      }
    }
  }

  // Replace unhealthy instance
  replaceUnhealthyInstance(instanceId) {
    if (this.currentInstances < this.maxInstances) {
      this.removeInstance(instanceId);
      this.createInstance();
      
      this.emit('instanceReplaced', { oldInstanceId: instanceId });
    }
  }

  // Record scaling event
  recordScalingEvent(type, instances, scalingTime) {
    const event = {
      type,
      instances,
      scalingTime,
      timestamp: Date.now(),
      currentInstances: this.currentInstances,
      load: this.stats.currentLoad
    };
    
    this.scalingHistory.push(event);
    
    // Keep only last 100 events
    if (this.scalingHistory.length > 100) {
      this.scalingHistory = this.scalingHistory.slice(-100);
    }
    
    this.stats.totalScalingEvents++;
    this.stats.totalScalingTime += scalingTime;
    this.stats.averageScalingTime = this.stats.totalScalingTime / this.stats.totalScalingEvents;
    
    if (type === 'scaleUp') {
      this.stats.scaleUpEvents++;
    } else {
      this.stats.scaleDownEvents++;
    }
  }

  // Cleanup instances
  cleanupInstances() {
    for (const [instanceId, instance] of this.instances) {
      if (instance.status === 'running') {
        this.removeInstance(instanceId);
      }
    }
  }

  // Public API methods
  getStatus() {
    return {
      name: this.name,
      currentInstances: this.currentInstances,
      targetInstances: this.targetInstances,
      minInstances: this.minInstances,
      maxInstances: this.maxInstances,
      isRunning: this.isRunning,
      currentLoad: this.stats.currentLoad,
      targetLoad: this.stats.targetLoad,
      stats: this.getStats()
    };
  }

  getStats() {
    return {
      ...this.stats,
      scalingHistory: this.scalingHistory.slice(-10), // Last 10 events
      instances: Array.from(this.instances.values()),
      unhealthyInstances: Array.from(this.unhealthyInstances)
    };
  }

  getInstances() {
    return Array.from(this.instances.values());
  }

  getScalingHistory() {
    return [...this.scalingHistory];
  }

  // Manual scaling
  scaleTo(targetInstances) {
    if (targetInstances < this.minInstances || targetInstances > this.maxInstances) {
      throw new Error(`Target instances must be between ${this.minInstances} and ${this.maxInstances}`);
    }
    
    const difference = targetInstances - this.currentInstances;
    
    if (difference > 0) {
      // Scale up
      for (let i = 0; i < difference; i++) {
        this.createInstance();
      }
    } else if (difference < 0) {
      // Scale down
      const instancesToRemove = Math.abs(difference);
      const instancesToTerminate = this.selectInstancesToTerminate(instancesToRemove);
      
      for (const instanceId of instancesToTerminate) {
        this.removeInstance(instanceId);
      }
    }
    
    this.currentInstances = targetInstances;
    this.targetInstances = targetInstances;
    
    this.emit('manualScale', {
      targetInstances,
      currentInstances: this.currentInstances
    });
  }

  // Update scaling policies
  updatePolicies(newPolicies) {
    this.scalingPolicies = { ...this.scalingPolicies, ...newPolicies };
    
    this.emit('policiesUpdated', { policies: this.scalingPolicies });
  }

  // Health check
  isHealthy() {
    const unhealthyCount = this.unhealthyInstances.size;
    const totalInstances = this.currentInstances;
    
    return unhealthyCount === 0 || (unhealthyCount / totalInstances) < 0.5; // Less than 50% unhealthy
  }
}

// Auto Scaler Manager
class AutoScalerManager {
  constructor() {
    this.scalers = new Map();
    this.globalStats = {
      totalScalers: 0,
      totalInstances: 0,
      totalScalingEvents: 0
    };
  }

  createScaler(name, options = {}) {
    if (this.scalers.has(name)) {
      return this.scalers.get(name);
    }
    
    const scaler = new AutoScaler({ name, ...options });
    
    // Set up event listeners
    scaler.on('scaledUp', (data) => {
      this.updateGlobalStats();
      this.emit('scalerScaledUp', { name, ...data });
    });
    
    scaler.on('scaledDown', (data) => {
      this.updateGlobalStats();
      this.emit('scalerScaledDown', { name, ...data });
    });
    
    this.scalers.set(name, scaler);
    this.globalStats.totalScalers++;
    this.updateGlobalStats();
    
    return scaler;
  }

  getScaler(name) {
    return this.scalers.get(name);
  }

  removeScaler(name) {
    const scaler = this.scalers.get(name);
    if (scaler) {
      scaler.stop();
      scaler.removeAllListeners();
      this.scalers.delete(name);
      this.globalStats.totalScalers--;
      this.updateGlobalStats();
    }
  }

  updateGlobalStats() {
    let totalInstances = 0;
    let totalScalingEvents = 0;
    
    for (const scaler of this.scalers.values()) {
      totalInstances += scaler.currentInstances;
      totalScalingEvents += scaler.stats.totalScalingEvents;
    }
    
    this.globalStats.totalInstances = totalInstances;
    this.globalStats.totalScalingEvents = totalScalingEvents;
  }

  getGlobalStats() {
    this.updateGlobalStats();
    return { ...this.globalStats };
  }

  getAllScalers() {
    return Array.from(this.scalers.values());
  }

  startAll() {
    for (const scaler of this.scalers.values()) {
      scaler.start();
    }
  }

  stopAll() {
    for (const scaler of this.scalers.values()) {
      scaler.stop();
    }
  }
}

// Create singleton instance
const autoScalerManager = new AutoScalerManager();

export { AutoScaler, autoScalerManager };


