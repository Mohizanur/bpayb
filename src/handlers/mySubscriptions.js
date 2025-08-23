import { getUserSubscriptions, getSubscription } from "../utils/database.js";
import { formatCurrency } from "../utils/payment.js";
import { db } from "../../firebase-config.js";

export default function mySubscriptionsHandler(bot) {
  // Handle my subscriptions menu
  bot.action("my_subs", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const lang = ctx.userLang || 'en';
      
      // Get user's subscriptions
      const subscriptions = await getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        const message = lang === 'am'
          ? `📊 **የእኔ ምዝገባዎች**
          
እስካሁን ምንም ምዝገባዎች የሉዎትም። አዲስ ምዝገባ ለመጀመር እባክዎ አገልግሎቶችን ይምረጡ:`
          : `📊 **My Subscriptions**
          
You don't have any subscriptions yet. To start a new subscription, please select a service:`;
        
        const keyboard = [
          [{ text: lang === 'am' ? '📱 አገልግሎቶች ይምረጡ' : '📱 Select Services', callback_data: 'services' }],
          [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }]
        ];
        
        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        
        await ctx.answerCbQuery();
        return;
      }
      
      // Group subscriptions by status
      const pendingSubs = subscriptions.filter(sub => sub.status === 'pending');
      const activeSubs = subscriptions.filter(sub => sub.status === 'active');
      const cancelledSubs = subscriptions.filter(sub => sub.status === 'cancelled');
      const rejectedSubs = subscriptions.filter(sub => sub.status === 'rejected');
      
      let message = lang === 'am'
        ? `📊 **የእኔ ምዝገባዎች**
        
**የሚጠበቁ:** ${pendingSubs.length}
**ንቁ:** ${activeSubs.length}
**የተሰረዙ:** ${cancelledSubs.length}
**የተቀበሉ:** ${rejectedSubs.length}

**የምዝገባዎችዎን ያሳዩ:**`
        : `📊 **My Subscriptions**
        
**Pending:** ${pendingSubs.length}
**Active:** ${activeSubs.length}
**Cancelled:** ${cancelledSubs.length}
**Rejected:** ${rejectedSubs.length}

**View your subscriptions:**`;
      
      const keyboard = [];
      
      // Add subscription buttons
      subscriptions.slice(0, 5).forEach(sub => {
        const statusEmoji = {
          'pending': '⏳',
          'active': '✅',
          'cancelled': '❌',
          'rejected': '🚫'
        };
        
        const statusText = {
          'pending': lang === 'am' ? 'የሚጠበቅ' : 'Pending',
          'active': lang === 'am' ? 'ንቁ' : 'Active',
          'cancelled': lang === 'am' ? 'የተሰረዘ' : 'Cancelled',
          'rejected': lang === 'am' ? 'የተቀበለ' : 'Rejected'
        };
        
        keyboard.push([
          {
            text: `${statusEmoji[sub.status]} ${sub.serviceName} - ${statusText[sub.status]}`,
            callback_data: `view_subscription_${sub.id}`
          }
        ]);
      });
      
      // Add action buttons
      keyboard.push([
        { text: lang === 'am' ? '📱 አዲስ ምዝገባ' : '📱 New Subscription', callback_data: 'services' },
        { text: lang === 'am' ? '🔄 እንደገና ጫን' : '🔄 Refresh', callback_data: 'my_subs' }
      ]);
      
      keyboard.push([
        { text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }
      ]);
      
      try {
        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
      } catch (editError) {
        // Handle "message is not modified" error gracefully
        if (editError.response && editError.response.error_code === 400 && 
            editError.response.description.includes('message is not modified')) {
          console.log('Message content unchanged, skipping edit');
        } else {
          throw editError; // Re-throw other errors
        }
      }

      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in my subscriptions:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ ምዝገባዎችን ማሳየት ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error loading subscriptions. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
    }
  });
  
  // Handle individual subscription view
  bot.action(/view_subscription_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Get subscription details
      const subscription = await getSubscription(subscriptionId);
      
      if (!subscription || subscription.userId !== String(ctx.from.id)) {
        await ctx.answerCbQuery(lang === 'am' ? 'ምዝገባ አልተገኘም' : 'Subscription not found');
        return;
      }
      
      const statusEmoji = {
        'pending': '⏳',
        'active': '✅',
        'cancelled': '❌',
        'rejected': '🚫'
      };
      
      const statusText = {
        'pending': lang === 'am' ? 'የሚጠበቅ' : 'Pending',
        'active': lang === 'am' ? 'ንቁ' : 'Active',
        'cancelled': lang === 'am' ? 'የተሰረዘ' : 'Cancelled',
        'rejected': lang === 'am' ? 'የተቀበለ' : 'Rejected'
      };
      
      const paymentStatusText = {
        'pending': lang === 'am' ? 'የሚጠበቅ' : 'Pending',
        'completed': lang === 'am' ? 'ተሟልቷል' : 'Completed',
        'failed': lang === 'am' ? 'ውድቅ ሆነ' : 'Failed'
      };
      
      const message = lang === 'am'
        ? `📊 **የምዝገባ ዝርዝር**
        
**አገልግሎት:** ${subscription.serviceName || 'N/A'}
**የእቅድ ቆይታ:** ${subscription.durationName || subscription.duration || 'N/A'}
**መጠን:** ${subscription.amount && !isNaN(subscription.amount) ? formatCurrency(subscription.amount) : 'N/A'}
**ሁኔታ:** ${statusEmoji[subscription.status]} ${statusText[subscription.status]}
**የክፍያ ሁኔታ:** ${paymentStatusText[subscription.paymentStatus] || 'በመጠባበቅ ላይ'}
**የክፍያ ማጣቀሻ:** ${subscription.paymentReference || 'አልተገኘም'}
**የተፈጠረበት ቀን:** ${subscription.createdAt && typeof subscription.createdAt.toDate === 'function' 
          ? subscription.createdAt.toDate().toLocaleDateString() 
          : subscription.createdAt 
            ? new Date(subscription.createdAt).toLocaleDateString()
            : 'N/A'}

${subscription.rejectionReason ? `**የመቀበል ምክንያት:** ${subscription.rejectionReason}` : ''}`
        : `📊 **Subscription Details**
        
**Service:** ${subscription.serviceName || 'N/A'}
**Duration:** ${subscription.durationName || subscription.duration || 'N/A'}
**Amount:** ${subscription.amount && !isNaN(subscription.amount) ? formatCurrency(subscription.amount) : 'N/A'}
**Status:** ${statusEmoji[subscription.status]} ${statusText[subscription.status]}
**Payment Status:** ${paymentStatusText[subscription.paymentStatus] || 'Pending'}
**Payment Reference:** ${subscription.paymentReference || 'Not Available'}
**Created:** ${subscription.createdAt && typeof subscription.createdAt.toDate === 'function' 
          ? subscription.createdAt.toDate().toLocaleDateString() 
          : subscription.createdAt 
            ? new Date(subscription.createdAt).toLocaleDateString()
            : 'N/A'}

${subscription.rejectionReason ? `**Rejection Reason:** ${subscription.rejectionReason}` : ''}`;
      
      const keyboard = [];
      
      // Add action buttons based on status
      if (subscription.status === 'pending') {
        if (!subscription.screenshotUploaded) {
          keyboard.push([
            { text: lang === 'am' ? '📸 ስክሪንሾት ያስገቡ' : '📸 Upload Screenshot', callback_data: `upload_screenshot_${subscriptionId}` }
          ]);
        }
        keyboard.push([
          { text: lang === 'am' ? '❌ ምዝገባ ያስተሳስሩ' : '❌ Cancel Subscription', callback_data: `cancel_subscription_${subscriptionId}` }
        ]);
      } else if (subscription.status === 'active') {
        keyboard.push([
          { text: lang === 'am' ? '❌ ምዝገባ ያስተሳስሩ' : '❌ Cancel Subscription', callback_data: `cancel_subscription_${subscriptionId}` }
        ]);
      }
      
      keyboard.push([
        { text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'my_subs' }
      ]);
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error viewing subscription:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ ምዝገባ ማሳየት ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error viewing subscription. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
    }
  });
  
  // Handle subscription cancellation
  bot.action(/cancel_subscription_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Get subscription details
      const subscription = await getSubscription(subscriptionId);
      
      if (!subscription || subscription.userId !== String(ctx.from.id)) {
        await ctx.answerCbQuery(lang === 'am' ? 'ምዝገባ አልተገኘም' : 'Subscription not found');
        return;
      }
      
      if (subscription.status === 'cancelled') {
        await ctx.answerCbQuery(lang === 'am' ? 'ምዝገባው አስቀድሞ ተሰርዟል' : 'Subscription already cancelled');
        return;
      }
      
      const message = lang === 'am'
        ? `❌ **ምዝገባ ማስተሳሰር**
        
**አገልግሎት:** ${subscription.serviceName}
**የእቅድ ቆይታ:** ${subscription.durationName}
**መጠን:** ${formatCurrency(subscription.amount)}

እርስዎ ይህን ምዝገባ ማስተሳሰር እንደሚፈልጉ እርግጠኛ ነዎት?`
        : `❌ **Cancel Subscription**
        
**Service:** ${subscription.serviceName}
**Duration:** ${subscription.durationName}
**Amount:** ${formatCurrency(subscription.amount)}

Are you sure you want to cancel this subscription?`;
      
      const keyboard = [
        [
          { text: lang === 'am' ? '✅ አዎ፣ ያስተሳስሩ' : '✅ Yes, Cancel', callback_data: `confirm_cancel_${subscriptionId}` },
          { text: lang === 'am' ? '❌ አይ' : '❌ No', callback_data: `view_subscription_${subscriptionId}` }
        ]
      ];
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ ምዝገባ ማስተሳሰር ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error cancelling subscription. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
    }
  });
  
  // Handle cancellation confirmation
  bot.action(/confirm_cancel_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Update subscription status to cancelled in database
      await db.collection('subscriptions').doc(subscriptionId).update({
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: String(ctx.from.id),
        updatedAt: new Date().toISOString()
      });
      
      // Cancellation successful
      const message = lang === 'am'
        ? `✅ **ምዝገባ ተሰርዟል**
        
የእርስዎ ምዝገባ በተሳካተ ሁኔታ ተሰርዟል። ለተጨማሪ መረጃ የድጋፍ ቡድኑን ያግኙ።`
        : `✅ **Subscription Cancelled**
        
Your subscription has been cancelled successfully. Contact support for more information.`;
      
      const keyboard = [
        [{ text: lang === 'am' ? '📊 የእኔ ምዝገባዎች' : '📊 My Subscriptions', callback_data: 'my_subs' }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }]
      ];
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery(lang === 'am' ? 'ምዝገባ ተሰርዟል' : 'Subscription cancelled');
      
    } catch (error) {
      console.error('Error confirming cancellation:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ ምዝገባ ማስተሳሰር ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error cancelling subscription. Please try again.';
      
      await ctx.answerCbQuery(errorMessage);
    }
  });
}
