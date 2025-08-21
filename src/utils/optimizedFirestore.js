// Optimized Firestore service with caching and efficiency improvements
import { firestore } from './firestore.js';
import { cache } from './cache.js';

class OptimizedFirestore {
  constructor() {
    this.firestore = firestore;
    this.cache = cache;
    this.batchSize = 20; // Pagination size
    this.requestCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  // Get services with caching
  async getServices(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cachedServices = this.cache.getServices();
      if (cachedServices) {
        this.cacheHits++;
        console.log('📦 Services loaded from cache');
        return cachedServices;
      }
    }

    // Fetch from Firestore
    this.cacheMisses++;
    this.requestCount++;
    console.log('🔥 Fetching services from Firestore');
    
    try {
      const snapshot = await this.firestore.collection('services').get();
      const services = [];
      
      snapshot.forEach(doc => {
        services.push({
          id: doc.id,
          serviceID: doc.id,
          ...doc.data()
        });
      });

      // Cache the results
      this.cache.setServices(services);
      console.log(`✅ Cached ${services.length} services`);
      
      return services;
    } catch (error) {
      console.error('❌ Error fetching services:', error);
      throw error;
    }
  }

  // Get single service with caching
  async getService(serviceId, forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cachedServices = this.cache.getServices();
      if (cachedServices) {
        const service = cachedServices.find(s => s.id === serviceId || s.serviceID === serviceId);
        if (service) {
          this.cacheHits++;
          return service;
        }
      }
    }

    // Fetch from Firestore
    this.cacheMisses++;
    this.requestCount++;
    
    try {
      const doc = await this.firestore.collection('services').doc(serviceId).get();
      if (doc.exists) {
        const service = { id: doc.id, ...doc.data() };
        
        // Update cache with new service
        const cachedServices = this.cache.getServices() || [];
        const existingIndex = cachedServices.findIndex(s => s.id === serviceId);
        if (existingIndex >= 0) {
          cachedServices[existingIndex] = service;
        } else {
          cachedServices.push(service);
        }
        this.cache.setServices(cachedServices);
        
        return service;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching service:', error);
      throw error;
    }
  }

  // Get user with caching
  async getUser(userId, forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cachedUser = this.cache.getUser(userId);
      if (cachedUser) {
        this.cacheHits++;
        return cachedUser;
      }
    }

    // Fetch from Firestore
    this.cacheMisses++;
    this.requestCount++;
    
    try {
      const doc = await this.firestore.collection('users').doc(userId).get();
      if (doc.exists) {
        const userData = { id: doc.id, ...doc.data() };
        this.cache.setUser(userId, userData);
        return userData;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching user:', error);
      throw error;
    }
  }

  // Get admin statistics with caching
  async getAdminStats(forceRefresh = false) {
    // Check cache first
    if (!forceRefresh) {
      const cachedStats = this.cache.getStats();
      if (cachedStats) {
        this.cacheHits++;
        return cachedStats;
      }
    }

    // Fetch from Firestore
    this.cacheMisses++;
    this.requestCount++;
    console.log('📊 Fetching admin stats from Firestore');
    
    try {
      const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, servicesSnapshot] = await Promise.all([
        this.firestore.collection('users').get(),
        this.firestore.collection('subscriptions').get(),
        this.firestore.collection('payments').get(),
        this.firestore.collection('services').get()
      ]);

      const stats = {
        totalUsers: usersSnapshot.size,
        activeUsers: usersSnapshot.docs.filter(doc => doc.data().status !== 'banned').length,
        totalSubscriptions: subscriptionsSnapshot.size,
        activeSubscriptions: subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'active').length,
        pendingSubscriptions: subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'pending').length,
        totalPayments: paymentsSnapshot.size,
        pendingPayments: paymentsSnapshot.docs.filter(doc => doc.data().status === 'pending').length,
        totalServices: servicesSnapshot.size,
        totalRevenue: 0,
        timestamp: new Date().toISOString()
      };

      // Calculate revenue
      paymentsSnapshot.docs.forEach(doc => {
        const payment = doc.data();
        if (payment.status === 'completed' && payment.price) {
          stats.totalRevenue += parseFloat(payment.price) || 0;
        }
      });

      // Cache the results
      this.cache.setStats(stats);
      console.log('✅ Cached admin statistics');
      
      return stats;
    } catch (error) {
      console.error('❌ Error fetching admin stats:', error);
      throw error;
    }
  }

  // Get paginated users (efficient for large datasets)
  async getUsersPaginated(page = 0, limit = this.batchSize, status = 'all') {
    this.requestCount++;
    
    try {
      let query = this.firestore.collection('users');
      
      // Apply status filter
      if (status !== 'all') {
        query = query.where('status', '==', status);
      }
      
      // Apply pagination
      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(page * limit)
        .get();

      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });

      return {
        users,
        hasMore: users.length === limit,
        total: snapshot.size,
        page
      };
    } catch (error) {
      console.error('❌ Error fetching paginated users:', error);
      throw error;
    }
  }

  // Get paginated subscriptions
  async getSubscriptionsPaginated(page = 0, limit = this.batchSize, status = 'all') {
    this.requestCount++;
    
    try {
      let query = this.firestore.collection('subscriptions');
      
      if (status !== 'all') {
        query = query.where('status', '==', status);
      }
      
      const snapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(page * limit)
        .get();

      const subscriptions = [];
      snapshot.forEach(doc => {
        subscriptions.push({ id: doc.id, ...doc.data() });
      });

      return {
        subscriptions,
        hasMore: subscriptions.length === limit,
        total: snapshot.size,
        page
      };
    } catch (error) {
      console.error('❌ Error fetching paginated subscriptions:', error);
      throw error;
    }
  }

  // Update service with cache invalidation
  async updateService(serviceId, updates) {
    this.requestCount++;
    
    try {
      await this.firestore.collection('services').doc(serviceId).update(updates);
      
      // Invalidate cache
      this.cache.invalidateServices();
      console.log('🔄 Service cache invalidated after update');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error updating service:', error);
      throw error;
    }
  }

  // Delete service with cache invalidation
  async deleteService(serviceId) {
    this.requestCount++;
    
    try {
      await this.firestore.collection('services').doc(serviceId).delete();
      
      // Invalidate cache
      this.cache.invalidateServices();
      console.log('🔄 Service cache invalidated after deletion');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Error deleting service:', error);
      throw error;
    }
  }

  // Get performance metrics
  getPerformanceMetrics() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const cacheHitRate = totalRequests > 0 ? (this.cacheHits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      totalRequests: this.requestCount,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRate: `${cacheHitRate}%`,
      cacheStats: this.cache.getStats(),
      estimatedSavings: this.cacheMisses * 0.0001 // Rough estimate of Firestore read costs saved
    };
  }

  // Reset metrics
  resetMetrics() {
    this.requestCount = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}

// Create and export optimized Firestore instance
export const optimizedFirestore = new OptimizedFirestore();

// Log performance metrics every 10 minutes
setInterval(() => {
  const metrics = optimizedFirestore.getPerformanceMetrics();
  console.log('📊 Firestore Performance Metrics:', metrics);
}, 10 * 60 * 1000);







