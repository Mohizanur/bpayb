// 🚀 CIRCUIT BREAKER - Fault Tolerance and Resilience
// Prevents cascading failures and provides automatic recovery

import EventEmitter from 'events';
import { performance } from 'perf_hooks';

class CircuitBreaker extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.name = options.name || 'default';
    this.timeout = options.timeout || 3000; // 3 seconds
    this.errorThreshold = options.errorThreshold || 5; // 5 errors
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.volumeThreshold = options.volumeThreshold || 10; // 10 requests
    
    // Circuit states
    this.states = {
      CLOSED: 'CLOSED',     // Normal operation
      OPEN: 'OPEN',         // Circuit is open, failing fast
      HALF_OPEN: 'HALF_OPEN' // Testing if service is back
    };
    
    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
    
    // Performance tracking
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      circuitOpens: 0,
      circuitCloses: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    // Pending requests
    this.pendingRequests = new Map();
    this.requestId = 0;
  }

  async execute(operation, fallback = null) {
    const requestId = ++this.requestId;
    const startTime = performance.now();
    
    this.stats.totalRequests++;
    this.requestCount++;
    
    try {
      // Check circuit state
      if (this.state === this.states.OPEN) {
        if (Date.now() < this.nextAttempt) {
          throw new Error(`Circuit breaker is OPEN for ${this.name}`);
        } else {
          this.state = this.states.HALF_OPEN;
          this.emit('stateChange', { from: this.states.OPEN, to: this.states.HALF_OPEN });
        }
      }
      
      // Execute operation with timeout
      const result = await this.executeWithTimeout(operation, requestId);
      
      // Record success
      this.recordSuccess(startTime);
      
      // Close circuit if it was half-open
      if (this.state === this.states.HALF_OPEN) {
        this.state = this.states.CLOSED;
        this.failureCount = 0;
        this.emit('stateChange', { from: this.states.HALF_OPEN, to: this.states.CLOSED });
        this.emit('circuitClosed', { name: this.name });
      }
      
      return result;
      
    } catch (error) {
      // Record failure
      this.recordFailure(startTime, error);
      
      // Check if circuit should open
      if (this.shouldOpenCircuit()) {
        this.openCircuit();
      }
      
      // Try fallback if available
      if (fallback) {
        try {
          return await fallback(error);
        } catch (fallbackError) {
          throw new Error(`Primary operation failed: ${error.message}, Fallback failed: ${fallbackError.message}`);
        }
      }
      
      throw error;
    }
  }

  async executeWithTimeout(operation, requestId) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Operation timeout after ${this.timeout}ms`));
      }, this.timeout);
      
      this.pendingRequests.set(requestId, { timeout, startTime: performance.now() });
      
      Promise.resolve(operation())
        .then(result => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeout);
          this.pendingRequests.delete(requestId);
          reject(error);
        });
    });
  }

  shouldOpenCircuit() {
    return (
      this.failureCount >= this.errorThreshold &&
      this.requestCount >= this.volumeThreshold &&
      this.state !== this.states.OPEN
    );
  }

  openCircuit() {
    this.state = this.states.OPEN;
    this.lastFailureTime = Date.now();
    this.nextAttempt = Date.now() + this.resetTimeout;
    this.stats.circuitOpens++;
    
    this.emit('stateChange', { from: this.states.CLOSED, to: this.states.OPEN });
    this.emit('circuitOpened', { 
      name: this.name, 
      failureCount: this.failureCount,
      nextAttempt: this.nextAttempt 
    });
    
    // Cancel all pending requests
    for (const [requestId, request] of this.pendingRequests) {
      clearTimeout(request.timeout);
      this.pendingRequests.delete(requestId);
    }
  }

  recordSuccess(startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.successCount++;
    this.failureCount = 0;
    this.stats.successfulRequests++;
    this.stats.totalResponseTime += responseTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.successfulRequests;
    
    this.emit('success', { 
      name: this.name, 
      responseTime,
      successCount: this.successCount 
    });
  }

  recordFailure(startTime, error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.stats.failedRequests++;
    
    this.emit('failure', { 
      name: this.name, 
      error: error.message,
      responseTime,
      failureCount: this.failureCount 
    });
  }

  // Reset circuit breaker
  reset() {
    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.requestCount = 0;
    this.lastFailureTime = 0;
    this.nextAttempt = 0;
    
    this.emit('reset', { name: this.name });
  }

  // Get current state
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      lastFailureTime: this.lastFailureTime,
      nextAttempt: this.nextAttempt,
      pendingRequests: this.pendingRequests.size
    };
  }

  // Get statistics
  getStats() {
    const successRate = this.stats.totalRequests > 0 ? 
      (this.stats.successfulRequests / this.stats.totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      successRate,
      currentState: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      requestCount: this.requestCount,
      pendingRequests: this.pendingRequests.size
    };
  }

  // Health check
  isHealthy() {
    return this.state === this.states.CLOSED || this.state === this.states.HALF_OPEN;
  }

  // Force circuit to open (for testing)
  forceOpen() {
    this.openCircuit();
  }

  // Force circuit to close (for testing)
  forceClose() {
    this.state = this.states.CLOSED;
    this.failureCount = 0;
    this.nextAttempt = 0;
    this.emit('stateChange', { from: this.states.OPEN, to: this.states.CLOSED });
  }
}

// Circuit Breaker Manager
class CircuitBreakerManager {
  constructor() {
    this.circuits = new Map();
    this.globalStats = {
      totalCircuits: 0,
      openCircuits: 0,
      halfOpenCircuits: 0,
      closedCircuits: 0
    };
  }

  createCircuit(name, options = {}) {
    if (this.circuits.has(name)) {
      return this.circuits.get(name);
    }
    
    const circuit = new CircuitBreaker({ name, ...options });
    
    // Set up event listeners
    circuit.on('stateChange', (data) => {
      this.updateGlobalStats();
      this.emit('circuitStateChange', { name, ...data });
    });
    
    circuit.on('circuitOpened', (data) => {
      this.emit('circuitOpened', data);
    });
    
    circuit.on('circuitClosed', (data) => {
      this.emit('circuitClosed', data);
    });
    
    this.circuits.set(name, circuit);
    this.globalStats.totalCircuits++;
    this.updateGlobalStats();
    
    return circuit;
  }

  getCircuit(name) {
    return this.circuits.get(name);
  }

  removeCircuit(name) {
    const circuit = this.circuits.get(name);
    if (circuit) {
      circuit.removeAllListeners();
      this.circuits.delete(name);
      this.globalStats.totalCircuits--;
      this.updateGlobalStats();
    }
  }

  updateGlobalStats() {
    let openCircuits = 0;
    let halfOpenCircuits = 0;
    let closedCircuits = 0;
    
    for (const circuit of this.circuits.values()) {
      switch (circuit.state) {
        case circuit.states.OPEN:
          openCircuits++;
          break;
        case circuit.states.HALF_OPEN:
          halfOpenCircuits++;
          break;
        case circuit.states.CLOSED:
          closedCircuits++;
          break;
      }
    }
    
    this.globalStats.openCircuits = openCircuits;
    this.globalStats.halfOpenCircuits = halfOpenCircuits;
    this.globalStats.closedCircuits = closedCircuits;
  }

  getAllCircuits() {
    return Array.from(this.circuits.values());
  }

  getGlobalStats() {
    this.updateGlobalStats();
    return { ...this.globalStats };
  }

  // Health check for all circuits
  getHealthStatus() {
    const unhealthyCircuits = [];
    
    for (const [name, circuit] of this.circuits) {
      if (!circuit.isHealthy()) {
        unhealthyCircuits.push({
          name,
          state: circuit.state,
          failureCount: circuit.failureCount,
          nextAttempt: circuit.nextAttempt
        });
      }
    }
    
    return {
      healthy: unhealthyCircuits.length === 0,
      totalCircuits: this.circuits.size,
      unhealthyCircuits,
      globalStats: this.getGlobalStats()
    };
  }

  // Reset all circuits
  resetAll() {
    for (const circuit of this.circuits.values()) {
      circuit.reset();
    }
  }
}

// Create singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

export { CircuitBreaker, circuitBreakerManager };


