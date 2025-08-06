import { firestore } from "../utils/firestore.js";

export default function mySubscriptionsHandler(bot) {
  bot.action('my_subs', async (ctx) => {
    try {
      const userID = ctx.from.id;
      const lang = ctx.userLang || 'en';

      // Get active subscriptions
      const activeSubsSnapshot = await firestore
        .collection('subscriptions')
        .where('telegramUserID', '==', userID)
        .where('status', '==', 'active')
        .get();

      // Get pending subscription requests
      const pendingSubsSnapshot = await firestore
        .collection('subscription_requests')
        .where('telegramUserID', '==', userID)
        .where('status', 'in', ['payment_pending', 'pending_admin_approval'])
        .get();

      let message = lang === 'am' 
        ? '📋 **የእኔ መዋቅሮች**\n\n'
        : '📋 **My Subscriptions**\n\n';

      const keyboard = [];

      // Show active subscriptions
      if (!activeSubsSnapshot.empty) {
        message += lang === 'am' 
          ? '✅ **ንቁ መዋቅሮች:**\n'
          : '✅ **Active Subscriptions:**\n';

        activeSubsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const endDate = new Date(data.endDate).toLocaleDateString();
          
          message += lang === 'am'
            ? `• ${data.serviceName}\n  📅 ያበቃ: ${endDate}\n  💰 ዋጋ: ${data.price} ብር\n\n`
            : `• ${data.serviceName}\n  📅 Expires: ${endDate}\n  💰 Price: ${data.price} ETB\n\n`;

          keyboard.push([{
            text: lang === 'am' ? `🔄 ${data.serviceName} አድስ` : `🔄 Renew ${data.serviceName}`,
            callback_data: `renew_${data.serviceID}`
          }]);
        });
      }

      // Show pending requests
      if (!pendingSubsSnapshot.empty) {
        message += lang === 'am' 
          ? '⏳ **በመጠባበቅ ላይ:**\n'
          : '⏳ **Pending Requests:**\n';

        pendingSubsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          const requestDate = new Date(data.requestedAt).toLocaleDateString();
          
          const statusText = data.status === 'payment_pending' 
            ? (lang === 'am' ? 'ክፍያ በመጠባበቅ ላይ' : 'Awaiting Payment')
            : (lang === 'am' ? 'የአስተዳዳሪ ማጽደቃ በመጠባበቅ ላይ' : 'Awaiting Admin Approval');

          const statusIcon = data.status === 'payment_pending' ? '💰' : '👨‍💼';

          message += lang === 'am'
            ? `• ${data.serviceName}\n  ${statusIcon} ሁኔታ: ${statusText}\n  📅 ተጠየቀ: ${requestDate}\n  💰 ዋጋ: ${data.price} ብር\n\n`
            : `• ${data.serviceName}\n  ${statusIcon} Status: ${statusText}\n  📅 Requested: ${requestDate}\n  💰 Price: ${data.price} ETB\n\n`;

          if (data.status === 'payment_pending') {
            keyboard.push([{
              text: lang === 'am' ? `📸 ${data.serviceName} ክፍያ ላክ` : `📸 Upload Payment for ${data.serviceName}`,
              callback_data: `upload_payment_${doc.id}`
            }]);
          }
        });
      }

      // If no subscriptions
      if (activeSubsSnapshot.empty && pendingSubsSnapshot.empty) {
        message += lang === 'am' 
          ? '📭 **እሁን ምንም መዋቅር የለዎትም።**\n\nአዲስ መዋቅር ለመጀመር ከታች ያለውን ይጫኑ።'
          : '📭 **You have no subscriptions yet.**\n\nClick below to start a new subscription.';

        keyboard.push([{
          text: lang === 'am' ? '🛒 አዲስ መዋቅር ይጀምሩ' : '🛒 Start New Subscription',
          callback_data: 'start'
        }]);
      } else {
        // Add option to subscribe to new service
        keyboard.push([{
          text: lang === 'am' ? '➕ አዲስ መዋቅር አክል' : '➕ Add New Subscription',
          callback_data: 'start'
        }]);
      }

      // Add support and main menu options
      keyboard.push([{
        text: lang === 'am' ? '💬 ድጋፍ' : '💬 Support',
        callback_data: 'support'
      }]);

      keyboard.push([{
        text: lang === 'am' ? '🏠 ዋና ምናሌ' : '🏠 Main Menu',
        callback_data: 'start'
      }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: keyboard
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error in mySubscriptions handler:', error);
      const errorMsg = ctx.userLang === 'am' 
        ? '❌ መዋቅሮችዎን ሲሰራዙ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error loading your subscriptions. Please try again.';
      await ctx.answerCbQuery(errorMsg);
    }
  });

  // Handle renewal requests
  bot.action(/^renew_(.+)$/, async (ctx) => {
    try {
      const serviceID = ctx.match[1];
      const userID = ctx.from.id;
      const lang = ctx.userLang || 'en';

      // Get service details
      const services = ctx.services || [];
      const service = services.find(s => s.serviceID === serviceID);

      if (!service) {
        const errorMsg = lang === 'am' 
          ? '❌ አገልግሎቱ አልተገኘም'
          : '❌ Service not found';
        return await ctx.answerCbQuery(errorMsg);
      }

      // Create renewal request (same as new subscription)
      const renewalRequest = {
        id: `renewal_${Date.now()}_${userID}`,
        telegramUserID: userID,
        serviceID: service.serviceID,
        serviceName: service.name,
        price: service.price,
        userLanguage: lang,
        status: 'payment_pending',
        requestedAt: new Date().toISOString(),
        paymentScreenshot: null,
        isRenewal: true,
        adminNotes: ''
      };

      // Save to database
      await firestore.collection('subscription_requests').doc(renewalRequest.id).set(renewalRequest);

      // Show payment instructions
      const paymentInstructions = lang === 'am' ? `
💰 **የእድሳት ክፍያ መመሪያዎች**

አገልግሎት: ${service.name}
ዋጋ: ${service.price} ብር/ወር

**የክፍያ መንገዶች:**

🏦 **ባንክ ካርድ:**
• CBE ባንክ: 1000123456789
• ዳሽን ባንክ: 2000987654321

📱 **ሞባይል ባንኪንግ:**
• ቴሌ ብር: 0912345678
• CBE ብር: 0987654321

📸 **የክፍያ ማረጋገጫ ስክሪን ሾት ላክ**
      ` : `
💰 **Renewal Payment Instructions**

Service: ${service.name}
Price: ${service.price} ETB/month

**Payment Methods:**

🏦 **Bank Transfer:**
• CBE Bank: 1000123456789
• Dashen Bank: 2000987654321

📱 **Mobile Banking:**
• TeleBirr: 0912345678
• CBE Birr: 0987654321

📸 **Send Payment Screenshot**
      `;

      await ctx.editMessageText(paymentInstructions, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'am' ? '📸 ስክሪን ሾት ላክ' : '📸 Upload Screenshot',
              callback_data: `upload_payment_${renewalRequest.id}`
            }
          ], [
            {
              text: lang === 'am' ? '🔙 ወደ መዋቅሮች ተመለስ' : '🔙 Back to Subscriptions',
              callback_data: 'my_subs'
            }
          ]]
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error in renewal handler:', error);
      await ctx.answerCbQuery('Error processing renewal request');
    }
  });

  // Handle check subscription status
  bot.action(/^check_status_(.+)$/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';

      const subDoc = await firestore.collection('subscription_requests').doc(subscriptionId).get();
      
      if (!subDoc.exists) {
        const errorMsg = lang === 'am' 
          ? '❌ መዋቅር አልተገኘም'
          : '❌ Subscription request not found';
        return await ctx.answerCbQuery(errorMsg);
      }

      const subData = subDoc.data();
      const requestDate = new Date(subData.requestedAt).toLocaleDateString();

      let statusMessage = lang === 'am' 
        ? `📋 **የመዋቅር ሁኔታ**\n\n🎯 አገልግሎት: ${subData.serviceName}\n📅 ተጠየቀ: ${requestDate}\n💰 ዋጋ: ${subData.price} ብር\n\n`
        : `📋 **Subscription Status**\n\n🎯 Service: ${subData.serviceName}\n📅 Requested: ${requestDate}\n💰 Price: ${subData.price} ETB\n\n`;

      switch (subData.status) {
        case 'payment_pending':
          statusMessage += lang === 'am' 
            ? '⏳ **ሁኔታ:** ክፍያ በመጠባበቅ ላይ\n\nእባክዎ ክፍያዎን ካጠናቀቁ በኋላ የክፍያ ማረጋገጫ ስክሪን ሾት ላኩ።'
            : '⏳ **Status:** Awaiting Payment\n\nPlease upload your payment screenshot after completing the payment.';
          break;
        case 'pending_admin_approval':
          statusMessage += lang === 'am' 
            ? '👨‍💼 **ሁኔታ:** የአስተዳዳሪ ማጽደቃ በመጠባበቅ ላይ\n\nክፍያዎ ተቀብለ የአስተዳዳሪ ማጽደቃ በመጠባበቅ ላይ ነው። ብዙውን ጊዜ 24 ሰዓት ይወስዳል።'
            : '👨‍💼 **Status:** Awaiting Admin Approval\n\nYour payment has been received and is awaiting admin approval. This usually takes up to 24 hours.';
          break;
        case 'approved':
          statusMessage += lang === 'am' 
            ? '✅ **ሁኔታ:** ተፈቅዷል\n\nመዋቅርዎ ተቀባይነት አግኝቶ ንቁ ነው!'
            : '✅ **Status:** Approved\n\nYour subscription has been approved and is now active!';
          break;
        case 'rejected':
          statusMessage += lang === 'am' 
            ? '❌ **ሁኔታ:** ተቃወመ\n\nመዋቅርዎ ተቃውሟል። እባክዎ ድጋፍን ያግኙ።'
            : '❌ **Status:** Rejected\n\nYour subscription request was rejected. Please contact support.';
          break;
      }

      await ctx.editMessageText(statusMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'am' ? '🔄 ሁኔታ ያድሱ' : '🔄 Refresh Status',
              callback_data: `check_status_${subscriptionId}`
            }
          ], [
            {
              text: lang === 'am' ? '🔙 ወደ መዋቅሮች ተመለስ' : '🔙 Back to Subscriptions',
              callback_data: 'my_subs'
            }
          ]]
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error checking subscription status:', error);
      await ctx.answerCbQuery('Error checking status');
    }
  });
}
