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
  // CRITICAL: Register text handler FIRST before any other handlers
  // This ensures it runs before admin/support handlers
  process.stderr.write('🔧 REGISTERING SUBSCRIBE TEXT HANDLER FIRST\n');
  console.log('🔧 REGISTERING SUBSCRIBE TEXT HANDLER FIRST');
  
  // Use bot.use() middleware instead of bot.on('text') to ensure it runs FIRST
  bot.use(async (ctx, next) => {
    // Only process text messages
    if (!ctx.message || !ctx.message.text) {
      return next();
    }
    
    try {
      // Log IMMEDIATELY - first thing, no checks
      process.stderr.write(`\n🔍🔍🔍 [SUBSCRIBE HANDLER] User: ${ctx.from?.id}, Text: ${ctx.message?.text || 'NO TEXT'}\n`);
      console.log('🔍🔍🔍 [SUBSCRIBE HANDLER] User:', ctx.from?.id, 'Text:', ctx.message?.text);
      
      // Skip if it's a command
      if (ctx.message?.text?.startsWith('/')) {
        return next();
      }
      
      // Skip if admin is in custom settlement flow (let admin handler process it)
      const userId = String(ctx.from?.id);
      if (global.adminStates && global.adminStates[userId]?.state === 'awaiting_custom_settlement') {
        process.stderr.write(`⏭️ [SUBSCRIBE HANDLER] Admin in settlement flow, skipping\n`);
        return next(); // Let admin handler process
      }
      
      // Check if user is in details collection flow
      if (!global.userDetailsState || !global.userDetailsState[userId] || global.userDetailsState[userId].state !== 'awaiting_user_details') {
        return next(); // Not in flow, let other handlers process
      }
      
      // User is in flow - process it
      process.stderr.write(`✅ Processing user details for: ${userId}, step: ${global.userDetailsState[userId].step}\n`);
      
      const userState = global.userDetailsState[userId];
      const lang = await getUserLanguage(ctx);
      const step = userState.step || 'name';
      const userInput = ctx.message.text.trim();
      
      if (step === 'name') {
        if (userInput.length < 2) {
          await ctx.reply(lang === 'am' 
            ? '⚠️ እባክዎ ትክክለኛ ስም ያስገቡ (ቢያንስ 2 ቁምፊዎች)'
            : '⚠️ Please enter a valid name (at least 2 characters)');
          return;
        }
        
        userState.userName = userInput;
        userState.step = 'email';
        userState.timestamp = Date.now();
        
        const emailPrompt = lang === 'am'
          ? `📧 *የኢሜይል አድራሻዎን ያስገቡ*\n\nእባክዎ የኢሜይል አድራሻዎን ይጻፉ:`
          : `📧 *Please Enter Your Email*\n\nPlease type your email address:`;
        
        await ctx.reply(emailPrompt, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'cancel_user_details' }]]
          }
        });
        
      } else if (step === 'email') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userInput)) {
          await ctx.reply(lang === 'am'
            ? '⚠️ እባክዎ ትክክለኛ የኢሜይል አድራሻ ያስገቡ (ለምሳሌ: example@email.com)'
            : '⚠️ Please enter a valid email address (e.g., example@email.com)');
          return;
        }
        
        userState.userEmail = userInput;
        userState.step = 'phone';
        userState.timestamp = Date.now();
        
        const phonePrompt = lang === 'am'
          ? `📱 *የስልክ ቁጥርዎን ያስገቡ*\n\nእባክዎ የስልክ ቁጥርዎን ይጻፉ (ቢያንስ 10 አሃዞች):`
          : `📱 *Please Enter Your Phone Number*\n\nPlease type your phone number (at least 10 digits):`;
        
        await ctx.reply(phonePrompt, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: t('cancel', lang), callback_data: 'cancel_user_details' }]]
          }
        });
        
      } else if (step === 'phone') {
        // Accept any phone number - just needs 10+ digits, no other restrictions!
        // Remove any spaces, dashes, parentheses, dots, or other formatting
        const digitsOnly = userInput.replace(/\D/g, ''); // Remove all non-digits
        
        // Just check if it has at least 10 digits - that's it!
        if (digitsOnly.length < 10) {
          await ctx.reply(lang === 'am'
            ? '⚠️ እባክዎ ቢያንስ 10 አሃዞች ያለው የስልክ ቁጥር ያስገቡ'
            : '⚠️ Please enter a phone number with at least 10 digits');
          return;
        }
        
        // Format: add + if user didn't include it, otherwise keep their format
        const formattedPhone = userInput.trim().startsWith('+') 
          ? userInput.trim() 
          : '+' + digitsOnly;
        
        userState.userPhone = formattedPhone;
        // DON'T delete state yet! Mark as awaiting payment proof
        // Screenshot handler needs this state to write to DB
        userState.step = 'awaiting_payment_proof';
        userState.awaitingProof = true;
        userState.timestamp = Date.now();
        
        console.log('✅ All user details collected, marking as awaiting payment proof');
        console.log('🔍 State after phone:', JSON.stringify(global.userDetailsState[userId], null, 2));
        
        await showPaymentInstructions(ctx, {
          paymentId: userState.paymentId,
          serviceId: userState.serviceId,
          duration: userState.duration,
          price: userState.price,
          userName: userState.userName,
          userEmail: userState.userEmail,
          userPhone: formattedPhone,
          isCustomPlan: userState.isCustomPlan || false,
          customPlanDetails: userState.customPlanDetails
        });
        
        // Mark as handled - don't call next() to prevent other handlers from processing
        return;
      }
    } catch (error) {
      process.stderr.write(`❌ ERROR in subscribe text handler: ${error.message}\n`);
      process.stderr.write(`❌ Stack: ${error.stack}\n`);
      console.error('❌ Error in subscribe text handler:', error);
      // On error, still call next() to let other handlers try
      return next();
    }
  });
  
  process.stderr.write('✅ SUBSCRIBE TEXT HANDLER REGISTERED\n');
  
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
      
      // Create payment ID (don't save to DB yet - ZERO quota!)
      const paymentId = `pay_${Date.now()}_${userId}`;
      const paymentReference = `REF-${Date.now()}-${userId}`;
      
      // Store state in memory ONLY - ZERO DB reads/writes during flow!
      if (!global.userDetailsState) global.userDetailsState = {};
      global.userDetailsState[userId] = {
        state: 'awaiting_user_details',
        paymentId: paymentId,
        paymentReference: paymentReference,
        serviceId: serviceId,
        serviceName: service.name,
        duration: duration,
        durationName: durationText,
        price: price,
        step: 'name', // Track which detail we're collecting
        timestamp: Date.now()
      };

      // Force log to stderr to bypass any console overrides
      process.stderr.write(`✅ User details state set in memory for user: ${userId}\n`);
      process.stderr.write(`🔍 State details: ${JSON.stringify(global.userDetailsState[userId])}\n`);
      console.log('✅ User details state set in memory for user:', userId);
      console.log('🔍 State details:', global.userDetailsState[userId]);

      // Ask for user name first
      const namePrompt = lang === 'am'
        ? `👤 *የእርስዎን ስም ያስገቡ*\n\nእባክዎ ሙሉ ስምዎን ይጻፉ:`
        : `👤 *Please Enter Your Name*\n\nPlease type your full name:`;

      console.log('🔍 Sending name prompt to user:', userId);
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
      console.log('✅ Name prompt sent successfully');
      
    } catch (error) {
      console.error('Error in subscription confirmation:', error);
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });

  // NOTE: Text handler for user details collection is already registered at the START of this function (line 18)
  // This ensures it runs before all other text handlers. No need to register it again here.

  // Handle "Pay Now" button for custom plans
  bot.action(/^pay_custom_plan_(.+)$/, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      
      console.log('🔍 Pay Now clicked for custom plan payment:', paymentId);
      
      // Get payment details from database
      const payment = await optimizedDatabase.getPendingPayment(paymentId);
      
      if (!payment) {
        await ctx.answerCbQuery(t('error_occurred', lang));
        await ctx.reply('❌ Payment not found. Please contact support.');
        return;
      }
      
      // Verify this payment belongs to this user
      if (String(payment.userId) !== userId) {
        await ctx.answerCbQuery(t('error_occurred', lang));
        await ctx.reply('❌ Unauthorized access.');
        return;
      }
      
      // Get custom plan request details (only if not already in payment data)
      // OPTIMIZATION: Skip DB read if customPlanDetails already in payment
      const request = (!payment.customPlanDetails && payment.customPlanRequestId) 
        ? await optimizedDatabase.getCustomPlanRequest(payment.customPlanRequestId)
        : null;
      
      // Set up user details collection state (same as normal plans!)
      if (!global.userDetailsState) global.userDetailsState = {};
      global.userDetailsState[userId] = {
        state: 'awaiting_user_details',
        paymentId: paymentId,
        paymentReference: payment.paymentReference || `REF-${Date.now()}-${userId}`,
        serviceId: payment.serviceId || request?.serviceId || 'custom_plan',
        serviceName: payment.serviceName || request?.serviceName || 'Custom Plan',
        duration: 'custom',
        durationName: 'Custom Plan',
        price: payment.price,
        isCustomPlan: true,
        customPlanRequestId: payment.customPlanRequestId,
        customPlanDetails: payment.customPlanDetails || request?.customPlanDetails,
        step: 'name',
        timestamp: Date.now()
      };
      
      // Ask for name first
      const namePrompt = lang === 'am'
        ? `👤 *የእርስዎን ስም ያስገቡ*\n\nእባክዎ ሙሉ ስምዎን ይጻፉ:`
        : `👤 *Please Enter Your Name*\n\nPlease type your full name:`;
      
      await ctx.answerCbQuery();
      await ctx.editMessageText(namePrompt, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? '❌ ይቅር' : '❌ Cancel', callback_data: 'cancel_user_details' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in pay_custom_plan handler:', error);
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery(t('error_occurred', lang));
    }
  });

  // Handle cancel custom plan
  bot.action('cancel_custom_plan', async (ctx) => {
    try {
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery();
      await ctx.editMessageText(
        lang === 'am' 
          ? '❌ የብጁ እቅድ ጥያቄ ተሰርዟል' 
          : '❌ Custom plan request cancelled',
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
      console.error('Error cancelling custom plan:', error);
    }
  });

  // Handle cancel user details collection
  bot.action('cancel_user_details', async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      
      // Clear in-memory state - ZERO DB read/write!
      if (global.userDetailsState && global.userDetailsState[userId]) {
        // No payment was created yet (only created at end), so just clear memory
        delete global.userDetailsState[userId];
      }
      
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
  async function showPaymentInstructions(ctx, { paymentId, serviceId, duration, price, userName, userEmail, userPhone, isCustomPlan, customPlanDetails }) {
    try {
      const lang = await getUserLanguage(ctx);
      
      // For custom plans, skip service lookup
      let service = null;
      let durationText = 'Custom Plan';
      let isCustom = isCustomPlan || false;
      
      if (!isCustom) {
        // Get the service details
        service = ctx.services?.find(s => s.id === serviceId || s.serviceID === serviceId);
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
        
        if (isConnectBased) {
          durationText = `${durationValue} Connects`;
        } else {
          durationText = `${durationValue} ${durationValue === 1 ? t('month', lang) : t('months', lang)}`;
        }
      }

      const plan = !isCustom ? service.plans?.find(p => p.duration === durationValue) : null;
      
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

        // Build payment message - handle custom plans differently
        let paymentMessage;
        if (isCustom) {
          // Custom plan message
          paymentMessage = lang === 'am'
            ? `💳 *የክፍያ መመሪያዎች*

📋 **ብጁ እቅድ:** ${customPlanDetails || 'Custom Plan'}
💵 **ዋጋ:** *${price.toLocaleString()} ${lang === 'am' ? t('birr', lang) : 'ETB'}*

${t('payment_accounts_instruction', lang)}:
${lang === 'am' ? paymentMethodsListAm : paymentMethodsListEn}
${paymentMethods.length > 0 ? (lang === 'am' ? (paymentMethods[0].instructionsAm || t('payment_proof_instruction', lang)) : (paymentMethods[0].instructions || t('payment_proof_instruction', lang))) : t('payment_proof_instruction', lang)}
${t('service_start_after_approval', lang)}`
            : `💳 *${t('payment_instructions_title', lang)}*

📋 **Custom Plan:** ${customPlanDetails || 'Custom Plan'}
💵 **${t('total_amount', lang)}:** *${price.toLocaleString()} ${lang === 'am' ? t('birr', lang) : 'ETB'}*

${t('payment_accounts_instruction', lang)}:
${lang === 'am' ? paymentMethodsListAm : paymentMethodsListEn}
${paymentMethods.length > 0 ? (lang === 'am' ? (paymentMethods[0].instructionsAm || t('payment_proof_instruction', lang)) : (paymentMethods[0].instructions || t('payment_proof_instruction', lang))) : t('payment_proof_instruction', lang)}
${t('service_start_after_approval', lang)}`;
        } else {
          // Regular plan message
          if (!service) {
            await ctx.reply(t('service_not_found', lang));
            return;
          }
          paymentMessage = `💳 *${t('payment_instructions_title', lang)}*

${t('service', lang)}: ${service.name}
${t('duration', lang)}: ${plan?.billingCycle || durationText}
${t('total_amount', lang)}: *${price.toLocaleString()} ${lang === 'am' ? t('birr', lang) : 'ETB'}*

${t('payment_accounts_instruction', lang)}:
${lang === 'am' ? paymentMethodsListAm : paymentMethodsListEn}
${paymentMethods.length > 0 ? (lang === 'am' ? (paymentMethods[0].instructionsAm || t('payment_proof_instruction', lang)) : (paymentMethods[0].instructions || t('payment_proof_instruction', lang))) : t('payment_proof_instruction', lang)}
${t('service_start_after_approval', lang)}`;
        }

      // DON'T create subscription/payment in DB yet - wait for payment proof!
      // This saves quota for users who just explore without paying

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
      
      // DON'T notify admin yet - wait for payment proof upload!
      // Admin will be notified when proof is uploaded (in handlePaymentProofUpload)
      
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
      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      
      // Update in-memory state to expect photo - ZERO DB write!
      if (global.userDetailsState && global.userDetailsState[userId]) {
        global.userDetailsState[userId].awaitingProof = true;
        global.userDetailsState[userId].timestamp = Date.now();
      }
      
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


