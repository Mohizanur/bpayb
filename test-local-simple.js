/**
 * 🚀 SIMPLE LOCAL BOT TEST
 * 
 * This tests your bot locally without Firebase dependencies
 */

import 'dotenv/config';
import { Telegraf } from 'telegraf';

console.log('🚀 Starting Simple Local Bot Test...\n');

// Check if bot token is available
if (!process.env.TELEGRAM_BOT_TOKEN) {
    console.error('❌ TELEGRAM_BOT_TOKEN not found in environment variables');
    console.log('💡 Please add your bot token to your .env file:');
    console.log('   TELEGRAM_BOT_TOKEN=your_bot_token_here');
    process.exit(1);
}

// Create bot instance
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Test basic bot functionality
bot.start((ctx) => {
    console.log('✅ Bot received /start command');
    ctx.reply('🚀 Bot is working! Smart Beast Mode is ready!');
});

bot.command('test', (ctx) => {
    console.log('✅ Bot received /test command');
    ctx.reply('✅ Bot is responding correctly!');
});

bot.command('beast_status', (ctx) => {
    console.log('✅ Bot received /beast_status command');
    ctx.reply('🚀 Smart Beast Mode Commands Available!\n\n' +
              '✅ /beast_enable - Enable optimizations\n' +
              '✅ /beast_disable - Disable optimizations\n' +
              '✅ /beast_status - Check status\n' +
              '✅ /beast_tips - Get tips\n' +
              '✅ /beast_emergency - Emergency shutdown');
});

// Error handling
bot.catch((err, ctx) => {
    console.error('❌ Bot error:', err);
    ctx.reply('Sorry, an error occurred. Please try again.');
});

// Start the bot
async function startBot() {
    try {
        console.log('🤖 Starting bot in polling mode...');
        await bot.launch();
        console.log('✅ Bot started successfully!');
        console.log('🎯 Bot is ready to receive commands!');
        console.log('\n📱 Test these commands in your Telegram chat:');
        console.log('   /start - Test basic functionality');
        console.log('   /test - Test command handling');
        console.log('   /beast_status - Test Smart Beast Mode commands');
        console.log('\n🔄 Press Ctrl+C to stop the bot');
        
        // Graceful shutdown
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));
        
    } catch (error) {
        console.error('❌ Failed to start bot:', error.message);
        process.exit(1);
    }
}

startBot();
