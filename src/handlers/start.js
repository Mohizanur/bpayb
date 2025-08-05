import { escapeMarkdownV2 } from "../utils/i18n.js";

export default function startHandler(bot) {
  bot.start(async (ctx) => {
    try {
      const lang = ctx.userLang;
      const title = ctx.i18n.hero_title[lang];
      const subtitle = ctx.i18n.hero_subtitle[lang];

      await ctx.reply(title + "\n\n" + subtitle, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "en" ? "Manage Plans" : "የአገልግሎት እቅዶች",
                callback_data: "manage_plans",
              },
            ],
            [
              {
                text: lang === "en" ? "Support" : "ድጋፍ",
                callback_data: "support",
              },
            ],
          ],
        },
      });
    } catch (error) {
      console.error("Error in start handler:", error);
      await ctx.reply("Welcome! Please try again.");
    }
  });

  bot.action("manage_plans", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const services = ctx.services;
      const keyboard = services.map((s) => [
        {
          text: `${s.name} - ${s.price} Birr/${s.billingCycle}`,
          callback_data: `subscribe_${s.serviceID}`,
        },
      ]);
      const message = lang === "en" ? "Available Services:" : "የሚገኙ አገልግሎቶች:";
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in manage_plans action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  bot.action("support", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const supportText =
        lang === "en"
          ? `💬 Support Information:

📧 Contact: support@admin.birr‑pay

📱 How to get help:
• Send any message to this bot
• Admin will review and respond
• You'll get a confirmation when message is received

🔧 Other commands:
/help - Show all commands
/faq - Frequently asked questions
/lang en - Switch to English
/lang am - Switch to Amharic`
          : `💬 የድጋፍ መረጃ:

📧 አድራሻ: support@admin.birr‑pay

📱 እርዳታ እንዴት እንደሚያገኙ:
• ለዚህ ቦት ማንኛውንም መልእክት ይላኩ
• አስተዳዳሪ ያገኝ እና ይመልሳል
• መልእክቱ እንደተቀበለ ማረጋገጫ ያገኛሉ

🔧 ሌሎች ትዕዛዞች:
/help - ሁሉንም ትዕዛዞች ያሳዩ
/faq - በተደጋጋሚ የሚጠየቁ ጥያቄዎች
/lang en - ወደ እንግሊዝኛ ቀይር
/lang am - ወደ አማርኛ ቀይር`;

      await ctx.editMessageText(supportText);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in support action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
}
