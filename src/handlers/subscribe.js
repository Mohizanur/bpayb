import { createSubscription, getUser } from "../utils/database.js";
import { 
  PAYMENT_METHODS, 
  calculateAmount, 
  formatCurrency, 
  createManualPayment
} from "../utils/payment.js";
import { loadServices } from "../utils/loadServices.js";
import { notifyAdminsAboutPayment } from "../utils/paymentVerification.js";

// Helper function to get duration name in the user's language
function getDurationName(durationId, lang = 'en') {
  const durations = {
    '1_month': { en: '1 Month', am: '1 ወር' },
    '3_months': { en: '3 Months', am: '3 ወር' },
    '6_months': { en: '6 Months', am: '6 ወር' },
    '12_months': { en: '12 Months', am: '12 ወር' }
  };
  return durations[durationId]?.[lang] || durationId;
}

// Helper function to notify admins about a pending payment
async function notifyAdminsAboutPendingPayment(ctx, paymentDetails, lang) {
  try {
    // This function is now a wrapper around the new notification system
    await notifyAdminsAboutPayment({
      id: paymentDetails.paymentId,
      userId: paymentDetails.userId,
      userName: `${paymentDetails.firstName} ${paymentDetails.lastName}`.trim() || `User-${paymentDetails.userId}`,
      serviceName: paymentDetails.serviceName,
      serviceId: paymentDetails.serviceId,
      amount: paymentDetails.amount,
      paymentMethod: paymentDetails.paymentMethod,
      paymentReference: paymentDetails.paymentReference,
      duration: paymentDetails.duration,
      timestamp: paymentDetails.timestamp || new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in notifyAdminsAboutPendingPayment:', error);
  }
}

// Helper function to handle payment proof submission
async function handlePaymentProof(ctx) {
  const { session } = ctx;
  const lang = ctx.userLang || 'en';
  
  if (!session.waitingForPaymentProof || !session.pendingPayment) {
    return false; // Not in payment proof state
  }
  
  const { serviceName, paymentReference, amount } = session.pendingPayment;
  
  // Create a support ticket for this payment
  const ticket = await createSupportTicket({
    userId: ctx.from.id,
    username: ctx.from.username || 'N/A',
    firstName: ctx.from.first_name || 'N/A',
    lastName: ctx.from.last_name || '',
    type: 'payment_verification',
    subject: `Payment Verification - ${paymentReference}`,
    message: `Please verify my payment for ${serviceName} (${amount})`,
    status: 'open',
    metadata: {
      paymentReference,
      serviceName,
      amount,
      timestamp: new Date().toISOString()
    }
  });
  
  // Notify user
  const userMessage = lang === 'am'
    ? `✅ *የክፍያ ማረጋገጫ ተቀብለናል*\n\n` +
      `የክፍያ ማጣቀሻ: \`${paymentReference}\`\n` +
      `አገልግሎት: ${serviceName}\n` +
      `መጠን: ${amount}\n\n` +
      `የክፍያ ማረጋገጫው ከተፈቀደ በኋላ አገልግሎቱ ይጀምራል። ስለ አገልግሎታችን ለማንኛውም ጥያቄ የደንበኛ አገልግሎት ጋር ያነጋግሩ።`
    : `✅ *Payment Verification Received*\n\n` +
      `Payment Reference: \`${paymentReference}\`\n` +
      `Service: ${serviceName}\n` +
      `Amount: ${amount}\n\n` +
      `Your payment is being verified. Once approved, your service will be activated. ` +
      `Please contact support if you have any questions.`;
  
  await ctx.reply(userMessage, { parse_mode: 'Markdown' });
  
  // Notify admins about the payment proof
  const admins = await getAdmins();
  if (admins && admins.length > 0) {
    const adminMessage = `📸 *Payment Proof Received*\n\n` +
      `👤 User: ${ctx.from.first_name || ''} ${ctx.from.last_name || ''} (@${ctx.from.username || 'N/A'})\n` +
      `🆔 User ID: ${ctx.from.id}\n` +
      `🔢 Reference: \`${paymentReference}\`\n` +
      `📱 Service: ${serviceName}\n` +
      `💵 Amount: ${amount}\n\n` +
      `Please verify this payment and update the subscription accordingly.`;
    
    for (const admin of admins) {
      try {
        await ctx.telegram.sendMessage(
          admin.userId,
          adminMessage,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error(`Failed to notify admin ${admin.userId}:`, error);
      }
    }
  }
  
  // Clear the pending payment state
  delete session.waitingForPaymentProof;
  delete session.pendingPayment;
  
  return true;
}

export default function subscribeHandler(bot) {
  // Handle service selection with proper ID matching
  bot.action(/^select_service_([a-z0-9]+(?:[_-][a-z0-9]+)*)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      console.log(`🔍 Looking up service with ID: ${serviceId}`);
      
      // Load services
      const services = await loadServices();
      console.log('Available services:', services.map(s => `${s.serviceID} (${s.name})`).join(', '));
      
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
        console.error(`❌ Service not found: ${serviceId}`);
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      // Show duration options
      const durationOptions = [
        { id: '1_month', name: lang === 'am' ? '1 ወር' : '1 Month', price: selectedService.price },
        { id: '3_months', name: lang === 'am' ? '3 ወር' : '3 Months', price: calculateAmount(selectedService.price, '3_months') },
        { id: '6_months', name: lang === 'am' ? '6 ወር' : '6 Months', price: calculateAmount(selectedService.price, '6_months') },
        { id: '12_months', name: lang === 'am' ? '12 ወር' : '12 Months', price: calculateAmount(selectedService.price, '12_months') }
      ];
      
      const keyboard = durationOptions.map(duration => [
        {
          text: `${duration.name} - ${formatCurrency(duration.price)}`,
          callback_data: `select_duration_${serviceId}_${duration.id}`
        }
      ]);
      
      keyboard.push([
        { text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'services' }
      ]);
      
      const message = lang === 'am'
        ? `📱 **${selectedService.name}**
        
${selectedService.description}

**የእቅድ አማራጮችን ይምረጡ:**`
        : `📱 **${selectedService.name}**
        
${selectedService.description}

**Select your plan:**`;
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in service selection:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ አገልግሎት መምረጫ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error selecting service. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
      
      // Show retry option
      const keyboard = [
        [{ text: lang === 'am' ? '🔄 እንደገና ይሞክሩ' : '🔄 Try Again', callback_data: 'services' }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      try {
        await ctx.editMessageText(errorMessage, {
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (editError) {
        console.error('Error editing message after service selection error:', editError);
      }
    }
  });
  
  // Handle duration selection with more flexible pattern
  bot.action(/^select_duration_([a-z0-9]+)(?:_(\d+))?_(\d+_months?|1_month)$/i, async (ctx) => {
    try {
      // The service ID is the first part (e.g., 'hbo' from 'hbo_3')
      const serviceId = ctx.match[1];
      // The duration ID is the last part (e.g., '3_months' from 'hbo_3_months')
      const durationId = ctx.match[3];
      const lang = ctx.userLang || 'en';
      
      console.log(`🔍 Duration selected - Service: ${serviceId}, Duration: ${durationId}`);
      
      // Load services
      const services = await loadServices();
      console.log('Available services:', services.map(s => `${s.serviceID} (${s.name})`).join(', '));
      
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
        console.error(`❌ Service not found: ${serviceId}`);
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      const amount = calculateAmount(selectedService.price, durationId);
      const durationNames = {
        '1_month': lang === 'am' ? '1 ወር' : '1 Month',
        '3_months': lang === 'am' ? '3 ወር' : '3 Months',
        '6_months': lang === 'am' ? '6 ወር' : '6 Months',
        '12_months': lang === 'am' ? '12 ወር' : '12 Months'
      };
      
      // Show payment methods
      const paymentMethods = Object.values(PAYMENT_METHODS);
      const keyboard = paymentMethods.map(method => [
        {
          text: lang === 'am' ? method.name_am : method.name,
          callback_data: `select_payment_${serviceId}_${durationId}_${method.id}`
        }
      ]);
      
      keyboard.push([
        { text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: `select_service_${serviceId}` }
      ]);
      
      const message = lang === 'am'
        ? `💳 **የክፍያ ዘዴ ይምረጡ**
        
**አገልግሎት:** ${selectedService.name}
**የእቅድ ቆይታ:** ${durationNames[durationId]}
**መጠን:** ${formatCurrency(amount)}

**የክፍያ ዘዴውን ይምረጡ:**`
        : `💳 **Select Payment Method**
        
**Service:** ${selectedService.name}
**Duration:** ${durationNames[durationId]}
**Amount:** ${formatCurrency(amount)}

**Select your payment method:**`;
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in duration selection:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ የእቅድ ቆይታ መምረጫ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error selecting plan duration. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
      
      // Show retry option
      const keyboard = [
        [{ text: lang === 'am' ? '🔄 እንደገና ይሞክሩ' : '🔄 Try Again', callback_data: `select_service_${serviceId}` }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      try {
        await ctx.editMessageText(errorMessage, {
          reply_markup: { inline_keyboard: keyboard }
        });
      } catch (editError) {
        console.error('Error editing message after duration selection error:', editError);
      }
    }
  });
  
  // Handle payment method selection with case-insensitive matching
  bot.action(/^select_payment_([a-z0-9]+)_(\d+_months?|1_month)_([a-z_]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const durationId = ctx.match[2];
      const paymentMethodId = ctx.match[3];
      const lang = ctx.userLang || 'en';
      const userId = ctx.from.id;
      
      console.log(`🔍 Payment selected - Service: ${serviceId}, Duration: ${durationId}, Method: ${paymentMethodId}`);
      
      const services = await loadServices();
      console.log('Available services:', services.map(s => `${s.serviceID} (${s.name})`).join(', '));
      
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
        console.error(`❌ Service not found: ${serviceId}`);
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      // Find payment method case-insensitively
      const paymentMethod = Object.values(PAYMENT_METHODS).find(
        method => method.id.toLowerCase() === paymentMethodId.toLowerCase()
      );
      
      if (!paymentMethod) {
        console.error(`❌ Payment method not found: ${paymentMethodId}`);
        await ctx.answerCbQuery(lang === 'am' ? 'የክፍያ ዘዴ አልተገኘም' : 'Payment method not found');
        return;
      }
      
      // Calculate amount
      const amount = calculateAmount(selectedService.price, durationId);
      
      // Generate a unique reference for this payment
      const initialPaymentReference = `BP-${Date.now()}-${userId.toString().slice(-4)}`;
      
      // Store payment info in user's session for screenshot upload
      ctx.session.pendingPayment = {
        serviceId,
        serviceName: selectedService.name,
        durationId,
        paymentMethodId: paymentMethod.id,
        amount,
        paymentReference: initialPaymentReference,
        timestamp: Date.now()
      };
      
      // Show payment instructions
      const paymentInstructions = lang === 'am' 
        ? paymentMethod.instructions_am.replace('{reference}', initialPaymentReference)
        : paymentMethod.instructions.replace('{reference}', initialPaymentReference);
      
      const paymentMessage = lang === 'am'
        ? `💳 *የክፍያ መመሪያዎች*\n\n` +
          `አገልግሎት: *${selectedService.name}*\n` +
          `የዕቅድ ቆይታ: *${getDurationName(durationId, lang)}*\n` +
          `መጠን: *${formatCurrency(amount)}*\n` +
          `የክፍያ ማጣቀሻ: \`${initialPaymentReference}\`\n\n` +
          `${paymentInstructions}\n\n` +
          `እባክዎ ክፍያውን ካደረጉ በኋላ የክፍያ ማረጋገጫ ስክሪንሾት ያስቀምጡ።`
        : `💳 *Payment Instructions*\n\n` +
          `Service: *${selectedService.name}*\n` +
          `Plan Duration: *${getDurationName(durationId, lang)}*\n` +
          `Amount: *${formatCurrency(amount)}*\n` +
          `Payment Reference: \`${initialPaymentReference}\`\n\n` +
          `${paymentInstructions}\n\n` +
          `After making the payment, please upload a screenshot of the payment confirmation.`;
      
      // Add a back button to payment methods
      const paymentKeyboard = [
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: `select_service_${serviceId}` }],
        [{ text: lang === 'am' ? '🏠 ዋና ገጽ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      await ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: paymentKeyboard }
      });
      
      // Set state to expect a photo next
      ctx.session.waitingForPaymentProof = true;
      
      // Notify admins about the pending payment
      await notifyAdminsAboutPendingPayment(ctx, {
        userId: ctx.from.id,
        username: ctx.from.username || 'N/A',
        firstName: ctx.from.first_name || 'N/A',
        lastName: ctx.from.last_name || '',
        serviceName: selectedService.name,
        duration: getDurationName(durationId, 'en'),
        amount: formatCurrency(amount),
        paymentMethod: paymentMethod.name,
        paymentReference: initialPaymentReference,
        timestamp: new Date().toISOString()
      }, lang);
      
      // Create subscription
      const subscriptionData = {
        userId: String(ctx.from.id),
        serviceId: serviceId,
        serviceName: selectedService.name,
        duration: durationId,
        durationName: getDurationName(durationId, 'en'),
        amount: amount,
        basePrice: selectedService.price,
        paymentMethod: paymentMethodId
      };
      
      const subscriptionResult = await createSubscription(subscriptionData);
      
      if (!subscriptionResult.success) {
        throw new Error('Failed to create subscription');
      }
      
      // For manual payments, we don't process the payment here
      // Just use the initial payment reference we already generated
      const finalPaymentReference = initialPaymentReference;
      
      // Show payment instructions
      const instructions = lang === 'am' 
        ? paymentMethod.instructions_am.replace('{reference}', finalPaymentReference)
        : paymentMethod.instructions.replace('{reference}', finalPaymentReference);
      
      const message = lang === 'am'
        ? `💳 **የክፍያ መመሪያዎች**
        
**አገልግሎት:** ${selectedService.name}
**የእቅድ ቆይታ:** ${getDurationName(durationId, 'am')}
**መጠን:** ${formatCurrency(amount)}
**የክፍያ ዘዴ:** ${paymentMethod.name_am}
**የክፍያ ማጣቀሻ:** ${finalPaymentReference}

**የክፍያ መመሪያዎች:**
${instructions}

**ክፍያውን ካደረጉ በኋላ ስክሪንሾትዎን ያስገቡ:**`
        : `💳 **Payment Instructions**
        
**Service:** ${selectedService.name}
**Duration:** ${getDurationName(durationId, 'en')}
**Amount:** ${formatCurrency(amount)}
**Payment Method:** ${paymentMethod.name}
**Payment Reference:** ${finalPaymentReference}

**Payment Instructions:**
${instructions}

**After making the payment, upload your screenshot:**`;
      
      const keyboard = [
        [{ 
          text: lang === 'am' ? '📸 ስክሪንሾት ያስገቡ' : '📸 Upload Screenshot', 
          callback_data: `upload_screenshot_${subscriptionResult.subscriptionId}_${finalPaymentReference}` 
        }],
        [{ text: lang === 'am' ? '📊 የእኔ ምዝገባዎች' : '📊 My Subscriptions', callback_data: 'my_subs' }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in payment method selection:', error);
      const lang = ctx.userLang || 'en';
      
      let errorMessage;
      if (error.message.includes('Service not found')) {
        errorMessage = lang === 'am' 
          ? '❌ አገልግሎት አልተገኘም። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Service not available. Please try again.';
      } else if (error.message.includes('Payment method')) {
        errorMessage = lang === 'am'
          ? '❌ የክፍያ ዘዴ አልተገኘም። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Payment method unavailable. Please try again.';
      } else {
        errorMessage = lang === 'am'
          ? '❌ ምዝገባ ማድረጊያ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Error creating subscription. Please try again.';
      }
      
      // Show error with retry button
      const serviceId = ctx.callbackQuery?.data?.match(/select_service_(.*)/)?.[1] || 'unknown';
      const errorKeyboard = [
        [{ text: lang === 'am' ? '🔄 እንደገና ይሞክሩ' : '🔄 Try Again', callback_data: `select_service_${serviceId}` }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      await ctx.editMessageText(errorMessage, {
        reply_markup: { inline_keyboard: errorKeyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    }
  });
  
  // Handle photo uploads when waiting for payment proof
  bot.on('photo', async (ctx) => {
    try {
      const { session } = ctx;
      
      // Check if we're expecting a payment proof
      if (!session.waitingForPaymentProof) {
        return; // Not in payment proof state
      }
      
      // Get the highest resolution photo
      const photo = ctx.message.photo.pop();
      const fileId = photo.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      // Store the file link in the pending payment
      if (session.pendingPayment) {
        session.pendingPayment.proofUrl = fileLink.href;
        
        // Handle the payment proof
        await handlePaymentProof(ctx);
      }
    } catch (error) {
      console.error('Error processing payment proof:', error);
      const lang = ctx.userLang || 'en';
      await ctx.reply(
        lang === 'am' 
          ? '❌ የክፍያ ማረጋገጫ በማስገባት ላይ ስህተት ተፈጥሯል። እባክዎ ቆይተው እንደገና ይሞክሩ።' 
          : '❌ An error occurred while processing your payment proof. Please try again later.'
      );
    }
  });
  
  // Handle text messages when waiting for payment proof
  bot.on('text', async (ctx) => {
    const { session } = ctx;
    
    // If we're waiting for payment proof and user sends a message
    if (session.waitingForPaymentProof) {
      const lang = ctx.userLang || 'en';
      await ctx.reply(
        lang === 'am'
          ? '📸 እባክዎ የክፍያ ማስረጃ ስክሪንሾት ያስቀምጡ። ከላይ ያለውን መመሪያ ይከተሉ።'
          : '📸 Please upload a screenshot of your payment proof. Follow the instructions above.'
      );
    }
  });
}
