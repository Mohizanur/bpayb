import { firestore } from "../utils/firestore.js";

export default function supportHandler(bot) {
  bot.on("text", async (ctx) => {
    try {
      // Skip if it's a command
      if (ctx.message.text.startsWith("/")) {
        return;
      }

      // Save to supportMessages
      await firestore.collection("supportMessages").add({
        telegramUserID: ctx.from.id,
        messageText: ctx.message.text,
        timestamp: new Date(),
        handled: false,
      });
      const lang = ctx.userLang;
      await ctx.reply(ctx.i18n.support_received[lang]);
    } catch (error) {
      console.error("Error in support handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
}
