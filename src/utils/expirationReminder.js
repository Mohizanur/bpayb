import { firestore } from './firestore.js';
import { bot } from '../bot.js';

/**
 * Subscription Expiration Reminder System
 * Checks for subscriptions expiring soon and sends notifications
 */

// Helper function to format date
const formatDate = (timestamp) => {
  if (!timestamp) return 'Unknown';
  const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Helper function to get days until expiration
const getDaysUntilExpiration = (endDate) => {
  if (!endDate) return null;
  
  const expiry = endDate.seconds ? new Date(endDate.seconds * 1000) : new Date(endDate);
  const now = new Date();
  const diffTime = expiry - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// Get user language preference
const getUserLanguage = async (userId) => {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (userDoc.exists) {
      return userDoc.data().language || 'en';
    }
  } catch (error) {
    console.error('Error getting user language:', error);
  }
  return 'en';
};

// Get user display name
const getUserDisplayName = async (userId) => {
  try {
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      return userData.username ? `@${userData.username}` : 
             (userData.firstName && userData.lastName) ? `${userData.firstName} ${userData.lastName}` :
             userData.firstName || `User ${userId}`;
    }
  } catch (error) {
    console.error('Error getting user display name:', error);
  }
  return `User ${userId}`;
};

// Send expiration reminder to user
const sendUserExpirationReminder = async (subscription, daysLeft) => {
  try {
    const userId = subscription.userId;
    const lang = await getUserLanguage(userId);
    
    const serviceName = subscription.serviceName || subscription.service || 'Your subscription';
    const expiryDate = formatDate(subscription.endDate);
    
    let message;
    if (lang === 'am') {
      if (daysLeft === 1) {
        message = `⚠️ **የደንበኝነት ማስታወቂያ** ⚠️

🎬 **አገልግሎት:** ${serviceName}
📅 **ማብቂያ ቀን:** ${expiryDate}
⏰ **ቀሪ ጊዜ:** 1 ቀን

የእርስዎ የደንበኝነት አገልግሎት ነገ ያበቃል!

🔄 **አሁኑኑ ያድሱ:**
• /start ይጫኑ
• አዲስ የደንበኝነት እቅድ ይምረጡ
• የክፍያ ማረጋገጫ ይላኩ

💡 **ለምን ማደስ አለብዎት?**
• ያለማቋረጥ አገልግሎት
• ምርጥ ዋጋ
• ፈጣን ማጽደቅ

📞 **እገዛ:** /support`;
      } else {
        message = `🔔 **የደንበኝነት ማስታወቂያ** 🔔

🎬 **አገልግሎት:** ${serviceName}
📅 **ማብቂያ ቀን:** ${expiryDate}
⏰ **ቀሪ ጊዜ:** ${daysLeft} ቀናት

የእርስዎ የደንበኝነት አገልግሎት በቅርቡ ያበቃል።

🔄 **አሁኑኑ ያድሱ:**
• /start ይጫኑ
• አዲስ የደንበኝነት እቅድ ይምረጡ
• የክፍያ ማረጋገጫ ይላኩ

💰 **ልዩ ቅናሽ:** የመጀመሪያ ደንበኞች 10% ቅናሽ!

📞 **እገዛ:** /support`;
      }
    } else {
      if (daysLeft === 1) {
        message = `⚠️ **Subscription Expiring Tomorrow!** ⚠️

🎬 **Service:** ${serviceName}
📅 **Expires:** ${expiryDate}
⏰ **Time Left:** 1 day

Your subscription expires tomorrow! Don't lose access to your favorite content.

🔄 **Renew Now:**
• Click /start
• Choose a subscription plan
• Submit payment proof
• Get instant activation

💡 **Why Renew?**
• Uninterrupted service
• Best pricing
• Fast approval

📞 **Need Help?** /support`;
      } else {
        message = `🔔 **Subscription Reminder** 🔔

🎬 **Service:** ${serviceName}
📅 **Expires:** ${expiryDate}
⏰ **Time Left:** ${daysLeft} days

Your subscription is expiring soon. Renew now to avoid service interruption!

🔄 **Renew Now:**
• Click /start
• Choose a subscription plan
• Submit payment proof
• Get instant activation

💰 **Special Offer:** 10% discount for early renewals!

📞 **Need Help?** /support`;
      }
    }

    // Add renewal buttons
    const renewalKeyboard = {
      inline_keyboard: [
        [
          { 
            text: lang === 'am' ? '🔄 አድስ' : '🔄 Renew Now', 
            callback_data: 'start_renewal' 
          }
        ],
        [
          { 
            text: lang === 'am' ? '📊 የእኔ ደንበኝነቶች' : '📊 My Subscriptions', 
            callback_data: 'my_subs' 
          }
        ],
        [
          { 
            text: lang === 'am' ? '📞 እገዛ' : '📞 Support', 
            callback_data: 'support' 
          }
        ]
      ]
    };

    await bot.telegram.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      reply_markup: renewalKeyboard
    });

    // Log the reminder
    await firestore.collection('reminderLogs').add({
      type: 'user_expiration_reminder',
      userId: userId,
      subscriptionId: subscription.id,
      serviceName: serviceName,
      daysLeft: daysLeft,
      sentAt: new Date(),
      language: lang
    });

    console.log(`✅ Sent expiration reminder to user ${userId} for ${serviceName} (${daysLeft} days left)`);
    return true;

  } catch (error) {
    console.error('Error sending user expiration reminder:', error);
    return false;
  }
};

