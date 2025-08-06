import { createSubscription, getUser } from '../utils/database.js';
import { initiatePayment, formatCurrency } from '../utils/payment.js';
import { loadServices } from '../utils/loadServices.js';

export default function subscribeHandler(bot) {
  // Handle service selection
  bot.action(/subscribe_(.+)/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Load services
      const services = await loadServices();
      const service = services.find(s => s.serviceID === serviceId);
      
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      // Show duration options
      const durations = [
        { id: '1month', name: lang === 'am' ? '1 ወር' : '1 Month', price: service.price },
        { id: '3months', name: lang === 'am' ? '3 ወሮች' : '3 Months', price: service.price * 3 },
        { id: '6months', name: lang === 'am' ? '6 ወሮች' : '6 Months', price: service.price * 6 },
        { id: '12months', name: lang === 'am' ? '12 ወሮች' : '12 Months', price: service.price * 12 }
      ];

      const message = lang === 'am'
        ? `📱 **${service.name} - የምዝገባ እቅድ ይምረጡ**

የሚፈልጉትን የምዝገባ ጊዜ ይምረጡ:`
        : `📱 **${service.name} - Choose Subscription Plan**

Select your preferred subscription duration:`;

      const keyboard = durations.map(duration => [{
        text: `${duration.name} - ${formatCurrency(duration.price)}`,
        callback_data: `duration_${serviceId}_${duration.id}`
      }]);

      keyboard.push([{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_services' }]);

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in subscribe action:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Handle duration selection
  bot.action(/duration_(.+)_(.+)/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2];
      const lang = ctx.userLang || 'en';
      
      // Load services
      const services = await loadServices();
      const service = services.find(s => s.serviceID === serviceId);
      
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      // Calculate price based on duration
      const durationMultiplier = {
        '1month': 1,
        '3months': 3,
        '6months': 6,
        '12months': 12
      };
      
      const totalPrice = service.price * durationMultiplier[duration];

      // Show payment methods
      const paymentMethods = [
        { id: 'cbe', name: lang === 'am' ? 'የኢትዮጵያ ንግድ ባንክ' : 'Commercial Bank of Ethiopia' },
        { id: 'telebirr', name: 'Telebirr' },
        { id: 'amole', name: 'Amole' }
      ];

      const message = lang === 'am'
        ? `💳 **${service.name} - የክፍያ ዘዴ ይምረጡ**

**የምዝገባ መረጃ:**
• አገልግሎት: ${service.name}
• ጊዜ: ${duration === '1month' ? '1 ወር' : duration === '3months' ? '3 ወሮች' : duration === '6months' ? '6 ወሮች' : '12 ወሮች'}
• ዋጋ: ${formatCurrency(totalPrice)}

የክፍያ ዘዴዎን ይምረጡ:`
        : `💳 **${service.name} - Choose Payment Method**

**Subscription Details:**
• Service: ${service.name}
• Duration: ${duration === '1month' ? '1 Month' : duration === '3months' ? '3 Months' : duration === '6months' ? '6 Months' : '12 Months'}
• Price: ${formatCurrency(totalPrice)}

Select your payment method:`;

      const keyboard = paymentMethods.map(method => [{
        text: method.name,
        callback_data: `payment_${serviceId}_${duration}_${method.id}`
      }]);

      keyboard.push([{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: `subscribe_${serviceId}` }]);

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in duration action:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Handle payment method selection
  bot.action(/payment_(.+)_(.+)_(.+)/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2];
      const paymentMethod = ctx.match[3];
      const lang = ctx.userLang || 'en';
      
      // Load services
      const services = await loadServices();
      const service = services.find(s => s.serviceID === serviceId);
      
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      // Calculate price
      const durationMultiplier = {
        '1month': 1,
        '3months': 3,
        '6months': 6,
        '12months': 12
      };
      
      const totalPrice = service.price * durationMultiplier[duration];

      // Create subscription record
      const subscriptionData = {
        userId: String(ctx.from.id),
        serviceId,
        serviceName: service.name,
        duration,
        amount: totalPrice,
        paymentMethod,
        status: 'pending'
      };

      const subscriptionResult = await createSubscription(subscriptionData);
      
      if (!subscriptionResult.success) {
        throw new Error(subscriptionResult.error);
      }

      // Initiate payment
      const paymentResult = await initiatePayment(
        ctx.from.id,
        serviceId,
        totalPrice,
        duration,
        paymentMethod
      );

      if (!paymentResult.success) {
        throw new Error(paymentResult.error);
      }

      // Show payment instructions
      const instructions = paymentResult.instructions;
      const message = lang === 'am'
        ? `💳 **የክፍያ መመሪያዎች**

**የምዝገባ መረጃ:**
• አገልግሎት: ${service.name}
• ጊዜ: ${duration === '1month' ? '1 ወር' : duration === '3months' ? '3 ወሮች' : duration === '6months' ? '6 ወሮች' : '12 ወሮች'}
• ዋጋ: ${formatCurrency(totalPrice)}
• የመጣጣም ቁጥር: ${paymentResult.reference}

**የክፍያ መመሪያዎች:**
${instructions.instructions.map(instruction => `• ${instruction}`).join('\n')}

**የመለያ መረጃ:**
• የመለያ ቁጥር: ${instructions.accountInfo}
• የመለያ ስም: ${instructions.accountName}

ክፍያውን ካደረጉ በኋላ የክፍያ ስክሪንሾት ይጫኑ:`
        : `💳 **Payment Instructions**

**Subscription Details:**
• Service: ${service.name}
• Duration: ${duration === '1month' ? '1 Month' : duration === '3months' ? '3 Months' : duration === '6months' ? '6 Months' : '12 Months'}
• Price: ${formatCurrency(totalPrice)}
• Reference: ${paymentResult.reference}

**Payment Instructions:**
${instructions.instructions.map(instruction => `• ${instruction}`).join('\n')}

**Account Information:**
• Account Number: ${instructions.accountInfo}
• Account Name: ${instructions.accountName}

After making the payment, upload your payment screenshot:`;

      const keyboard = [
        [{ text: lang === 'am' ? '📸 የክፍያ ስክሪንሾት ይጫኑ' : '📸 Upload Payment Screenshot', callback_data: `upload_screenshot_${subscriptionResult.subscriptionId}` }],
        [{ text: lang === 'am' ? '📊 የክፍያ ሁኔታ ይመልከቱ' : '📊 Check Payment Status', callback_data: `check_payment_${paymentResult.paymentId}` }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_services' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in payment action:', error);
      const lang = ctx.userLang || 'en';
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተከስቷል' : 'Error occurred');
    }
  });

  // Handle payment status check
  bot.action(/check_payment_(.+)/, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Get payment status (this would typically fetch from database)
      const status = 'pending'; // Mock status for now
      
      const statusText = {
        'pending': lang === 'am' ? '⏳ በመጠበቅ ላይ' : '⏳ Pending',
        'completed': lang === 'am' ? '✅ ተሳትሟል' : '✅ Completed',
        'rejected': lang === 'am' ? '❌ ተቀብሏል' : '❌ Rejected'
      };

      const message = lang === 'am'
        ? `📊 **የክፍያ ሁኔታ**

የክፍያ ሁኔታ: ${statusText[status]}

${status === 'pending' ? 'ክፍያው እስካሁን አልተረጋገጠም። እባክዎ ያስተናግዱ።' : ''}`
        : `📊 **Payment Status**

Payment Status: ${statusText[status]}

${status === 'pending' ? 'Payment has not been verified yet. Please wait.' : ''}`;

      const keyboard = [
        [{ text: lang === 'am' ? '🔄 እንደገና ይፈትሹ' : '🔄 Refresh', callback_data: `check_payment_${paymentId}` }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_services' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in check payment action:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });
}
