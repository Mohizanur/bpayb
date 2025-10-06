// 🚀 SMART VERIFICATION MIDDLEWARE - ZERO LATENCY
// Cached phone verification and admin checks for maximum performance

import { firestore } from '../utils/firestore.js';
import { cache } from '../utils/cache.js';

// In-memory cache for instant access
const verificationCache = new Map();
const adminCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

// Smart admin check with caching
export const isAuthorizedAdmin = async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    if (!userId) return false;
    
    // 1. Check cache FIRST (0ms)
    const cached = adminCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.isAdmin;
    }
    
    // 2. Check environment variable (fastest)
    if (process.env.ADMIN_TELEGRAM_ID && userId === process.env.ADMIN_TELEGRAM_ID) {
      adminCache.set(userId, { isAdmin: true, timestamp: Date.now() });
      return true;
    }
    
    // 3. Check Firestore config (only if not cached)
    const adminDoc = await firestore.collection('config').doc('admins').get();
    let isAdmin = false;
    
    if (adminDoc.exists) {
      const admins = adminDoc.data().userIds || [];
      isAdmin = admins.includes(userId);
    }
    
    // 4. Cache the result
    adminCache.set(userId, { isAdmin, timestamp: Date.now() });
    
    return isAdmin;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Smart user data fetcher with caching
const getUserDataSmart = async (userId) => {
  try {
    // 1. Check cache FIRST (0ms)
    const cached = verificationCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.userData;
    }
    
    // 2. Check global cache
    let userData = cache.getUser(userId);
    if (userData) {
      verificationCache.set(userId, { userData, timestamp: Date.now() });
      return userData;
    }
    
    // 3. Fetch from Firestore (only if not cached)
    const userDoc = await firestore.collection('users').doc(userId).get();
    userData = userDoc.data() || {};
    
    // 4. Cache the result
    cache.setUser(userId, userData);
    verificationCache.set(userId, { userData, timestamp: Date.now() });
    
    return userData;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return { phoneVerified: false };
  }
};

// Smart phone verification middleware
export const smartPhoneVerificationMiddleware = async (ctx, next) => {
  try {
    // Skip verification for essential commands
    const isVerificationCommand = 
      ctx.message?.text?.startsWith('/verify') || 
      ctx.callbackQuery?.data?.startsWith('verify_');
    const isStartCommand = ctx.message?.text === '/start';
    const isHelpCommand = ctx.message?.text === '/help';
    const isLanguageCommand = 
      ctx.message?.text === '/lang' || ctx.message?.text === '/language';
    const isSupportCommand = ctx.message?.text === '/support';
    const isContactMessage = ctx.message?.contact;
    const isManualPhoneInput = 
      ctx.message?.text === '✍️ በእጅ መፃፍ' || 
      ctx.message?.text === '✍️ Type Manually';
    const isVerificationCodeInput = 
      ctx.message?.text && /^\d{6}$/.test(ctx.message.text.trim());
    
    if (isVerificationCommand || isStartCommand || isHelpCommand || 
        isLanguageCommand || isSupportCommand || isContactMessage || 
        isManualPhoneInput || isVerificationCodeInput) {
      return next();
    }
    
    // Smart admin check (cached)
    const isAdmin = await isAuthorizedAdmin(ctx);
    if (isAdmin) {
      return next();
    }
    
    // Check if user is verified (cached)
    if (!ctx.from?.id) {
      return next();
    }
    
    const userId = String(ctx.from.id);
    const userData = await getUserDataSmart(userId);
    
    // If user doesn't exist, create them
    if (!userData.telegramId) {
      const newUserData = {
        telegramId: userId,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
        username: ctx.from.username || '',
        language: ctx.from.language_code || 'en',
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await firestore.collection('users').doc(userId).set(newUserData);
      
      // Update cache
      cache.setUser(userId, newUserData);
      verificationCache.set(userId, { userData: newUserData, timestamp: Date.now() });
      
      // Show verification prompt
      await showVerificationPrompt(ctx, newUserData.language);
      return;
    }
    
    // If user exists but not verified
    if (!userData.phoneVerified) {
      await showVerificationPrompt(ctx, userData.language || ctx.from.language_code || 'en');
      return;
    }
    
    // User is verified, continue
    return next();
    
  } catch (error) {
    console.error('⚠️ SMART VERIFICATION MIDDLEWARE ERROR:', error);
    // Continue without verification if there's an error
    return next();
  }
};

// Show verification prompt
const showVerificationPrompt = async (ctx, lang) => {
  try {
    const verificationMsg = lang === 'am'
      ? '📱 የተልፍዎን መረጃ አስፈላጊ\n\nየBirrPay አገልግሎቶችን ለመጠቀም የተልፍዎን መረጃ አስፈላጊ።\n\nእባክዎ ከታች ያለውን ቁልፍ በመጫን የስልክ ቁጥርዎን ያረጋግጡ።'
      : '📱 Phone Verification Required\n\nTo use BirrPay services, you need to verify your phone number.\n\nPlease verify your phone number by clicking the button below.';
    
    // Remove any existing reply markup first
    try {
      await ctx.answerCbQuery();
    } catch (e) {
      /* Ignore if not a callback query */
    }
    
    await ctx.reply(verificationMsg, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: lang === 'am' ? '📱 ስልክ ቁጥሬን ለማረጋገጥ' : '📱 Verify My Number',
              callback_data: 'verify_phone'
            }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('Error showing verification prompt:', error);
  }
};

// Cache invalidation functions
export const invalidateUserCache = (userId) => {
  verificationCache.delete(userId);
  cache.invalidateUser(userId);
};

export const invalidateAdminCache = (userId) => {
  adminCache.delete(userId);
};

// Clear all caches (for admin commands)
export const clearAllCaches = () => {
  verificationCache.clear();
  adminCache.clear();
  cache.clear();
};

// Get all admin IDs for notifications
export const getAllAdmins = async () => {
  try {
    const admins = [];
    
    // Add main admin from environment variable
    if (process.env.ADMIN_TELEGRAM_ID) {
      admins.push({
        id: process.env.ADMIN_TELEGRAM_ID,
        telegramId: process.env.ADMIN_TELEGRAM_ID,
        isMainAdmin: true
      });
    }
    
    // Get additional admins from Firestore
    const adminDoc = await firestore.collection('config').doc('admins').get();
    if (adminDoc.exists) {
      const adminData = adminDoc.data();
      const userIds = adminData.userIds || [];
      
      userIds.forEach(userId => {
        // Don't duplicate main admin
        if (userId !== process.env.ADMIN_TELEGRAM_ID) {
          admins.push({
            id: userId,
            telegramId: userId,
            isMainAdmin: false
          });
        }
      });
    }
    
    return admins;
  } catch (error) {
    console.error('Error getting all admins:', error);
    // Fallback to main admin only
    return process.env.ADMIN_TELEGRAM_ID ? [{
      id: process.env.ADMIN_TELEGRAM_ID,
      telegramId: process.env.ADMIN_TELEGRAM_ID,
      isMainAdmin: true
    }] : [];
  }
};

// Get cache statistics
export const getCacheStats = () => {
  return {
    verificationCache: verificationCache.size,
    adminCache: adminCache.size,
    globalCache: cache.size(),
    memoryUsage: cache.getMemoryUsage()
  };
};

