import { escapeMarkdownV2 } from "../utils/i18n.js";

export default function helpHandler(bot) {
  console.log("🔧 Registering help command handler");
  bot.command("help", async (ctx) => {
    try {
      console.log("🚀 HELP COMMAND TRIGGERED!");
      console.log("User ID:", ctx.from?.id);
      console.log("User language:", ctx.userLang);
      console.log("i18n available:", !!ctx.i18n);
      
      const lang = ctx.userLang || "en";
      
      // Fallback help text if i18n is not available
      let helpText;
      if (ctx.i18n && ctx.i18n.help_title && ctx.i18n.help_text) {
        const helpTitle = ctx.i18n.help_title[lang] || ctx.i18n.help_title["en"];
        const helpContent = ctx.i18n.help_text[lang] || ctx.i18n.help_text["en"];
        helpText = `${helpTitle}\n\n${helpContent}`;
      } else {
        // Fallback help text
        helpText = lang === "am" 
          ? "🔧 BirrPay የብር የደግፍ መረጃ\n\nየተጣታት ትዕዛዞች:\n• /start - ዋና ምንዩ\n• /help - የእርዳታ ምንዩ\n• /faq - በተደጋጋሚ የሚጣዩ ጥያቄዎች\n• /lang - የቋንቃ መረጥ\n• /mysubs - የእርስዎ መዋቅሮች\n• /support - የተጠቃሚ ድጋፍ"
          : "🔧 BirrPay Help & Support\n\nAvailable Commands:\n• /start - Main menu and services\n• /help - Show this help message\n• /faq - Frequently asked questions\n• /lang - Change language settings\n• /mysubs - View your subscriptions\n• /support - Contact customer support";
      }

      console.log("Sending help response...");
      await ctx.reply(helpText);
      console.log("Help response sent successfully!");
    } catch (error) {
      console.error("Error in help handler:", error);
      try {
        const errorMsg = "Sorry, something went wrong. Please try again.";
        await ctx.reply(errorMsg);
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  });
}
