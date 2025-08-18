// Run the real bot without webhook clearing issues
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { firestore } from './src/utils/firestore.js';

// Import handlers
import { setupStartHandler } from './src/handlers/start.js';
import setupSubscribeHandler from './src/handlers/subscribe.js';
import supportHandler from './src/handlers/support.js';
import langHandler from './src/handlers/lang.js';
import faqHandler from './src/handlers/faq.js';
import mySubscriptionsHandler from './src/handlers/mySubscriptions.js';
import cancelSubscriptionHandler from './src/handlers/cancelSubscription.js';
import adminHandler from './src/handlers/admin.js';
import helpHandler from './src/handlers/help.js';
import screenshotUploadHandler from './src/handlers/screenshotUpload.js';
import { registerAdminPaymentHandlers } from './src/handlers/adminPaymentHandlers.js';
import { loadI18n } from './src/utils/i18n.js';
import { loadServices } from './src/utils/loadServices.js';

dotenv.config();

console.log('🚀 Starting Real BirrPay Bot');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  telegram: {
    webhookReply: false, // Disable webhook reply for polling
  }
});

// Load i18n and services
let i18n, services;
try {
  console.log("Loading i18n and services...");
  i18n = await loadI18n();
  services = await loadServices();
  console.log("Successfully loaded i18n and services");
} catch (error) {
  console.error("Error loading i18n or services:", error);
  i18n = { hero_title: { en: "Welcome", am: "እንኳን ደስ አለዎት" } };
  services = [];
}

// User language middleware
bot.use(async (ctx, next) => {
  try {
    if (ctx.from?.id && firestore) {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          ctx.userLang = userData.language || ctx.from.language_code || 'en';
        } else {
          ctx.userLang = ctx.from.language_code || 'en';
        }
      } catch (error) {
        ctx.userLang = ctx.from?.language_code || 'en';
      }
    } else {
      ctx.userLang = ctx.from?.language_code || 'en';
    }
    
    if (ctx.userLang?.startsWith('am')) {
      ctx.userLang = 'am';
    } else {
      ctx.userLang = 'en';
    }
    
    ctx.i18n = i18n;
    ctx.services = services;
    
    return next();
  } catch (error) {
    console.error('Error in language middleware:', error);
    ctx.userLang = 'en';
    ctx.i18n = i18n;
    ctx.services = services;
    return next();
  }
});

// Add debug middleware to see all commands
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text) {
    console.log(`📥 Received command: "${ctx.message.text}" from user ${ctx.from.id} (${ctx.from.first_name})`);
    
    // Special debug for admin command
    if (ctx.message.text === '/admin') {
      console.log(`🔧 ADMIN COMMAND DETECTED - About to process...`);
    }
  }
  return next();
});

// Register all handlers
console.log("Registering bot command handlers...");

setupStartHandler(bot);
setupSubscribeHandler(bot);
supportHandler(bot);
langHandler(bot);
faqHandler(bot);
mySubscriptionsHandler(bot);
cancelSubscriptionHandler(bot);

// Working admin command with REAL features
bot.command('admin', async (ctx) => {
  console.log(`🔧 /admin command received from user ${ctx.from.id}`);
  
  try {
    // Check admin authorization (same as test)
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();
    
    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.\n\n🔒 All access attempts are logged for security.");
      return;
    }
    
    console.log('✅ Admin authorized, loading panel...');
    
    // Load real-time statistics from Firebase
    const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, pendingPaymentsSnapshot, servicesSnapshot] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('subscriptions').get(),
      firestore.collection('payments').get(),
      firestore.collection('pendingPayments').get(),
      firestore.collection('services').get()
    ]);

    // Calculate real statistics
    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => {
      const userData = doc.data();
      return userData.status !== 'banned' && userData.status !== 'suspended';
    }).length;

    const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
      const subData = doc.data();
      return subData.status === 'active';
    }).length;

    const pendingSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
      const subData = doc.data();
      return subData.status === 'pending';
    }).length;

    const totalPayments = paymentsSnapshot.size;
    const pendingPayments = pendingPaymentsSnapshot.size;
    
    // Calculate revenue
    let totalRevenue = 0;
    pendingPaymentsSnapshot.docs.forEach(doc => {
      const paymentData = doc.data();
      if (paymentData.status === 'approved' && paymentData.amount) {
        totalRevenue += parseFloat(paymentData.amount) || 0;
      }
    });

    // Create admin panel message
    const adminMessage = `🔧 **BirrPay Admin Panel**

📊 **System Statistics:**
━━━━━━━━━━━━━━━━━━━
👥 **Users:** ${totalUsers} total (${activeUsers} active)
📋 **Subscriptions:** ${subscriptionsSnapshot.size} total (${activeSubscriptions} active, ${pendingSubscriptions} pending)
💰 **Payments:** ${totalPayments} total (${pendingPayments} pending)
💵 **Revenue:** ${totalRevenue.toFixed(2)} ETB
🛍️ **Services:** ${servicesSnapshot.size} available

⏰ **Last Updated:** ${new Date().toLocaleString()}

🎯 **Quick Actions:**`;

    // Admin action buttons
    const adminKeyboard = [
      [
        { text: '👥 Manage Users', callback_data: 'admin_users' },
        { text: '📋 Subscriptions', callback_data: 'admin_subscriptions' }
      ],
      [
        { text: '💰 Payments', callback_data: 'admin_payments' },
        { text: '🛍️ Services', callback_data: 'admin_services' }
      ],
      [
        { text: '📊 Analytics', callback_data: 'admin_analytics' },
        { text: '⚙️ Settings', callback_data: 'admin_settings' }
      ],
      [
        { text: '🔔 Broadcast', callback_data: 'admin_broadcast' },
        { text: '📁 Export Data', callback_data: 'admin_export' }
      ],
      [
        { text: '🏠 Back to Main Menu', callback_data: 'back_to_start' }
      ]
    ];

    await ctx.reply(adminMessage, {
      reply_markup: { inline_keyboard: adminKeyboard },
      parse_mode: 'Markdown'
    });
    
    console.log('✅ Admin panel sent successfully');
    
  } catch (error) {
    console.error('❌ Error in admin command:', error);
    await ctx.reply('❌ Error loading admin panel: ' + error.message);
  }
});

// Don't register the original admin handler to avoid conflicts
// adminHandler(bot);
helpHandler(bot);
screenshotUploadHandler(bot);
registerAdminPaymentHandlers(bot);

console.log("✅ All bot handlers registered successfully");

// Set up bot commands menu
async function setupBotMenu() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Main menu and services' },
      { command: 'help', description: '🔧 Help and support information' },
      { command: 'faq', description: '❓ Frequently asked questions' },
      { command: 'lang', description: '🌐 Change language settings' },
      { command: 'mysubs', description: '📊 My active subscriptions' },
      { command: 'support', description: '📞 Contact customer support' },
      { command: 'admin', description: '🔑 Admin panel (admin only)' }
    ]);
    console.log("✅ Bot menu commands set successfully!");
  } catch (error) {
    console.error("❌ Error setting bot menu:", error);
  }
}

// Start bot
async function start() {
  try {
    await setupBotMenu();
    
    console.log('🚀 Starting bot in polling mode...');
    await bot.launch();
    console.log('✅ BirrPay Bot is now running!');
    console.log('📱 Try these commands:');
    console.log('   /start - Main menu with all features');
    console.log('   /admin - Admin panel (you are authorized)');
    console.log('   /help - Help and support');
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Error starting bot:', error);
  }
}

start();
