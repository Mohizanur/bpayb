import { firestore } from "../utils/firestore.js";

export default function subscribeHandler(bot) {
  bot.action(/subscribe_(.+)/, async (ctx) => {
    try {
      const serviceID = ctx.match[1];
      const userID = ctx.from.id;
      const lang = ctx.userLang;
      const services = ctx.services;
      const service = services.find(s => s.serviceID === serviceID);
      
      if (!service) {
        await ctx.answerCbQuery("Service not found.");
        return;
      }
      
      // Check if user already has an active or pending subscription for this service
      const existingSubSnap = await firestore
        .collection("subscriptions")
        .where("telegramUserID", "==", userID)
        .where("serviceID", "==", serviceID)
        .where("status", "in", ["active", "pending"])
        .get();
        
      if (!existingSubSnap.empty) {
        const statusMsg = lang === "en" 
          ? `You already have an ${existingSubSnap.docs[0].data().status} subscription for ${service.name}.`
          : `ለ${service.name} ቀድሞውኑ ${existingSubSnap.docs[0].data().status} መዋቅር አለዎት።`;
        await ctx.answerCbQuery(statusMsg);
        return;
      }
      
      // Create subscription request
      const subscriptionData = {
        telegramUserID: userID,
        serviceID,
        serviceName: service.name,
        price: service.price,
        billingCycle: service.billingCycle,
        requestedAt: new Date(),
        status: "pending",
        userLanguage: lang
      };
      
      await firestore.collection("subscriptions").add(subscriptionData);
      
      // Send detailed payment instructions
      const paymentMsg = ctx.i18n.payment_instructions[lang];
      
      await ctx.editMessageText(paymentMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "en" ? "📊 My Subscriptions" : "📊 የእንወ መዋቅሮች", callback_data: "my_subs" }],
            [{ text: lang === "en" ? "⬅️ Back to Services" : "⬅️ ወደ አገልግሎቶች ተመለስ", callback_data: "manage_plans" }]
          ]
        }
      });
      
      await ctx.answerCbQuery(
        lang === "en" 
          ? `✅ Subscription request submitted for ${service.name}!`
          : `✅ ለ${service.name} የመዋቅር ጥያቄ ተላክ!`
      );
      
    } catch (error) {
      console.error("Error in subscribe handler:", error);
      const errorMsg = ctx.i18n?.error_generic?.[ctx.userLang] || "Sorry, something went wrong.";
      await ctx.answerCbQuery(errorMsg);
    }
  });
}
