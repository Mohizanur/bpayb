import { firestore } from "../utils/firestore.js";

export default function mySubscriptionsHandler(bot) {
  // Handle both /my_subscriptions and /mysubs commands
  const handleMySubscriptions = async (ctx) => {
    try {
      const lang = ctx.userLang;
      const userID = ctx.from.id;
      
      const subsSnap = await firestore
        .collection("subscriptions")
        .where("telegramUserID", "==", userID)
        .where("status", "==", "active")
        .get();
        
      if (subsSnap.empty) {
        const noSubsMsg = ctx.i18n.no_active_subs[lang];
        await ctx.reply(noSubsMsg);
        return;
      }
      
      const services = ctx.services;
      const title = ctx.i18n.active_subs_title[lang];
      let msg = `${title}\n\n`;
      const keyboard = [];
      
      subsSnap.forEach((doc) => {
        const sub = doc.data();
        const service = services.find((s) => s.serviceID === sub.serviceID);
        const serviceName = service ? service.name : sub.serviceID;
        const nextBilling = sub.nextBillingDate || "N/A";
        const price = service ? service.price : "N/A";
        
        msg += `📱 ${serviceName}\n`;
        msg += `💰 ${price} Birr/month\n`;
        msg += `📅 Next billing: ${nextBilling}\n\n`;
        
        // Add cancel button for each subscription
        keyboard.push([{
          text: `❌ Cancel ${serviceName}`,
          callback_data: `cancel_sub_${doc.id}`
        }]);
      });
      
      msg += ctx.i18n.cancel_tip[lang];
      
      await ctx.reply(msg, {
        reply_markup: { inline_keyboard: keyboard }
      });
      
    } catch (error) {
      console.error("Error in mySubscriptions handler:", error);
      const errorMsg = ctx.i18n?.error_generic?.[ctx.userLang] || "Sorry, something went wrong. Please try again.";
      await ctx.reply(errorMsg);
    }
  };
  
  bot.command("my_subscriptions", handleMySubscriptions);
  bot.command("mysubs", handleMySubscriptions);
  
  // Handle cancel subscription confirmation
  bot.action(/cancel_sub_(.+)/, async (ctx) => {
    try {
      const subId = ctx.match[1];
      const lang = ctx.userLang;
      
      const confirmMsg = ctx.i18n.cancel_confirm[lang];
      const yesText = ctx.i18n.yes[lang];
      const noText = ctx.i18n.no[lang];
      
      await ctx.editMessageText(confirmMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: yesText, callback_data: `confirm_cancel_${subId}` }],
            [{ text: noText, callback_data: "cancel_cancel" }]
          ]
        }
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in cancel_sub action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
  
  // Handle confirmed cancellation
  bot.action(/confirm_cancel_(.+)/, async (ctx) => {
    try {
      const subId = ctx.match[1];
      const lang = ctx.userLang;
      
      // Update subscription status to cancelled
      await firestore.collection("subscriptions").doc(subId).update({
        status: "cancelled",
        cancelledAt: new Date(),
        cancelledBy: ctx.from.id
      });
      
      const successMsg = ctx.i18n.cancel_success[lang];
      await ctx.editMessageText(successMsg);
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error("Error in confirm_cancel action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
  
  // Handle cancel cancellation (user changed mind)
  bot.action("cancel_cancel", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const backMsg = lang === "en" ? "Cancellation aborted." : "ሰረዝ ተቋርጧል።";
      
      await ctx.editMessageText(backMsg);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in cancel_cancel action:", error);
      await ctx.answerCbQuery();
    }
  });
}
