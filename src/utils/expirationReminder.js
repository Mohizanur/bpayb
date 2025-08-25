import { firestore } from './firestore.js';
import { t } from './translations.js';

// Expiration reminder system for BirrPay Bot
class ExpirationReminder {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
  }

  // Start the expiration reminder system
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Expiration reminder system already running');
      return;
    }

    console.log('⏰ Starting expiration reminder system...');
    this.isRunning = true;

    // Run initial check
    await this.checkExpirationReminders();

    // Set up daily checks at 9:00 AM and 6:00 PM
    this.checkInterval = setInterval(async () => {
      const now = new Date();
      const hour = now.getHours();
      
      // Check at 9:00 AM and 6:00 PM
      if (hour === 9 || hour === 18) {
        console.log(`⏰ Running scheduled expiration check at ${hour}:00`);
        await this.checkExpirationReminders();
      }
    }, 60 * 60 * 1000); // Check every hour

    console.log('✅ Expiration reminder system started');
  }

  // Stop the expiration reminder system
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('🛑 Expiration reminder system stopped');
  }

  // Check for expiring subscriptions and send reminders
  async checkExpirationReminders() {
    try {
      console.log('🔍 Checking subscription expirations...');
      
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Get all active subscriptions
      const subscriptionsSnapshot = await firestore
        .collection('subscriptions')
        .where('status', '==', 'active')
        .get();

      let totalExpiring = 0;
      let remindersSent = 0;
      let adminAlertSent = false;

      for (const doc of subscriptionsSnapshot.docs) {
        const subscription = doc.data();
        const expiresAt = subscription.expiresAt?.toDate();

        if (!expiresAt) continue;

        const daysUntilExpiry = Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000));

        // Check if subscription is expiring soon
        if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
          totalExpiring++;
          
          // Send reminder to user
          await this.sendUserReminder(subscription.userId, subscription, daysUntilExpiry);
          remindersSent++;
        }

        // Check if subscription has expired
        if (expiresAt < now && subscription.status === 'active') {
          await this.handleExpiredSubscription(subscription);
        }
      }

      // Send admin alert if there are expiring subscriptions
      if (totalExpiring > 0) {
        await this.sendAdminAlert(totalExpiring, remindersSent);
        adminAlertSent = true;
      }

      console.log(`✅ Expiration check completed: ${totalExpiring} expiring, ${remindersSent} reminders sent`);
      
      return {
        totalExpiring,
        remindersSent,
        adminAlertSent,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error checking expiration reminders:', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Send reminder to user about expiring subscription
  async sendUserReminder(userId, subscription, daysUntilExpiry) {
    try {
      // Get user language preference
      const userDoc = await firestore.collection('users').doc(String(userId)).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || 'en';

      // Get service details
      const serviceDoc = await firestore.collection('services').doc(subscription.serviceId).get();
      const serviceData = serviceDoc.data() || {};

      let message = '';
      let urgency = '';

      if (daysUntilExpiry === 1) {
        urgency = '🚨 URGENT';
        message = t('subscription_expires_tomorrow', lang)
          .replace('{service}', serviceData.name || 'Unknown Service')
          .replace('{plan}', subscription.planName || 'Unknown Plan');
      } else if (daysUntilExpiry <= 3) {
        urgency = '⚠️ IMPORTANT';
        message = t('subscription_expires_soon', lang)
          .replace('{service}', serviceData.name || 'Unknown Service')
          .replace('{plan}', subscription.planName || 'Unknown Plan')
          .replace('{days}', daysUntilExpiry);
      } else {
        urgency = '📅 REMINDER';
        message = t('subscription_expires_week', lang)
          .replace('{service}', serviceData.name || 'Unknown Service')
          .replace('{plan}', subscription.planName || 'Unknown Plan')
          .replace('{days}', daysUntilExpiry);
      }

      // Store reminder in database
      await firestore.collection('reminders').add({
        userId: String(userId),
        subscriptionId: subscription.id,
        type: 'expiration',
        message: message,
        urgency: urgency,
        daysUntilExpiry: daysUntilExpiry,
        sentAt: new Date(),
        read: false
      });

      console.log(`📱 Sent expiration reminder to user ${userId}: ${daysUntilExpiry} days left`);

    } catch (error) {
      console.error(`❌ Error sending reminder to user ${userId}:`, error);
    }
  }

  // Handle expired subscription
  async handleExpiredSubscription(subscription) {
    try {
      // Update subscription status to expired
      await firestore.collection('subscriptions').doc(subscription.id).update({
        status: 'expired',
        expiredAt: new Date()
      });

      // Get user language preference
      const userDoc = await firestore.collection('users').doc(String(subscription.userId)).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || 'en';

      // Get service details
      const serviceDoc = await firestore.collection('services').doc(subscription.serviceId).get();
      const serviceData = serviceDoc.data() || {};

      const message = t('subscription_expired', lang)
        .replace('{service}', serviceData.name || 'Unknown Service')
        .replace('{plan}', subscription.planName || 'Unknown Plan');

      // Store expiration notification
      await firestore.collection('notifications').add({
        userId: String(subscription.userId),
        type: 'subscription_expired',
        message: message,
        subscriptionId: subscription.id,
        createdAt: new Date(),
        read: false
      });

      console.log(`⏰ Subscription ${subscription.id} marked as expired`);

    } catch (error) {
      console.error(`❌ Error handling expired subscription ${subscription.id}:`, error);
    }
  }

  // Send admin alert about expiring subscriptions
  async sendAdminAlert(totalExpiring, remindersSent) {
    try {
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (!adminId) return;

      const message = `📊 **Expiration Alert**\n\n` +
        `⏰ **Expiring Subscriptions:** ${totalExpiring}\n` +
        `📱 **Reminders Sent:** ${remindersSent}\n` +
        `🕐 **Time:** ${new Date().toLocaleString()}\n\n` +
        `Use /admin_expiring to view details`;

      // Store admin alert
      await firestore.collection('admin_alerts').add({
        type: 'expiration_alert',
        message: message,
        totalExpiring: totalExpiring,
        remindersSent: remindersSent,
        createdAt: new Date()
      });

      console.log(`📊 Sent admin alert: ${totalExpiring} expiring subscriptions`);

    } catch (error) {
      console.error('❌ Error sending admin alert:', error);
    }
  }

  // Manual trigger for expiration check
  async triggerExpirationCheck() {
    console.log('🔍 Manual expiration check triggered');
    return await this.checkExpirationReminders();
  }

  // Get system status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheck: new Date().toISOString(),
      nextCheck: this.getNextCheckTime()
    };
  }

  // Get next scheduled check time
  getNextCheckTime() {
    const now = new Date();
    const next9AM = new Date(now);
    next9AM.setHours(9, 0, 0, 0);
    
    const next6PM = new Date(now);
    next6PM.setHours(18, 0, 0, 0);

    if (now.getHours() < 9) {
      return next9AM;
    } else if (now.getHours() < 18) {
      return next6PM;
    } else {
      next9AM.setDate(next9AM.getDate() + 1);
      return next9AM;
    }
  }
}

// Singleton instance
const expirationReminder = new ExpirationReminder();

// Export functions for backward compatibility
export async function checkExpirationReminders() {
  return await expirationReminder.checkExpirationReminders();
}

export async function triggerExpirationCheck() {
  return await expirationReminder.triggerExpirationCheck();
}

export async function handleRenewalCallback(ctx) {
  try {
    console.log('Handling renewal callback for user:', ctx.from.id);
    
    // Get user language
    const lang = await getUserLanguage(ctx);
    
    await ctx.answerCbQuery(t('renewal_coming_soon', lang));
    
    // Send renewal instructions
    await ctx.reply(t('renewal_instructions', lang));
    
  } catch (error) {
    console.error('Error handling renewal callback:', error);
    await ctx.answerCbQuery('Error processing renewal request');
  }
}

// Export the class instance
export default expirationReminder;
