/**
 * ULTRA-CACHE: Aggressive in-memory caching for handling thousands of simultaneous requests
 * This cache layer sits between the bot and Firestore to minimize database reads
 */

// ========================================
// LANGUAGE CACHE (Most Accessed Data)
// ========================================
const languageCache = new Map();
const languageCacheTimestamp = new Map();
const LANGUAGE_CACHE_TTL = 1000 * 60 * 60 * 24 * 7; // 7 days (almost permanent)

export function cacheUserLanguage(userId, language) {
  const uid = String(userId);
  languageCache.set(uid, language);
  languageCacheTimestamp.set(uid, Date.now());
}

export function getCachedUserLanguage(userId) {
  const uid = String(userId);
  const cached = languageCache.get(uid);
  const timestamp = languageCacheTimestamp.get(uid);
  
  if (cached && timestamp) {
    const age = Date.now() - timestamp;
    if (age < LANGUAGE_CACHE_TTL) {
      return cached; // Return cached language
    }
    // Expired - remove from cache
    languageCache.delete(uid);
    languageCacheTimestamp.delete(uid);
  }
  
  return null;
}

export function clearUserLanguageCache(userId) {
  const uid = String(userId);
  languageCache.delete(uid);
  languageCacheTimestamp.delete(uid);
}

// ========================================
// ADMIN CACHE (Frequently Checked)
// ========================================
let adminListCache = null;
let adminListTimestamp = null;
const ADMIN_CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function cacheAdminList(adminIds) {
  adminListCache = new Set(adminIds.map(String));
  adminListTimestamp = Date.now();
  console.log(`✅ Cached ${adminIds.length} admin IDs`);
}

export function getCachedAdminList() {
  if (adminListCache && adminListTimestamp) {
    const age = Date.now() - adminListTimestamp;
    if (age < ADMIN_CACHE_TTL) {
      return Array.from(adminListCache);
    }
    // Expired
    adminListCache = null;
    adminListTimestamp = null;
  }
  return null;
}

export function isAdmin(userId) {
  if (!adminListCache) return null; // Not cached yet
  return adminListCache.has(String(userId));
}

export function clearAdminCache() {
  adminListCache = null;
  adminListTimestamp = null;
  console.log('🔄 Admin cache cleared');
}

// ========================================
// USER DATA CACHE (For Active Sessions)
// ========================================
const userDataCache = new Map();
const userDataTimestamp = new Map();
const USER_DATA_TTL = 1000 * 60 * 15; // 15 minutes (active session)

export function cacheUserData(userId, userData) {
  const uid = String(userId);
  userDataCache.set(uid, userData);
  userDataTimestamp.set(uid, Date.now());
  
  // Also cache language from user data
  if (userData.language) {
    cacheUserLanguage(uid, userData.language);
  }
}

export function getCachedUserData(userId) {
  const uid = String(userId);
  const cached = userDataCache.get(uid);
  const timestamp = userDataTimestamp.get(uid);
  
  if (cached && timestamp) {
    const age = Date.now() - timestamp;
    if (age < USER_DATA_TTL) {
      return cached;
    }
    // Expired
    userDataCache.delete(uid);
    userDataTimestamp.delete(uid);
  }
  
  return null;
}

// ========================================
// REQUEST DEDUPLICATION
// ========================================
const pendingRequests = new Map();

/**
 * Deduplicate simultaneous identical requests
 * If same request is in-flight, wait for it instead of making duplicate DB call
 */
export async function deduplicateRequest(key, requestFunction) {
  // Check if this request is already in-flight
  if (pendingRequests.has(key)) {
    console.log(`⚡ Deduplicated request: ${key}`);
    return await pendingRequests.get(key);
  }
  
  // Start new request
  const promise = requestFunction();
  pendingRequests.set(key, promise);
  
  try {
    const result = await promise;
    return result;
  } finally {
    // Clean up after request completes
    pendingRequests.delete(key);
  }
}

// ========================================
// CACHE STATISTICS
// ========================================
let stats = {
  languageHits: 0,
  languageMisses: 0,
  adminHits: 0,
  adminMisses: 0,
  userDataHits: 0,
  userDataMisses: 0,
  deduplications: 0
};

export function recordCacheHit(type) {
  switch(type) {
    case 'language':
      stats.languageHits++;
      break;
    case 'admin':
      stats.adminHits++;
      break;
    case 'userData':
      stats.userDataHits++;
      break;
    case 'dedup':
      stats.deduplications++;
      break;
  }
}

export function recordCacheMiss(type) {
  switch(type) {
    case 'language':
      stats.languageMisses++;
      break;
    case 'admin':
      stats.adminMisses++;
      break;
    case 'userData':
      stats.userDataMisses++;
      break;
  }
}

export function getCacheStats() {
  const calculateHitRate = (hits, misses) => {
    const total = hits + misses;
    return total > 0 ? ((hits / total) * 100).toFixed(1) + '%' : 'N/A';
  };
  
  return {
    language: {
      hits: stats.languageHits,
      misses: stats.languageMisses,
      hitRate: calculateHitRate(stats.languageHits, stats.languageMisses),
      cacheSize: languageCache.size
    },
    admin: {
      hits: stats.adminHits,
      misses: stats.adminMisses,
      hitRate: calculateHitRate(stats.adminHits, stats.adminMisses),
      cached: adminListCache ? adminListCache.size : 0
    },
    userData: {
      hits: stats.userDataHits,
      misses: stats.userDataMisses,
      hitRate: calculateHitRate(stats.userDataHits, stats.userDataMisses),
      cacheSize: userDataCache.size
    },
    deduplications: stats.deduplications,
    totalSavings: stats.languageHits + stats.adminHits + stats.userDataHits + stats.deduplications
  };
}

