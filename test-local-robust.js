// Test script for local bot with robust error handling
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

// Enhanced error handling for callback queries
const ignoreCallbackError = (error) => {
  if (error.message.includes('query is too old') || 
      error.message.includes('query ID is invalid') ||
      error.message.includes('message is not modified') ||
      error.message.includes('message to edit not found')) {
    console.log('🔄 Ignoring expected callback error:', error.message);
    return; // Ignore these specific errors
  }
  console.error('❌ Unexpected callback query error:', error);
};

// Robust bot initialization with retry logic
const initializeBotWithRetry = async (maxRetries = 5, delay = 3000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Bot initialization attempt ${attempt}/${maxRetries}...`);
      
      // Create bot with enhanced configuration
      const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
        telegram: {
          // Increase timeout for API calls
          request: {
            timeout: 30000, // 30 seconds
            retry: 3,
            retryDelay: 1000
          }
        }
      });

      // Test bot connection
      const botInfo = await bot.telegram.getMe();
      console.log(`✅ Bot connected successfully: @${botInfo.username}`);
      
      return bot;
    } catch (error) {
      console.error(`❌ Bot initialization attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ Retrying in ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        console.error('❌ All bot initialization attempts failed');
        throw error;
      }
    }
  }
};

// Main function
const main = async () => {
  try {
    console.log('🚀 Starting BirrPay Bot with robust error handling...');
    
    // Initialize bot with retry logic
    const bot = await initializeBotWithRetry();
    
    // Add basic error handling
    bot.catch((err, ctx) => {
      console.error('❌ Bot error:', err);
      try {
        ctx.reply('❌ An error occurred. Please try again later.').catch(ignoreCallbackError);
      } catch (e) {
        console.error('Error sending error message:', e);
      }
    });
    
    // Add a simple test command
    bot.command('test', async (ctx) => {
      try {
        await ctx.reply('✅ Bot is working!');
        await ctx.answerCbQuery().catch(ignoreCallbackError);
      } catch (error) {
        console.error('Error in test command:', error);
        await ctx.answerCbQuery('❌ Error occurred').catch(ignoreCallbackError);
      }
    });
    
    // Add a test callback query
    bot.action('test_callback', async (ctx) => {
      try {
        await ctx.answerCbQuery('✅ Callback working!');
        await ctx.editMessageText('✅ Callback query handled successfully!');
      } catch (error) {
        console.error('Error in test callback:', error);
        await ctx.answerCbQuery('❌ Callback error').catch(ignoreCallbackError);
      }
    });
    
    // Start the bot
    console.log('🔧 Starting bot with polling...');
    await bot.launch();
    console.log('✅ Bot started successfully!');
    console.log('📱 Test commands:');
    console.log('   /test - Test basic functionality');
    console.log('   test_callback - Test callback queries');
    
    // Graceful shutdown
    process.once('SIGINT', () => {
      console.log('🛑 Shutting down bot...');
      bot.stop('SIGINT');
    });
    
    process.once('SIGTERM', () => {
      console.log('🛑 Shutting down bot...');
      bot.stop('SIGTERM');
    });
    
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    console.log('🔄 Attempting to restart in 10 seconds...');
    
    // Wait 10 seconds before attempting restart
    setTimeout(() => {
      console.log('🔄 Restarting bot...');
      process.exit(1); // Exit with error code to trigger restart
    }, 10000);
  }
};

// Start the bot
main();
