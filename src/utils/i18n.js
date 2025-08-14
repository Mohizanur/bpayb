import fs from "fs/promises";
import { firestore, isFirebaseConnected } from "./firestore.js";
import { supabase as supabaseClient } from './supabaseClient.js';

let i18nCache = null;

export async function loadI18n() {
  if (i18nCache) return i18nCache;
  try {
    const filePath = new URL("../i18n.json", import.meta.url);
    const data = await fs.readFile(filePath, "utf-8");
    i18nCache = JSON.parse(data);
    return i18nCache;
  } catch (error) {
    console.error("Error loading i18n file:", error);
    return {};
  }
}

export async function getUserLang(ctx) {
  try {
    const userId = String(ctx.from.id);

    // Prefer Supabase when configured
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('users')
        .select('language')
        .eq('id', userId)
        .single();
      if (!error && data?.language) return data.language;
    }

    if (!isFirebaseConnected) {
      return ctx.from?.language_code === "am" ? "am" : "en";
    }

    // Try Firestore
    const userDoc = await firestore
      .collection("users")
      .doc(userId)
      .get();
    
    if (userDoc.exists) {
      return userDoc.data().language || "en";
    }

    // Default based on Telegram user settings
    return ctx.from?.language_code === "am" ? "am" : "en";
  } catch (error) {
    console.error("Error getting user language:", error);
    return "en";
  }
}

export async function setUserLang(ctx, lang) {
  try {
    const userId = String(ctx.from.id);

    // Prefer Supabase when configured
    if (supabaseClient) {
      const { error } = await supabaseClient
        .from('users')
        .upsert({ id: userId, language: lang }, { onConflict: 'id' });
      if (!error) return true;
    }

    if (!isFirebaseConnected) return false;

    await firestore.collection("users").doc(String(ctx.from.id)).set({
      telegramUserID: ctx.from.id,
      language: lang,
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error setting user language:", error);
    return false;
  }
}

export function setLanguageCache(userId, lang) {
  // Placeholder for potential caching layer
}

export function getTranslatedMessage(ctx, key, defaultText) {
  const lang = ctx.userLang || (ctx.from?.language_code === "am" ? "am" : "en");
  const messages = i18nCache || {};
  const translated = messages[key]?.[lang];
  return translated || defaultText;
}

export function getErrorMessage(ctx) {
  return getTranslatedMessage(ctx, 'error_generic', '❌ An error occurred. Please try again.');
}
