import { firestore } from "../utils/firestore.js";

export default function mySubscriptionsHandler(bot) {
  bot.command("my_subscriptions", async (ctx) => {
    const lang = ctx.userLang;
    const userID = ctx.from.id;
    const subsSnap = await firestore
      .collection("subscriptions")
      .where("telegramUserID", "==", userID)
      .where("status", "==", "active")
      .get();
    if (subsSnap.empty) {
      await ctx.reply(
        lang === "en" ? "No active subscriptions." : "ምንም አካት የለም።"
      );
      return;
    }
    const services = ctx.services;
    let msg =
      lang === "en" ? "Your active subscriptions:\n" : "የእርስዎ አካት መዋቅሮች:\n";
    subsSnap.forEach((doc) => {
      const sub = doc.data();
      const service = services.find((s) => s.serviceID === sub.serviceID);
      msg += `\n${service ? service.name : sub.serviceID}: ${
        sub.nextBillingDate || "-"
      }\n`;
    });
    await ctx.reply(msg);
  });
}
