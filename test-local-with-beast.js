/**
 * 🚀 LOCAL BOT TEST WITH SMART BEAST MODE
 * 
 * This tests your bot locally with Smart Beast Mode enabled
 */

import 'dotenv/config';
import { Telegraf } from 'telegraf';
import smartBeastMain from './src/utils/smartBeastMain.js';

console.log('🚀 Starting Local Bot Test with Smart Beast Mode...\n');

// Check if bot token is available
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('💡 Please add your bot token to your .env file:');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
    process.exit(1);
}

// Create bot instance
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Initialize Smart Beast Mode
async function initializeSmartBeast() {
    try {
        console.log('🚀 Initializing Smart Beast Mode...');
        await smartBeastMain.initializeSmartBeastMode();
        smartBeastMain.registerSmartBeastMode(bot);
        console.log('✅ Smart Beast Mode initialized successfully!');
        
        // Auto-enable for testing
        await smartBeastMain.enableSmartBeastMode();
        console.log('✅ Smart Beast Mode enabled for testing!');
        
    } catch (error) {
        console.warn('⚠️ Smart Beast Mode initialization failed:', error.message);
        console.log('🔄 Continuing without Smart Beast Mode...');
    }
}

// Basic bot commands
bot.start((ctx) => {
    console.log('✅ Bot received /start command');
    ctx.reply('🚀 Bot is working! Smart Beast Mode is active!');
});

bot.command('test', (ctx) => {
    console.log('✅ Bot received /test command');
    ctx.reply('✅ Bot is responding correctly!');
});

bot.command('status', (ctx) => {
    console.log('✅ Bot received /status command');
    const status = smartBeastMain.getSmartBeastStatus();
    ctx.reply(`📊 Bot Status:\n` +
              `🚀 Smart Beast Mode: ${status.enabled ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
              `💾 Memory: ${Math.round(status.memoryUsage.heapUsed / (1024 * 1024))}MB\n` +
              `📈 Cache: ${status.cacheSize}/${status.maxCacheSize}\n` +
              `⏱️ Uptime: ${Math.round(status.uptime / 60)} minutes`);
});

// Error handling
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    ctx.reply('Sorry, an error occurred. Please try again.');
});

// Start the bot
async function startBot() {
    try {
        // Initialize Smart Beast Mode first
        await initializeSmartBeast();
        
        console.log('🤖 Starting bot in polling mode...');
        await bot.launch();
        console.log('✅ Bot started successfully!');
        console.log('🎯 Bot is ready to receive commands!');
        console.log('\n📱 Test these commands in your Telegram chat:');
        console.log('   /start - Test basic functionality');
        console.log('   /test - Test command handling');
        console.log('   /status - Check bot and Smart Beast Mode status');
        console.log('   /beast_enable - Enable Smart Beast Mode');
        console.log('   /beast_disable - Disable Smart Beast Mode');
        console.log('   /beast_status - Detailed Smart Beast Mode status');
        console.log('   /beast_tips - Get optimization tips');
        console.log('\n🔄 Press Ctrl+C to stop the bot');
        
        // Graceful shutdown
        process.once('SIGINT', async () => {
            console.log('\n🔄 Shutting down gracefully...');
            try {
                await smartBeastMain.disableSmartBeastMode();
                console.log('✅ Smart Beast Mode disabled');
            } catch (error) {
                console.error('❌ Error disabling Smart Beast Mode:', error.message);
            }
            bot.stop('SIGINT');
        });
        
        process.once('SIGTERM', async () => {
            console.log('\n🔄 Shutting down gracefully...');
            try {
                await smartBeastMain.disableSmartBeastMode();
                console.log('✅ Smart Beast Mode disabled');
            } catch (error) {
                console.error('❌ Error disabling Smart Beast Mode:', error.message);
            }
            bot.stop('SIGTERM');
        });
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);
        process.exit(1);
    }
}

startBot();
