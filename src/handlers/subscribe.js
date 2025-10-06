/**
 * Subscribe handler for the Telegram bot
 * @param {import('telegraf').Telegraf} bot - The Telegraf bot instance
 */

import { firestore } from '../utils/firestore.js';
import { cache } from '../utils/cache.js';
import { getAllAdmins } from '../middleware/smartVerification.js';
import { t, getUserLanguage } from '../utils/translations.js';

function setupSubscribeHandler(bot) {
  // Handle service selection with more flexible ID matching and caching
  bot.action(/^select_service_([a-z0-9_()+.-]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = await getUserLanguage(ctx);
      
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
        await ctx.answerCbQuery(t('service_not_found', lang));
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
      const message = `✅ *${service.name}* ${t('selected', lang)}\n\n${service.description || ''}\n\n${t('choose_subscription_duration', lang)}`;
      
      // Create inline keyboard with available plans
      const planButtons = service.plans.map(plan => {
        const durationText = plan.duration === 1 
          ? t('month', lang)
          : plan.duration < 12 
            ? t('months', lang)
            : t('year', lang);
        const currency = lang === 'am' ? t('birr', lang) : 'ETB';
        
        return {
          text: `${plan.duration} ${durationText} - ${plan.price} ${currency}`,
        callback_data: `subscribe_${service.id || service.serviceID}_${plan.duration}m_${plan.price}`
        };
      });
      
      // Group buttons in rows of 2
      const keyboardRows = [];
      for (let i = 0; i < planButtons.length; i += 2) {
        keyboardRows.push(planButtons.slice(i, i + 2));
      }
      
      // Add custom plan button
      keyboardRows.push([
        { 
          text: t('request_custom_plan', lang), 
          callback_data: `custom_plan_for_${service.id || service.serviceID}` 
        }
      ]);
      
      // Add back button
      keyboardRows.push([
        { 
          text: t('back', lang), 
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
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });

  // Handle subscription with duration and price
  bot.action(/^subscribe_([a-z0-9_()+.-]+)_(\d+m)_(\d+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2]; // e.g., '1m', '3m', '6m', '12m'
      const price = parseInt(ctx.match[3], 10);
      const lang = await getUserLanguage(ctx);
      
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
        await ctx.answerCbQuery(t('service_not_found', lang));
        return;
      }

      // Parse duration
      const months = parseInt(duration, 10);
      const durationText = `${months} ${months === 1 ? t('month', lang) : t('months', lang)}`;

      // Format price
      const formattedPrice = price.toLocaleString('en-US');
      
      // Show confirmation message
      const confirmMessage = `✅ *${service.name} - ${durationText}*\n\n` +
        `${t('price', lang)}: *${formattedPrice} ${lang === 'am' ? t('birr', lang) : 'ETB'}*\n\n` +
        `${t('proceed_with_subscription', lang)}`;

      await ctx.editMessageText(confirmMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t('yes', lang), 
                callback_data: `confirm_sub_${serviceId}_${duration}_${price}` },
              { text: t('no', lang), 
                callback_data: `back_to_services` }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in subscription selection:', error);
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });

  // Handle subscription confirmation
  bot.action(/^confirm_sub_([a-z0-9_()+.-]+)_(\d+m)_(\d+)$/i, async (ctx) => {
    try {
      console.log('🔍 Subscription confirmation callback received:', ctx.callbackQuery.data);
      const serviceId = ctx.match[1];
      const duration = ctx.match[2];
      const price = parseInt(ctx.match[3], 10);
      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      console.log('🔍 Parsed values:', { serviceId, duration, price, userId });
      
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
        await ctx.answerCbQuery(t('service_not_found', lang));
        return;
      }

      const months = parseInt(duration, 10);
      const durationText = `${months} ${months === 1 ? t('month', lang) : t('months', lang)}`;
      
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

        const paymentMessage = `💳 *${t('payment_instructions_title', lang)}*

${t('service', lang)}: ${service.name}
${t('duration', lang)}: ${plan?.billingCycle || `${months} ${months === 1 ? t('month', lang) : t('months', lang)}`}
${t('total_amount', lang)}: *${price.toLocaleString()} ${lang === 'am' ? t('birr', lang) : 'ETB'}*

${t('payment_accounts_instruction', lang)}:
${lang === 'am' ? paymentMethodsListAm : paymentMethodsListEn}
${paymentMethods.length > 0 ? (lang === 'am' ? (paymentMethods[0].instructionsAm || t('payment_proof_instruction', lang)) : (paymentMethods[0].instructions || t('payment_proof_instruction', lang))) : t('payment_proof_instruction', lang)}
${t('service_start_after_approval', lang)}`;

      // Save pending payment to database (without starting subscription yet)
      const paymentId = `pay_${Date.now()}_${userId}`;
      const paymentReference = `REF-${Date.now()}-${userId}`;
      const paymentData = {
        id: paymentId,
        userId,
        serviceId: service.id,
        serviceName: service.name,
        duration,
        durationName: durationText,
        price,
        amount: `ETB ${price}`, // Formatted amount for display
        status: 'pending',
        paymentReference: paymentReference,
        createdAt: new Date().toISOString(),
        paymentMethod: 'manual',
        paymentDetails: {}
      };

      // Create pending subscription first
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const subscriptionData = {
        id: subscriptionId,
        userId,
        serviceId: service.id,
        serviceName: service.name,
        status: 'pending',
        duration: duration,
        durationName: durationText,
        amount: `ETB ${price}`,
        price: price,
        paymentId: paymentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await firestore.collection('subscriptions').doc(subscriptionId).set(subscriptionData);

      // Add subscription ID to payment data
      paymentData.subscriptionId = subscriptionId;

      // Save to Firestore
      await firestore.collection('pendingPayments').doc(paymentId).set(paymentData);

      // Send payment instructions
      await ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t('upload_payment_proof', lang),
                callback_data: `upload_proof_${paymentId}` }
            ],
            [
              { text: t('main_page', lang),
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

      // Notify all admins
      const allAdmins = await getAllAdmins();
      for (const admin of allAdmins) {
        if (admin.telegramId || admin.id) {
          try {
            await ctx.telegram.sendMessage(
              admin.telegramId || admin.id,
              adminMessage,
              { parse_mode: 'Markdown' }
            );
          } catch (error) {
            console.log(`Could not notify admin ${admin.id}:`, error.message);
          }
        }
      }
      
    } catch (error) {
      console.error('Error in payment instructions:', error);
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });

  // Handle payment proof upload
  bot.action(/^upload_proof_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const lang = await getUserLanguage(ctx);
      
      // Set user state to expect photo
      await firestore.collection('userStates').doc(String(ctx.from.id)).set({
        state: 'awaiting_payment_proof',
        paymentId,
        timestamp: new Date().toISOString()
      });
      
      const message = `📤 *${t('upload_payment_proof_title', lang)}*\n\n` +
        `${t('upload_payment_proof_instruction', lang)}\n` +
        `${t('click_cancel_to_cancel', lang)}`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      console.error('Error in upload proof handler:', error);
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });
  
  // Helper function to get user language
  async function getUserLanguage(ctx) {
    try {
      const userId = String(ctx.from.id);
      if (!userId) {
        return ctx.from.language_code === 'am' ? 'am' : 'en';
      }
      const userDoc = await firestore.collection('users').doc(userId).get();
      return userDoc.exists ? (userDoc.data().language || 'en') : 'en';
    } catch (error) {
      console.error('Error getting user language:', error);
      return ctx.from.language_code === 'am' ? 'am' : 'en';
    }
  }
}

export default setupSubscribeHandler;


