// 🚀 REAL-TIME FIRESTORE - Quota-Aware Real-time Database Operations
// Real-time Firestore operations that respect free tier quotas

import { firestore } from './firestore.js';
import firestoreQuotaManager from './firestoreQuotaManager.js';
import { performance } from 'perf_hooks';

class RealTimeFirestore {
  constructor() {
    this.isInitialized = false;
    this.listeners = new Map();
    this.realtimeData = new Map();
    
    // Real-time settings
    this.settings = {
      enableRealTimeSync: true,
      enableQuotaManagement: true,
      maxListeners: 100,
      syncInterval: 5000, // 5 seconds for free tier
      batchSize: 500,
      enableSmartCaching: true
    };
    
    // Statistics
    this.stats = {
      totalReads: 0,
      totalWrites: 0,
      totalQueries: 0,
      cacheHits: 0,
      realTimeUpdates: 0,
      quotaSavings: 0,
      averageResponseTime: 0
    };
    
    this.startTime = Date.now();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Real-Time Firestore...');
    
    // Initialize quota manager
    await firestoreQuotaManager.initialize();
    
    // Start real-time sync
    if (this.settings.enableRealTimeSync) {
      this.startRealTimeSync();
    }
    
    this.isInitialized = true;
    console.log('✅ Real-Time Firestore initialized');
  }

  // Real-time document operations
  async getDocument(collection, docId, options = {}) {
    const startTime = performance.now();
    
    try {
      // Use quota manager for smart reading
      const result = await firestoreQuotaManager.smartRead(collection, docId, options);
      
      this.stats.totalReads++;
      this.updateStats(startTime);
      
      return result;
      
    } catch (error) {
      console.error(`Error reading document ${collection}/${docId}:`, error.message);
      throw error;
    }
  }

  async setDocument(collection, docId, data, options = {}) {
    const startTime = performance.now();
    
    try {
      // Use quota manager for smart writing
      const result = await firestoreQuotaManager.smartWrite(collection, docId, data, options);
      
      // Update real-time cache
      this.updateRealTimeCache(collection, docId, data);
      
      // Notify listeners
      this.notifyListeners(collection, docId, 'modified', data);
      
      this.stats.totalWrites++;
      this.updateStats(startTime);
      
      return result;
      
    } catch (error) {
      console.error(`Error writing document ${collection}/${docId}:`, error.message);
      throw error;
    }
  }

  async queryCollection(collection, filters = {}, options = {}) {
    const startTime = performance.now();
    
    try {
      // Use quota manager for smart querying
      const result = await firestoreQuotaManager.smartQuery(collection, filters, options);
      
      // Update real-time cache with query results
      if (result.docs) {
        result.docs.forEach(doc => {
          this.updateRealTimeCache(collection, doc.id, doc.data);
        });
      }
      
      this.stats.totalQueries++;
      this.updateStats(startTime);
      
      return result;
      
    } catch (error) {
      console.error(`Error querying collection ${collection}:`, error.message);
      throw error;
    }
  }

  // Real-time listeners (quota-efficient)
  onSnapshot(collection, docId, callback, options = {}) {
    const listenerId = `${collection}_${docId}_${Date.now()}`;
    
    if (this.listeners.size >= this.settings.maxListeners) {
      throw new Error('Maximum listeners reached');
    }
    
    const listener = {
      id: listenerId,
      collection,
      docId,
      callback,
      options,
      lastUpdate: Date.now(),
      active: true
    };
    
    this.listeners.set(listenerId, listener);
    
    // Initial data fetch
    this.getDocument(collection, docId, options)
      .then(data => {
        if (listener.active) {
          callback(data, 'initial');
        }
      })
      .catch(error => {
        console.error(`Error in initial snapshot for ${collection}/${docId}:`, error.message);
      });
    
    return () => {
      // Unsubscribe function
      listener.active = false;
      this.listeners.delete(listenerId);
    };
  }

