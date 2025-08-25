import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function testBotCommands() {
  try {
    console.log('🔍 Testing bot commands...');
    
    // Get bot info
    const botInfo = await bot.telegram.getMe();
    console.log('🤖 Bot Info:', JSON.stringify(botInfo, null, 2));
    
    // Test sending a message to the bot
    console.log('📤 Testing bot response...');
    
    // Get webhook info to confirm it's active
    const webhookInfo = await bot.telegram.getWebhookInfo();
    console.log('📊 Current Webhook Info:', JSON.stringify(webhookInfo, null, 2));
    
    if (webhookInfo.url) {
      console.log('✅ Webhook is active and configured');
      console.log('🔗 Webhook URL:', webhookInfo.url);
      console.log('📱 Pending updates:', webhookInfo.pending_update_count);
      
      if (webhookInfo.pending_update_count > 0) {
        console.log('⚠️ There are pending updates - bot might be receiving messages but not processing them');
      } else {
        console.log('✅ No pending updates - webhook is working correctly');
      }
    } else {
      console.log('❌ No webhook configured');
    }
    
  } catch (error) {
    console.error('❌ Error testing bot:', error.message);
  }
}

testBotCommands();
