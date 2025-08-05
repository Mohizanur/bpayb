import { setUserLang } from "../utils/i18n.js";

export default function langHandler(bot) {
  bot.command("lang", async (ctx) => {
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
  });
}
