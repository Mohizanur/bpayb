// Load Balancer and Request Handler for Maximum Performance
// Handles thousands of concurrent requests with intelligent routing

import performanceOptimizer from './performance-optimizer.js';
import enhancedDatabase from './enhanced-database.js';

class LoadBalancer {
  constructor() {
    this.requestHandlers = new Map();
    this.activeRequests = new Map();
    this.requestQueue = [];
    this.workerPool = [];
    this.maxConcurrentRequests = 10000; // Handle 10k concurrent requests
    this.maxWorkers = 50; // 50 worker threads
    
    // Request routing
    this.routes = {
      'user': this.handleUserRequest.bind(this),
      'subscription': this.handleSubscriptionRequest.bind(this),
      'service': this.handleServiceRequest.bind(this),
      'payment': this.handlePaymentRequest.bind(this),
      'admin': this.handleAdminRequest.bind(this)
    };
    
    // Initialize worker pool
    this.initializeWorkerPool();
    this.startRequestProcessing();
  }

  // Initialize Worker Pool
  initializeWorkerPool() {
    for (let i = 0; i < this.maxWorkers; i++) {
      this.workerPool.push({
        id: i,
        busy: false,
        currentRequest: null,
        startTime: null
      });
    }
  }

  // Get Available Worker
  getAvailableWorker() {
    return this.workerPool.find(worker => !worker.busy);
  }

  // Request Processing
  async processRequest(requestId, requestType, data, priority = 'normal') {
    const startTime = Date.now();
    
    // Check if we can handle more requests
    if (this.activeRequests.size >= this.maxConcurrentRequests) {
      throw new Error('Maximum concurrent requests reached');
    }
    
    // Get available worker
    const worker = this.getAvailableWorker();
    if (!worker) {
      // Queue request if no workers available
      this.requestQueue.push({
        id: requestId,
        type: requestType,
        data,
        priority,
        timestamp: startTime
      });
      return this.queueRequest(requestId);
    }
    
    // Mark worker as busy
    worker.busy = true;
    worker.currentRequest = requestId;
    worker.startTime = startTime;
    
    // Add to active requests
    this.activeRequests.set(requestId, {
      workerId: worker.id,
      type: requestType,
      startTime,
      priority
    });
    
    try {
      // Route request to appropriate handler
      const handler = this.routes[requestType];
      if (!handler) {
        throw new Error(`Unknown request type: ${requestType}`);
      }
      
      // Check rate limiting
      if (data.userId && performanceOptimizer.isRateLimited(data.userId, requestType, 20, 60000)) {
        throw new Error('Rate limit exceeded');
      }
      
      const result = await handler(requestId, data);
      
      // Update performance metrics
      const duration = Date.now() - startTime;
      performanceOptimizer.performanceMetrics.averageResponseTime = 
        (performanceOptimizer.performanceMetrics.averageResponseTime + duration) / 2;
      
      return result;
    } catch (error) {
      console.error(`Request ${requestId} failed:`, error);
      throw error;
    } finally {
      // Free worker
      worker.busy = false;
      worker.currentRequest = null;
      worker.startTime = null;
      
      // Remove from active requests
      this.activeRequests.delete(requestId);
    }
  }

  // Request Handlers
  async handleUserRequest(requestId, data) {
    const { operation, userId, userData } = data;
    
    switch (operation) {
      case 'get':
        return await enhancedDatabase.getUserOptimized(userId);
      case 'update':
        return await enhancedDatabase.updateUserOptimized(userId, userData);
      case 'create':
        return await enhancedDatabase.updateUserOptimized(userId, userData);
      default:
        throw new Error(`Unknown user operation: ${operation}`);
    }
  }

  async handleSubscriptionRequest(requestId, data) {
    const { operation, userId, subscriptionData } = data;
    
    switch (operation) {
      case 'get':
        return await enhancedDatabase.getUserSubscriptionsOptimized(userId);
      case 'create':
        return await enhancedDatabase.createSubscriptionOptimized(subscriptionData);
      case 'update':
        return await enhancedDatabase.updateSubscriptionOptimized(subscriptionData.id, subscriptionData);
      default:
        throw new Error(`Unknown subscription operation: ${operation}`);
    }
  }

