import { firestore } from "../utils/firestore.js";

export default function supportHandler(bot) {
  bot.on("text", async (ctx) => {
    // Save to supportMessages
    await firestore.collection("supportMessages").add({
      telegramUserID: ctx.from.id,
      messageText: ctx.message.text,
      timestamp: new Date(),
      handled: false,
    });
    const lang = ctx.userLang;
    await ctx.reply(ctx.i18n.support_received[lang]);
  });
}
