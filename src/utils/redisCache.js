// 🚀 REDIS CACHE - Distributed High-Performance Caching
// Ultra-fast distributed caching with Redis for maximum scalability

import { createClient } from 'redis';
import { performance } from 'perf_hooks';

class RedisCache {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.localCache = new Map(); // Fallback local cache
    this.connectionPool = [];
    this.isInitialized = false;
    
    // Performance settings
    this.settings = {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || null,
      db: process.env.REDIS_DB || 0,
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 10000,
      commandTimeout: 5000,
      retryDelayOnFailover: 100,
      enableOfflineQueue: false,
      maxMemoryPolicy: 'allkeys-lru',
      maxMemory: '512mb'
    };
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      averageResponseTime: 0,
      totalOperations: 0
    };
    
    this.pendingOperations = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('🚀 Initializing Redis Cache...');
    
    try {
      // Create Redis client
      this.client = createClient({
        socket: {
          host: this.settings.host,
          port: this.settings.port,
          connectTimeout: this.settings.connectTimeout,
          commandTimeout: this.settings.commandTimeout,
          keepAlive: this.settings.keepAlive,
          family: this.settings.family
        },
        password: this.settings.password,
        database: this.settings.db,
        retry_strategy: (options) => {
          if (options.error && options.error.code === 'ECONNREFUSED') {
            return new Error('Redis server connection refused');
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            return new Error('Retry time exhausted');
          }
          if (options.attempt > 10) {
            return undefined;
          }
          return Math.min(options.attempt * 100, 3000);
        }
      });

      // Set up event handlers
      this.setupEventHandlers();
      
      // Connect to Redis
      await this.client.connect();
      
      // Configure Redis for maximum performance
      await this.configureRedis();
      
      // Initialize connection pool
      await this.initializeConnectionPool();
      
      this.isInitialized = true;
      console.log('✅ Redis Cache initialized');
      
    } catch (error) {
      console.error('❌ Redis Cache initialization failed:', error.message);
      // Fall back to local cache only
      this.isInitialized = true;
    }
  }

  setupEventHandlers() {
    this.client.on('connect', () => {
      console.log('📡 Redis connected');
      this.isConnected = true;
    });

    this.client.on('ready', () => {
      console.log('✅ Redis ready');
    });

    this.client.on('error', (error) => {
      console.error('❌ Redis error:', error.message);
      this.isConnected = false;
      this.stats.errors++;
    });

    this.client.on('end', () => {
      console.log('📡 Redis connection ended');
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  async configureRedis() {
    try {
      // Configure Redis for maximum performance
      await this.client.configSet('maxmemory-policy', this.settings.maxMemoryPolicy);
      await this.client.configSet('maxmemory', this.settings.maxMemory);
      await this.client.configSet('tcp-keepalive', '60');
      await this.client.configSet('timeout', '0');
      
      // Enable compression for large values
      await this.client.configSet('hash-max-ziplist-entries', '512');
      await this.client.configSet('hash-max-ziplist-value', '64');
      
      console.log('⚙️ Redis configured for maximum performance');
    } catch (error) {
      console.error('❌ Redis configuration failed:', error.message);
    }
  }

  async initializeConnectionPool() {
    // Create multiple Redis connections for better performance
    for (let i = 0; i < 10; i++) {
      try {
        const client = createClient({
          socket: {
            host: this.settings.host,
            port: this.settings.port,
            connectTimeout: this.settings.connectTimeout,
            commandTimeout: this.settings.commandTimeout
          },
          password: this.settings.password,
          database: this.settings.db
        });
        
        await client.connect();
        this.connectionPool.push(client);
      } catch (error) {
        console.error(`❌ Failed to create Redis connection ${i}:`, error.message);
      }
    }
    
    console.log(`📡 Redis connection pool initialized with ${this.connectionPool.length} connections`);
  }

  // Ultra-fast get operation
  async get(key, options = {}) {
    const startTime = performance.now();
    
    try {
      // Check local cache first
      if (options.useLocalCache !== false) {
        const localValue = this.localCache.get(key);
        if (localValue && Date.now() - localValue.timestamp < 60000) { // 1 minute local cache
          this.stats.hits++;
          this.updateStats(startTime);
          return localValue.data;
        }
      }
      
      // Get from Redis
      if (this.isConnected && this.client) {
        const value = await this.client.get(key);
        
        if (value) {
          const parsedValue = this.parseValue(value);
          
          // Store in local cache
          this.localCache.set(key, {
            data: parsedValue,
            timestamp: Date.now()
          });
          
          this.stats.hits++;
          this.updateStats(startTime);
          return parsedValue;
        }
      }
      
      this.stats.misses++;
      this.updateStats(startTime);
      return null;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      
      // Fall back to local cache
      const localValue = this.localCache.get(key);
      if (localValue) {
        return localValue.data;
      }
      
      throw error;
    }
  }

  // Ultra-fast set operation
  async set(key, value, ttl = 300, options = {}) {
    const startTime = performance.now();
    
    try {
      const serializedValue = this.serializeValue(value);
      
      // Set in local cache
      if (options.useLocalCache !== false) {
        this.localCache.set(key, {
          data: value,
          timestamp: Date.now()
        });
      }
      
      // Set in Redis
      if (this.isConnected && this.client) {
        if (ttl > 0) {
          await this.client.setEx(key, ttl, serializedValue);
        } else {
          await this.client.set(key, serializedValue);
        }
      }
      
      this.stats.sets++;
      this.updateStats(startTime);
      return true;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  // Batch operations for maximum efficiency
  async mget(keys) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client && keys.length > 0) {
        const values = await this.client.mGet(keys);
        
        const results = {};
        keys.forEach((key, index) => {
          if (values[index]) {
            results[key] = this.parseValue(values[index]);
            this.stats.hits++;
          } else {
            this.stats.misses++;
          }
        });
        
        this.updateStats(startTime);
        return results;
      }
      
      // Fall back to individual gets
      const results = {};
      for (const key of keys) {
        results[key] = await this.get(key);
      }
      
      this.updateStats(startTime);
      return results;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  async mset(keyValuePairs, ttl = 300) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client && keyValuePairs.length > 0) {
        const serializedPairs = {};
        Object.entries(keyValuePairs).forEach(([key, value]) => {
          serializedPairs[key] = this.serializeValue(value);
        });
        
        await this.client.mSet(serializedPairs);
        
        // Set TTL for each key
        if (ttl > 0) {
          const pipeline = this.client.multi();
          Object.keys(keyValuePairs).forEach(key => {
            pipeline.expire(key, ttl);
          });
          await pipeline.exec();
        }
      }
      
      this.stats.sets += Object.keys(keyValuePairs).length;
      this.updateStats(startTime);
      return true;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  // Delete operation
  async del(key) {
    const startTime = performance.now();
    
    try {
      // Remove from local cache
      this.localCache.delete(key);
      
      // Remove from Redis
      if (this.isConnected && this.client) {
        await this.client.del(key);
      }
      
      this.stats.deletes++;
      this.updateStats(startTime);
      return true;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  // Pattern-based operations
  async keys(pattern) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client) {
        const keys = await this.client.keys(pattern);
        this.updateStats(startTime);
        return keys;
      }
      
      // Fall back to local cache
      const localKeys = Array.from(this.localCache.keys()).filter(key => 
        this.matchPattern(key, pattern)
      );
      
      this.updateStats(startTime);
      return localKeys;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  // Increment operation
  async incr(key, amount = 1, ttl = 300) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client) {
        const newValue = await this.client.incrBy(key, amount);
        
        // Set TTL if key is new
        if (newValue === amount) {
          await this.client.expire(key, ttl);
        }
        
        this.updateStats(startTime);
        return newValue;
      }
      
      // Fall back to local cache
      const currentValue = await this.get(key) || 0;
      const newValue = currentValue + amount;
      await this.set(key, newValue, ttl);
      
      this.updateStats(startTime);
      return newValue;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  // Hash operations
  async hget(hash, field) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client) {
        const value = await this.client.hGet(hash, field);
        this.updateStats(startTime);
        return value ? this.parseValue(value) : null;
      }
      
      this.updateStats(startTime);
      return null;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  async hset(hash, field, value, ttl = 300) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client) {
        await this.client.hSet(hash, field, this.serializeValue(value));
        
        if (ttl > 0) {
          await this.client.expire(hash, ttl);
        }
      }
      
      this.updateStats(startTime);
      return true;
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  async hgetall(hash) {
    const startTime = performance.now();
    
    try {
      if (this.isConnected && this.client) {
        const hashData = await this.client.hGetAll(hash);
        
        const result = {};
        Object.entries(hashData).forEach(([field, value]) => {
          result[field] = this.parseValue(value);
        });
        
        this.updateStats(startTime);
        return result;
      }
      
      this.updateStats(startTime);
      return {};
      
    } catch (error) {
      this.stats.errors++;
      this.updateStats(startTime);
      throw error;
    }
  }

  // Utility methods
  serializeValue(value) {
    if (typeof value === 'string') {
      return value;
    }
    return JSON.stringify(value);
  }

  parseValue(value) {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  matchPattern(key, pattern) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(key);
  }

  updateStats(startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.stats.totalOperations++;
    this.stats.averageResponseTime = 
      (this.stats.averageResponseTime * (this.stats.totalOperations - 1) + responseTime) / 
      this.stats.totalOperations;
  }

  // Health check
  async healthCheck() {
    try {
      if (this.isConnected && this.client) {
        const pong = await this.client.ping();
        return {
          status: 'healthy',
          connected: true,
          response: pong,
          stats: this.getStats()
        };
      }
      
      return {
        status: 'degraded',
        connected: false,
        stats: this.getStats()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        error: error.message,
        stats: this.getStats()
      };
    }
  }

  // Public API methods
  getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate,
      connected: this.isConnected,
      connectionPoolSize: this.connectionPool.length,
      localCacheSize: this.localCache.size
    };
  }

  // Shutdown
  async shutdown() {
    console.log('🔄 Shutting down Redis Cache...');
    
    try {
      if (this.client) {
        await this.client.quit();
      }
      
      for (const client of this.connectionPool) {
        await client.quit();
      }
      
      this.localCache.clear();
      this.isConnected = false;
      
      console.log('✅ Redis Cache shutdown complete');
    } catch (error) {
      console.error('❌ Redis Cache shutdown error:', error.message);
    }
  }
}

// Create singleton instance
const redisCache = new RedisCache();

export default redisCache;


