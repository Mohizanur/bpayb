import { setUserLang } from "../utils/i18n.js";

export default function langHandler(bot) {
  bot.command("lang", async (ctx) => {
    try {
      console.log("Lang command triggered!");
      const arg = ctx.message.text.split(" ")[1];
      console.log("Lang argument:", arg);
      if (arg === "en" || arg === "am") {
        await setUserLang(ctx.from.id, arg);
        console.log("Sending lang response...");
        await ctx.reply(
          arg === "en"
            ? ctx.i18n.lang_switched_en.en
            : ctx.i18n.lang_switched_am.am
        );
        console.log("Lang response sent successfully!");
      } else {
        console.log("Invalid lang argument, sending usage message...");
        await ctx.reply("Usage: /lang en or /lang am");
        console.log("Usage message sent successfully!");
      }
    } catch (error) {
      console.error("Error in lang handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
}
