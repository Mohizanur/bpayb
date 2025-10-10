/**
 * ULTRA-FAST ADMIN VERIFICATION
 * Uses aggressive caching to avoid database hits on every admin action
 */

import { firestore } from "../utils/firestore.js";
import { 
  cacheAdminList, 
  getCachedAdminList, 
  isAdmin,
  recordCacheHit,
  recordCacheMiss,
  clearAdminCache
} from "../utils/ultraCache.js";

// Preload admin list on module import
let adminListLoaded = false;

async function preloadAdminList() {
  if (adminListLoaded) return;
  
  try {
    const admins = [];
    
    // Load from environment variable
    if (process.env.ADMIN_TELEGRAM_ID) {
      admins.push(process.env.ADMIN_TELEGRAM_ID);
    }
    
    // Load from Firestore config
    try {
      const adminDoc = await firestore.collection('config').doc('admins').get();
      if (adminDoc.exists) {
        const adminIds = adminDoc.data().userIds || [];
        admins.push(...adminIds);
      }
    } catch (error) {
      console.log('Could not load admin list from Firestore:', error.message);
    }
    
    // Remove duplicates and cache
    const uniqueAdmins = [...new Set(admins)];
    cacheAdminList(uniqueAdmins);
    adminListLoaded = true;
    
    console.log(`⚡ Admin list preloaded: ${uniqueAdmins.length} admins cached`);
  } catch (error) {
    console.error('Error preloading admin list:', error);
  }
}

// Auto-preload on module import
preloadAdminList();

/**
 * Ultra-fast admin check with caching
 */
export async function isAuthorizedAdmin(ctx) {
  try {
    const userId = ctx.from?.id?.toString();
    if (!userId) return false;
    
    // Ensure admin list is loaded
    if (!adminListLoaded) {
      await preloadAdminList();
    }
    
    // ULTRA-CACHE: Check cached admin list (instant!)
    const cachedResult = isAdmin(userId);
    if (cachedResult !== null) {
      recordCacheHit('admin');
      return cachedResult;
    }
    
    recordCacheMiss('admin');
    
    // If cache miss, reload admin list and check again
    await preloadAdminList();
    const result = isAdmin(userId);
    
    if (!result) {
      console.warn(`⚠️ Unauthorized admin access attempt from user ${userId} (${ctx.from?.username || 'no username'})`);
    }
    
    return result || false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Refresh admin cache (call this when admin list changes)
 */
export async function refreshAdminCache() {
  clearAdminCache();
  adminListLoaded = false;
  await preloadAdminList();
  console.log('✅ Admin cache refreshed');
}

export default isAuthorizedAdmin;

