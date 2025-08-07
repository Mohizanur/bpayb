import { Telegraf } from 'telegraf';

// Create and export the bot instance
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  handlerTimeout: 9000,
});

// Export a function to get the bot instance (useful for dependency injection)
export function getBotInstance() {
  return bot;
}

// Export a function to set webhook URL
export async function setWebhook(url) {
  if (!url) {
    throw new Error('Webhook URL is required');
  }
  
  try {
    await bot.telegram.setWebhook(url);
    return { success: true, url };
  } catch (error) {
    console.error('Error setting webhook:', error);
    return { success: false, error: error.message };
  }
}
