import { firestore } from "../utils/firestore.js";

export default function cancelSubscriptionHandler(bot) {
  bot.command("cancel_subscription", async (ctx) => {
    const lang = ctx.userLang;
    const userID = ctx.from.id;
    const subsSnap = await firestore
      .collection("subscriptions")
      .where("telegramUserID", "==", userID)
      .where("status", "==", "active")
      .get();
    if (subsSnap.empty) {
      await ctx.reply(
        lang === "en"
          ? "No active subscriptions to cancel."
          : "ምንም የሚተዉ አካት የለም።"
      );
      return;
    }
    const services = ctx.services;
    const keyboard = [];
    subsSnap.forEach((doc) => {
      const sub = doc.data();
      const service = services.find((s) => s.serviceID === sub.serviceID);
      keyboard.push([
        {
          text: `${service ? service.name : sub.serviceID}`,
          callback_data: `cancel_confirm_${doc.id}`,
        },
      ]);
    });
    await ctx.reply(
      lang === "en" ? "Select a subscription to cancel:" : "የሚተዉ መዋቅር ይምረጡ፡",
      {
        reply_markup: { inline_keyboard: keyboard },
      }
    );
  });

  bot.action(/cancel_confirm_(.+)/, async (ctx) => {
    const subId = ctx.match[1];
    const lang = ctx.userLang;
    await firestore
      .collection("subscriptions")
      .doc(subId)
      .update({ status: "cancelled" });
    await ctx.reply(lang === "en" ? "Subscription cancelled." : "መዋቅሩ ተተውቷል።");
    await ctx.answerCbQuery();
  });
}
