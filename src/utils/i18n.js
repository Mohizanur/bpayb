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

// Function to escape MarkdownV2 text
export function escapeMarkdownV2(text) {
  if (!text) return text;
  // First escape backslashes, then escape special characters
  return text.replace(/\\/g, "\\\\").replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

export async function getUserLang(ctx) {
  try {
    // If Firebase is not connected, use fallback immediately
    if (!isFirebaseConnected) {
      const lang = ctx.from?.language_code === "am" ? "am" : "en";
      console.log(`Using fallback language: ${lang} (Firebase not connected)`);
      return lang;
    }

    // Try Firestore, fallback to Telegram language_code, then 'en'
    const userDoc = await firestore
      .collection("users")
      .doc(String(ctx.from.id))
      .get();
    if (userDoc.exists) return userDoc.data().language;
    if (ctx.from.language_code === "am") return "am";
    return "en";
  } catch (error) {
    // Only log error once, not repeatedly
    if (error.code === 16) {
      console.log(`Firebase auth error - using fallback language`);
    } else {
      console.error("Error getting user language:", error.message);
    }
    // Fallback to Telegram language_code or 'en'
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
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
