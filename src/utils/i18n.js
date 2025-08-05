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

export async function getUserLang(ctx) {
  // Try Firestore, fallback to Telegram language_code, then 'en'
  const userDoc = await firestore
    .collection("users")
    .doc(String(ctx.from.id))
    .get();
  if (userDoc.exists) return userDoc.data().language;
  if (ctx.from.language_code === "am") return "am";
  return "en";
}

export async function setUserLang(userID, lang) {
  await firestore
    .collection("users")
    .doc(String(userID))
    .set({ language: lang }, { merge: true });
}
