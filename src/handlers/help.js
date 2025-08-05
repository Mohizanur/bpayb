export default function helpHandler(bot) {
  bot.command("help", async (ctx) => {
    const lang = ctx.userLang;

    const helpText =
      lang === "en"
        ? `🤖 **BirrPay Bot Commands:**

📋 **Main Commands:**
/start - Start the bot and see main menu
/help - Show this help message
/faq - Frequently asked questions
/lang en - Switch to English
/lang am - Switch to Amharic

📱 **Subscription Commands:**
/my_subscriptions - View your active subscriptions
/cancel_subscription - Cancel a subscription

💬 **Support:**
Send any message for support (admin will review)

🔧 **Admin Commands** (Admin only):
/admin_pending - View pending subscriptions
/admin_support - View support messages
/admin_active - View active subscriptions
/admin_help - Admin help`
        : `🤖 **የ BirrPay Bot ትዕዛዞች:**

📋 **ዋና ትዕዛዞች:**
/start - ቦቱን ጀምር እና ዋና ምናሌ ይመልከቱ
/help - ይህን የእርዳታ መልእክት ያሳዩ
/faq - በተደጋጋሚ የሚጠየቁ ጥያቄዎች
/lang en - ወደ እንግሊዝኛ ቀይር
/lang am - ወደ አማርኛ ቀይር

📱 **የመዋቅር ትዕዛዞች:**
/my_subscriptions - አካት መዋቅሮችዎን ይመልከቱ
/cancel_subscription - መዋቅር ይሰረዙ

💬 **ድጋፍ:**
ለድጋፍ ማንኛውንም መልእክት ይላኩ (አስተዳዳሪ ያገኝ)

🔧 **የአስተዳዳሪ ትዕዛዞች** (አስተዳዳሪ ብቻ):
/admin_pending - የሚጠበቁ መዋቅሮችን ይመልከቱ
/admin_support - የድጋፍ መልእክቶችን ይመልከቱ
/admin_active - አካት መዋቅሮችን ይመልከቱ
/admin_help - የአስተዳዳሪ እርዳታ`;

    await ctx.reply(helpText, { parse_mode: "MarkdownV2" });
  });
}
