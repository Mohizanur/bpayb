// Webhook Manager for BirrPay Bot
// Handles webhook setup, status checking, and management

class WebhookManager {
  constructor(bot) {
    this.bot = bot;
    this.webhookUrl = process.env.WEBHOOK_URL || 'https://bpayb.onrender.com/telegram';
    this.isWebhookActive = false;
  }

  // Set up webhook
  async setupWebhook() {
    try {
      console.log('🔄 Setting up webhook...');
      
      // Delete any existing webhook
      await this.bot.telegram.deleteWebhook();
      console.log('🗑️ Deleted existing webhook');
      
      // Set new webhook
      await this.bot.telegram.setWebhook(this.webhookUrl);
      console.log(`✅ Webhook set to: ${this.webhookUrl}`);
      
      // Verify webhook is set
      const webhookInfo = await this.bot.telegram.getWebhookInfo();
      console.log('📊 Webhook Info:', {
        url: webhookInfo.url,
        has_custom_certificate: webhookInfo.has_custom_certificate,
        pending_update_count: webhookInfo.pending_update_count,
        last_error_date: webhookInfo.last_error_date,
        last_error_message: webhookInfo.last_error_message
      });
      
      this.isWebhookActive = true;
      return true;
    } catch (error) {
      console.error('❌ Webhook setup failed:', error.message);
      this.isWebhookActive = false;
      return false;
    }
  }

  // Check webhook status
  async checkWebhookStatus() {
    try {
      const webhookInfo = await this.bot.telegram.getWebhookInfo();
      return {
        isActive: webhookInfo.url === this.webhookUrl,
        url: webhookInfo.url,
        pendingUpdates: webhookInfo.pending_update_count,
        lastError: webhookInfo.last_error_message,
        lastErrorDate: webhookInfo.last_error_date
      };
    } catch (error) {
      console.error('❌ Failed to check webhook status:', error.message);
      return {
        isActive: false,
        error: error.message
      };
    }
  }

  // Delete webhook
  async deleteWebhook() {
    try {
      await this.bot.telegram.deleteWebhook();
      console.log('🗑️ Webhook deleted successfully');
      this.isWebhookActive = false;
      return true;
    } catch (error) {
      console.error('❌ Failed to delete webhook:', error.message);
      return false;
    }
  }

  // Get webhook URL
  getWebhookUrl() {
    return this.webhookUrl;
  }

  // Check if webhook is active
  isActive() {
    return this.isWebhookActive;
  }
}

export default WebhookManager;


      const webhookInfo = await this.bot.telegram.getWebhookInfo();

      return {

        isActive: webhookInfo.url === this.webhookUrl,

        url: webhookInfo.url,

        pendingUpdates: webhookInfo.pending_update_count,

        lastError: webhookInfo.last_error_message,

        lastErrorDate: webhookInfo.last_error_date

      };

    } catch (error) {

      console.error('❌ Failed to check webhook status:', error.message);

      return {

        isActive: false,

        error: error.message

      };

    }

  }



  // Delete webhook

  async deleteWebhook() {

    try {

      await this.bot.telegram.deleteWebhook();

      console.log('🗑️ Webhook deleted successfully');

      this.isWebhookActive = false;

      return true;

    } catch (error) {

      console.error('❌ Failed to delete webhook:', error.message);

      return false;

    }

  }



  // Get webhook URL

  getWebhookUrl() {

    return this.webhookUrl;

  }



  // Check if webhook is active

  isActive() {

    return this.isWebhookActive;

  }

}



export default WebhookManager;


