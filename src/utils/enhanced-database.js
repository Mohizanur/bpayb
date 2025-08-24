// Enhanced Database Operations with Performance Optimization
// Handles thousands of concurrent requests efficiently

import { firestore } from './firestore.js';
import performanceOptimizer from './performance-optimizer.js';

class EnhancedDatabase {
  constructor() {
    this.connectionPool = new Map();
    this.queryCache = new Map();
    this.subscriptionCache = new Map();
    this.userCache = new Map();
    this.serviceCache = new Map();
    
    // Batch operation queues
    this.writeQueue = [];
    this.readQueue = [];
    
    // Start batch processing
    this.startBatchProcessing();
  }

  // Optimized User Operations
  async getUserOptimized(userId, useCache = true) {
    const cacheKey = `user_${userId}`;
    
    if (useCache) {
      const cached = await performanceOptimizer.getCachedData(cacheKey, 300000); // 5 minutes
      if (cached) return cached;
    }
    
    try {
      const userData = await performanceOptimizer.optimizedGet('users', userId, useCache);
      if (userData) {
        await performanceOptimizer.setCachedData(cacheKey, userData, 300000);
      }
      return userData;
    } catch (error) {
      console.error(`Error getting user ${userId}:`, error);
      return null;
    }
  }

  async updateUserOptimized(userId, data, useCache = true) {
    try {
      await performanceOptimizer.optimizedSet('users', userId, data, useCache);
      
      // Update cache
      if (useCache) {
        const cacheKey = `user_${userId}`;
        await performanceOptimizer.setCachedData(cacheKey, data, 300000);
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating user ${userId}:`, error);
      return false;
    }
  }

  // Optimized Subscription Operations
  async getUserSubscriptionsOptimized(userId, useCache = true) {
    const cacheKey = `subscriptions_${userId}`;
    
    if (useCache) {
      const cached = await performanceOptimizer.getCachedData(cacheKey, 60000); // 1 minute
      if (cached) return cached;
    }
    
    try {
      // Check rate limiting
      if (performanceOptimizer.isRateLimited(userId, 'get_subscriptions', 5, 60000)) {
        throw new Error('Rate limit exceeded for subscription queries');
      }
      
      const snapshot = await firestore
        .collection('subscriptions')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(50) // Limit for performance
        .get();
      
      const subscriptions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (useCache) {
        await performanceOptimizer.setCachedData(cacheKey, subscriptions, 60000);
      }
      
      return subscriptions;
    } catch (error) {
      console.error(`Error getting subscriptions for user ${userId}:`, error);
      return [];
    }
  }

  async createSubscriptionOptimized(subscriptionData) {
    try {
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add to write queue for batch processing
      this.writeQueue.push({
        type: 'create',
        collection: 'subscriptions',
        docId: subscriptionId,
        data: {
          ...subscriptionData,
          id: subscriptionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
      
      // Clear user subscription cache
      const cacheKey = `subscriptions_${subscriptionData.userId}`;
      performanceOptimizer.cache.delete(cacheKey);
      
      return subscriptionId;
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Optimized Service Operations
  async getServicesOptimized(useCache = true) {
    const cacheKey = 'all_services';
    
    if (useCache) {
      const cached = await performanceOptimizer.getCachedData(cacheKey, 300000); // 5 minutes
      if (cached) return cached;
    }
    
    try {
      const snapshot = await firestore.collection('services').get();
      const services = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      if (useCache) {
        await performanceOptimizer.setCachedData(cacheKey, services, 300000);
      }
      
      return services;
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }

  async getServiceOptimized(serviceId, useCache = true) {
    const cacheKey = `service_${serviceId}`;
    
    if (useCache) {
      const cached = await performanceOptimizer.getCachedData(cacheKey, 300000);
      if (cached) return cached;
    }
    
    try {
      const serviceData = await performanceOptimizer.optimizedGet('services', serviceId, useCache);
      if (serviceData && useCache) {
        await performanceOptimizer.setCachedData(cacheKey, serviceData, 300000);
      }
      return serviceData;
    } catch (error) {
      console.error(`Error getting service ${serviceId}:`, error);
      return null;
    }
  }

  // Batch Processing
  startBatchProcessing() {
    setInterval(async () => {
      await this.processWriteQueue();
      await this.processReadQueue();
    }, 1000); // Process every second
  }

  async processWriteQueue() {
    if (this.writeQueue.length === 0) return;
    
    const batch = firestore.batch();
    const operations = this.writeQueue.splice(0, 500); // Firestore batch limit
    
    for (const operation of operations) {
      try {
        const ref = firestore.collection(operation.collection).doc(operation.docId);
        
        switch (operation.type) {
          case 'create':
          case 'update':
            batch.set(ref, operation.data, { merge: true });
            break;
          case 'delete':
            batch.delete(ref);
            break;
        }
      } catch (error) {
        console.error(`Batch operation failed:`, error);
      }
    }
    
    if (operations.length > 0) {
      try {
        await batch.commit();
        console.log(`✅ Processed ${operations.length} batch operations`);
      } catch (error) {
        console.error('Batch commit failed:', error);
      }
    }
  }

  async processReadQueue() {
    if (this.readQueue.length === 0) return;
    
    const operations = this.readQueue.splice(0, 100); // Process 100 at a time
    
    for (const operation of operations) {
      try {
        const result = await operation.query();
        operation.resolve(result);
      } catch (error) {
        operation.reject(error);
      }
    }
  }

  // Performance Monitoring
  getDatabaseStats() {
    return {
      writeQueueSize: this.writeQueue.length,
      readQueueSize: this.readQueue.length,
      cacheStats: {
        userCache: this.userCache.size,
        subscriptionCache: this.subscriptionCache.size,
        serviceCache: this.serviceCache.size,
        queryCache: this.queryCache.size
      },
      performanceStats: performanceOptimizer.getPerformanceStats()
    };
  }

  // Cache Management
  clearUserCache(userId) {
    const cacheKey = `user_${userId}`;
    performanceOptimizer.cache.delete(cacheKey);
  }

  clearSubscriptionCache(userId) {
    const cacheKey = `subscriptions_${userId}`;
    performanceOptimizer.cache.delete(cacheKey);
  }

  clearServiceCache() {
    performanceOptimizer.cache.delete('all_services');
  }

  // Optimized Payment Operations
  async createPaymentOptimized(paymentData) {
    try {
      const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      this.writeQueue.push({
        type: 'create',
        collection: 'payments',
        docId: paymentId,
        data: {
          ...paymentData,
          id: paymentId,
          createdAt: new Date().toISOString(),
          status: 'pending'
        }
      });
      
      return paymentId;
    } catch (error) {
      console.error('Error creating payment:', error);
      throw error;
    }
  }

  async updatePaymentStatusOptimized(paymentId, status, useCache = true) {
    try {
      await performanceOptimizer.optimizedSet('payments', paymentId, {
        status,
        updatedAt: new Date().toISOString()
      }, useCache);
      
      return true;
    } catch (error) {
      console.error(`Error updating payment ${paymentId}:`, error);
      return false;
    }
  }

  // Bulk Operations for Admin
  async getBulkSubscriptionsOptimized(limit = 100, offset = 0) {
    try {
      const snapshot = await firestore
        .collection('subscriptions')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting bulk subscriptions:', error);
      return [];
    }
  }

  async getBulkUsersOptimized(limit = 100, offset = 0) {
    try {
      const snapshot = await firestore
        .collection('users')
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting bulk users:', error);
      return [];
    }
  }
}

// Singleton instance
const enhancedDatabase = new EnhancedDatabase();

export default enhancedDatabase;