  onCollectionSnapshot(collection, filters, callback, options = {}) {
    const listenerId = `${collection}_query_${Date.now()}`;
    
    if (this.listeners.size >= this.settings.maxListeners) {
      throw new Error('Maximum listeners reached');
    }
    
    const listener = {
      id: listenerId,
      collection,
      filters,
      callback,
      options,
      lastUpdate: Date.now(),
      active: true,
      type: 'collection'
    };
    
    this.listeners.set(listenerId, listener);
    
    // Initial query
    this.queryCollection(collection, filters, options)
      .then(data => {
        if (listener.active) {
          callback(data, 'initial');
        }
      })
      .catch(error => {
        console.error(`Error in initial collection snapshot for ${collection}:`, error.message);
      });
    
    return () => {
      // Unsubscribe function
      listener.active = false;
      this.listeners.delete(listenerId);
    };
  }

  // Real-time sync system (quota-efficient)
  startRealTimeSync() {
    setInterval(() => {
      this.syncRealTimeData();
    }, this.settings.syncInterval);
    
    console.log(`🔄 Real-time sync started (${this.settings.syncInterval}ms interval)`);
  }

  async syncRealTimeData() {
    if (this.listeners.size === 0) return;
    
    const quotaStatus = firestoreQuotaManager.getQuotaStatus();
    
    // Skip sync if quota is too high
    if (quotaStatus.status === 'EMERGENCY') {
      console.warn('⚠️ Skipping real-time sync due to quota limits');
      return;
    }
    
    // Sync active listeners
    const activeListeners = Array.from(this.listeners.values()).filter(l => l.active);
    
    for (const listener of activeListeners.slice(0, 10)) { // Limit to 10 per sync
      try {
        if (listener.type === 'collection') {
          const data = await this.queryCollection(listener.collection, listener.filters, listener.options);
          if (listener.active) {
            listener.callback(data, 'sync');
            listener.lastUpdate = Date.now();
          }
        } else {
          const data = await this.getDocument(listener.collection, listener.docId, listener.options);
          if (listener.active) {
            listener.callback(data, 'sync');
            listener.lastUpdate = Date.now();
          }
        }
        
        this.stats.realTimeUpdates++;
        
        // Small delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Error syncing listener ${listener.id}:`, error.message);
      }
    }
  }

  // Real-time cache management
  updateRealTimeCache(collection, docId, data) {
    const key = `${collection}_${docId}`;
    this.realtimeData.set(key, {
      data,
      timestamp: Date.now(),
      collection,
      docId
    });
    
    // Limit cache size
    if (this.realtimeData.size > 1000) {
      const entries = Array.from(this.realtimeData.entries());
      const toRemove = entries.slice(0, 100);
      toRemove.forEach(([k]) => this.realtimeData.delete(k));
    }
  }

  getRealTimeData(collection, docId) {
    const key = `${collection}_${docId}`;
    const cached = this.realtimeData.get(key);
    
    if (cached && Date.now() - cached.timestamp < 60000) { // 1 minute cache
      this.stats.cacheHits++;
      return cached.data;
    }
    
    return null;
  }

  notifyListeners(collection, docId, type, data) {
    const relevantListeners = Array.from(this.listeners.values()).filter(
      l => l.active && l.collection === collection && 
      (l.docId === docId || l.type === 'collection')
    );
    
    relevantListeners.forEach(listener => {
      try {
        listener.callback(data, type);
        listener.lastUpdate = Date.now();
      } catch (error) {
        console.error(`Error notifying listener ${listener.id}:`, error.message);
      }
    });
  }

  // User management with real-time sync
  async getUser(userId) {
    return await this.getDocument('users', userId);
  }

  async updateUser(userId, userData) {
    return await this.setDocument('users', userId, {
      ...userData,
      updatedAt: Date.now()
    });
  }

