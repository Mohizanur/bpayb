import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

async function testWebhook() {
  try {
    console.log('🔍 Testing webhook configuration...');
    
    // Get webhook info
    const webhookInfo = await bot.telegram.getWebhookInfo();
    console.log('📊 Webhook Info:', JSON.stringify(webhookInfo, null, 2));
    
    // Test bot info
    const botInfo = await bot.telegram.getMe();
    console.log('🤖 Bot Info:', JSON.stringify(botInfo, null, 2));
    
    // Test if webhook URL is accessible
    const webhookUrl = 'https://bpayb.onrender.com/webhook';
    console.log(`🔗 Testing webhook URL: ${webhookUrl}`);
    
    // Try to set webhook
    await bot.telegram.deleteWebhook();
    console.log('🗑️ Deleted existing webhook');
    
    await bot.telegram.setWebhook(webhookUrl);
    console.log('✅ Webhook set successfully');
    
    // Get updated webhook info
    const updatedWebhookInfo = await bot.telegram.getWebhookInfo();
    console.log('📊 Updated Webhook Info:', JSON.stringify(updatedWebhookInfo, null, 2));
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

testWebhook();
