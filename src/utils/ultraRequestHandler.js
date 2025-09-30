// 🚀 ULTRA-FAST REQUEST HANDLER
// Optimized middleware for handling thousands of simultaneous requests
// Target: 50-100ms response times, 2,000-3,000 concurrent users

import { ultraMaxPerformance } from "./ultraMaxPerformance.js";
import { performanceMonitor } from "./performanceMonitor.js";

class UltraRequestHandler {
  constructor() {
    this.maxConcurrent = 3000; // Max concurrent requests
    this.activeRequests = new Map();
    this.requestQueue = [];
    this.requestStats = {
      total: 0,
      successful: 0,
      failed: 0,
      queued: 0,
      avgResponseTime: 0,
    };

    // Rate limiting per user
    this.userLimits = new Map();
    this.rateLimits = {
      general: { max: 20, window: 60000 }, // 20 requests per minute
      subscription: { max: 10, window: 60000 }, // 10 subscription ops per minute
      admin: { max: 30, window: 60000 }, // 30 admin ops per minute
      payment: { max: 5, window: 60000 }, // 5 payment ops per minute
    };
  }

  // Main request handler with ultra performance
  async handleRequest(ctx, next, requestType = "general") {
    const requestId = this.generateRequestId();
    const userId = ctx.from?.id || "anonymous";
    const startTime = Date.now();

    try {
      // Check rate limiting
      if (!this.checkRateLimit(userId, requestType)) {
        await ctx.reply("⚠️ Too many requests. Please wait a moment.");
        return;
      }

      // Check concurrent requests
      if (this.activeRequests.size >= this.maxConcurrent) {
        // Queue the request
        return await this.queueRequest(ctx, next, requestId);
      }

      // Track active request
      this.activeRequests.set(requestId, {
        userId,
        type: requestType,
        startTime,
      });

      // Track performance
      performanceMonitor.trackRequestStart(requestId, requestType);
      ultraMaxPerformance.stats.requests++;

      // Execute the request
      await next();

      // Track success
      const responseTime = Date.now() - startTime;
      this.recordSuccess(responseTime);
      performanceMonitor.trackRequestEnd(requestId, true);
    } catch (error) {
      // Track failure
      this.recordFailure();
      performanceMonitor.trackRequestEnd(requestId, false);
      console.error("❌ Request error:", error);

      // Send user-friendly error
      try {
        await ctx.reply("⚠️ An error occurred. Please try again.");
      } catch (replyError) {
        // Ignore reply errors
      }
    } finally {
      // Clean up
      this.activeRequests.delete(requestId);

      // Process queued requests
      this.processQueue();
    }
  }

  // Rate limiting check
  checkRateLimit(userId, requestType) {
    const limit = this.rateLimits[requestType] || this.rateLimits.general;
    const key = `${userId}_${requestType}`;

    if (!this.userLimits.has(key)) {
      this.userLimits.set(key, []);
    }

    const requests = this.userLimits.get(key);
    const now = Date.now();

    // Remove old requests outside the window
    const validRequests = requests.filter((time) => now - time < limit.window);

    // Check if limit exceeded
    if (validRequests.length >= limit.max) {
      return false;
    }

    // Add current request
    validRequests.push(now);
    this.userLimits.set(key, validRequests);

    return true;
  }

  // Queue request when at capacity
  async queueRequest(ctx, next, requestId) {
    return new Promise((resolve, reject) => {
      this.requestQueue.push({
        ctx,
        next,
        requestId,
        resolve,
        reject,
        timestamp: Date.now(),
      });

      this.requestStats.queued++;

      // Set timeout for queued requests (30 seconds)
      setTimeout(() => {
        const index = this.requestQueue.findIndex(
          (r) => r.requestId === requestId
        );
        if (index !== -1) {
          this.requestQueue.splice(index, 1);
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
  }

  // Process queued requests
  async processQueue() {
    while (
      this.requestQueue.length > 0 &&
      this.activeRequests.size < this.maxConcurrent
    ) {
      const request = this.requestQueue.shift();

      if (request) {
        // Check if request is too old (expired)
        if (Date.now() - request.timestamp > 30000) {
          request.reject(new Error("Request expired"));
          continue;
        }

        // Process the request
        try {
          await this.handleRequest(request.ctx, request.next);
          request.resolve();
        } catch (error) {
          request.reject(error);
        }
      }
    }
  }

  // Generate unique request ID
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Record successful request
  recordSuccess(responseTime) {
    this.requestStats.total++;
    this.requestStats.successful++;

    // Update average response time
    const currentAvg = this.requestStats.avgResponseTime;
    const count = this.requestStats.successful;
    this.requestStats.avgResponseTime =
      (currentAvg * (count - 1) + responseTime) / count;
  }

  // Record failed request
  recordFailure() {
    this.requestStats.total++;
    this.requestStats.failed++;
  }

  // Get handler statistics
  getStats() {
    return {
      activeRequests: this.activeRequests.size,
      queuedRequests: this.requestQueue.length,
      totalRequests: this.requestStats.total,
      successful: this.requestStats.successful,
      failed: this.requestStats.failed,
      successRate:
        this.requestStats.total > 0
          ? (
              (this.requestStats.successful / this.requestStats.total) *
              100
            ).toFixed(2) + "%"
          : "0%",
      avgResponseTime: this.requestStats.avgResponseTime.toFixed(2) + "ms",
      capacity: {
        current: this.activeRequests.size,
        max: this.maxConcurrent,
        utilization:
          ((this.activeRequests.size / this.maxConcurrent) * 100).toFixed(2) +
          "%",
      },
    };
  }

  // Emergency: Clear rate limits (admin only)
  clearRateLimits() {
    this.userLimits.clear();
  }

  // Emergency: Clear queue (admin only)
  clearQueue() {
    this.requestQueue.forEach((req) => {
      req.reject(new Error("Queue cleared"));
    });
    this.requestQueue = [];
  }
}

// Create singleton instance
const ultraRequestHandler = new UltraRequestHandler();

// Middleware factory
export function createUltraMiddleware(requestType = "general") {
  return async (ctx, next) => {
    await ultraRequestHandler.handleRequest(ctx, next, requestType);
  };
}

// Export handler and middleware
export { ultraRequestHandler, UltraRequestHandler };
