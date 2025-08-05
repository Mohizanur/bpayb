import { firestore } from "../utils/firestore.js";

export default function subscribeHandler(bot) {
  bot.action(/subscribe_(.+)/, async (ctx) => {
    const serviceID = ctx.match[1];
    const userID = ctx.from.id;
    const lang = ctx.userLang;
    await firestore.collection("subscriptions").add({
      telegramUserID: userID,
      serviceID,
      requestedAt: new Date(),
      status: "pending",
    });
    await ctx.reply(ctx.i18n.pending_request[lang]);
    await ctx.answerCbQuery();
  });
}
