import { Telegraf } from 'telegraf';

// Configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Custom fetch with retry and timeout logic
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per attempt
    
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        timeout: 10000, // Total timeout including retries
        retry: retries,
        retryDelay: delay
      });
      
      clearTimeout(timeoutId);
      
      // Handle non-2xx responses
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      
      return response;
    } catch (error) {
      lastError = error;
      
      // Don't retry on 4xx errors (except 429 - Too Many Requests)
      if (error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        console.warn(`Non-retryable error (${error.status}), giving up`);
        break;
      }
      
      if (i < retries - 1) {
        const waitTime = delay * (i + 1); // Exponential backoff
        console.warn(`Attempt ${i + 1} failed, retrying in ${waitTime}ms...`, error.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }
  
  throw lastError || new Error('Unknown error occurred after all retries');
};

// Enhanced HTTP agent for better connection handling
const https = require('https');
const http = require('http');

const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 100,
  keepAliveMsecs: 60000, // 1 minute
  timeout: 10000, // 10 seconds
  rejectUnauthorized: true
});

// Create and export the bot instance with enhanced configuration
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  handlerTimeout: 45000, // Increased timeout to 45 seconds
  telegram: {
    agent: agent, // Use our custom agent
    apiRoot: 'https://api.telegram.org',
    webhookReply: true,
    testEnv: process.env.NODE_ENV === 'test',
    testEnvUrl: process.env.TELEGRAM_TEST_URL,
    // Add custom request method with retry logic
    request: async (url, options = {}) => {
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substring(2, 10);
      
      console.log(`[${requestId}] Starting request to: ${url}`);
      
      try {
        const response = await fetchWithRetry(url, {
          ...options,
          agent: url.startsWith('https') ? agent : new http.Agent(),
          headers: {
            ...options.headers,
            'Connection': 'keep-alive',
            'Keep-Alive': 'timeout=10, max=1000'
          }
        });
        
        const data = await response.json();
        const duration = Date.now() - startTime;
        
        console.log(`[${requestId}] Request completed in ${duration}ms`);
        
        if (!data.ok) {
          const error = new Error(data.description || 'Telegram API error');
          error.code = data.error_code;
          error.response = data;
          console.error(`[${requestId}] Telegram API error:`, data);
          throw error;
        }
        
        return data;
      } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[${requestId}] Request failed after ${duration}ms:`, error.message);
        
        // Add more context to the error
        error.requestUrl = url;
        error.requestOptions = {
          ...options,
          headers: { ...options.headers, 'authorization': '***REDACTED***' }
        };
        
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
