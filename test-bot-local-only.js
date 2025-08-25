import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Simple test command
bot.command('test', (ctx) => {
  console.log('✅ Test command received from user:', ctx.from.id);
  ctx.reply('✅ Bot is working! Test command received.');
});

bot.command('start', (ctx) => {
  console.log('✅ Start command received from user:', ctx.from.id);
  ctx.reply('🚀 Bot is running! This is a test response.');
});

bot.command('ping', (ctx) => {
  console.log('✅ Ping command received from user:', ctx.from.id);
  ctx.reply('🏓 Pong! Bot is responsive.');
});

// Handle all text messages
bot.on('text', (ctx) => {
  console.log('📝 Text message received:', ctx.message.text, 'from user:', ctx.from.id);
  ctx.reply(`📝 You said: "${ctx.message.text}"\n\nBot is working correctly!`);
});

// Error handling
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  ctx.reply('❌ An error occurred. Please try again.');
});

console.log('🤖 Starting local test bot (polling only)...');
console.log('🔑 Bot token length:', process.env.TELEGRAM_BOT_TOKEN?.length || 0);

// Start the bot with polling only (no HTTP server)
async function startBot() {
  try {
    console.log('🗑️ Deleting existing webhook...');
    await bot.telegram.deleteWebhook();
    console.log('✅ Webhook deleted successfully');
    
    console.log('🚀 Starting bot with polling...');
    await bot.launch();
    
    console.log('✅ Local test bot started successfully!');
    console.log('📱 Send /test, /start, or /ping to test the bot');
    console.log('📱 Bot username: @BirrPayerBot');
    console.log('📱 Or send any text message to test');
  } catch (error) {
    console.error('❌ Failed to start test bot:', error);
  }
}

startBot();

// Graceful stop
process.once('SIGINT', () => {
  console.log('🛑 Stopping bot...');
  bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
  console.log('🛑 Stopping bot...');
  bot.stop('SIGTERM');
});
