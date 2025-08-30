// Firestore Optimization Utility for BirrPay Bot
// Reduces database calls and prevents quota limits while maintaining all features

import { firestore } from './firestore.js';

// Cache configuration
const CACHE_TTL = {
  USERS: 5 * 60 * 1000,        // 5 minutes
  SERVICES: 30 * 60 * 1000,    // 30 minutes  
  SUBSCRIPTIONS: 2 * 60 * 1000, // 2 minutes
  PAYMENTS: 2 * 60 * 1000,     // 2 minutes
  STATS: 1 * 60 * 1000         // 1 minute
};

// In-memory cache with TTL
class FirestoreCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      this.stats.misses++;
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }
    
    this.stats.hits++;
    return item.data;
  }

  set(key, data, ttl = 60000) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });
    this.stats.sets++;
  }

  invalidate(pattern) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size
    };
  }
}

const cache = new FirestoreCache();

// Optimized database operations
export class FirestoreOptimizer {
  
  // Get user with caching
  static async getUser(userId) {
    const cacheKey = `user_${userId}`;
    let userData = cache.get(cacheKey);
    
    if (!userData) {
      const userDoc = await firestore.collection('users').doc(userId).get();
      userData = userDoc.exists ? userDoc.data() : null;
      cache.set(cacheKey, userData, CACHE_TTL.USERS);
    }
    
    return userData;
  }

  // Get services with caching (rarely changes)
  static async getServices() {
    const cacheKey = 'services_all';
    let services = cache.get(cacheKey);
    
    if (!services) {
      const servicesSnapshot = await firestore.collection('services').get();
      services = servicesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      cache.set(cacheKey, services, CACHE_TTL.SERVICES);
    }
    
    return services;
  }

  // Get user subscriptions with pagination
  static async getUserSubscriptions(userId, limit = 10, offset = 0) {
    const cacheKey = `user_subs_${userId}_${limit}_${offset}`;
    let subscriptions = cache.get(cacheKey);
    
    if (!subscriptions) {
      const subsSnapshot = await firestore.collection('subscriptions')
        .where('telegramUserID', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .offset(offset)
        .get();
      
      subscriptions = subsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      cache.set(cacheKey, subscriptions, CACHE_TTL.SUBSCRIPTIONS);
    }
    
    return subscriptions;
  }

  // Get admin statistics with aggregation (most expensive operation)
  static async getAdminStats() {
    const cacheKey = 'admin_stats';
    let stats = cache.get(cacheKey);
    
    if (!stats) {
      // Use separate queries with limits instead of loading all data
      const [usersCount, activeSubsCount, pendingSubsCount, paymentsCount] = await Promise.all([
        this.getCollectionCount('users'),
        this.getCollectionCountWithFilter('subscriptions', 'status', '==', 'active'),
        this.getCollectionCountWithFilter('subscriptions', 'status', '==', 'pending'),
        this.getCollectionCount('pendingPayments')
      ]);
      
      stats = {
        totalUsers: usersCount,
        activeSubscriptions: activeSubsCount,
        pendingSubscriptions: pendingSubsCount,
        totalPayments: paymentsCount,
        timestamp: new Date()
      };
      
      cache.set(cacheKey, stats, CACHE_TTL.STATS);
    }
    
    return stats;
  }

  // Get users with pagination for admin panel
  static async getUsersPaginated(page = 0, pageSize = 10, filter = 'all') {
    const cacheKey = `users_page_${page}_${pageSize}_${filter}`;
    let users = cache.get(cacheKey);
    
    if (!users) {
      let query = firestore.collection('users');
      
      // Apply filters
      if (filter === 'active') {
        query = query.where('status', '!=', 'banned').where('status', '!=', 'suspended');
      } else if (filter === 'banned') {
        query = query.where('status', 'in', ['banned', 'suspended']);
      } else if (filter === 'premium') {
        query = query.where('isPremium', '==', true);
      }
      
      const usersSnapshot = await query
        .orderBy('lastActivity', 'desc')
        .limit(pageSize)
        .offset(page * pageSize)
        .get();
      
      users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      cache.set(cacheKey, users, CACHE_TTL.USERS);
    }
    
    return users;
  }

  // Get subscriptions with pagination for admin panel
  static async getSubscriptionsPaginated(page = 0, pageSize = 10, status = 'all') {
    const cacheKey = `subs_page_${page}_${pageSize}_${status}`;
    let subscriptions = cache.get(cacheKey);
    
    if (!subscriptions) {
      let query = firestore.collection('subscriptions');
      
      if (status !== 'all') {
        query = query.where('status', '==', status);
      }
      
      const subsSnapshot = await query
        .orderBy('createdAt', 'desc')
        .limit(pageSize)
        .offset(page * pageSize)
        .get();
      
      subscriptions = subsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      cache.set(cacheKey, subscriptions, CACHE_TTL.SUBSCRIPTIONS);
    }
    
    return subscriptions;
  }

  // Get collection count efficiently
  static async getCollectionCount(collectionName) {
    const cacheKey = `count_${collectionName}`;
    let count = cache.get(cacheKey);
    
    if (count === null || count === undefined) {
      const snapshot = await firestore.collection(collectionName).count().get();
      count = snapshot.data().count;
      cache.set(cacheKey, count, CACHE_TTL.STATS);
    }
    
    return count;
  }

  // Get collection count with filter
  static async getCollectionCountWithFilter(collectionName, field, operator, value) {
    const cacheKey = `count_${collectionName}_${field}_${operator}_${value}`;
    let count = cache.get(cacheKey);
    
    if (count === null || count === undefined) {
      const snapshot = await firestore.collection(collectionName)
        .where(field, operator, value)
        .count()
        .get();
      count = snapshot.data().count;
      cache.set(cacheKey, count, CACHE_TTL.STATS);
    }
    
    return count;
  }

  // Invalidate cache when data changes
  static invalidateUserCache(userId) {
    cache.invalidate(`user_${userId}`);
    cache.invalidate('admin_stats');
    cache.invalidate('users_page_');
  }

  static invalidateSubscriptionCache(userId) {
    cache.invalidate(`user_subs_${userId}`);
    cache.invalidate('subs_page_');
    cache.invalidate('admin_stats');
  }

  static invalidatePaymentCache() {
    cache.invalidate('payments_');
    cache.invalidate('admin_stats');
  }

  // Get cache statistics
  static getCacheStats() {
    return cache.getStats();
  }

  // Batch operations for efficiency
  static async batchUpdate(operations) {
    const batch = firestore.batch();
    
    operations.forEach(op => {
      if (op.type === 'set') {
        batch.set(firestore.collection(op.collection).doc(op.id), op.data);
      } else if (op.type === 'update') {
        batch.update(firestore.collection(op.collection).doc(op.id), op.data);
      } else if (op.type === 'delete') {
        batch.delete(firestore.collection(op.collection).doc(op.id));
      }
    });
    
    await batch.commit();
    
    // Invalidate relevant caches
    this.invalidateUserCache('*');
    this.invalidateSubscriptionCache('*');
  }
}

// Rate limiting for concurrent requests
class RateLimiter {
  constructor(maxRequests = 100, timeWindow = 60000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindow;
    this.requests = [];
  }

  async checkLimit() {
    const now = Date.now();
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.timeWindow - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(now);
  }
}

const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

// Wrapper for rate-limited operations
export const rateLimitedOperation = async (operation) => {
  await rateLimiter.checkLimit();
  return operation();
};

// Export cache for monitoring
export { cache as FirestoreCache };
