import { Telegraf } from 'telegraf';
import { Agent } from 'https';

// Configuration
const MAX_RETRIES = 5;
const RETRY_DELAY = 3000; // 3 seconds
const REQUEST_TIMEOUT = 15000; // 15 seconds

// Create a custom HTTPS agent with keepAlive
const httpAgent = new Agent({
  keepAlive: true,
  keepAliveMsecs: 60000, // 1 minute
  maxSockets: 100,
  maxFreeSockets: 10,
  timeout: REQUEST_TIMEOUT
});

// Custom fetch with retry and timeout logic
const fetchWithRetry = async (url, options = {}, retries = MAX_RETRIES, delay = RETRY_DELAY) => {
  let lastError;
  
  for (let i = 0; i < retries; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
    
    try {
      const response = await fetch(url, {
        ...options,
        agent: httpAgent,
        signal: controller.signal,
        timeout: REQUEST_TIMEOUT,
        retry: retries,
        retryDelay: delay,
        // Add proxy support if needed
        // agent: new HttpsProxyAgent(process.env.HTTPS_PROXY)
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
        const waitTime = delay * Math.pow(2, i); // Exponential backoff
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
import { Agent as HttpsAgent } from 'https';
import { Agent as HttpAgent } from 'http';

const httpAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 100,
  keepAliveMsecs: 60000, // 1 minute
  timeout: 10000, // 10 seconds
  rejectUnauthorized: true
});

// Test Telegram API connectivity
const testTelegramConnection = async () => {
  const testUrl = `${process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org'}/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`;
  console.log('Testing connection to Telegram API at:', testUrl);
  
  try {
    const response = await fetch(testUrl, { 
      agent: httpAgent,
      timeout: 10000 
    });
    const data = await response.json();
    console.log('Telegram API connection test result:', data);
    return data.ok === true;
  } catch (error) {
    console.error('Telegram API connection test failed:', error);
    return false;
  }
};

// Create and export the bot instance with enhanced configuration
export const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  telegram: {
    agent: httpAgent, // Use our custom HTTPS agent
    apiRoot: process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org',
    webhookReply: true,
    testEnv: process.env.NODE_ENV === 'test',
    // Custom request handler with retry logic
    request: async (url, options = {}) => {
      const maxRetries = 3;
      let lastError;
      const startTime = Date.now();
      const requestId = Math.random().toString(36).substring(2, 8);
      
      console.log(`[${requestId}] Starting request to: ${url}`);
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetchWithRetry(url, {
            ...options,
            agent: httpAgent,
            headers: {
              'Content-Type': 'application/json',
              'Connection': 'keep-alive',
              'Keep-Alive': 'timeout=10, max=1000',
              ...options.headers,
            },
          });
          
          const data = await response.json();
          const duration = Date.now() - startTime;
          
          console.log(`[${requestId}] Request completed in ${duration}ms`);
          
          if (!data.ok) {
            // If it's a rate limit error, wait and retry
            if (data.error_code === 429) {
              const retryAfter = data.parameters?.retry_after || 5;
              console.warn(`[${requestId}] Rate limited, retrying after ${retryAfter} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
              continue;
            }
            
            const error = new Error(data.description || 'Telegram API error');
            error.code = data.error_code;
            error.response = data;
            console.error(`[${requestId}] Telegram API error:`, data);
            throw error;
          }
          
          return data.result;
          
        } catch (error) {
          lastError = error;
          const duration = Date.now() - startTime;
          console.error(`[${requestId}] Request attempt ${attempt} failed after ${duration}ms:`, error.message);
          
          // If it's not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const backoffTime = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Max 30s
            console.warn(`[${requestId}] Retrying in ${backoffTime}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffTime));
          } else {
            // If this was the last attempt, throw the error
            console.error(`[${requestId}] All ${maxRetries} attempts failed after ${duration}ms`);
            throw lastError || new Error('Unknown error in Telegram API request');
          }
        }
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
