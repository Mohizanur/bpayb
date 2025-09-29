import smartBeastMode from './smartBeastMode.js';
import { firestore } from './firestore.js';

/**
 * 🔗 SMART BEAST MODE INTEGRATION
 * 
 * This file integrates Smart Beast Mode with existing database operations
 * to provide automatic performance optimizations
 */

/**
 * Enhanced database operations with Smart Beast Mode
 */
export class SmartBeastDatabase {
    constructor() {
        this.isEnabled = false;
        this.initialize();
    }

    async initialize() {
        // Check if Smart Beast Mode should be auto-enabled
        try {
            const configDoc = await firestore.collection('config').doc('smartBeast').get();
            if (configDoc.exists) {
                const config = configDoc.data();
                if (config.autoEnable && !this.isEnabled) {
                    smartBeastMode.enable();
                    this.isEnabled = true;
                    console.log('🚀 Smart Beast Mode auto-enabled from config');
                }
            }
        } catch (error) {
            console.warn('Could not check Smart Beast config:', error.message);
        }
    }

    /**
     * Smart collection reference with connection pooling
     */
    async collection(collectionName) {
        if (smartBeastMode.isEnabled) {
            return await smartBeastMode.getOptimizedConnection(collectionName);
        }
        return firestore.collection(collectionName);
    }

    /**
     * Smart document reference with caching
     */
    async doc(collectionName, docId) {
        if (smartBeastMode.isEnabled) {
            const collection = await this.collection(collectionName);
            return collection.doc(docId);
        }
        return firestore.collection(collectionName).doc(docId);
    }

    /**
     * Smart query with caching
     */
    async smartQuery(queryKey, queryFunction, ttl = 300000) {
        if (smartBeastMode.isEnabled) {
            return await smartBeastMode.smartCache(queryKey, queryFunction, ttl);
        }
        return await queryFunction();
    }

    /**
     * Smart batch operations
     */
    async smartBatch(operations) {
        if (smartBeastMode.isEnabled) {
            // Use Smart Beast Mode optimizations for batch operations
            const batch = firestore.batch();
            
            // Process operations with rate limiting
            for (const operation of operations) {
                const { type, ref, data } = operation;
                
                // Check rate limiting
                const canProceed = await smartBeastMode.adaptiveRateLimit('batch_operation', 'system');
                if (!canProceed) {
                    console.warn('Rate limit reached for batch operation');
                    break;
                }
                
                switch (type) {
                    case 'set':
                        batch.set(ref, data);
                        break;
                    case 'update':
                        batch.update(ref, data);
                        break;
                    case 'delete':
                        batch.delete(ref);
                        break;
                }
            }
            
            return await batch.commit();
        } else {
            // Standard batch operation
            const batch = firestore.batch();
            operations.forEach(({ type, ref, data }) => {
                switch (type) {
                    case 'set':
                        batch.set(ref, data);
                        break;
                    case 'update':
                        batch.update(ref, data);
                        break;
                    case 'delete':
                        batch.delete(ref);
                        break;
                }
            });
            return await batch.commit();
        }
    }
}

/**
 * Enhanced user operations with Smart Beast Mode
 */
export class SmartBeastUserOps {
    constructor() {
        this.db = new SmartBeastDatabase();
    }