  async createUser(userId, userData) {
    return await this.setDocument('users', userId, {
      ...userData,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
  }

  // Subscription management with real-time sync
  async getUserSubscriptions(userId) {
    return await this.queryCollection('subscriptions', { userId }, { limit: 50 });
  }

  async createSubscription(subscriptionData) {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return await this.setDocument('subscriptions', subscriptionId, {
      ...subscriptionData,
      id: subscriptionId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      status: 'active'
    });
  }

  async updateSubscription(subscriptionId, updates) {
    return await this.setDocument('subscriptions', subscriptionId, {
      ...updates,
      updatedAt: Date.now()
    });
  }

  // Service management
  async getServices() {
    return await this.queryCollection('services', {}, { limit: 100 });
  }

  async getService(serviceId) {
    return await this.getDocument('services', serviceId);
  }

  // Company management
  async getCompany(companyId) {
    return await this.getDocument('companies', companyId);
  }

  async updateCompany(companyId, companyData) {
    return await this.setDocument('companies', companyId, {
      ...companyData,
      updatedAt: Date.now()
    });
  }

  // Statistics and analytics
  async recordUserActivity(userId, activity) {
    const activityId = `activity_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return await this.setDocument('user_activities', activityId, {
      userId,
      activity,
      timestamp: Date.now()
    });
  }

  async getAnalytics(type, timeRange = '24h') {
    const filters = {
      timestamp: { '>=': Date.now() - (timeRange === '24h' ? 86400000 : 604800000) }
    };
    
    return await this.queryCollection('analytics', filters, { limit: 1000 });
  }

  // Performance monitoring
  updateStats(startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    const totalOperations = this.stats.totalReads + this.stats.totalWrites + this.stats.totalQueries;
    this.stats.averageResponseTime = totalOperations > 0 ? 
      (this.stats.averageResponseTime * (totalOperations - 1) + responseTime) / totalOperations : responseTime;
  }

  // Public API methods
  getStats() {
    const quotaStatus = firestoreQuotaManager.getQuotaStatus();
    
    return {
      ...this.stats,
      uptime: Date.now() - this.startTime,
      activeListeners: this.listeners.size,
      realtimeDataSize: this.realtimeData.size,
      quotaStatus,
      settings: this.settings
    };
  }

  getQuotaStatus() {
    return firestoreQuotaManager.getQuotaStatus();
  }

  isHealthy() {
    return firestoreQuotaManager.isHealthy() && this.listeners.size < this.settings.maxListeners;
  }

  // Admin methods
  async clearCache() {
    this.realtimeData.clear();
    return { message: 'Real-time cache cleared', timestamp: Date.now() };
  }

  async getQuotaReport() {
    const quotaStatus = firestoreQuotaManager.getQuotaStatus();
    const stats = this.getStats();
    
    return {
      quota: quotaStatus,
      performance: {
        totalOperations: stats.totalReads + stats.totalWrites + stats.totalQueries,
        averageResponseTime: stats.averageResponseTime,
        cacheHitRate: stats.cacheHits > 0 ? (stats.cacheHits / (stats.totalReads + stats.totalQueries)) * 100 : 0
      },
      realtime: {
        activeListeners: stats.activeListeners,
        realtimeUpdates: stats.realTimeUpdates,
        dataSize: stats.realtimeDataSize
      },
      recommendations: this.getOptimizationRecommendations(quotaStatus)
    };
  }

  getOptimizationRecommendations(quotaStatus) {
    const recommendations = [];
    
    if (quotaStatus.reads.percentage > 80) {
      recommendations.push('Consider increasing cache TTL to reduce reads');
    }
    
    if (quotaStatus.writes.percentage > 80) {
      recommendations.push('Enable batch writing to reduce write operations');
    }
    
    if (quotaStatus.cache.hitRate < 70) {
      recommendations.push('Optimize caching strategy for better hit rate');
    }
    
    if (this.listeners.size > 50) {
      recommendations.push('Consider reducing active listeners for better quota efficiency');
    }
    
    return recommendations;
  }

  // Shutdown
  async shutdown() {
    console.log('🔄 Shutting down Real-Time Firestore...');
    
    // Clear all listeners
    this.listeners.clear();
    this.realtimeData.clear();
    
    // Shutdown quota manager
    await firestoreQuotaManager.shutdown();
    
    console.log('✅ Real-Time Firestore shutdown complete');
  }
}

// Create singleton instance
const realTimeFirestore = new RealTimeFirestore();

export default realTimeFirestore;
