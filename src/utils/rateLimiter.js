// 🚀 RATE LIMITER - Intelligent Rate Limiting and DDoS Protection
// Advanced rate limiting with multiple algorithms and automatic protection

import { performance } from 'perf_hooks';

class RateLimiter {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.windowMs = options.windowMs || 60000; // 1 minute
    this.maxRequests = options.maxRequests || 100;
    this.algorithm = options.algorithm || 'sliding_window';
    this.skipSuccessfulRequests = options.skipSuccessfulRequests || false;
    this.skipFailedRequests = options.skipFailedRequests || false;
    this.keyGenerator = options.keyGenerator || ((req) => req.ip || 'anonymous');
    
    // Rate limiting data
    this.requests = new Map();
    this.blocks = new Map();
    this.whitelist = new Set();
    this.blacklist = new Set();
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      whitelistedRequests: 0,
      blacklistedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
    
    // DDoS protection
    this.ddosProtection = {
      enabled: options.ddosProtection !== false,
      threshold: options.ddosThreshold || 1000, // requests per minute
      blockDuration: options.ddosBlockDuration || 300000, // 5 minutes
      detectionWindow: options.ddosDetectionWindow || 60000 // 1 minute
    };
    
    // Adaptive rate limiting
    this.adaptive = {
      enabled: options.adaptive !== false,
      baseLimit: this.maxRequests,
      currentLimit: this.maxRequests,
      adjustmentFactor: 0.1,
      minLimit: Math.floor(this.maxRequests * 0.1),
      maxLimit: Math.floor(this.maxRequests * 2)
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.windowMs);
  }

  // Main rate limiting function
  async checkLimit(request, response = null) {
    const startTime = performance.now();
    const key = this.keyGenerator(request);
    
    this.stats.totalRequests++;
    
    try {
      // Check whitelist
      if (this.whitelist.has(key)) {
        this.stats.whitelistedRequests++;
        this.recordResponseTime(startTime);
        return { allowed: true, reason: 'whitelisted' };
      }
      
      // Check blacklist
      if (this.blacklist.has(key)) {
        this.stats.blacklistedRequests++;
        this.recordResponseTime(startTime);
        return { allowed: false, reason: 'blacklisted' };
      }
      
      // Check if key is currently blocked
      if (this.blocks.has(key)) {
        const blockInfo = this.blocks.get(key);
        if (Date.now() < blockInfo.expiresAt) {
          this.stats.blockedRequests++;
          this.recordResponseTime(startTime);
          return { 
            allowed: false, 
            reason: 'blocked',
            retryAfter: Math.ceil((blockInfo.expiresAt - Date.now()) / 1000)
          };
        } else {
          this.blocks.delete(key);
        }
      }
      
      // Check rate limit
      const limitResult = this.checkRateLimit(key, request);
      
      if (limitResult.allowed) {
        this.stats.allowedRequests++;
        this.recordResponseTime(startTime);
        return limitResult;
      } else {
        this.stats.blockedRequests++;
        this.recordResponseTime(startTime);
        return limitResult;
      }
      
    } catch (error) {
      console.error('Rate limiter error:', error);
      this.recordResponseTime(startTime);
      return { allowed: true, reason: 'error', error: error.message };
    }
  }

  checkRateLimit(key, request) {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get or create request history for this key
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requestHistory = this.requests.get(key);
    
    // Clean old requests
    const validRequests = requestHistory.filter(timestamp => timestamp > windowStart);
    this.requests.set(key, validRequests);
    
    // Check if limit is exceeded
    const currentLimit = this.adaptive.enabled ? this.adaptive.currentLimit : this.maxRequests;
    
    if (validRequests.length >= currentLimit) {
      // Check for DDoS pattern
      if (this.ddosProtection.enabled && this.isDDoSPattern(key, validRequests)) {
        this.blockKey(key, this.ddosProtection.blockDuration, 'ddos');
        return {
          allowed: false,
          reason: 'ddos_detected',
          retryAfter: Math.ceil(this.ddosProtection.blockDuration / 1000)
        };
      }
      
      // Regular rate limit exceeded
      return {
        allowed: false,
        reason: 'rate_limit_exceeded',
        retryAfter: Math.ceil((validRequests[0] + this.windowMs - now) / 1000),
        limit: currentLimit,
        remaining: 0,
        resetTime: validRequests[0] + this.windowMs
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    // Update adaptive limits
    if (this.adaptive.enabled) {
      this.updateAdaptiveLimits();
    }
    
    return {
      allowed: true,
      reason: 'allowed',
      limit: currentLimit,
      remaining: currentLimit - validRequests.length,
      resetTime: validRequests[0] + this.windowMs
    };
  }

  isDDoSPattern(key, requests) {
    if (requests.length < this.ddosProtection.threshold) {
      return false;
    }
    
    const now = Date.now();
    const detectionWindow = this.ddosProtection.detectionWindow;
    const windowStart = now - detectionWindow;
    
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return recentRequests.length >= this.ddosProtection.threshold;
  }

  blockKey(key, duration, reason) {
    this.blocks.set(key, {
      blockedAt: Date.now(),
      expiresAt: Date.now() + duration,
      reason
    });
  }

  updateAdaptiveLimits() {
    const successRate = this.stats.totalRequests > 0 ? 
      this.stats.allowedRequests / this.stats.totalRequests : 1;
    
    if (successRate > 0.95) {
      // Increase limit if success rate is high
      this.adaptive.currentLimit = Math.min(
        this.adaptive.maxLimit,
        this.adaptive.currentLimit + Math.ceil(this.adaptive.currentLimit * this.adaptive.adjustmentFactor)
      );
    } else if (successRate < 0.8) {
      // Decrease limit if success rate is low
      this.adaptive.currentLimit = Math.max(
        this.adaptive.minLimit,
        this.adaptive.currentLimit - Math.ceil(this.adaptive.currentLimit * this.adaptive.adjustmentFactor)
      );
    }
  }

  recordResponseTime(startTime) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    this.stats.totalResponseTime += responseTime;
    this.stats.averageResponseTime = this.stats.totalResponseTime / this.stats.totalRequests;
  }

  // Whitelist management
  addToWhitelist(key) {
    this.whitelist.add(key);
    this.blocks.delete(key);
  }

  removeFromWhitelist(key) {
    this.whitelist.delete(key);
  }

  isWhitelisted(key) {
    return this.whitelist.has(key);
  }

  // Blacklist management
  addToBlacklist(key) {
    this.blacklist.add(key);
    this.blocks.delete(key);
  }

  removeFromBlacklist(key) {
    this.blacklist.delete(key);
  }

  isBlacklisted(key) {
    return this.blacklist.has(key);
  }

  // Block management
  unblockKey(key) {
    this.blocks.delete(key);
  }

  isBlocked(key) {
    const blockInfo = this.blocks.get(key);
    if (!blockInfo) return false;
    
    if (Date.now() >= blockInfo.expiresAt) {
      this.blocks.delete(key);
      return false;
    }
    
    return true;
  }

  // Cleanup expired data
  cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Clean expired requests
    for (const [key, requests] of this.requests) {
      const validRequests = requests.filter(timestamp => timestamp > windowStart);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
    
    // Clean expired blocks
    for (const [key, blockInfo] of this.blocks) {
      if (now >= blockInfo.expiresAt) {
        this.blocks.delete(key);
      }
    }
  }

  // Get statistics
  getStats() {
    const successRate = this.stats.totalRequests > 0 ? 
      (this.stats.allowedRequests / this.stats.totalRequests) * 100 : 0;
    
    return {
      ...this.stats,
      successRate,
      currentLimit: this.adaptive.currentLimit,
      activeKeys: this.requests.size,
      blockedKeys: this.blocks.size,
      whitelistedKeys: this.whitelist.size,
      blacklistedKeys: this.blacklist.size,
      adaptive: this.adaptive.enabled
    };
  }

  // Get key information
  getKeyInfo(key) {
    const requests = this.requests.get(key) || [];
    const blockInfo = this.blocks.get(key);
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    const currentLimit = this.adaptive.enabled ? this.adaptive.currentLimit : this.maxRequests;
    
    return {
      key,
      requests: recentRequests.length,
      limit: currentLimit,
      remaining: Math.max(0, currentLimit - recentRequests.length),
      resetTime: recentRequests.length > 0 ? recentRequests[0] + this.windowMs : now + this.windowMs,
      isWhitelisted: this.whitelist.has(key),
      isBlacklisted: this.blacklist.has(key),
      isBlocked: blockInfo ? now < blockInfo.expiresAt : false,
      blockInfo: blockInfo ? {
        blockedAt: blockInfo.blockedAt,
        expiresAt: blockInfo.expiresAt,
        reason: blockInfo.reason
      } : null
    };
  }

  // Reset statistics
  resetStats() {
    this.stats = {
      totalRequests: 0,
      allowedRequests: 0,
      blockedRequests: 0,
      whitelistedRequests: 0,
      blacklistedRequests: 0,
      averageResponseTime: 0,
      totalResponseTime: 0
    };
  }

  // Destroy rate limiter
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.requests.clear();
    this.blocks.clear();
    this.whitelist.clear();
    this.blacklist.clear();
  }
}