  async handleServiceRequest(requestId, data) {
    const { operation, serviceId, serviceData } = data;
    
    switch (operation) {
      case 'get_all':
        return await enhancedDatabase.getServicesOptimized();
      case 'get':
        return await enhancedDatabase.getServiceOptimized(serviceId);
      case 'create':
        return await enhancedDatabase.createServiceOptimized(serviceData);
      case 'update':
        return await enhancedDatabase.updateServiceOptimized(serviceId, serviceData);
      default:
        throw new Error(`Unknown service operation: ${operation}`);
    }
  }

  async handlePaymentRequest(requestId, data) {
    const { operation, paymentId, paymentData } = data;
    
    switch (operation) {
      case 'create':
        return await enhancedDatabase.createPaymentOptimized(paymentData);
      case 'update_status':
        return await enhancedDatabase.updatePaymentStatusOptimized(paymentId, paymentData.status);
      default:
        throw new Error(`Unknown payment operation: ${operation}`);
    }
  }

  async handleAdminRequest(requestId, data) {
    const { operation, limit, offset } = data;
    
    switch (operation) {
      case 'get_bulk_subscriptions':
        return await enhancedDatabase.getBulkSubscriptionsOptimized(limit, offset);
      case 'get_bulk_users':
        return await enhancedDatabase.getBulkUsersOptimized(limit, offset);
      case 'get_stats':
        return {
          database: enhancedDatabase.getDatabaseStats(),
          performance: performanceOptimizer.getPerformanceStats(),
          loadBalancer: this.getLoadBalancerStats()
        };
      default:
        throw new Error(`Unknown admin operation: ${operation}`);
    }
  }

  // Queue Management
  async queueRequest(requestId) {
    return new Promise((resolve, reject) => {
      const queueItem = this.requestQueue.find(item => item.id === requestId);
      if (queueItem) {
        queueItem.resolve = resolve;
        queueItem.reject = reject;
      }
    });
  }

  startRequestProcessing() {
    setInterval(() => {
      this.processQueuedRequests();
    }, 100); // Process queue every 100ms
  }

  async processQueuedRequests() {
    if (this.requestQueue.length === 0) return;
    
    const availableWorker = this.getAvailableWorker();
    if (!availableWorker) return;
    
    // Sort by priority and timestamp
    this.requestQueue.sort((a, b) => {
      if (a.priority === 'high' && b.priority !== 'high') return -1;
      if (a.priority !== 'high' && b.priority === 'high') return 1;
      return a.timestamp - b.timestamp;
    });
    
    const request = this.requestQueue.shift();
    if (!request) return;
    
    try {
      const result = await this.processRequest(
        request.id,
        request.type,
        request.data,
        request.priority
      );
      
      if (request.resolve) {
        request.resolve(result);
      }
    } catch (error) {
      if (request.reject) {
        request.reject(error);
      }
    }
  }

  // Performance Monitoring
  getLoadBalancerStats() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      availableWorkers: this.workerPool.filter(w => !w.busy).length,
      totalWorkers: this.workerPool.length,
      averageResponseTime: performanceOptimizer.performanceMetrics.averageResponseTime,
      requestsPerSecond: this.activeRequests.size,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }

  // Health Check
  isHealthy() {
    const stats = this.getLoadBalancerStats();
    return {
      healthy: stats.activeRequests < stats.maxConcurrentRequests * 0.9,
      stats
    };
  }

  // Emergency Mode
  enableEmergencyMode() {
    this.maxConcurrentRequests = 5000; // Reduce to 5k
    this.maxWorkers = 25; // Reduce workers
    console.log('🚨 Emergency mode enabled - reduced capacity');
  }

  disableEmergencyMode() {
    this.maxConcurrentRequests = 10000; // Back to 10k
    this.maxWorkers = 50; // Back to 50 workers
    console.log('✅ Emergency mode disabled - full capacity restored');
  }
}

// Singleton instance
const loadBalancer = new LoadBalancer();

export default loadBalancer;
