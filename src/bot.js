import { Telegraf } from 'telegraf';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Create a custom fetch with retry logic
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });
      return response;
    } catch (error) {
      if (i === retries - 1) throw error; // If this was the last attempt, throw the error
      console.warn(`Attempt ${i + 1} failed, retrying in ${delay}ms...`, error.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Create and export the bot instance with enhanced configuration
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  handlerTimeout: 30000, // Increased timeout to 30 seconds
  telegram: {
    agent: null, // Use default agent
    apiRoot: 'https://api.telegram.org',
    webhookReply: true,
    testEnv: process.env.NODE_ENV === 'test',
    testEnvUrl: process.env.TELEGRAM_TEST_URL,
    // Add custom request method with retry logic
    request: async (url, options = {}) => {
      try {
        const response = await fetchWithRetry(url, options);
        const data = await response.json();
        
        if (!data.ok) {
          console.error('Telegram API error:', data);
          throw new Error(data.description || 'Telegram API error');
        }
        
        return data;
      } catch (error) {
        console.error('Request to Telegram API failed:', error);
        throw error;
      }
    }
  },
});

// Add global error handling
bot.catch((error, ctx) => {
  console.error('Global bot error:', error);
  
  // Try to send an error message to the user if possible
  try {
    if (ctx && ctx.reply) {
      ctx.reply('Sorry, an error occurred. Please try again later.')
        .catch(e => console.error('Failed to send error message:', e));
    }
  } catch (e) {
    console.error('Error in global error handler:', e);
  }
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
