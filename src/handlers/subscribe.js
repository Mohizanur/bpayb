/**
 * Import admin from 'firebase-admin';
 */

import { firestore } from '../utils/firestore.js';

// Use shared Firestore instance (real or mock based on environment/config)

/**
 * Subscribe handler for the Telegram bot
 * @param {import('telegraf').Telegraf} bot - The Telegraf bot instance
 */
function setupSubscribeHandler(bot) {
  // Handle service selection with more flexible ID matching
  bot.action(/^select_service_([a-z0-9_-]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Show loading message
      await ctx.answerCbQuery();
      
      // Get the service details from the context or database
      let service;
      
      // First try to get from context
      if (ctx.services) {
        service = ctx.services.find(s => s.id === serviceId || s.serviceID === serviceId);
      }
      
      // If not found in context, try to fetch from Firestore
      if (!service) {
        try {
          const serviceDoc = await firestore.collection('services').doc(serviceId).get();
          if (serviceDoc.exists) {
            service = { id: serviceDoc.id, ...serviceDoc.data() };
          }
        } catch (error) {
          console.error('Error fetching service from Firestore:', error);
        }
      }
      
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      // Ensure plans array exists and has valid plans
      if (!service.plans || !Array.isArray(service.plans) || service.plans.length === 0) {
        // If no plans, create default plans
        service.plans = [
          { duration: 1, price: service.price || 100, billingCycle: 'monthly' },
          { duration: 3, price: Math.round((service.price || 100) * 2.7), billingCycle: 'quarterly' },
          { duration: 6, price: Math.round((service.price || 100) * 5), billingCycle: 'semi-annually' },
          { duration: 12, price: Math.round((service.price || 100) * 9), billingCycle: 'annually' }
        ];
      }
      
      // Show service details and subscription options
      const message = lang === 'am' 
        ? `✅ *${service.name}* የተመረጠ\n\n${service.description || ''}\n\nእባክዎ የምትፈልጉትን የደንበኝነት ምዝገባ ዓይነት ይምረጥ:`
        : `✅ *${service.name}* selected\n\n${service.description || ''}\n\nPlease choose your subscription duration:`;
      
      // Create inline keyboard with available plans
      const planButtons = service.plans.map(plan => ({
        text: lang === 'am' ? 
          `${plan.duration} ${plan.duration === 1 ? 'ወር' : plan.duration < 12 ? 'ወራት' : 'አመት'} - ${plan.price} ብር` : 
          `${plan.duration} ${plan.duration === 1 ? 'Month' : plan.duration < 12 ? 'Months' : 'Year'}${plan.duration >= 12 && plan.duration % 12 === 0 ? 's' : ''} - ${plan.price} ETB`,
        callback_data: `subscribe_${service.id || service.serviceID}_${plan.duration}m_${plan.price}`
      }));
      
      // Group buttons in rows of 2
      const keyboardRows = [];
      for (let i = 0; i < planButtons.length; i += 2) {
        keyboardRows.push(planButtons.slice(i, i + 2));
      }
      
      // Add custom plan button
      keyboardRows.push([
        { 
          text: lang === 'am' ? '🎯 ብጁ እቅድ ይጠይቁ' : '🎯 Request Custom Plan', 
          callback_data: `custom_plan_for_${service.id || service.serviceID}` 
        }
      ]);
      
      // Add back button
      keyboardRows.push([
        { 
          text: lang === 'am' ? '🔙 ወደ ኋላ' : '🔙 Back', 
          callback_data: 'back_to_services' 
        }
      ]);

      // Edit the message with service details and plans
      try {
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboardRows
          }
        });
      } catch (error) {
        console.error('Error editing message:', error);
        // If message editing fails, send a new message
        await ctx.reply(message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: keyboardRows
          }
        });
      }
      
    } catch (error) {
      console.error('Error in service selection:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle subscription with duration and price
  bot.action(/^subscribe_([a-z0-9_-]+)_(\d+m)_(\d+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2]; // e.g., '1m', '3m', '6m', '12m'
      const price = parseInt(ctx.match[3], 10);
      const lang = ctx.userLang || 'en';
      
      // Get the service details
      const service = ctx.services?.find(s => s.id === serviceId);
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      // Parse duration
      const months = parseInt(duration, 10);
      const durationText = lang === 'am' 
        ? `${months} ${months === 1 ? 'ወር' : 'ወራት'}`
        : `${months} ${months === 1 ? 'Month' : 'Months'}`;

      // Format price
      const formattedPrice = price.toLocaleString('en-US');
      
      // Show confirmation message
      const confirmMessage = lang === 'am'
        ? `✅ *${service.name} - ${durationText}*\n\n` +
          `ዋጋ: *${formattedPrice} ብር*\n\n` +
          `ይህን የደንበኝነት ምዝገባ መግዛት ይፈልጋሉ?`
        : `✅ *${service.name} - ${durationText}*\n\n` +
          `Price: *${formattedPrice} ETB*\n\n` +
          `Do you want to proceed with this subscription?`;

      await ctx.editMessageText(confirmMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? '✅ አዎ' : '✅ Yes', 
                callback_data: `confirm_sub_${serviceId}_${duration}_${price}` },
              { text: lang === 'am' ? '❌ አይ' : '❌ No', 
                callback_data: `back_to_services` }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in subscription selection:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle subscription confirmation
  bot.action(/^confirm_sub_([a-z0-9_-]+)_(\d+m)_(\d+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2];
      const price = parseInt(ctx.match[3], 10);
      const userId = String(ctx.from.id);
      const lang = ctx.userLang || 'en';
      
      // Get the service details
      const service = ctx.services?.find(s => s.id === serviceId);
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      const months = parseInt(duration, 10);
      const durationText = lang === 'am' 
        ? `${months} ${months === 1 ? 'ወር' : 'ወራት'}`
        : `${months} ${months === 1 ? 'Month' : 'Months'}`;
      
      // Find the matching plan
      const plan = service.plans?.find(p => p.duration === months);
      
      // Payment instructions
        // Get payment methods from Firestore
        let paymentMethods = [];
        try {
          const paymentMethodsDoc = await firestore.collection('config').doc('paymentMethods').get();
          if (paymentMethodsDoc.exists) {
            paymentMethods = paymentMethodsDoc.data().methods?.filter(method => method.active) || [];
          }
        } catch (error) {
          console.error('Error fetching payment methods:', error);
        }

        // Fallback to default payment methods if none configured
        if (paymentMethods.length === 0) {
          paymentMethods = [
            {
              id: 'telebirr',
              name: 'TeleBirr',
              nameAm: 'ቴሌብር',
              account: '0912345678',
              instructions: 'Send payment to TeleBirr account and upload screenshot',
              instructionsAm: 'ወደ ቴሌብር መለያ ክፍያ በመላክ ስክሪንሾት ይላኩ',
              icon: '📱'
            }
          ];
        }

        // Build payment methods list
        let paymentMethodsListEn = '';
        let paymentMethodsListAm = '';
        
        paymentMethods.forEach(method => {
          const icon = method.icon || '💳';
          paymentMethodsListEn += `${icon} *${method.name}*: ${method.account}\n`;
          paymentMethodsListAm += `${icon} *${method.nameAm || method.name}*: ${method.account}\n`;
        });

        const paymentMessage = lang === 'am'
        ? `💳 *የክፍያ መመሪያዎች*

አገልግሎት: ${service.name}
ቆይታ: ${plan?.billingCycle || `${months} ${months === 1 ? 'ወር' : 'ወራት'}`}
ጠቅላላ ዋጋ: *${price.toLocaleString()} ብር*

ክፍያ ለማድረግ ወደሚከተሉት አካውንቶች ገንዘብ ያስተላልፉ፡
${paymentMethodsListAm}
${paymentMethods.length > 0 ? (paymentMethods[0].instructionsAm || 'ክፍያ ካደረጉ በኋላ የክፍያ ማረጋገጫ ስክሪንሾት ወይም ሪሲት ይላኩ።') : 'ክፍያ ካደረጉ በኋላ የክፍያ ማረጋገጫ ስክሪንሾት ወይም ሪሲት ይላኩ።'}
አስተናጋጁ ክፍያዎን ከፀደቀ በኋላ አገልግሎቱ ይጀምራል።`
        : `💳 *Payment Instructions*

Service: ${service.name}
Duration: ${plan?.billingCycle || `${months} ${months === 1 ? 'Month' : 'Months'}`}
Total Amount: *${price.toLocaleString()} ETB*

Please make payment to any of the following accounts:
${paymentMethodsListEn}
${paymentMethods.length > 0 ? (paymentMethods[0].instructions || 'After payment, please send a screenshot or receipt as proof.') : 'After payment, please send a screenshot or receipt as proof.'}
Your service will start after admin approves your payment.`;

      // Save pending payment to database (without starting subscription yet)
      const paymentId = `pay_${Date.now()}_${userId}`;
      const paymentData = {
        userId,
        serviceId: service.id,
        serviceName: service.name,
        duration,
        durationName: durationText,
        price,
        amount: `ETB ${price}`, // Formatted amount for display
        status: 'pending',
        createdAt: new Date().toISOString(),
        paymentMethod: 'manual',
        paymentDetails: {}
      };

      // Save to Firestore
      await firestore.collection('pendingPayments').doc(paymentId).set(paymentData);

      // Send payment instructions
      await ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? '📤 የክፍያ ማስረጃ አስገባ' : '📤 Upload Payment Proof',
                callback_data: `upload_proof_${paymentId}` }
            ],
            [
              { text: lang === 'am' ? '🏠 ዋና ገጽ' : '🏠 Main Menu',
                callback_data: 'main_menu' }
            ]
          ]
        }
      });
      
      // Notify admin about new pending payment
      const adminMessage = `🆕 *New Pending Payment*\n\n` +
        `👤 User: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})\n` +
        `🆔 User ID: ${userId}\n` +
        `📱 Service: ${service.name}\n` +
        `⏳ Duration: ${months} ${months === 1 ? 'Month' : 'Months'}\n` +
        `💰 Amount: ${price.toLocaleString()} ETB\n\n` +
        `Payment ID: ${paymentId}`;

      await ctx.telegram.sendMessage(
        process.env.ADMIN_TELEGRAM_ID,
        adminMessage,
        { parse_mode: 'Markdown' }
      );
      
    } catch (error) {
      console.error('Error in payment instructions:', error);
      const lang = ctx.userLang || 'en';
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle payment proof upload
  bot.action(/^upload_proof_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Set user state to expect photo
      await firestore.collection('userStates').doc(String(ctx.from.id)).set({
        state: 'awaiting_payment_proof',
        paymentId,
        timestamp: new Date().toISOString()
      });
      
      const message = lang === 'am'
        ? `📤 *የክፍያ ማስረጃ ይላኩ*\n\n` +
          `እባክዎ የክፍያ ማስረጃዎን (ስክሪንሾት ወይም ሪሲት) ይላኩ።\n` +
          `ለማሰረዝ /cancel ይጫኑ።`
        : `📤 *Upload Payment Proof*\n\n` +
          `Please send a screenshot or photo of your payment receipt.\n` +
          `Click /cancel to cancel.`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      console.error('Error in upload proof handler:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle photo messages (payment proof)
  bot.on('photo', async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const userState = await firestore.collection('userStates').doc(userId).get();
      
      if (!userState.exists || userState.data().state !== 'awaiting_payment_proof') {
        return; // Not waiting for payment proof
      }
      
      const paymentId = userState.data().paymentId;
      const lang = ctx.userLang || 'en';
      
      // Get the highest resolution photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Get payment data to create subscription
      const paymentDoc = await firestore.collection('pendingPayments').doc(paymentId).get();
      const paymentData = paymentDoc.data();
      
      // Generate payment reference
      const paymentReference = `REF-${Date.now().toString().slice(-8)}-${userId.slice(-4)}`;
      
      // Update payment with proof
      await firestore.collection('pendingPayments').doc(paymentId).update({
        paymentProof: fileUrl,
        paymentReference: paymentReference,
        proofSubmittedAt: new Date().toISOString(),
        status: 'proof_submitted'
      });
      
      // Create pending subscription
      const subscriptionId = `sub_${Date.now()}_${userId}`;
      const months = parseInt(paymentData.duration, 10);
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      
      const subscriptionData = {
        userId,
        serviceId: paymentData.serviceId,
        serviceName: paymentData.serviceName,
        duration: paymentData.duration,
        durationName: paymentData.durationName || `${paymentData.duration} Month${paymentData.duration > 1 ? 's' : ''}`,
        amount: paymentData.price,
        price: paymentData.price, // Keep for backward compatibility
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: 'pending',
        paymentId,
        paymentReference: paymentId,
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await firestore.collection('subscriptions').doc(subscriptionId).set(subscriptionData);
      
      // Clear user state
      await firestore.collection('userStates').doc(userId).delete();
      
      // Notify user
      const userMessage = lang === 'am'
        ? `✅ *የክፍያ ማስረጃዎ ተቀብለናል!*\n\n` +
          `አስተናጋጁ ክፍያዎን እያረጋገጠ ነው። አገልግሎቱ ከተረጋገጠ በኋላ ወዲያው ይጀምራል።\n` +
          `ለማንኛውም ጥያቄ የድጋፍ ቡድናችንን ያነጋግሩ።`
        : `✅ *Payment Proof Received!*\n\n` +
          `We've received your payment proof and our team is reviewing it.\n` +
          `Your subscription will start as soon as we verify your payment.\n` +
          `Please contact support if you have any questions.`;
      
      await ctx.reply(userMessage, { parse_mode: 'Markdown' });
      
      // Notify admin with the proof (reuse existing paymentData)
      
      const adminMessage = `🆕 *Payment Proof Submitted*\n\n` +
        `👤 User: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})\n` +
        `🆔 User ID: ${userId}\n` +
        `📱 Service: ${paymentData.serviceName}\n` +
        `⏳ Duration: ${paymentData.duration}\n` +
        `💰 Amount: ${paymentData.price.toLocaleString()} ETB\n\n` +
        `Payment ID: ${paymentId}`;
      
      await ctx.telegram.sendPhoto(
        process.env.ADMIN_TELEGRAM_ID,
        { url: fileUrl },
        {
          caption: adminMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve', callback_data: `approve_payment_${paymentId}` },
                { text: '❌ Reject', callback_data: `reject_payment_${paymentId}` }
              ]
            ]
          }
        }
      );
      
    } catch (error) {
      console.error('Error processing payment proof:', error);
      const lang = ctx.userLang || 'en';
      await ctx.reply(
        lang === 'am' 
          ? 'ስህተት ተፈጥሯል። እባክዎ ቆይተው እንደገና ይሞክሩ።' 
          : 'An error occurred. Please try again later.'
      );
    }
  });

  // Handle admin approval of payment
  bot.action(/^approve_payment_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const adminId = String(ctx.from.id);
      
      // Verify admin
      if (String(adminId) !== process.env.ADMIN_TELEGRAM_ID) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }
      
      // Get payment data
      const paymentRef = firestore.collection('pendingPayments').doc(paymentId);
      const paymentDoc = await paymentRef.get();
      
      if (!paymentDoc.exists) {
        await ctx.answerCbQuery('Payment not found');
        return;
      }
      
      const payment = paymentDoc.data();
      const userId = payment.userId;
      const months = parseInt(payment.duration, 10);
      
      // Find existing pending subscription
      const subscriptionsQuery = await firestore.collection('subscriptions')
        .where('paymentId', '==', paymentId)
        .where('status', '==', 'pending')
        .get();
      
      if (subscriptionsQuery.empty) {
        await ctx.answerCbQuery('No pending subscription found');
        return;
      }
      
      // Update existing subscription to active
      const subscriptionDoc = subscriptionsQuery.docs[0];
      const subscriptionId = subscriptionDoc.id;
      
      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      
      await firestore.collection('subscriptions').doc(subscriptionId).update({
        status: 'active',
        paymentStatus: 'completed',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        updatedAt: new Date().toISOString(),
        approvedAt: new Date().toISOString(),
        approvedBy: adminId
      });
      
      // Update payment status
      await paymentRef.update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId,
        subscriptionId
      });
      
      // Notify admin
      await ctx.answerCbQuery('✅ Payment approved!');
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [{ text: '✅ Approved', callback_data: 'approved' }]
        ]
      });
      
      // Notify user
      const userLang = await getUserLanguage(userId);
      const userMessage = userLang === 'am'
        ? `✅ *ክፍያዎ ተረጋግሯል!*\n\n` +
          `የ${payment.serviceName} የደንበኝነት ምዝገባዎ ተጠናቍሯል!\n` +
          `ቆይታ: ${months} ${months === 1 ? 'ወር' : 'ወራት'}\n` +
          `የሚያበቃበት ቀን: ${endDate.toLocaleDateString('en-ET')}\n\n` +
          `አገልግሎቱን ለመጠቀም የእርስዎ መለያ ዝግጁ ነው። አመሰግናለን!`
        : `✅ *Payment Verified!*\n\n` +
          `Your ${payment.serviceName} subscription is now active!\n` +
          `Duration: ${months} ${months === 1 ? 'Month' : 'Months'}\n` +
          `Ends on: ${endDate.toLocaleDateString('en-US')}\n\n` +
          `Your account is now ready to use. Thank you for subscribing!`;
      
      await ctx.telegram.sendMessage(userId, userMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error approving payment:', error);
      await ctx.answerCbQuery('Error approving payment');
    }
  });
  
  // Handle admin rejection of payment
  bot.action(/^reject_payment_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      
      // Verify admin
      if (String(ctx.from.id) !== process.env.ADMIN_TELEGRAM_ID) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }
      
      // Find and update existing pending subscription
      const subscriptionsQuery = await firestore.collection('subscriptions')
        .where('paymentId', '==', paymentId)
        .where('status', '==', 'pending')
        .get();
      
      if (!subscriptionsQuery.empty) {
        const subscriptionDoc = subscriptionsQuery.docs[0];
        await firestore.collection('subscriptions').doc(subscriptionDoc.id).update({
          status: 'rejected',
          paymentStatus: 'rejected',
          rejectedAt: new Date().toISOString(),
          rejectedBy: String(ctx.from.id),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Update payment status
      await firestore.collection('pendingPayments').doc(paymentId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: String(ctx.from.id)
      });
      
      await ctx.answerCbQuery('❌ Payment rejected');
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [{ text: '❌ Rejected', callback_data: 'rejected' }]
        ]
      });
      
      // Get payment data to notify user
      const payment = await firestore.collection('pendingPayments').doc(paymentId).get();
      const paymentData = payment.data();
      const userId = paymentData.userId;
      
      // Notify user
      const userLang = await getUserLanguage(userId);
      const userMessage = userLang === 'am'
        ? `❌ *የክፍያ ማረጋገጫ አልተቀበለም*\n\n` +
          `ያስገቡት የክፍያ ማስረጃ አልተቀበለም። እባክዎ የበለጠ ዝርዝር ለማግኘት የድጋፍ ቡድናችንን ያነጋግሩ።`
        : `❌ *Payment Verification Failed*\n\n` +
          `The payment proof you submitted was not accepted. ` +
          `Please contact our support team for more details.`;
      
      await ctx.telegram.sendMessage(userId, userMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error rejecting payment:', error);
      await ctx.answerCbQuery('Error rejecting payment');
    }
  });
  
  // Helper function to get user language
  async function getUserLanguage(userId) {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      return userDoc.exists ? (userDoc.data().language || 'en') : 'en';
    } catch (error) {
      console.error('Error getting user language:', error);
      return 'en';
    }
  }
}

export default setupSubscribeHandler;