    /**
     * Smart user creation with caching
     */
    async createUser(userData) {
        const cacheKey = `user_create_${userData.telegramId || userData.id}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const userRef = await this.db.doc('users', userData.telegramId || userData.id);
            await userRef.set({
                ...userData,
                createdAt: new Date(),
                lastActivity: new Date(),
                status: 'active'
            });
            
            // Invalidate related caches
            this.invalidateUserCaches(userData.telegramId || userData.id);
            
            return { success: true, userId: userData.telegramId || userData.id };
        }, 60000); // 1 minute cache for user creation
    }

    /**
     * Smart user retrieval with caching
     */
    async getUser(userId) {
        const cacheKey = `user_get_${userId}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const userDoc = await this.db.doc('users', userId);
            const userSnap = await userDoc.get();
            
            if (userSnap.exists) {
                return { success: true, user: { id: userSnap.id, ...userSnap.data() } };
            } else {
                return { success: false, error: 'User not found' };
            }
        }, 300000); // 5 minutes cache for user data
    }

    /**
     * Smart user update with cache invalidation
     */
    async updateUser(userId, updateData) {
        const cacheKey = `user_update_${userId}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const userRef = await this.db.doc('users', userId);
            await userRef.update({
                ...updateData,
                updatedAt: new Date(),
                lastActivity: new Date()
            });
            
            // Invalidate related caches
            this.invalidateUserCaches(userId);
            
            return { success: true };
        }, 60000); // 1 minute cache for user updates
    }

    /**
     * Invalidate user-related caches
     */
    invalidateUserCaches(userId) {
        if (smartBeastMode.isEnabled) {
            const cacheKeys = [
                `user_get_${userId}`,
                `user_update_${userId}`,
                `user_create_${userId}`
            ];
            
            cacheKeys.forEach(key => {
                smartBeastMode.cache.delete(`smart_${key}`);
            });
        }
    }
}

/**
 * Enhanced subscription operations with Smart Beast Mode
 */
export class SmartBeastSubscriptionOps {
    constructor() {
        this.db = new SmartBeastDatabase();
    }

    /**
     * Smart subscription creation
     */
    async createSubscription(subscriptionData) {
        const cacheKey = `sub_create_${subscriptionData.userId}_${subscriptionData.serviceName}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const subRef = await this.db.collection('subscriptions');
            const newSub = await subRef.add({
                ...subscriptionData,
                createdAt: new Date(),
                status: 'pending'
            });
            
            // Invalidate related caches
            this.invalidateSubscriptionCaches(subscriptionData.userId);
            
            return { success: true, subscriptionId: newSub.id };
        }, 60000);
    }

    /**
     * Smart subscription retrieval
     */
    async getSubscriptions(userId) {
        const cacheKey = `subs_get_${userId}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const subsRef = await this.db.collection('subscriptions');
            const subsSnap = await subsRef.where('userId', '==', userId).get();
            
            const subscriptions = [];
            subsSnap.forEach(doc => {
                subscriptions.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, subscriptions };
        }, 300000); // 5 minutes cache
    }

    /**
     * Invalidate subscription-related caches
     */
    invalidateSubscriptionCaches(userId) {
        if (smartBeastMode.isEnabled) {
            const cacheKeys = [
                `sub_create_${userId}_`,
                `subs_get_${userId}`
            ];
            
            // Remove all keys that start with these patterns
            for (const [key] of smartBeastMode.cache) {
                cacheKeys.forEach(pattern => {
                    if (key.includes(pattern)) {
                        smartBeastMode.cache.delete(key);
                    }
                });
            }
        }
    }
}

/**
 * Enhanced payment operations with Smart Beast Mode
 */
export class SmartBeastPaymentOps {
    constructor() {
        this.db = new SmartBeastDatabase();
    }

    /**
     * Smart payment creation
     */
    async createPayment(paymentData) {
        const cacheKey = `payment_create_${paymentData.userId}_${Date.now()}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const paymentRef = await this.db.collection('payments');
            const newPayment = await paymentRef.add({
                ...paymentData,
                createdAt: new Date(),
                status: 'pending'
            });
            
            // Invalidate related caches
            this.invalidatePaymentCaches(paymentData.userId);
            
            return { success: true, paymentId: newPayment.id };
        }, 30000); // 30 seconds cache for payments
    }

    /**
     * Smart payment retrieval
     */
    async getPayments(userId) {
        const cacheKey = `payments_get_${userId}`;
        
        return await this.db.smartQuery(cacheKey, async () => {
            const paymentsRef = await this.db.collection('payments');
            const paymentsSnap = await paymentsRef.where('userId', '==', userId).get();
            
            const payments = [];
            paymentsSnap.forEach(doc => {
                payments.push({ id: doc.id, ...doc.data() });
            });
            
            return { success: true, payments };
        }, 300000); // 5 minutes cache
    }

    /**
     * Invalidate payment-related caches
     */
    invalidatePaymentCaches(userId) {
        if (smartBeastMode.isEnabled) {
            const cacheKeys = [
                `payment_create_${userId}_`,
                `payments_get_${userId}`
            ];
            
            // Remove all keys that start with these patterns
            for (const [key] of smartBeastMode.cache) {
                cacheKeys.forEach(pattern => {
                    if (key.includes(pattern)) {
                        smartBeastMode.cache.delete(key);
                    }
                });
            }
        }
    }
}

/**
 * Performance monitoring integration
 */
export class SmartBeastMonitor {
    constructor() {
        this.metrics = new Map();
        this.startMonitoring();
    }

    /**
     * Start performance monitoring
     */
    startMonitoring() {
        if (smartBeastMode.isEnabled) {
            setInterval(() => {
                this.logPerformanceMetrics();
            }, 300000); // 5 minutes
        }
    }

    /**
     * Record operation performance
     */
    recordOperation(operation, duration, success) {
        if (!smartBeastMode.isEnabled) return;

        const key = `${operation}_${success ? 'success' : 'failed'}`;
        const current = this.metrics.get(key) || { count: 0, totalDuration: 0, avgDuration: 0 };
        
        current.count++;
        current.totalDuration += duration;
        current.avgDuration = current.totalDuration / current.count;
        
        this.metrics.set(key, current);
    }

    /**
     * Log performance metrics
     */
    logPerformanceMetrics() {
        if (this.metrics.size === 0) return;

        console.log('📊 Smart Beast Mode Performance Metrics:');
        for (const [key, value] of this.metrics) {
            console.log(`  ${key}: ${value.count} operations, avg ${value.avgDuration.toFixed(2)}ms`);
        }
        
        // Reset metrics
        this.metrics.clear();
    }
}

// Create instances
export const smartBeastDB = new SmartBeastDatabase();
export const smartBeastUsers = new SmartBeastUserOps();
export const smartBeastSubscriptions = new SmartBeastSubscriptionOps();
export const smartBeastPayments = new SmartBeastPaymentOps();
export const smartBeastMonitor = new SmartBeastMonitor();

export default {
    SmartBeastDatabase,
    SmartBeastUserOps,
    SmartBeastSubscriptionOps,
    SmartBeastPaymentOps,
    SmartBeastMonitor,
    smartBeastDB,
    smartBeastUsers,
    smartBeastSubscriptions,
    smartBeastPayments,
    smartBeastMonitor
};
