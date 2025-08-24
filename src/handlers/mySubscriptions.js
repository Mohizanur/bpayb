import { getUserSubscriptions, getSubscription } from "../utils/database.js";
import { formatCurrency } from "../utils/payment.js";
import { db } from "../../firebase-config.js";
import { t, getUserLanguage } from "../utils/translations.js";

export default function mySubscriptionsHandler(bot) {
  // Handle my subscriptions menu
  bot.action("my_subs", async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const lang = await getUserLanguage(ctx);
      
      // Get user's subscriptions
      const subscriptions = await getUserSubscriptions(userId);
      
      if (subscriptions.length === 0) {
        const message = `📊 **${t('my_subscriptions', lang)}**
        
${t('no_subscriptions_yet', lang)}`;
        
        const keyboard = [
          [{ text: t('select_services', lang), callback_data: 'services' }],
          [{ text: t('main_menu', lang), callback_data: 'back_to_menu' }]
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
      
      let message = `📊 **${t('my_subscriptions', lang)}**
        
**${t('pending', lang)}:** ${pendingSubs.length}
**${t('active', lang)}:** ${activeSubs.length}
**${t('cancelled', lang)}:** ${cancelledSubs.length}
**${t('rejected', lang)}:** ${rejectedSubs.length}

**${t('view_your_subscriptions', lang)}:**`;
      
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
          'pending': t('pending', lang),
          'active': t('active', lang),
          'cancelled': t('cancelled', lang),
          'rejected': t('rejected', lang)
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
        { text: t('new_subscription', lang), callback_data: 'services' },
        { text: t('refresh', lang), callback_data: 'my_subs' }
      ]);
      
      keyboard.push([
        { text: t('main_menu', lang), callback_data: 'back_to_menu' }
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
      const lang = await getUserLanguage(ctx);
      await ctx.answerCbQuery(t('error_loading_subscriptions', lang));
    }
  });
  
  // Handle individual subscription view
  bot.action(/view_subscription_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = await getUserLanguage(ctx);
      
      // Get subscription details
      const subscription = await getSubscription(subscriptionId);
      
      if (!subscription || subscription.userId !== String(ctx.from.id)) {
        await ctx.answerCbQuery(t('subscription_not_found', lang));
        return;
      }
      
      const statusEmoji = {
        'pending': '⏳',
        'active': '✅',
        'cancelled': '❌',
        'rejected': '🚫'
      };
      
      const statusText = {
        'pending': t('pending', lang),
        'active': t('active', lang),
        'cancelled': t('cancelled', lang),
        'rejected': t('rejected', lang)
      };
      
      const paymentStatusText = {
        'pending': t('pending', lang),
        'completed': t('completed', lang),
        'failed': t('failed', lang)
      };
      
      const message = `📊 **${t('subscription_details', lang)}**
        
**${t('service', lang)}:** ${subscription.serviceName || 'N/A'}
**${t('duration', lang)}:** ${subscription.durationName || subscription.duration || 'N/A'}
**${t('amount', lang)}:** ${subscription.amount && !isNaN(subscription.amount) ? formatCurrency(subscription.amount) : 'N/A'}
**${t('status', lang)}:** ${statusEmoji[subscription.status]} ${statusText[subscription.status]}
**${t('payment_status', lang)}:** ${paymentStatusText[subscription.paymentStatus] || t('pending', lang)}
**${t('payment_reference', lang)}:** ${subscription.paymentReference || t('not_available', lang)}
**${t('created', lang)}:** ${subscription.createdAt && typeof subscription.createdAt.toDate === 'function' 
          ? subscription.createdAt.toDate().toLocaleDateString() 
          : subscription.createdAt 
            ? new Date(subscription.createdAt).toLocaleDateString()
            : 'N/A'}

${subscription.rejectionReason ? `**${t('rejection_reason', lang)}:** ${subscription.rejectionReason}` : ''}`;
      
      const keyboard = [];
      
      // Add action buttons based on status
      if (subscription.status === 'pending') {
        if (!subscription.screenshotUploaded) {
          keyboard.push([
            { text: t('upload_screenshot', lang), callback_data: `upload_screenshot_${subscriptionId}` }
          ]);
        }
        keyboard.push([
          { text: t('cancel_subscription', lang), callback_data: `cancel_subscription_${subscriptionId}` }
        ]);
      } else if (subscription.status === 'active') {
        keyboard.push([
          { text: t('cancel_subscription', lang), callback_data: `cancel_subscription_${subscriptionId}` }
        ]);
      }
      
      keyboard.push([
        { text: t('back', lang), callback_data: 'my_subs' }
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
