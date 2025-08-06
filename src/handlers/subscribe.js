import { createSubscription, getUser } from "../utils/database.js";
import { processPayment, PAYMENT_METHODS, calculateAmount, formatCurrency } from "../utils/payment.js";
import { loadServices } from "../utils/loadServices.js";

export default function subscribeHandler(bot) {
  // Handle service selection
  bot.action(/select_service_(.+)/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Load services
      const services = await loadServices();
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
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
      await ctx.answerCbQuery('Error occurred');
    }
  });
  
  // Handle duration selection
  bot.action(/select_duration_(.+)_(.+)/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const durationId = ctx.match[2];
      const lang = ctx.userLang || 'en';
      
      // Load services
      const services = await loadServices();
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
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
      await ctx.answerCbQuery('Error occurred');
    }
  });
  
  // Handle payment method selection
  bot.action(/select_payment_(.+)_(.+)_(.+)/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const durationId = ctx.match[2];
      const paymentMethodId = ctx.match[3];
      const lang = ctx.userLang || 'en';
      
      // Load services
      const services = await loadServices();
      const selectedService = services.find(s => s.serviceID === serviceId);
      
      if (!selectedService) {
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
      const errorMessage = lang === 'am'
        ? '❌ ምዝገባ ማድረጊያ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error creating subscription. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
    }
  });
}
