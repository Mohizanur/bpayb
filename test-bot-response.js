import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function testBotResponse() {
  try {
    console.log('🔍 Testing bot response...');
    
    // Get bot info
    const botInfo = await bot.telegram.getMe();
    console.log('🤖 Bot Info:', JSON.stringify(botInfo, null, 2));
    
    // Test webhook info
    const webhookInfo = await bot.telegram.getWebhookInfo();
    console.log('📊 Webhook Info:', JSON.stringify(webhookInfo, null, 2));
    
    console.log('\n📋 Test Instructions:');
    console.log('1. Open Telegram and search for @' + botInfo.username);
    console.log('2. Send /start to test basic functionality');
    console.log('3. Send /help to test help command');
    console.log('4. Send /lang to test language settings');
    console.log('5. Try sending a regular message to test text handling');
    console.log('6. Check the console output for command logging');
    
    console.log('\n🔍 Debugging:');
    console.log('- The bot should log all incoming commands');
    console.log('- Check if you see "📥 Command:" messages in the console');
    console.log('- If no logging appears, the bot is not receiving messages');
    
  } catch (error) {
    console.error('❌ Error testing bot:', error.message);
  }
}

testBotResponse();
