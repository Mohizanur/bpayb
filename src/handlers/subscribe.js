/**
 * Subscribe handler for the Telegram bot
 * @param {import('telegraf').Telegraf} bot - The Telegraf bot instance
 */

import { firestore } from '../utils/firestore.js';
import { cache } from '../utils/cache.js';

function setupSubscribeHandler(bot) {
  // Handle service selection with more flexible ID matching and caching
  bot.action(/^select_service_([a-z0-9_-]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Show loading message
      await ctx.answerCbQuery();
      
      // Get the service details using cache first
      let service = cache.getServices()?.find(s => s.id === serviceId || s.serviceID === serviceId);
      
      // If not found in cache, try to fetch from Firestore
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
      let service = ctx.services?.find(s => s.id === serviceId || s.serviceID === serviceId);
      
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
      let service = ctx.services?.find(s => s.id === serviceId || s.serviceID === serviceId);
      
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


