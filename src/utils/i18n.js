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
    
    // ULTRA-CACHE: Check cache first (instant response)
    const cachedLang = getCachedUserLanguage(userId);
    if (cachedLang) {
      recordCacheHit('language');
      return cachedLang; // Instant return, no DB hit!
    }
    
    recordCacheMiss('language');

    // If Firebase is not connected, use fallback immediately
    if (!isFirebaseConnected) {
      const lang = ctx.from?.language_code === "am" ? "am" : "en";
      cacheUserLanguage(userId, lang);
      return lang;
    }

    // DEDUPLICATION: If multiple simultaneous requests for same user, wait for first one
    const lang = await deduplicateRequest(`getUserLang_${userId}`, async () => {
      // Try Firestore
      const userDoc = await firestore
        .collection("users")
        .doc(userId)
        .get();
      
      if (userDoc.exists && userDoc.data().language) {
        const savedLang = userDoc.data().language;
        // Cache for future use (7 days)
        cacheUserLanguage(userId, savedLang);
        return savedLang;
      }
      
      // If no saved language, use Telegram language_code as default
      const defaultLang = ctx.from?.language_code === "am" ? "am" : "en";
      // Cache the default too
      cacheUserLanguage(userId, defaultLang);
      return defaultLang;
    });
    
    return lang;
  } catch (error) {
    // Only log error once, not repeatedly
    if (error.code === 16) {
      console.log(`Firebase auth error - using fallback language for user ${ctx.from.id}`);
    } else {
      console.error("Error getting user language:", error.message);
    }
    // Fallback to Telegram language_code or 'en'
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    cacheUserLanguage(userId, lang); // Cache fallback too
    return lang;
  }
}

export async function setUserLang(ctx, lang) {
  try {
    const userId = String(ctx.from.id);
    
    // ULTRA-CACHE: Update cache immediately (instant for next request)
    cacheUserLanguage(userId, lang);
    
    if (!isFirebaseConnected) {
      console.log(`Mock: Setting user ${userId} language to ${lang}`);
      return;
    }

    // Update database in background (don't wait)
    firestore.collection("users").doc(userId).set({
      telegramUserID: ctx.from.id,
      language: lang,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
      lastActivity: new Date()
    }, { merge: true }).catch(err => {
      console.error("Error setting user language:", err.message);
    });
    
    console.log(`✅ User ${userId} language set to ${lang} (cached + background save)`);
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
