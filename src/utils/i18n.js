import fs from "fs/promises";
import { firestore, isFirebaseConnected } from "./firestore.js";

let i18nCache = null;
export async function loadI18n() {
  if (!i18nCache) {
    i18nCache = JSON.parse(
      await fs.readFile(new URL("../i18n.json", import.meta.url))
    );
  }
  return i18nCache;
}

// Language cache to ensure immediate persistence
const languageCache = new Map();

export function setLanguageCache(userId, language) {
  languageCache.set(String(userId), language);
  console.log(`🔄 Language cached: ${language} for user ${userId}`);
}

export function getLanguageCache(userId) {
  return languageCache.get(String(userId));
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
    
    // First check language cache for immediate persistence
    const cachedLang = getLanguageCache(userId);
    if (cachedLang) {
      console.log(`🚀 Using cached language: ${cachedLang} for user ${userId}`);
      return cachedLang;
    }

    // If Firebase is not connected, use fallback immediately
    if (!isFirebaseConnected) {
      const lang = ctx.from?.language_code === "am" ? "am" : "en";
      console.log(`Using fallback language: ${lang} (Firebase not connected)`);
      return lang;
    }

    // Try Firestore
    const userDoc = await firestore
      .collection("users")
      .doc(userId)
      .get();
    
    if (userDoc.exists && userDoc.data().language) {
      const savedLang = userDoc.data().language;
      // Cache the language for immediate future use
      setLanguageCache(userId, savedLang);
      console.log(`✅ Retrieved saved language: ${savedLang} for user ${userId}`);
      return savedLang;
    }
    
    // If no saved language, use Telegram language_code as default
    const defaultLang = ctx.from?.language_code === "am" ? "am" : "en";
    console.log(`📝 No saved language, using default: ${defaultLang} for user ${userId}`);
    return defaultLang;
  } catch (error) {
    // Only log error once, not repeatedly
    if (error.code === 16) {
      console.log(`Firebase auth error - using fallback language for user ${ctx.from.id}`);
    } else {
      console.error("Error getting user language:", error.message);
    }
    // Fallback to Telegram language_code or 'en'
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    console.log(`⚠️ Error fallback language: ${lang} for user ${ctx.from.id}`);
    return lang;
  }
}

export async function setUserLang(ctx, lang) {
  try {
    if (!isFirebaseConnected) {
      console.log(`Mock: Setting user ${ctx.from.id} language to ${lang}`);
      return;
    }

    await firestore.collection("users").doc(String(ctx.from.id)).set({
      telegramUserID: ctx.from.id,
      language: lang,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name,
      username: ctx.from.username,
    });
    console.log(`User ${ctx.from.id} language set to ${lang}`);
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
