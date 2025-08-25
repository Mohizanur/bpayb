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

console.log('🤖 Starting simple test bot...');
console.log('🔑 Bot token length:', process.env.TELEGRAM_BOT_TOKEN?.length || 0);

// Start the bot
bot.launch()
  .then(() => {
    console.log('✅ Simple test bot started successfully!');
    console.log('📱 Send /test, /start, or /ping to test the bot');
  })
  .catch((error) => {
    console.error('❌ Failed to start test bot:', error);
  });

// Graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
