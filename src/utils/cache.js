// Cache management system for BirrPay Bot
// Reduces Firestore read operations and improves performance

class CacheManager {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map(); // Time-to-live for cache entries
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default
  }

  // Set cache with TTL
  set(key, value, ttlMs = this.defaultTTL) {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  // Get cache value if not expired
  get(key) {
    if (!this.cache.has(key)) return null;
    
    const expiry = this.ttl.get(key);
    if (Date.now() > expiry) {
      this.delete(key);
      return null;
    }
    
    return this.cache.get(key);
  }

  // Delete cache entry
  delete(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
  }

  // Clear all cache
  clear() {
    this.cache.clear();
    this.ttl.clear();
  }

  // Get cache size
  size() {
    return this.cache.size;
  }

  // Check if key exists and is valid
  has(key) {
    return this.get(key) !== null;
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [key, expiry] of this.ttl) {
      if (now > expiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      memoryUsage: this.getMemoryUsage()
    };
  }

  // Estimate memory usage
  getMemoryUsage() {
    let size = 0;
    for (const [key, value] of this.cache) {
      size += JSON.stringify(key).length;
      size += JSON.stringify(value).length;
    }
    return size;
  }

  // Clean expired entries
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, expiry] of this.ttl) {
      if (now > expiry) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
    return expiredKeys.length;
  }
}

// Service-specific cache with optimized TTL
class ServiceCache extends CacheManager {
  constructor() {
    super();
    this.serviceTTL = 10 * 60 * 1000; // 10 minutes for services
    this.userTTL = 2 * 60 * 1000; // 2 minutes for user data
    this.statsTTL = 1 * 60 * 1000; // 1 minute for statistics
  }

  // Cache services with longer TTL
  setServices(services) {
    this.set('services', services, this.serviceTTL);
  }

  // Cache user data
  setUser(userId, userData) {
    this.set(`user_${userId}`, userData, this.userTTL);
  }

  // Cache statistics
  setStats(stats) {
    this.set('admin_stats', stats, this.statsTTL);
  }

  // Get cached services
  getServices() {
    return this.get('services');
  }

  // Get cached user
  getUser(userId) {
    return this.get(`user_${userId}`);
  }

  // Get cached stats
  getStats() {
    return this.get('admin_stats');
  }

  // Invalidate service cache (when services are modified)
  invalidateServices() {
    this.delete('services');
  }

  // Invalidate user cache
  invalidateUser(userId) {
    this.delete(`user_${userId}`);
  }

  // Invalidate stats cache
  invalidateStats() {
    this.delete('admin_stats');
  }
}

// Create global cache instance
export const cache = new ServiceCache();

// Auto-cleanup every 5 minutes
setInterval(() => {
  const cleaned = cache.cleanup();
  if (cleaned > 0) {
    console.log(`🧹 Cache cleanup: removed ${cleaned} expired entries`);
  }
}, 5 * 60 * 1000);

// Export cache manager for testing
export { CacheManager, ServiceCache };
