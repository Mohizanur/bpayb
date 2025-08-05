import { escapeMarkdownV2 } from "../utils/i18n.js";

export default function helpHandler(bot) {
  bot.command("help", async (ctx) => {
    try {
      console.log("Help command triggered!");
      const lang = ctx.userLang;
      const helpTitle = ctx.i18n.help_title[lang];
      const helpText = ctx.i18n.help_text[lang];

      console.log("Sending help response...");
      await ctx.reply(`${helpTitle}\n\n${helpText}`);
      console.log("Help response sent successfully!");
    } catch (error) {
      console.error("Error in help handler:", error);
      const errorMsg = ctx.i18n?.error_generic?.[ctx.userLang] || "Sorry, something went wrong. Please try again.";
      await ctx.reply(errorMsg);
    }
  });
}
