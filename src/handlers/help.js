import { escapeMarkdownV2 } from "../utils/i18n.js";

export default function helpHandler(bot) {
  bot.command("help", async (ctx) => {
    try {
      const lang = ctx.userLang;

      const helpText =
        lang === "en"
          ? `🤖 **BirrPay Bot Commands:**

📋 **Main Commands:**
/start \\- Start the bot and see main menu
/help \\- Show this help message
/faq \\- Frequently asked questions
/lang en \\- Switch to English
/lang am \\- Switch to Amharic

📱 **Subscription Commands:**
/my\\_subscriptions \\- View your active subscriptions
/cancel\\_subscription \\- Cancel a subscription

💬 **Support:**
Send any message for support \\(admin will review\\)

🔧 **Admin Commands** \\(Admin only\\):
/admin\\_pending \\- View pending subscriptions
/admin\\_support \\- View support messages
/admin\\_active \\- View active subscriptions
/admin\\_help \\- Admin help`
          : `🤖 **የ BirrPay Bot ትዕዛዞች:**

📋 **ዋና ትዕዛዞች:**
/start \\- ቦቱን ጀምር እና ዋና ምናሌ ይመልከቱ
/help \\- ይህን የእርዳታ መልእክት ያሳዩ
/faq \\- በተደጋጋሚ የሚጠየቁ ጥያቄዎች
/lang en \\- ወደ እንግሊዝኛ ቀይር
/lang am \\- ወደ አማርኛ ቀይር

📱 **የመዋቅር ትዕዛዞች:**
/my\\_subscriptions \\- አካት መዋቅሮችዎን ይመልከቱ
/cancel\\_subscription \\- መዋቅር ይሰረዙ

💬 **ድጋፍ:**
ለድጋፍ ማንኛውንም መልእክት ይላኩ \\(አስተዳዳሪ ያገኝ\\)

🔧 **የአስተዳዳሪ ትዕዛዞች** \\(አስተዳዳሪ ብቻ\\):
/admin\\_pending \\- የሚጠበቁ መዋቅሮችን ይመልከቱ
/admin\\_support \\- የድጋፍ መልእክቶችን ይመልከቱ
/admin\\_active \\- አካት መዋቅሮችን ይመልከቱ
/admin\\_help \\- የአስተዳዳሪ እርዳታ`;

      await ctx.reply(helpText, { parse_mode: "MarkdownV2" });
    } catch (error) {
      console.error("Error in help handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
}
