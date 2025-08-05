import fs from "fs/promises";
import { firestore } from "./firestore.js";

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
  return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&").replace(/\\/g, "\\\\");
}

export async function getUserLang(ctx) {
  try {
    // Try Firestore, fallback to Telegram language_code, then 'en'
    const userDoc = await firestore
      .collection("users")
      .doc(String(ctx.from.id))
      .get();
    if (userDoc.exists) return userDoc.data().language;
    if (ctx.from.language_code === "am") return "am";
    return "en";
  } catch (error) {
    console.error("Error getting user language:", error);
    // Fallback to Telegram language_code or 'en'
    if (ctx.from?.language_code === "am") return "am";
    return "en";
  }
}

export async function setUserLang(userID, lang) {
  try {
    await firestore
      .collection("users")
      .doc(String(userID))
      .set({ language: lang }, { merge: true });
  } catch (error) {
    console.error("Error setting user language:", error);
    // Don't throw - this is not critical for bot operation
  }
}
