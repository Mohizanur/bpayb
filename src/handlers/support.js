import { firestore } from "../utils/firestore.js";

export default function supportHandler(bot) {
  // Handle /support command
  bot.command("support", async (ctx) => {
    try {
      // Get user's language preference from database
      let lang = 'en';
      try {
        const { firestore } = await import('../utils/firestore.js');
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
      } catch (error) {
        console.log('Could not get user language, using default:', error.message);
        lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
      }
      
      const supportText = lang === "en"
        ? `💬 **BirrPay Support**\n\nWe're here to help! You can:\n\n📧 **Contact us directly:**\nsupport@admin.birr‑pay\n\n💬 **Send a message:**\nJust type your question or issue and send it. Our admin will review and respond.\n\n⚡ **Quick Help:**\n• /help - View all commands\n• /faq - Common questions\n• /mysubs - View subscriptions\n\n🕐 **Response time:** Usually within 24 hours`
        : `💬 **BirrPay ድጋፍ**\n\nእርዳታ ለመስጠት እዚህ ነን! ይችላሉ:\n\n📧 **በቀጥታ ያግኙን:**\nsupport@admin.birr‑pay\n\n💬 **መልእክት ይላኩ:**\nጥያቄዎን ወይም ችግሮን ብቻ ይተይቡ እና ይላኩ። አስተዳዳሪያችን ያገኝ እና ይመልሳል።\n\n⚡ **ፈጣን እርዳታ:**\n• /help - ሁሉንም ትዕዛዞች ይመልከቱ\n• /faq - የተለመዱ ጥያቄዎች\n• /mysubs - መዋቅሮችን ይመልከቱ\n\n🕐 **የምላሽ ጊዜ:** አብዛኛውን ጊዜ በ24 ሰዓት ውስጥ`;
      
      await ctx.reply(supportText, { parse_mode: "Markdown" });
    } catch (error) {
      console.error("Error in support command:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
  
  // Handle text messages for support (but only if not a command and not in service creation flow)
  bot.on("text", async (ctx) => {
    try {
      console.log('🔍 Support handler called for user:', ctx.from?.id);
      console.log('🔍 Message text:', ctx.message.text);
      
      // Skip if it's a command
      if (ctx.message.text.startsWith("/")) {
        console.log('🔍 Skipping command message');
        return;
      }

      // Skip if user is in service creation, editing, or custom plan flow
      const userId = ctx.from?.id;
      console.log('🔍 Checking states for user:', userId);
      console.log('🔍 serviceCreationState:', global.serviceCreationState?.[userId]);
      console.log('🔍 serviceEditState:', global.serviceEditState?.[userId]);
      console.log('🔍 userStates:', global.userStates?.[userId]);
      
      if (userId && (
        (global.serviceCreationState && global.serviceCreationState[userId]) ||
        (global.serviceEditState && global.serviceEditState[userId]) ||
        (global.userStates && global.userStates[userId]?.state === 'awaiting_custom_plan_details')
      )) {
        console.log('🔍 User is in service/custom plan flow, skipping support handler');
        return; // Let service creation/editing/custom plan handler process this
      }
      
      console.log('🔍 Processing as support message');

      // Get user's language preference from database
      let lang = 'en';
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
      } catch (error) {
        console.log('Could not get user language, using default:', error.message);
        lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
      }
      const userInfo = {
        id: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name,
        username: ctx.from.username
      };

      // Save to supportMessages with more details
      const supportDoc = await firestore.collection("supportMessages").add({
        telegramUserID: ctx.from.id,
        userInfo: userInfo,
        messageText: ctx.message.text,
        timestamp: new Date(),
        handled: false,
        language: lang
      });
      
      // Send confirmation to user
      const confirmationMsg = lang === 'am' 
        ? '✅ የድጋፍ መልእክትዎ ተቀብሏል! በቅርቡ እንመልሳለን።'
        : '✅ Your support message has been received! We will respond soon.';
      await ctx.reply(confirmationMsg);
      
      // Notify admin if available
      try {
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (adminId) {
          const adminNotification = `🔔 **New Support Message**\n\n👤 **From:** ${userInfo.firstName} ${userInfo.lastName || ''}${userInfo.username ? ` (@${userInfo.username})` : ''}\n🆔 **User ID:** ${userInfo.id}\n🌐 **Language:** ${lang.toUpperCase()}\n\n💬 **Message:**\n${ctx.message.text}\n\n📋 **Message ID:** ${supportDoc.id}`;
          
          await bot.telegram.sendMessage(adminId, adminNotification, {
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Mark as Handled", callback_data: `admin_handled_${supportDoc.id}` }]
              ]
            }
          });
        }
      } catch (adminError) {
        console.log("Could not notify admin:", adminError.message);
      }
      
    } catch (error) {
      console.error("Error in support handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
    }
  });
}
