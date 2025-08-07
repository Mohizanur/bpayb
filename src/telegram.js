import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

// Initialize bot with retry logic
const initializeBot = () => {
  const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
    telegram: {
      // Use webhook reply when using webhooks
      webhookReply: true,
      // Custom API server if needed (optional)
      // apiRoot: 'https://api.telegram.org',
    },
    // Increase timeout for API calls
    telegram: { agent: null },
    // Disable retries in the library, we'll handle them
    retryAfter: 1,
  });

  // Error handling
  bot.catch((err, ctx) => {
    console.error('Telegraf Error:', err);
    try {
      return ctx.reply('❌ An error occurred. Please try again later.');
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  });

  return bot;
};

export default initializeBot;
