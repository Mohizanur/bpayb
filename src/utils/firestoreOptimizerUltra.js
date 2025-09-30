// 🚀 ULTRA FIRESTORE OPTIMIZER
// Maximum realistic performance with intelligent caching and batching
// Integrates with ultraMaxPerformance for production-ready optimization

import { firestore } from "./firestore.js";
import { ultraMaxPerformance, ULTRA_CACHE_TTL } from "./ultraMaxPerformance.js";
import { performanceMonitor } from "./performanceMonitor.js";

// Enhanced Firestore Optimizer with ultra performance
export class FirestoreOptimizerUltra {
  // Get user with ultra-fast caching
  static async getUser(userId) {
    return await ultraMaxPerformance.getData(
      "users",
      String(userId),
      ULTRA_CACHE_TTL.USERS
    );
  }

  // Get services with extended caching
  static async getServices() {
    const cacheKey = "services_all";
    const cached = ultraMaxPerformance.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const servicesSnapshot = await firestore.collection("services").get();
      const services = servicesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      ultraMaxPerformance.cache.set(
        cacheKey,
        services,
        ULTRA_CACHE_TTL.SERVICES
      );
      performanceMonitor.trackFirestoreOperation("read", servicesSnapshot.size);

      return services;
    } catch (error) {
      console.error("❌ Error fetching services:", error);
      return [];
    }
  }

  // Get user subscriptions with smart caching
  static async getUserSubscriptions(userId) {
    const cacheKey = `subscriptions_${userId}`;
    const cached = ultraMaxPerformance.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const subsSnapshot = await firestore
        .collection("subscriptions")
        .where("userId", "==", String(userId))
        .get();

      const subscriptions = subsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      ultraMaxPerformance.cache.set(
        cacheKey,
        subscriptions,
        ULTRA_CACHE_TTL.SUBSCRIPTIONS
      );
      performanceMonitor.trackFirestoreOperation("read", subsSnapshot.size);

      return subscriptions;
    } catch (error) {
      console.error(`❌ Error fetching subscriptions for ${userId}:`, error);
      return [];
    }
  }

  // Get all users with pagination
  static async getAllUsers(page = 1, limit = 100) {
    const cacheKey = `users_page_${page}_${limit}`;
    const cached = ultraMaxPerformance.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      const usersSnapshot = await firestore
        .collection("users")
        .limit(limit)
        .offset((page - 1) * limit)
        .get();

      const users = usersSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      ultraMaxPerformance.cache.set(
        cacheKey,
        users,
        ULTRA_CACHE_TTL.USER_PAGES
      );
      performanceMonitor.trackFirestoreOperation("read", usersSnapshot.size);

      return users;
    } catch (error) {
      console.error("❌ Error fetching users:", error);
      return [];
    }
  }

  // Get collection count with aggressive caching
  static async getCollectionCount(collectionName) {
    const cacheKey = `count_${collectionName}`;
    const cached = ultraMaxPerformance.cache.get(cacheKey);

    if (cached !== null && cached !== undefined) {
      return cached;
    }

    try {
      const snapshot = await firestore.collection(collectionName).get();
      const count = snapshot.size;

      ultraMaxPerformance.cache.set(
        cacheKey,
        count,
        ULTRA_CACHE_TTL.COLLECTION_COUNTS
      );
      performanceMonitor.trackFirestoreOperation("read", snapshot.size);

      return count;
    } catch (error) {
      console.error(`❌ Error counting ${collectionName}:`, error);
      return 0;
    }
  }

  // Get admin stats with smart caching
  static async getAdminStats() {
    const cacheKey = "admin_stats";
    const cached = ultraMaxPerformance.cache.get(cacheKey);

    if (cached) {
      return cached;
    }

    try {
      // Use parallel queries for speed
      const [usersCount, subsCount, paymentsCount, servicesCount] =
        await Promise.all([
          this.getCollectionCount("users"),
          this.getCollectionCount("subscriptions"),
          this.getCollectionCount("payments"),
          this.getCollectionCount("services"),
        ]);

      const stats = {
        users: usersCount,
        subscriptions: subsCount,
        payments: paymentsCount,
        services: servicesCount,
        timestamp: Date.now(),
      };

      ultraMaxPerformance.cache.set(
        cacheKey,
        stats,
        ULTRA_CACHE_TTL.ADMIN_STATS
      );

      return stats;
    } catch (error) {
      console.error("❌ Error fetching admin stats:", error);
      return {
        users: 0,
        subscriptions: 0,
        payments: 0,
        services: 0,
      };
    }
  }

  // Update user with smart batching
  static async updateUser(userId, data) {
    return await ultraMaxPerformance.updateData("users", String(userId), data);
  }

  // Create user with smart batching
  static async createUser(userId, data) {
    return await ultraMaxPerformance.setData("users", String(userId), {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // Create subscription with smart batching
  static async createSubscription(subscriptionData) {
    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await ultraMaxPerformance.setData("subscriptions", subscriptionId, {
      ...subscriptionData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Invalidate user subscriptions cache
    this.invalidateSubscriptionCache(subscriptionData.userId);

    return subscriptionId;
  }

  // Update subscription with smart batching
  static async updateSubscription(subscriptionId, data) {
    return await ultraMaxPerformance.updateData(
      "subscriptions",
      subscriptionId,
      {
        ...data,
        updatedAt: new Date(),
      }
    );
  }

  // Create payment record with smart batching
  static async createPayment(paymentData) {
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await ultraMaxPerformance.setData("payments", paymentId, {
      ...paymentData,
      createdAt: new Date(),
    });

    return paymentId;
  }

  // Invalidate specific caches
  static invalidateUserCache(userId) {
    const cacheKey = `users_${userId}`;
    ultraMaxPerformance.cache.l1Cache.delete(cacheKey);
    ultraMaxPerformance.cache.l2Cache.delete(cacheKey);
  }

  static invalidateSubscriptionCache(userId) {
    const cacheKey = `subscriptions_${userId}`;
    ultraMaxPerformance.cache.l1Cache.delete(cacheKey);
    ultraMaxPerformance.cache.l2Cache.delete(cacheKey);
  }

  static invalidateAdminCache() {
    const keys = [
      "admin_stats",
      "count_users",
      "count_subscriptions",
      "count_payments",
    ];
    keys.forEach((key) => {
      ultraMaxPerformance.cache.l1Cache.delete(key);
      ultraMaxPerformance.cache.l2Cache.delete(key);
    });
  }

  // Get cache statistics
  static getCacheStats() {
    return ultraMaxPerformance.getStats();
  }

  // Force flush all pending operations
  static async flushPendingOperations() {
    await ultraMaxPerformance.flush();
  }

  // Clear all caches (emergency use only)
  static clearAllCaches() {
    ultraMaxPerformance.clearCache();
  }
}

// Backward compatibility: Export both old and new names
export const FirestoreOptimizer = FirestoreOptimizerUltra;
export { ULTRA_CACHE_TTL as CACHE_TTL };
