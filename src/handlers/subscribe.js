import { createSubscription, getUser } from "../utils/database.js";
import { processPayment, PAYMENT_METHODS, calculateAmount, formatCurrency } from "../utils/payment.js";
import { loadServices } from "../utils/loadServices.js";

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
  
  // Handle payment method selection with proper pattern matching
  bot.action(/^select_payment_([a-z0-9]+)_(\d+_months?|1_month)_([a-z_]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const durationId = ctx.match[2];
      const paymentMethodId = ctx.match[3];
      const lang = ctx.userLang || 'en';
      
      // Load services with detailed logging
      console.log(`🔍 Payment selected - Service: ${serviceId}, Duration: ${durationId}, Method: ${paymentMethodId}`);
      
      const services = await loadServices();
      console.log('Available services:', services.map(s => `${s.serviceID} (${s.name})`).join(', '));
      
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
        console.error(`❌ Service not found: ${serviceId}`);
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      const paymentMethod = PAYMENT_METHODS[paymentMethodId];
      if (!paymentMethod) {
        await ctx.answerCbQuery(lang === 'am' ? 'የክፍያ ዘዴ አልተገኘም' : 'Payment method not found');
        return;
      }
      
      const amount = calculateAmount(selectedService.price, durationId);
      const durationNames = {
        '1_month': lang === 'am' ? '1 ወር' : '1 Month',
        '3_months': lang === 'am' ? '3 ወር' : '3 Months',
        '6_months': lang === 'am' ? '6 ወር' : '6 Months',
        '12_months': lang === 'am' ? '12 ወር' : '12 Months'
      };
      
      // Create subscription
      const subscriptionData = {
        userId: String(ctx.from.id),
        serviceId: serviceId,
        serviceName: selectedService.name,
        duration: durationId,
        durationName: durationNames[durationId],
        amount: amount,
        basePrice: selectedService.price,
        paymentMethod: paymentMethodId
      };
      
      const subscriptionResult = await createSubscription(subscriptionData);
      
      if (!subscriptionResult.success) {
        throw new Error('Failed to create subscription');
      }
      
      // Process payment
      const paymentResult = await processPayment({
        ...subscriptionData,
        subscriptionId: subscriptionResult.subscriptionId
      }, paymentMethodId);
      
      if (!paymentResult.success) {
        throw new Error('Failed to process payment');
      }
      
      // Show payment instructions
      const instructions = lang === 'am' 
        ? paymentMethod.instructions_am.replace('{reference}', paymentResult.paymentReference)
        : paymentMethod.instructions.replace('{reference}', paymentResult.paymentReference);
      
      const message = lang === 'am'
        ? `💳 **የክፍያ መመሪያዎች**
        
**አገልግሎት:** ${selectedService.name}
**የእቅድ ቆይታ:** ${durationNames[durationId]}
**መጠን:** ${formatCurrency(amount)}
**የክፍያ ዘዴ:** ${paymentMethod.name_am}
**የክፍያ ማጣቀሻ:** ${paymentResult.paymentReference}

**የክፍያ መመሪያዎች:**
${instructions}

**ክፍያውን ካደረጉ በኋላ ስክሪንሾትዎን ያስገቡ:**`
        : `💳 **Payment Instructions**
        
**Service:** ${selectedService.name}
**Duration:** ${durationNames[durationId]}
**Amount:** ${formatCurrency(amount)}
**Payment Method:** ${paymentMethod.name}
**Payment Reference:** ${paymentResult.paymentReference}

**Payment Instructions:**
${instructions}

**After making the payment, upload your screenshot:**`;
      
      const keyboard = [
        [{ text: lang === 'am' ? '📸 ስክሪንሾት ያስገቡ' : '📸 Upload Screenshot', callback_data: `upload_screenshot_${subscriptionResult.subscriptionId}` }],
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
      const keyboard = [
        [{ text: lang === 'am' ? '🔄 እንደገና ይሞክሩ' : '🔄 Try Again', callback_data: `select_service_${serviceId}` }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      await ctx.editMessageText(errorMessage, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    }
  });
}
