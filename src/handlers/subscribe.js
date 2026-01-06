/**
 * Subscribe handler for the Telegram bot
 * @param {import('telegraf').Telegraf} bot - The Telegraf bot instance
 */

import { firestore } from '../utils/firestore.js';
import { cache } from '../utils/cache.js';
import { getAllAdmins } from '../middleware/smartVerification.js';
import { t, getUserLanguage } from '../utils/translations.js';
import optimizedDatabase from '../utils/optimizedDatabase.js';

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
      
      // If not found in cache, try to fetch from Firestore - OPTIMIZED with smart caching
      if (!service) {
        try {
          service = await optimizedDatabase.getService(serviceId);
          if (service) {
            service = { id: serviceId, ...service };
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
        // Determine if this is a connect-based service (Upwork) or month-based
        const isConnectBased = plan.billingCycle && plan.billingCycle.toLowerCase().includes('connect');
        
        let durationText;
        if (isConnectBased) {
          // For connect-based services (Upwork)
          durationText = plan.billingCycle; // e.g., "30 Connects"
        } else {
          // For month-based services (Netflix, etc.)
          durationText = plan.duration === 1 
            ? t('month', lang)
            : plan.duration < 12 
              ? t('months', lang)
              : t('year', lang);
        }
        
        const currency = lang === 'am' ? t('birr', lang) : 'ETB';
        const durationType = isConnectBased ? 'c' : 'm'; // 'c' = connects, 'm' = months
        
        return {
          text: isConnectBased 
            ? `${plan.billingCycle} - ${plan.price} ${currency}`
            : `${plan.duration} ${durationText} - ${plan.price} ${currency}`,
          callback_data: `subscribe_${service.id || service.serviceID}_${plan.duration}${durationType}_${plan.price}`
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

  // Handle subscription with duration and price (supports both months and connects)
  bot.action(/^subscribe_([a-z0-9_()+.-]+)_(\d+[mc])_(\d+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2]; // e.g., '1m', '3m', '30c', '50c'
      const price = parseInt(ctx.match[3], 10);
      const lang = await getUserLanguage(ctx);
      
      // Get the service details
      let service = ctx.services?.find(s => s.id === serviceId || s.serviceID === serviceId);
      
      // If not found in context, try to fetch from Firestore - OPTIMIZED with smart caching
      if (!service) {
        try {
          service = await optimizedDatabase.getService(serviceId);
          if (service) {
            service = { id: serviceId, ...service };
          }
        } catch (error) {
          console.error('Error fetching service from Firestore:', error);
        }
      }
      
      if (!service) {
        await ctx.answerCbQuery(t('service_not_found', lang));
        return;
      }

      // Parse duration (supports months 'm' and connects 'c')
      const durationType = duration.slice(-1); // 'm' or 'c'
      const durationValue = parseInt(duration, 10);
      const isConnectBased = durationType === 'c';
      
      let durationText;
      if (isConnectBased) {
        durationText = `${durationValue} Connects`;
      } else {
        durationText = `${durationValue} ${durationValue === 1 ? t('month', lang) : t('months', lang)}`;
      }

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

  // Handle subscription confirmation (supports both months and connects)
  bot.action(/^confirm_sub_([a-z0-9_()+.-]+)_(\d+[mc])_(\d+)$/i, async (ctx) => {
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
      
      // If not found in context, try to fetch from Firestore - OPTIMIZED with smart caching
      if (!service) {
        try {
          service = await optimizedDatabase.getService(serviceId);
          if (service) {
            service = { id: serviceId, ...service };
          }
        } catch (error) {
          console.error('Error fetching service from Firestore:', error);
        }
      }
      
      if (!service) {
        await ctx.answerCbQuery(t('service_not_found', lang));
        return;
      }

      // Parse duration (supports months 'm' and connects 'c')
      const durationType = duration.slice(-1); // 'm' or 'c'
      const durationValue = parseInt(duration, 10);
      const isConnectBased = durationType === 'c';
      
      let durationText;
      if (isConnectBased) {
        durationText = `${durationValue} Connects`;
      } else {
        durationText = `${durationValue} ${durationValue === 1 ? t('month', lang) : t('months', lang)}`;
      }

      // Create payment ID and save initial payment data (without user details yet)
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
        amount: `ETB ${price}`,
        status: 'pending',
        paymentReference: paymentReference,
        createdAt: new Date().toISOString(),
        paymentMethod: 'manual',
        paymentDetails: {}
      };

      // Save initial payment data to Firestore (will be updated with user details later)
      await firestore.collection('pendingPayments').doc(paymentId).set(paymentData);

      // Set user state to collect user details (name, email, phone)
      await firestore.collection('userStates').doc(userId).set({
        state: 'awaiting_user_details',
        paymentId: paymentId,
        serviceId: serviceId,
        duration: duration,
        price: price,
        step: 'name', // Track which detail we're collecting
        timestamp: new Date().toISOString()
      });

      // Ask for user name first
      const namePrompt = lang === 'am'
        ? `👤 *የእርስዎን ስም ያስገቡ*\n\nእባክዎ ሙሉ ስምዎን ይጻፉ:`
        : `👤 *Please Enter Your Name*\n\nPlease type your full name:`;

      await ctx.editMessageText(namePrompt, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: t('cancel', lang), callback_data: 'cancel_user_details' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in subscription confirmation:', error);
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });

  // Handle text messages for collecting user details
  bot.on('text', async (ctx) => {
    try {
      // Skip if it's a command
      if (ctx.message.text.startsWith('/')) {
        return; // Let other handlers process commands
      }

      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      
      // Check if user is in user details collection flow
      const { smartGet } = await import('../utils/optimizedDatabase.js');
      const userState = await smartGet('userStates', userId, false);
      
      if (!userState || userState.state !== 'awaiting_user_details') {
        return; // Not in user details flow, let other handlers process
      }

      const step = userState.step || 'name';
      const paymentId = userState.paymentId;
      const serviceId = userState.serviceId;
      const duration = userState.duration;
      const price = userState.price;

      // Get payment data
      const paymentDoc = await firestore.collection('pendingPayments').doc(paymentId).get();
      if (!paymentDoc.exists) {
        await ctx.reply(lang === 'am' ? '❌ ክፍያ አልተገኘም' : '❌ Payment not found');
        await firestore.collection('userStates').doc(userId).delete();
        return;
      }

      const paymentData = paymentDoc.data();
      const userInput = ctx.message.text.trim();

      if (step === 'name') {
        // Validate name (at least 2 characters)
        if (userInput.length < 2) {
          await ctx.reply(lang === 'am' 
            ? '⚠️ እባክዎ ትክክለኛ ስም ያስገቡ (ቢያንስ 2 ቁምፊዎች)'
            : '⚠️ Please enter a valid name (at least 2 characters)');
          return;
        }

        // Save name and ask for email
        paymentData.userName = userInput;
        await firestore.collection('pendingPayments').doc(paymentId).update({ userName: userInput });

        // Update state to ask for email
        await firestore.collection('userStates').doc(userId).update({
          step: 'email',
          userName: userInput
        });

        const emailPrompt = lang === 'am'
          ? `📧 *የኢሜይል አድራሻዎን ያስገቡ*\n\nእባክዎ የኢሜይል አድራሻዎን ይጻፉ:`
          : `📧 *Please Enter Your Email*\n\nPlease type your email address:`;

        await ctx.reply(emailPrompt, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: t('cancel', lang), callback_data: 'cancel_user_details' }
              ]
            ]
          }
        });

      } else if (step === 'email') {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userInput)) {
          await ctx.reply(lang === 'am'
            ? '⚠️ እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (ለምሳሌ: example@email.com)'
            : '⚠️ Please enter a valid email address (e.g., example@email.com)');
          return;
        }

        // Save email and ask for phone
        paymentData.userEmail = userInput;
        await firestore.collection('pendingPayments').doc(paymentId).update({ userEmail: userInput });

        // Update state to ask for phone
        await firestore.collection('userStates').doc(userId).update({
          step: 'phone',
          userEmail: userInput
        });

        const phonePrompt = lang === 'am'
          ? `📱 *የስልክ ቁጥርዎን ያስገቡ*\n\nእባክዎ የስልክ ቁጥርዎን ይጻፉ (ለምሳሌ: +251912345678):`
          : `📱 *Please Enter Your Phone Number*\n\nPlease type your phone number (e.g., +251912345678):`;

        await ctx.reply(phonePrompt, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: t('cancel', lang), callback_data: 'cancel_user_details' }
              ]
            ]
          }
        });

      } else if (step === 'phone') {
        // Validate phone format (Ethiopian format: +251XXXXXXXXX)
        const phoneRegex = /^\+251[79]\d{8}$/;
        const formattedPhone = userInput.startsWith('+') ? userInput : '+' + userInput;
        
        if (!phoneRegex.test(formattedPhone)) {
          await ctx.reply(lang === 'am'
            ? '⚠️ እባክዎ ትክክለኛ የስልክ ቁጥር ያስገቡ (ለምሳሌ: +251912345678)'
            : '⚠️ Please enter a valid phone number (e.g., +251912345678)');
          return;
        }

        // Save phone - all details collected!
        paymentData.userPhone = formattedPhone;
        await firestore.collection('pendingPayments').doc(paymentId).update({ 
          userPhone: formattedPhone,
          userDetailsCollected: true
        });

        // Clear user state
        await firestore.collection('userStates').doc(userId).delete();

        // Now show payment instructions
        await showPaymentInstructions(ctx, {
          paymentId,
          serviceId,
          duration,
          price,
          userName: paymentData.userName,
          userEmail: paymentData.userEmail,
          userPhone: formattedPhone
        });
      }

    } catch (error) {
      console.error('Error in user details collection:', error);
      // On error, let other handlers process the message
      return;
    }
  });

  // Handle cancel user details collection
  bot.action('cancel_user_details', async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      
      // Get user state to find payment ID
      const { smartGet } = await import('../utils/optimizedDatabase.js');
      const userState = await smartGet('userStates', userId, false);
      
      if (userState && userState.paymentId) {
        // Delete the pending payment
        await firestore.collection('pendingPayments').doc(userState.paymentId).delete();
      }
      
      // Clear user state
      await firestore.collection('userStates').doc(userId).delete();
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        lang === 'am' 
          ? '❌ የደንበኝነት ምዝገባ ተሰርዟል' 
          : '❌ Subscription cancelled',
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: t('main_page', lang), callback_data: 'main_menu' }
              ]
            ]
          }
        }
      );
    } catch (error) {
      console.error('Error cancelling user details:', error);
    }
  });

  // Function to show payment instructions after collecting user details
  async function showPaymentInstructions(ctx, { paymentId, serviceId, duration, price, userName, userEmail, userPhone }) {
    try {
      const lang = await getUserLanguage(ctx);
      
      // Get the service details
      let service = ctx.services?.find(s => s.id === serviceId || s.serviceID === serviceId);
      if (!service) {
        service = await optimizedDatabase.getService(serviceId);
        if (service) {
          service = { id: serviceId, ...service };
        }
      }

      if (!service) {
        await ctx.reply(t('service_not_found', lang));
        return;
      }

      // Parse duration
      const durationType = duration.slice(-1);
      const durationValue = parseInt(duration, 10);
      const isConnectBased = durationType === 'c';
      
      let durationText;
      if (isConnectBased) {
        durationText = `${durationValue} Connects`;
      } else {
        durationText = `${durationValue} ${durationValue === 1 ? t('month', lang) : t('months', lang)}`;
      }

      const plan = service.plans?.find(p => p.duration === durationValue);

      // Get payment methods
      let paymentMethods = [];
      try {
        paymentMethods = await optimizedDatabase.getPaymentMethods();
        paymentMethods = paymentMethods.filter(method => method.active);
      } catch (error) {
        console.error('Error fetching payment methods:', error);
      }

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
${t('duration', lang)}: ${plan?.billingCycle || durationText}
${t('total_amount', lang)}: *${price.toLocaleString()} ${lang === 'am' ? t('birr', lang) : 'ETB'}*

${t('payment_accounts_instruction', lang)}:
${lang === 'am' ? paymentMethodsListAm : paymentMethodsListEn}
${paymentMethods.length > 0 ? (lang === 'am' ? (paymentMethods[0].instructionsAm || t('payment_proof_instruction', lang)) : (paymentMethods[0].instructions || t('payment_proof_instruction', lang))) : t('payment_proof_instruction', lang)}
${t('service_start_after_approval', lang)}`;

      // Create pending subscription
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const subscriptionData = {
        id: subscriptionId,
        userId: String(ctx.from.id),
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
      await firestore.collection('pendingPayments').doc(paymentId).update({ subscriptionId });

      // Send payment instructions
      await ctx.reply(paymentMessage, {
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
      
      // Notify admin about new pending payment with user details
      const adminMessage = `🆕 *New Pending Payment*\n\n` +
        `👤 *User Details:*\n` +
        `├─ Name: ${userName}\n` +
        `├─ Email: ${userEmail}\n` +
        `├─ Phone: ${userPhone}\n` +
        `└─ Telegram: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})\n\n` +
        `🆔 User ID: ${String(ctx.from.id)}\n` +
        `📱 Service: ${service.name}\n` +
        `⏳ Duration: ${durationText}\n` +
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
      console.error('Error showing payment instructions:', error);
      const lang = await getUserLanguage(ctx);
      await ctx.reply(t('error_occurred', lang));
    }
  }

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
      const userData = await optimizedDatabase.getUser(userId);
      return userData ? (userData.language || 'en') : 'en';
    } catch (error) {
      console.error('Error getting user language:', error);
      return ctx.from.language_code === 'am' ? 'am' : 'en';
    }
  }
}

export default setupSubscribeHandler;


