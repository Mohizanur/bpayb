import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

// Create a simple bot that uses polling
const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Simple commands for testing
bot.command('start', (ctx) => {
  console.log('✅ /start command received from:', ctx.from.id);
  ctx.reply('🚀 Real bot is working locally with polling!');
});

bot.command('admin', (ctx) => {
  console.log('✅ /admin command received from:', ctx.from.id);
  ctx.reply('🔑 Admin panel - Real bot functionality!');
});

bot.command('test', (ctx) => {
  console.log('✅ /test command received from:', ctx.from.id);
  ctx.reply('✅ Real bot test response working!');
});

bot.command('help', (ctx) => {
  console.log('✅ /help command received from:', ctx.from.id);
  ctx.reply('📚 Help: Use /start, /admin, /help, /test');
});

// Launch with polling for local testing
console.log('🤖 Starting REAL bot locally with polling...');
bot.launch().then(() => {
  console.log('✅ Real bot is running locally with polling!');
  console.log('📱 Test commands: /start, /admin, /help, /test');
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
