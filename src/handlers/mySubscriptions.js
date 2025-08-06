import { getSubscriptions, updateSubscription } from '../utils/database.js';
import { formatCurrency } from '../utils/payment.js';

export default function mySubscriptionsHandler(bot) {
  // Handle my subscriptions menu
  bot.action("my_subs", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      // Get user's subscriptions
      const subscriptionsResult = await getSubscriptions(ctx.from.id);
      
      if (!subscriptionsResult.success) {
        throw new Error(subscriptionsResult.error);
      }

      const subscriptions = subscriptionsResult.data;
      
      if (subscriptions.length === 0) {
        const message = lang === 'am'
          ? `📊 **የእርስዎ ምዝገባዎች**

እስካሁን ምንም ምዝገባ የለዎትም።

አዲስ ምዝገባ ለመጀመር አገልግሎቶችን ይመልከቱ:`
          : `📊 **Your Subscriptions**

You don't have any subscriptions yet.

To start a new subscription, view our services:`;

        const keyboard = [
          [{ text: lang === 'am' ? '📱 አገልግሎቶች ይመልከቱ' : '📱 View Services', callback_data: 'services' }],
          [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_start' }]
        ];

        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        
        await ctx.answerCbQuery();
        return;
      }

      // Group subscriptions by status
      const activeSubs = subscriptions.filter(sub => sub.status === 'active');
      const pendingSubs = subscriptions.filter(sub => sub.status === 'pending');
      const cancelledSubs = subscriptions.filter(sub => sub.status === 'cancelled');

      let message = lang === 'am'
        ? `📊 **የእርስዎ ምዝገባዎች**

**ንቁ ምዝገባዎች (${activeSubs.length}):**\n`
        : `📊 **Your Subscriptions**

**Active Subscriptions (${activeSubs.length}):**\n`;

      // Display active subscriptions
      if (activeSubs.length > 0) {
        activeSubs.forEach((sub, index) => {
          const startDate = sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A';
          const endDate = sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A';
          
          message += lang === 'am'
            ? `${index + 1}. **${sub.serviceName}**\n   • ጊዜ: ${sub.duration === '1month' ? '1 ወር' : sub.duration === '3months' ? '3 ወሮች' : sub.duration === '6months' ? '6 ወሮች' : '12 ወሮች'}\n   • ዋጋ: ${formatCurrency(sub.amount)}\n   • የጀመረበት: ${startDate}\n   • የሚያበቃበት: ${endDate}\n\n`
            : `${index + 1}. **${sub.serviceName}**\n   • Duration: ${sub.duration === '1month' ? '1 Month' : sub.duration === '3months' ? '3 Months' : sub.duration === '6months' ? '6 Months' : '12 Months'}\n   • Price: ${formatCurrency(sub.amount)}\n   • Started: ${startDate}\n   • Ends: ${endDate}\n\n`;
        });
      } else {
        message += lang === 'am' ? 'ምንም ንቁ ምዝገባ የለም።\n\n' : 'No active subscriptions.\n\n';
      }

      // Display pending subscriptions
      if (pendingSubs.length > 0) {
        message += lang === 'am' ? `**በመጠበቅ ላይ (${pendingSubs.length}):**\n` : `**Pending (${pendingSubs.length}):**\n`;
        
        pendingSubs.forEach((sub, index) => {
          const createdDate = sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A';
          
          message += lang === 'am'
            ? `${index + 1}. **${sub.serviceName}**\n   • ጊዜ: ${sub.duration === '1month' ? '1 ወር' : sub.duration === '3months' ? '3 ወሮች' : sub.duration === '6months' ? '6 ወሮች' : '12 ወሮች'}\n   • ዋጋ: ${formatCurrency(sub.amount)}\n   • የተጠየቀበት: ${createdDate}\n\n`
            : `${index + 1}. **${sub.serviceName}**\n   • Duration: ${sub.duration === '1month' ? '1 Month' : sub.duration === '3months' ? '3 Months' : sub.duration === '6months' ? '6 Months' : '12 Months'}\n   • Price: ${formatCurrency(sub.amount)}\n   • Requested: ${createdDate}\n\n`;
        });
      }

      // Display cancelled subscriptions
      if (cancelledSubs.length > 0) {
        message += lang === 'am' ? `**የተሰረዙ (${cancelledSubs.length}):**\n` : `**Cancelled (${cancelledSubs.length}):**\n`;
        
        cancelledSubs.forEach((sub, index) => {
          const cancelledDate = sub.updatedAt ? new Date(sub.updatedAt).toLocaleDateString() : 'N/A';
          
          message += lang === 'am'
            ? `${index + 1}. **${sub.serviceName}**\n   • የተሰረዘበት: ${cancelledDate}\n\n`
            : `${index + 1}. **${sub.serviceName}**\n   • Cancelled: ${cancelledDate}\n\n`;
        });
      }

      const keyboard = [
        [{ text: lang === 'am' ? '📱 አዲስ ምዝገባ' : '📱 New Subscription', callback_data: 'services' }],
        [{ text: lang === 'am' ? '🔄 እንደገና ይፈትሹ' : '🔄 Refresh', callback_data: 'my_subs' }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_start' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in my subscriptions action:', error);
      const lang = ctx.userLang || 'en';
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተከስቷል' : 'Error occurred');
    }
  });

  // Handle subscription cancellation
  bot.action(/cancel_sub_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Update subscription status to cancelled
      const updateResult = await updateSubscription(subscriptionId, {
        status: 'cancelled',
        cancelledAt: new Date()
      });
      
      if (!updateResult.success) {
        throw new Error(updateResult.error);
      }

      const message = lang === 'am'
        ? `✅ **ምዝገባ ተሰርዟል**

የምዝገባዎ በተሳካች ሁኔታ ተሰርዟል።

ለማንኛውም ጥያቄ ድጋፍ ያግኙን።`
        : `✅ **Subscription Cancelled**

Your subscription has been successfully cancelled.

Contact support for any questions.`;

      const keyboard = [
        [{ text: lang === 'am' ? '📊 ምዝገባዎቼን ይመልከቱ' : '📊 View My Subscriptions', callback_data: 'my_subs' }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_start' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in cancel subscription action:', error);
      const lang = ctx.userLang || 'en';
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተከስቷል' : 'Error occurred');
    }
  });

  // Handle subscription details
  bot.action(/sub_details_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Get subscription details
      const subscriptionsResult = await getSubscriptions(ctx.from.id);
      
      if (!subscriptionsResult.success) {
        throw new Error(subscriptionsResult.error);
      }

      const subscription = subscriptionsResult.data.find(sub => sub.id === subscriptionId);
      
      if (!subscription) {
        await ctx.answerCbQuery(lang === 'am' ? 'ምዝገባ አልተገኘም' : 'Subscription not found');
        return;
      }

      const startDate = subscription.startDate ? new Date(subscription.startDate).toLocaleDateString() : 'N/A';
      const endDate = subscription.endDate ? new Date(subscription.endDate).toLocaleDateString() : 'N/A';
      const createdDate = subscription.createdAt ? new Date(subscription.createdAt).toLocaleDateString() : 'N/A';

      const statusText = {
        'active': lang === 'am' ? '✅ ንቁ' : '✅ Active',
        'pending': lang === 'am' ? '⏳ በመጠበቅ ላይ' : '⏳ Pending',
        'cancelled': lang === 'am' ? '❌ ተሰርዟል' : '❌ Cancelled'
      };

      const message = lang === 'am'
        ? `📋 **የምዝገባ ዝርዝር**

**አገልግሎት:** ${subscription.serviceName}
**ሁኔታ:** ${statusText[subscription.status]}
**ጊዜ:** ${subscription.duration === '1month' ? '1 ወር' : subscription.duration === '3months' ? '3 ወሮች' : subscription.duration === '6months' ? '6 ወሮች' : '12 ወሮች'}
**ዋጋ:** ${formatCurrency(subscription.amount)}
**የክፍያ ዘዴ:** ${subscription.paymentMethod === 'cbe' ? 'የኢትዮጵያ ንግድ ባንክ' : subscription.paymentMethod === 'telebirr' ? 'Telebirr' : 'Amole'}
**የተጠየቀበት:** ${createdDate}
**የጀመረበት:** ${startDate}
**የሚያበቃበት:** ${endDate}`
        : `📋 **Subscription Details**

**Service:** ${subscription.serviceName}
**Status:** ${statusText[subscription.status]}
**Duration:** ${subscription.duration === '1month' ? '1 Month' : subscription.duration === '3months' ? '3 Months' : subscription.duration === '6months' ? '6 Months' : '12 Months'}
**Price:** ${formatCurrency(subscription.amount)}
**Payment Method:** ${subscription.paymentMethod === 'cbe' ? 'Commercial Bank of Ethiopia' : subscription.paymentMethod === 'telebirr' ? 'Telebirr' : 'Amole'}
**Requested:** ${createdDate}
**Started:** ${startDate}
**Ends:** ${endDate}`;

      const keyboard = [];

      // Add cancel button for active subscriptions
      if (subscription.status === 'active') {
        keyboard.push([{ text: lang === 'am' ? '❌ ምዝገባ ሰርዝ' : '❌ Cancel Subscription', callback_data: `cancel_sub_${subscriptionId}` }]);
      }

      keyboard.push([
        { text: lang === 'am' ? '📊 ምዝገባዎቼን ይመልከቱ' : '📊 View My Subscriptions', callback_data: 'my_subs' },
        { text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_start' }
      ]);

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in subscription details action:', error);
      const lang = ctx.userLang || 'en';
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተከስቷል' : 'Error occurred');
    }
  });
}
