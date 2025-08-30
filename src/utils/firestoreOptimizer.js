// Firestore Optimization Utility for BirrPay Bot
// AGGRESSIVE BEAST MODE - Maximum efficiency for 10,000+ users on free tier

import { firestore } from './firestore.js';

// AGGRESSIVE CACHE TTL - Extended for maximum hit rate
const CACHE_TTL = {
  USERS: 30 * 60 * 1000,        // 30 minutes (was 5) - 6x longer
  SERVICES: 60 * 60 * 1000,     // 1 hour (was 30 min) - 2x longer
  SUBSCRIPTIONS: 10 * 60 * 1000, // 10 minutes (was 2) - 5x longer
  PAYMENTS: 10 * 60 * 1000,     // 10 minutes (was 2) - 5x longer
  STATS: 5 * 60 * 1000,         // 5 minutes (was 1) - 5x longer
  ADMIN_STATS: 5 * 60 * 1000,   // 5 minutes - NEW
  USER_PAGES: 10 * 60 * 1000,   // 10 minutes - NEW
  COLLECTION_COUNTS: 15 * 60 * 1000 // 15 minutes - NEW
};

// In-memory cache with TTL
class FirestoreCache {
  constructor() {
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      invalidations: 0
    };
    this.batchOperations = [];
    this.batchTimer = null;
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

  // AGGRESSIVE invalidation - only when absolutely necessary
  invalidate(pattern) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    this.stats.invalidations += count;
  }

  // SMART BATCHING - Queue operations for batch processing
  queueOperation(operation) {
    this.batchOperations.push(operation);
    
    // Process batch every 5 seconds or when 10+ operations
    if (this.batchOperations.length >= 10) {
      this.processBatch();
    } else if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processBatch(), 5000);
    }
  }

  async processBatch() {
    if (this.batchOperations.length === 0) return;
    
    try {
      const batch = firestore.batch();
      this.batchOperations.forEach(op => {
        if (op.type === 'set') {
          batch.set(op.ref, op.data);
        } else if (op.type === 'update') {
          batch.update(op.ref, op.data);
        } else if (op.type === 'delete') {
          batch.delete(op.ref);
        }
      });
      
      await batch.commit();
      this.batchOperations = [];
      if (this.batchTimer) {
        clearTimeout(this.batchTimer);
        this.batchTimer = null;
      }
    } catch (error) {
      console.error('Batch operation failed:', error);
    }
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total * 100).toFixed(2) + '%' : '0%',
      size: this.cache.size,
      batchQueue: this.batchOperations.length
    };
  }
}

const cache = new FirestoreCache();

// AGGRESSIVE BEAST MODE OPTIMIZATIONS
export class FirestoreOptimizer {
  
  // Get user with AGGRESSIVE caching
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

  // Get services with EXTENDED caching
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

  // LAZY LOADING - Only load when actually needed
  static async getAdminStats() {
    const cacheKey = 'admin_stats';
    let stats = cache.get(cacheKey);
    
    if (!stats) {
      // Only calculate if admin actually opens panel
      stats = await this.calculateAdminStats();
      cache.set(cacheKey, stats, CACHE_TTL.ADMIN_STATS);
    }
    
    return stats;
  }

  // VIRTUAL PAGINATION - Cache each page separately
  static async getUsersPage(page = 1, limit = 10) {
    const cacheKey = `users_page_${page}_${limit}`;
    let users = cache.get(cacheKey);
    
    if (!users) {
      const usersSnapshot = await firestore.collection('users')
        .limit(limit)
        .offset((page - 1) * limit)
        .get();
      
      users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      cache.set(cacheKey, users, CACHE_TTL.USER_PAGES);
    }
    
    return users;
  }

  // AGGRESSIVE collection counting with caching
  static async getCollectionCount(collectionName) {
    const cacheKey = `count_${collectionName}`;
    let count = cache.get(cacheKey);
    
    if (count === null) {
      const snapshot = await firestore.collection(collectionName).get();
      count = snapshot.size;
      cache.set(cacheKey, count, CACHE_TTL.COLLECTION_COUNTS);
    }
    
    return count;
  }

  // SMART BATCHING for updates
  static async updateUser(userId, data) {
    // Update cache immediately for instant response
    const cacheKey = `user_${userId}`;
    const existingData = cache.get(cacheKey);
    const updatedData = { ...existingData, ...data };
    cache.set(cacheKey, updatedData, CACHE_TTL.USERS);
    
    // Queue for batch processing (delayed sync)
    cache.queueOperation({
      type: 'update',
      ref: firestore.collection('users').doc(userId),
      data: data
    });
    
    return updatedData;
  }

  // FAKE REAL-TIME updates
  static async createSubscription(userId, subscriptionData) {
    // Update cache immediately
    const cacheKey = `subscriptions_${userId}`;
    const existingSubs = cache.get(cacheKey) || [];
    const newSub = { id: Date.now().toString(), ...subscriptionData };
    existingSubs.push(newSub);
    cache.set(cacheKey, existingSubs, CACHE_TTL.SUBSCRIPTIONS);
    
    // Queue for batch processing
    cache.queueOperation({
      type: 'set',
      ref: firestore.collection('subscriptions').doc(newSub.id),
      data: subscriptionData
    });
    
    return newSub;
  }

  // Calculate admin stats only when needed
  static async calculateAdminStats() {
    const [usersCount, subscriptionsCount, paymentsCount, servicesCount] = await Promise.all([
      this.getCollectionCount('users'),
      this.getCollectionCount('subscriptions'),
      this.getCollectionCount('payments'),
      this.getCollectionCount('services')
    ]);
    
    return {
      users: usersCount,
      subscriptions: subscriptionsCount,
      payments: paymentsCount,
      services: servicesCount
    };
  }

  // Invalidate cache only when absolutely necessary
  static invalidateUserCache(userId) {
    cache.invalidate(`user_${userId}`);
  }

  static invalidateSubscriptionCache(userId) {
    cache.invalidate(`subscriptions_${userId}`);
  }

  static invalidatePaymentCache() {
    cache.invalidate('payments');
  }

  static getCacheStats() {
    return cache.getStats();
  }

  // Force process any pending batch operations
  static async flushBatch() {
    await cache.processBatch();
  }
}

// Rate limiter for additional protection
class RateLimiter {
  constructor() {
    this.requests = new Map();
    this.limits = {
      reads: { max: 100, window: 60000 },    // 100 reads per minute
      writes: { max: 50, window: 60000 },    // 50 writes per minute
      deletes: { max: 20, window: 60000 }    // 20 deletes per minute
    };
  }

  canProceed(operation) {
    const now = Date.now();
    const limit = this.limits[operation];
    
    if (!this.requests.has(operation)) {
      this.requests.set(operation, []);
    }
    
    const requests = this.requests.get(operation);
    const validRequests = requests.filter(time => now - time < limit.window);
    
    if (validRequests.length >= limit.max) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(operation, validRequests);
    return true;
  }
}

const rateLimiter = new RateLimiter();

// Rate-limited operation wrapper
export const rateLimitedOperation = async (operation, func) => {
  if (!rateLimiter.canProceed(operation)) {
    throw new Error(`Rate limit exceeded for ${operation}`);
  }
  return await func();
};

export { cache as FirestoreCache };
