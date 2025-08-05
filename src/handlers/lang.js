import { setUserLang } from "../utils/i18n.js";

export default function langHandler(bot) {
  bot.command("lang", async (ctx) => {
    try {
      console.log("Lang command triggered!");
      console.log("User language:", ctx.userLang);
      console.log("i18n available:", !!ctx.i18n);
      
      const arg = ctx.message.text.split(" ")[1];
      console.log("Lang argument:", arg);
      
      if (arg === "en" || arg === "am") {
        await setUserLang(ctx, arg);
        console.log("Sending lang response...");
        
        // Fallback messages if i18n is not available
        let responseMsg;
        if (ctx.i18n && ctx.i18n.lang_switched_en && ctx.i18n.lang_switched_am) {
          responseMsg = arg === "en"
            ? ctx.i18n.lang_switched_en.en
            : ctx.i18n.lang_switched_am.am;
        } else {
          responseMsg = arg === "en"
            ? "🇺🇸 Language switched to English"
            : "🇪🇹 ቋንቋ ወደ አማርኛ ተቀይሯል";
        }
        
        await ctx.reply(responseMsg);
        console.log("Lang response sent successfully!");
      } else {
        console.log("Invalid lang argument, sending usage message...");
        const usageMsg = ctx.userLang === "am" 
          ? "አጠቃቀም: /lang en ወይም /lang am"
          : "Usage: /lang en or /lang am";
        await ctx.reply(usageMsg);
        console.log("Usage message sent successfully!");
      }
    } catch (error) {
      console.error("Error in lang handler:", error);
      try {
        await ctx.reply("Sorry, something went wrong. Please try again.");
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  });
}
