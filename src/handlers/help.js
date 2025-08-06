import { escapeMarkdownV2 } from "../utils/i18n.js";
import { firestore } from "../utils/firestore.js";

export default function helpHandler(bot) {
  console.log("🔧 Registering enhanced help command handler");
  
  bot.command("help", async (ctx) => {
    try {
      console.log("🚀 HELP COMMAND TRIGGERED!");
      console.log("User ID:", ctx.from?.id);
      console.log("User language:", ctx.userLang);
      
      const lang = ctx.from.language_code === 'am' ? 'am' : 'en';
      
      const helpMessage = lang === "am" 
        ? `🔧 **BirrPay እርዳታ ማእከል**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **ተጠቃሚ ትዕዛዞች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 ዋና ትዕዛዞች:**
• \`/start\` - ዋና ምንዩ እና አገልግሎቶች
• \`/help\` - ይህ እርዳታ መልእክት
• \`/mysubs\` - የእርስዎ ምዝገባዎች ይመልከቱ

**ℹ️ መረጃ እና ድጋፍ:**
• \`/faq\` - በተደጋጋሚ የሚጠየቁ ጥያቄዎች
• \`/support\` - የደንበኞች ድጋፍ ያግኙ
• \`/lang\` - የቋንቋ ቅንብሮች ይቀይሩ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 **ፈጣን እርምጃዎች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 አዲስ ምዝገባ ለመጀመር: \`/start\` ን ተጠቅመው
📊 ምዝገባዎችዎን ለማስተዳደር: \`/mysubs\` ን ተጠቅመው
💬 ድጋፍ ለማግኘት: \`/support\` ን ተጠቅመው

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **ጠቃሚ ምክሮች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• ሁሉንም መልእክቶች በአማርኛ ወይም እንግሊዝኛ ይላኩ
• የክፍያ ፎቶ ግልጽ እና የሚነበብ መሆን አለበት
• የደንበኞች ድጋፍ 24/7 ዝግጁ ነው

**🆘 እርዳታ ያስፈልግዎታል?** \`/support\` ን ይጠቀሙ!`
        : `🔧 **BirrPay Help Center**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **User Commands**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎯 Main Commands:**
• \`/start\` - Main menu and services
• \`/help\` - Show this help message
• \`/mysubs\` - View your subscriptions

**ℹ️ Information & Support:**
• \`/faq\` - Frequently asked questions
• \`/support\` - Contact customer support
• \`/lang\` - Change language settings

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 **Quick Actions**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 To start a new subscription: Use \`/start\`
📊 To manage subscriptions: Use \`/mysubs\`
💬 To get support: Use \`/support\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **Helpful Tips**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Send all messages in Amharic or English
• Payment screenshots must be clear and readable
• Customer support is available 24/7

**🆘 Need Help?** Use \`/support\`!`;

      const helpKeyboard = [
        [
          { 
            text: lang === "am" ? "❓ FAQ ይመልከቱ" : "❓ View FAQ", 
            callback_data: "faq_menu" 
          },
          { 
            text: lang === "am" ? "🛠️ ድጋፍ አግኙ" : "🛠️ Get Support", 
            callback_data: "support_menu" 
          }
        ],
        [
          { 
            text: lang === "am" ? "📖 እንዴት እንደሚሰራ" : "📖 How It Works", 
            callback_data: "how_to_use" 
          }
        ],
        [
          { 
            text: lang === "am" ? "🏠 ዋና ምንዩ" : "🏠 Main Menu", 
            callback_data: "back_to_start" 
          }
        ]
      ];

      await ctx.reply(helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: helpKeyboard }
      });

      // Log help usage
      await firestore.collection('userActivities').add({
        userId: ctx.from.id,
        activity: 'help_accessed',
        timestamp: new Date(),
        metadata: { command: 'help', language: lang }
      });

      console.log("✅ Enhanced help response sent successfully!");
    } catch (error) {
      console.error("⚠️ Error in help command:", error);
      try {
        const errorMsg = ctx.from.language_code === 'am'
          ? "ይቅርታ፣ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
          : "Sorry, something went wrong. Please try again.";
        await ctx.reply(errorMsg);
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  });

  // Enhanced mysubs command
  bot.command("mysubs", async (ctx) => {
    try {
      const lang = ctx.from.language_code === 'am' ? 'am' : 'en';
      
      // Quick access to subscriptions
      const quickMessage = lang === "am"
        ? "📊 **የእርስዎ ምዝገባዎች**\n\nምዝገባዎችዎን ለመመልከት ከታች ያለውን ይጫኑ:"
        : "📊 **Your Subscriptions**\n\nClick below to view your subscriptions:";

      const keyboard = [
        [
          { 
            text: lang === "am" ? "📋 ምዝገባዎች ይመልከቱ" : "📋 View Subscriptions", 
            callback_data: "my_subs" 
          }
        ],
        [
          { 
            text: lang === "am" ? "📱 አዲስ ምዝገባ" : "📱 New Subscription", 
            callback_data: "services" 
          }
        ]
      ];

      await ctx.reply(quickMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

      // Log activity
      await firestore.collection('userActivities').add({
        userId: ctx.from.id,
        activity: 'mysubs_accessed',
        timestamp: new Date(),
        metadata: { command: 'mysubs', language: lang }
      });

    } catch (error) {
      console.error("Error in mysubs command:", error);
      await ctx.reply(
        ctx.from.language_code === 'am'
          ? "ይቅርታ፣ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
          : "Sorry, something went wrong. Please try again."
      );
    }
  });

  // Enhanced lang command
  bot.command("lang", async (ctx) => {
    try {
      const currentLang = ctx.from.language_code === 'am' ? 'am' : 'en';
      
      const langMessage = currentLang === "am"
        ? "🌐 **ቋንቋ ቅንብሮች**\n\nየቋንቋ ምርጫዎን ይምረጡ:"
        : "🌐 **Language Settings**\n\nSelect your language preference:";

      const keyboard = [
        [
          { text: "🇪🇹 አማርኛ (Amharic)", callback_data: "set_lang_am" },
          { text: "🇺🇸 English", callback_data: "set_lang_en" }
        ],
        [
          { 
            text: currentLang === "am" ? "🔙 ወደ ኋላ" : "🔙 Back", 
            callback_data: "back_to_start" 
          }
        ]
      ];

      await ctx.reply(langMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });

    } catch (error) {
      console.error("Error in lang command:", error);
      await ctx.reply("Error changing language settings.");
    }
  });

  // Language setting handlers
  bot.action("set_lang_am", async (ctx) => {
    try {
      await firestore.collection('users').doc(String(ctx.from.id)).update({
        language: 'am',
        updatedAt: new Date()
      });

      await ctx.editMessageText(
        "✅ **ቋንቋ ተቀይሯል**\n\nቋንቋዎ ወደ አማርኛ ተቀይሯል። ሁሉም መልእክቶች አሁን በአማርኛ ይላካሉ።",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: "🏠 ዋና ምንዩ", callback_data: "back_to_start" }
            ]]
          }
        }
      );

      await ctx.answerCbQuery("ቋንቋ ወደ አማርኛ ተቀይሯል");

    } catch (error) {
      console.error("Error setting Amharic language:", error);
      await ctx.answerCbQuery("Error changing language");
    }
  });

  bot.action("set_lang_en", async (ctx) => {
    try {
      await firestore.collection('users').doc(String(ctx.from.id)).update({
        language: 'en',
        updatedAt: new Date()
      });

      await ctx.editMessageText(
        "✅ **Language Changed**\n\nYour language has been changed to English. All messages will now be sent in English.",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: "🏠 Main Menu", callback_data: "back_to_start" }
            ]]
          }
        }
      );

      await ctx.answerCbQuery("Language changed to English");

    } catch (error) {
      console.error("Error setting English language:", error);
      await ctx.answerCbQuery("Error changing language");
    }
  });
}
