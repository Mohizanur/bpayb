import { escapeMarkdownV2 } from "../utils/i18n.js";
import { firestore } from "../utils/firestore.js";

export default function helpHandler(bot) {
  console.log("🔧 Registering enhanced help command handler");
  
  bot.command("help", async (ctx) => {
    try {
      console.log("🚀 HELP COMMAND TRIGGERED!");
      console.log("User ID:", ctx.from?.id);
      console.log("User language:", ctx.userLang);
      
      const lang = ctx.userLang || 'en';
      
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
        const errorMsg = ctx.userLang === 'am'
          ? "ይቅርታ፣ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
          : "Sorry, something went wrong. Please try again.";
        await ctx.reply(errorMsg);
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  });

  // Enhanced mysubs command - now directly shows full subscription interface
  bot.command("mysubs", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const lang = ctx.userLang || 'en';
      
      // Import the subscription handler functions
      const { getUserSubscriptions } = await import("../utils/database.js");
      
      // Get user's subscriptions
      const subscriptions = await getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        const message = lang === 'am'
          ? `📊 **የእኔ ምዝገባዎች**
          
እስካሁን ምንም ምዝገባዎች የሉዎትም። አዲስ ምዝገባ ለመጀመር እባክዎ አገልግሎቶችን ይምረጡ:`
          : `📊 **My Subscriptions**
          
You don't have any subscriptions yet. To start a new subscription, please select a service:`;
        
        const keyboard = [
          [{ text: lang === 'am' ? '📱 አገልግሎቶች ይምረጡ' : '📱 Select Services', callback_data: 'services' }],
          [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }]
        ];
        
        await ctx.reply(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        
        // Log activity
        await firestore.collection('userActivities').add({
          userId: ctx.from.id,
          activity: 'mysubs_accessed',
          timestamp: new Date(),
          metadata: { command: 'mysubs', language: lang, hasSubscriptions: false }
        });
        
        return;
      }
      
      // Group subscriptions by status
      const pendingSubs = subscriptions.filter(sub => sub.status === 'pending');
      const activeSubs = subscriptions.filter(sub => sub.status === 'active');
      const cancelledSubs = subscriptions.filter(sub => sub.status === 'cancelled');
      const rejectedSubs = subscriptions.filter(sub => sub.status === 'rejected');
      
      let message = lang === 'am'
        ? `📊 **የእኔ ምዝገባዎች**
        
**የሚጠበቁ:** ${pendingSubs.length}
**ንቁ:** ${activeSubs.length}
**የተሰረዙ:** ${cancelledSubs.length}
**የተቀበሉ:** ${rejectedSubs.length}

**የምዝገባዎችዎን ያሳዩ:**`
        : `📊 **My Subscriptions**
        
**Pending:** ${pendingSubs.length}
**Active:** ${activeSubs.length}
**Cancelled:** ${cancelledSubs.length}
**Rejected:** ${rejectedSubs.length}

**View your subscriptions:**`;
      
      const keyboard = [];
      
      // Add subscription buttons
      subscriptions.slice(0, 5).forEach(sub => {
        const statusEmoji = {
          'pending': '⏳',
          'active': '✅',
          'cancelled': '❌',
          'rejected': '🚫'
        };
        
        const statusText = {
          'pending': lang === 'am' ? 'የሚጠበቅ' : 'Pending',
          'active': lang === 'am' ? 'ንቁ' : 'Active',
          'cancelled': lang === 'am' ? 'የተሰረዘ' : 'Cancelled',
          'rejected': lang === 'am' ? 'የተቀበለ' : 'Rejected'
        };
        
        keyboard.push([
          {
            text: `${statusEmoji[sub.status]} ${sub.serviceName} - ${statusText[sub.status]}`,
            callback_data: `view_subscription_${sub.id}`
          }
        ]);
      });
      
      // Add action buttons
      keyboard.push([
        { text: lang === 'am' ? '📱 አዲስ ምዝገባ' : '📱 New Subscription', callback_data: 'services' },
        { text: lang === 'am' ? '🔄 እንደገና ጫን' : '🔄 Refresh', callback_data: 'my_subs' }
      ]);
      
      keyboard.push([
        { text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }
      ]);
      
      await ctx.reply(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });

      // Log activity
      await firestore.collection('userActivities').add({
        userId: ctx.from.id,
        activity: 'mysubs_accessed',
        timestamp: new Date(),
        metadata: { command: 'mysubs', language: lang, hasSubscriptions: true, subscriptionCount: subscriptions.length }
      });

    } catch (error) {
      console.error("Error in mysubs command:", error);
      await ctx.reply(
        ctx.userLang === 'am'
          ? "ይቅርታ፣ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
          : "Sorry, something went wrong. Please try again."
      );
    }
  });

  // Enhanced lang command
  bot.command("lang", async (ctx) => {
    try {
      const currentLang = ctx.userLang === 'am' ? 'am' : 'en';
      
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
      const userLang = await getUserLang(ctx);
      const i18n = await loadI18n();
      const errorMsg = i18n.error_generic?.[userLang] || "❌ Something went wrong. Please try again or contact support.";
      await ctx.reply(errorMsg);
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