// Send expiration alert to admins
const sendAdminExpirationAlert = async (expiringSubscriptions) => {
  try {
    // Get admin IDs
    const adminDoc = await firestore.collection('config').doc('admins').get();
    let adminIds = [];
    
    if (adminDoc.exists) {
      adminIds = adminDoc.data().userIds || [];
    }
    
    // Fallback to environment variable
    if (adminIds.length === 0 && process.env.ADMIN_TELEGRAM_ID) {
      adminIds = [process.env.ADMIN_TELEGRAM_ID];
    }

    if (adminIds.length === 0) {
      console.warn('No admin IDs found for expiration alerts');
      return false;
    }

    // Group subscriptions by days left
    const groupedSubs = {
      1: expiringSubscriptions.filter(sub => getDaysUntilExpiration(sub.endDate) === 1),
      3: expiringSubscriptions.filter(sub => getDaysUntilExpiration(sub.endDate) === 3),
      7: expiringSubscriptions.filter(sub => getDaysUntilExpiration(sub.endDate) === 7)
    };

    let alertMessage = `🚨 **Subscription Expiration Alert** 🚨

📊 **Summary:**
• Tomorrow: ${groupedSubs[1].length} subscriptions
• In 3 days: ${groupedSubs[3].length} subscriptions  
• In 7 days: ${groupedSubs[7].length} subscriptions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

    // Add details for each group
    for (const [days, subs] of Object.entries(groupedSubs)) {
      if (subs.length > 0) {
        alertMessage += `⏰ **Expiring in ${days} day${days > 1 ? 's' : ''}:**\n`;
        
        for (const sub of subs.slice(0, 5)) {
          const userDisplayName = await getUserDisplayName(sub.userId);
          const serviceName = sub.serviceName || sub.service || 'Unknown Service';
          const expiryDate = formatDate(sub.endDate);
          
          alertMessage += `• ${userDisplayName} - ${serviceName} (${expiryDate})\n`;
        }
        
        if (subs.length > 5) {
          alertMessage += `• ...and ${subs.length - 5} more\n`;
        }
        alertMessage += '\n';
      }
    }

    alertMessage += `🎯 **Recommended Actions:**
• Contact users for renewal reminders
• Prepare renewal offers and discounts
• Monitor subscription renewal rates
• Update service availability

📊 **View Details:** Use admin panel for full subscription management

⏰ **Alert Time:** ${new Date().toLocaleString()}`;

    // Send to all admins
    const adminKeyboard = {
      inline_keyboard: [
        [{ text: '📊 View Admin Panel', callback_data: 'admin' }],
        [{ text: '🟢 Active Subscriptions', callback_data: 'admin_active' }],
        [{ text: '📈 Subscription Stats', callback_data: 'admin_subscriptions' }]
      ]
    };

    for (const adminId of adminIds) {
      try {
        await bot.telegram.sendMessage(adminId, alertMessage, {
          parse_mode: 'Markdown',
          reply_markup: adminKeyboard
        });
      } catch (error) {
        console.error(`Error sending expiration alert to admin ${adminId}:`, error);
      }
    }

    // Log the admin alert
    await firestore.collection('reminderLogs').add({
      type: 'admin_expiration_alert',
      adminIds: adminIds,
      expiringCount: expiringSubscriptions.length,
      breakdown: {
        tomorrow: groupedSubs[1].length,
        threeDays: groupedSubs[3].length,
        sevenDays: groupedSubs[7].length
      },
      sentAt: new Date()
    });

    console.log(`✅ Sent expiration alerts to ${adminIds.length} admins for ${expiringSubscriptions.length} expiring subscriptions`);
    return true;

  } catch (error) {
    console.error('Error sending admin expiration alert:', error);
    return false;
  }
};

// Main function to check and send expiration reminders
export const checkExpirationReminders = async () => {
  try {
    console.log('🔍 Checking for subscription expirations...');
    
    // Get all active subscriptions
    const subscriptionsSnapshot = await firestore.collection('subscriptions')
      .where('status', '==', 'active')
      .get();

    if (subscriptionsSnapshot.empty) {
      console.log('No active subscriptions found');
      return;
    }

    const now = new Date();
    const expiringSubscriptions = [];
    const userReminders = [];

    // Check each subscription
    for (const doc of subscriptionsSnapshot.docs) {
      const subscription = { id: doc.id, ...doc.data() };
      const daysLeft = getDaysUntilExpiration(subscription.endDate);

      // Skip if no valid expiration date
      if (daysLeft === null || daysLeft < 0) continue;

      // Check if we should send reminders (1, 3, or 7 days)
      if ([1, 3, 7].includes(daysLeft)) {
        expiringSubscriptions.push(subscription);

        // Check if we already sent a reminder for this subscription and timeframe
        const existingReminderQuery = await firestore.collection('reminderLogs')
          .where('subscriptionId', '==', subscription.id)
          .where('daysLeft', '==', daysLeft)
          .where('type', '==', 'user_expiration_reminder')
          .limit(1)
          .get();

        // Only send if we haven't sent this reminder before
        if (existingReminderQuery.empty) {
          userReminders.push({ subscription, daysLeft });
        }
      }
    }

    console.log(`Found ${expiringSubscriptions.length} expiring subscriptions`);
    console.log(`Sending ${userReminders.length} user reminders`);

    // Send user reminders
    let successfulReminders = 0;
    for (const { subscription, daysLeft } of userReminders) {
      const success = await sendUserExpirationReminder(subscription, daysLeft);
      if (success) successfulReminders++;
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Send admin alert if there are expiring subscriptions
    if (expiringSubscriptions.length > 0) {
      await sendAdminExpirationAlert(expiringSubscriptions);
    }

    console.log(`✅ Expiration check complete: ${successfulReminders}/${userReminders.length} user reminders sent`);
    
    return {
      totalExpiring: expiringSubscriptions.length,
      remindersSent: successfulReminders,
      adminAlertSent: expiringSubscriptions.length > 0
    };

  } catch (error) {
    console.error('Error in checkExpirationReminders:', error);
    throw error;
  }
};

// Function to manually trigger expiration check (for testing)
export const triggerExpirationCheck = async () => {
  console.log('🔧 Manually triggering expiration check...');
  return await checkExpirationReminders();
};

// Handle renewal callback
export const handleRenewalCallback = async (ctx) => {
  try {
    await ctx.answerCbQuery();
    
    // Redirect to start command for subscription selection
    const lang = await getUserLanguage(ctx.from.id.toString());
    
    const message = lang === 'am' 
      ? '🔄 **የደንበኝነት እድሳት**\n\nእባክዎ የሚፈልጉትን አገልግሎት ይምረጡ:'
      : '🔄 **Subscription Renewal**\n\nPlease select the service you want to renew:';
    
    // Import and use the start handler functionality
    const { startHandler } = await import('../handlers/start.js');
    await startHandler(ctx);
    
  } catch (error) {
    console.error('Error handling renewal callback:', error);
    await ctx.answerCbQuery('❌ Error processing renewal request');
  }
};