export function logCacheStats() {
  const cacheStats = getCacheStats();
  console.log('📊 ULTRA-CACHE Statistics:');
  console.log(`   Language: ${cacheStats.language.hitRate} hit rate (${cacheStats.language.hits} hits, ${cacheStats.language.cacheSize} cached)`);
  console.log(`   Admin: ${cacheStats.admin.hitRate} hit rate (${cacheStats.admin.hits} hits)`);
  console.log(`   User Data: ${cacheStats.userData.hitRate} hit rate (${cacheStats.userData.hits} hits)`);
  console.log(`   Deduped Requests: ${cacheStats.deduplications}`);
  console.log(`   Total DB Reads Saved: ${cacheStats.totalSavings}`);
}

// Log stats every 5 minutes - DISABLED for quota protection
// setInterval(logCacheStats, 5 * 60 * 1000);
console.log('⚠️ Cache stats logging DISABLED (quota protection)');

// ========================================
// CLEANUP (Prevent Memory Leaks)
// ========================================
function cleanup() {
  const now = Date.now();
  
  // Clean expired language cache
  for (const [userId, timestamp] of languageCacheTimestamp.entries()) {
    if (now - timestamp > LANGUAGE_CACHE_TTL) {
      languageCache.delete(userId);
      languageCacheTimestamp.delete(userId);
    }
  }
  
  // Clean expired user data cache
  for (const [userId, timestamp] of userDataTimestamp.entries()) {
    if (now - timestamp > USER_DATA_TTL) {
      userDataCache.delete(userId);
      userDataTimestamp.delete(userId);
    }
  }
}

// Run cleanup every hour - DISABLED for quota protection
// setInterval(cleanup, 60 * 60 * 1000);
console.log('⚠️ Cache cleanup DISABLED (quota protection)');

// ULTRA-CACHE: Custom Plan Requests (cached for 6 hours)
const customPlanRequestsCache = new Map();
let customPlanRequestsCacheTime = null;

export async function getCachedCustomPlanRequests() {
  // Check if cache is valid (6 hours)
  const cacheExpired = !customPlanRequestsCacheTime || 
    (Date.now() - customPlanRequestsCacheTime) > 21600000; // 6 hours
  
  if (customPlanRequestsCache.size === 0 || cacheExpired) {
    console.log('🔄 Custom plan requests cache miss - reading from database');
    const { firestore } = await import('./firestore.js');
    const snapshot = await firestore.collection('customPlanRequests').get();
    customPlanRequestsCache.clear();
    snapshot.docs.forEach(doc => {
      customPlanRequestsCache.set(doc.id, { id: doc.id, ...doc.data() });
    });
    customPlanRequestsCacheTime = Date.now();
  } else {
    console.log('⚡ Custom plan requests cache hit - no DB read!');
  }
  
  return Array.from(customPlanRequestsCache.values());
}

// ULTRA-CACHE: Subscriptions (cached for 6 hours)
const subscriptionsCache = new Map();
let subscriptionsCacheTime = null;

export async function getCachedSubscriptions() {
  // Check if cache is valid (6 hours)
  const cacheExpired = !subscriptionsCacheTime || 
    (Date.now() - subscriptionsCacheTime) > 21600000; // 6 hours
  
  if (subscriptionsCache.size === 0 || cacheExpired) {
    console.log('🔄 Subscriptions cache miss - reading from database');
    const { firestore } = await import('./firestore.js');
    const snapshot = await firestore.collection('subscriptions').get();
    subscriptionsCache.clear();
    snapshot.docs.forEach(doc => {
      subscriptionsCache.set(doc.id, { id: doc.id, ...doc.data() });
    });
    subscriptionsCacheTime = Date.now();
  } else {
    console.log('⚡ Subscriptions cache hit - no DB read!');
  }
  
  return Array.from(subscriptionsCache.values());
}

// ULTRA-CACHE: Payment Methods (cached for 1 hour)
const paymentMethodsCache = new Map();
let paymentMethodsCacheTime = null;

export async function getCachedPaymentMethods() {
  // Check if cache is valid (1 hour)
  const cacheExpired = !paymentMethodsCacheTime || 
    (Date.now() - paymentMethodsCacheTime) > 3600000; // 1 hour
  
  if (paymentMethodsCache.size === 0 || cacheExpired) {
    console.log('🔄 Payment methods cache miss - reading from database');
    const { firestore } = await import('./firestore.js');
    const doc = await firestore.collection('config').doc('paymentMethods').get();
    
    if (doc.exists) {
      const methods = doc.data().methods || [];
      paymentMethodsCache.clear();
      methods.forEach(method => {
        paymentMethodsCache.set(method.id, method);
      });
    } else {
      paymentMethodsCache.clear();
    }
    paymentMethodsCacheTime = Date.now();
  } else {
    console.log('⚡ Payment methods cache hit - no DB read!');
  }
  
  return Array.from(paymentMethodsCache.values());
}

console.log('⚡ ULTRA-CACHE initialized for maximum performance');

