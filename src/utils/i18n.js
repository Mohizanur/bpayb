import fs from "fs/promises";
import { firestore, isFirebaseConnected } from "./firestore.js";
import { 
  cacheUserLanguage, 
  getCachedUserLanguage, 
  clearUserLanguageCache,
  recordCacheHit,
  recordCacheMiss,
  deduplicateRequest
} from "./ultraCache.js";

let i18nCache = null;
export async function loadI18n() {
  if (!i18nCache) {
    i18nCache = JSON.parse(
      await fs.readFile(new URL("../i18n.json", import.meta.url))
    );
  }
  return i18nCache;
}

// Legacy compatibility wrappers
export function setLanguageCache(userId, language) {
  cacheUserLanguage(userId, language);
}

export function getLanguageCache(userId) {
  return getCachedUserLanguage(userId);
}

// Function to escape MarkdownV2 text
export function escapeMarkdownV2(text) {
  if (!text) return text;
  // First escape backslashes, then escape special characters
  return text.replace(/\\/g, "\\\\").replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

export async function getUserLang(ctx) {
  try {
    const userId = String(ctx.from.id);
    
    // ULTRA-CACHE: Check cache first (instant response, NO DB READ!)
    const cachedLang = getCachedUserLanguage(userId);
    if (cachedLang) {
      recordCacheHit('language');
      return cachedLang; // Instant return, no DB hit!
    }
    
    // If not in cache, use Telegram's language_code as default (NO DB READ!)
    // This saves quota - we never read from DB for language
    const defaultLang = ctx.from?.language_code === "am" ? "am" : "en";
    cacheUserLanguage(userId, defaultLang); // Cache it for next time
    return defaultLang;
  } catch (error) {
    console.error("Error getting user language:", error.message);
    // Fallback to Telegram language_code or 'en' (NO DB READ!)
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    const userId = String(ctx.from?.id);
    if (userId) {
      cacheUserLanguage(userId, lang); // Cache fallback too
    }
    return lang;
  }
}

export async function setUserLang(ctx, lang) {
  try {
    const userId = String(ctx.from.id);
    
    // ULTRA-CACHE: Update cache immediately (NO DB WRITE - saves quota!)
    cacheUserLanguage(userId, lang);
    
    // Also invalidate optimizedDatabase cache to ensure consistency
    try {
      const { invalidateUser } = await import('./smartCache.js');
      invalidateUser(userId);
    } catch (error) {
      // Ignore if smartCache is not available
      console.log('Could not invalidate smartCache:', error.message);
    }
    
    // NO DATABASE WRITE - Language is stored in cache only to save quota!
    // Language preference is not critical data that needs persistence
    console.log(`✅ User ${userId} language set to ${lang} (cached only - no DB write)`);
  } catch (error) {
    console.error("Error setting user language:", error.message);
  }
}

// Utility function to get translated error message
export async function getErrorMessage(ctx, key = 'error_generic') {
  try {
    const userLang = await getUserLang(ctx);
    const i18n = await loadI18n();
    return i18n[key]?.[userLang] || i18n.error_generic?.[userLang] || "❌ Something went wrong. Please try again or contact support.";
  } catch (error) {
    console.error("Error getting translated message:", error);
    return "❌ Something went wrong. Please try again or contact support.";
  }
}

// Utility function to get any translated message
export async function getTranslatedMessage(ctx, key, fallback = '') {
  try {
    const userLang = await getUserLang(ctx);
    const i18n = await loadI18n();
    return i18n[key]?.[userLang] || fallback;
  } catch (error) {
    console.error("Error getting translated message:", error);
    return fallback;
  }
}
