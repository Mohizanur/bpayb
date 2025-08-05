import { setUserLang } from "../utils/i18n.js";

export default function langHandler(bot) {
  bot.command("lang", async (ctx) => {
    try {
      const arg = ctx.message.text.split(" ")[1];
      if (arg === "en" || arg === "am") {
        await setUserLang(ctx.from.id, arg);
        await ctx.reply(
          arg === "en"
            ? ctx.i18n.lang_switched_en.en
            : ctx.i18n.lang_switched_am.am
        );
      } else {
        await ctx.reply("Usage: /lang en or /lang am");
      }
    } catch (error) {
      console.error("Error in lang handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
}
