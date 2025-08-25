import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function testLocalBot() {
  try {
    console.log('🔍 Testing local bot...');
    
    // Get bot info
    const botInfo = await bot.telegram.getMe();
    console.log('🤖 Bot Info:', JSON.stringify(botInfo, null, 2));
    
    // Test webhook info
    const webhookInfo = await bot.telegram.getWebhookInfo();
    console.log('📊 Webhook Info:', JSON.stringify(webhookInfo, null, 2));
    
    // Test if we can send a message (this will help verify the bot token is working)
    console.log('✅ Bot token is valid and bot is accessible');
    console.log('📱 Bot username:', botInfo.username);
    console.log('🔗 Bot link: https://t.me/' + botInfo.username);
    
    console.log('\n📋 Test Instructions:');
    console.log('1. Open Telegram and search for @' + botInfo.username);
    console.log('2. Send /start to test basic functionality');
    console.log('3. Send /help to test help command');
    console.log('4. Send /lang to test language settings');
    console.log('5. Try sending a regular message to test text handling');
    
  } catch (error) {
    console.error('❌ Error testing local bot:', error.message);
  }
}

testLocalBot();