// Rate Limiter Manager
class RateLimiterManager {
  constructor() {
    this.limiters = new Map();
    this.globalStats = {
      totalLimiters: 0,
      totalRequests: 0,
      totalAllowed: 0,
      totalBlocked: 0
    };
  }

  createLimiter(name, options = {}) {
    if (this.limiters.has(name)) {
      return this.limiters.get(name);
    }
    
    const limiter = new RateLimiter({ name, ...options });
    this.limiters.set(name, limiter);
    this.globalStats.totalLimiters++;
    
    return limiter;
  }

  getLimiter(name) {
    return this.limiters.get(name);
  }

  removeLimiter(name) {
    const limiter = this.limiters.get(name);
    if (limiter) {
      limiter.destroy();
      this.limiters.delete(name);
      this.globalStats.totalLimiters--;
    }
  }

  getGlobalStats() {
    let totalRequests = 0;
    let totalAllowed = 0;
    let totalBlocked = 0;
    
    for (const limiter of this.limiters.values()) {
      const stats = limiter.getStats();
      totalRequests += stats.totalRequests;
      totalAllowed += stats.allowedRequests;
      totalBlocked += stats.blockedRequests;
    }
    
    this.globalStats.totalRequests = totalRequests;
    this.globalStats.totalAllowed = totalAllowed;
    this.globalStats.totalBlocked = totalBlocked;
    
    return { ...this.globalStats };
  }

  getAllLimiters() {
    return Array.from(this.limiters.values());
  }

  // Global whitelist/blacklist
  addToGlobalWhitelist(key) {
    for (const limiter of this.limiters.values()) {
      limiter.addToWhitelist(key);
    }
  }

  addToGlobalBlacklist(key) {
    for (const limiter of this.limiters.values()) {
      limiter.addToBlacklist(key);
    }
  }

  removeFromGlobalWhitelist(key) {
    for (const limiter of this.limiters.values()) {
      limiter.removeFromWhitelist(key);
    }
  }

  removeFromGlobalBlacklist(key) {
    for (const limiter of this.limiters.values()) {
      limiter.removeFromBlacklist(key);
    }
  }
}

// Create singleton instance
const rateLimiterManager = new RateLimiterManager();

export { RateLimiter, rateLimiterManager };


