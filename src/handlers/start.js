export default function startHandler(bot) {
  bot.start(async (ctx) => {
    const lang = ctx.userLang;
    await ctx.reply(
      ctx.i18n.hero_title[lang] + "\n" + ctx.i18n.hero_subtitle[lang],
      {
        parse_mode: "MarkdownV2",
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
      }
    );
  });

  bot.action("manage_plans", async (ctx) => {
    const lang = ctx.userLang;
    const services = ctx.services;
    const keyboard = services.map((s) => [
      {
        text: `${s.name} - ${s.price} Birr/${s.billingCycle}`,
        callback_data: `subscribe_${s.serviceID}`,
      },
    ]);
    await ctx.editMessageText(
      lang === "en" ? "Available Services:" : "የሚገኙ አገልግሎቶች:",
      { reply_markup: { inline_keyboard: keyboard }, parse_mode: "MarkdownV2" }
    );
    await ctx.answerCbQuery();
  });

  bot.action("support", async (ctx) => {
    const lang = ctx.userLang;
    const supportText =
      lang === "en"
        ? `💬 **Support Information:**

📧 **Contact:** support@admin.birr‑pay

📱 **How to get help:**
• Send any message to this bot
• Admin will review and respond
• You'll get a confirmation when message is received

🔧 **Other commands:**
/help - Show all commands
/faq - Frequently asked questions
/lang en - Switch to English
/lang am - Switch to Amharic`
        : `💬 **የድጋፍ መረጃ:**

📧 **አድራሻ:** support@admin.birr‑pay

📱 **እርዳታ እንዴት እንደሚያገኙ:**
• ለዚህ ቦት ማንኛውንም መልእክት ይላኩ
• አስተዳዳሪ ያገኝ እና ይመልሳል
• መልእክቱ እንደተቀበለ ማረጋገጫ ያገኛሉ

🔧 **ሌሎች ትዕዛዞች:**
/help - ሁሉንም ትዕዛዞች ያሳዩ
/faq - በተደጋጋሚ የሚጠየቁ ጥያቄዎች
/lang en - ወደ እንግሊዝኛ ቀይር
/lang am - ወደ አማርኛ ቀይር`;

    await ctx.editMessageText(supportText, { parse_mode: "MarkdownV2" });
    await ctx.answerCbQuery();
  });
}
