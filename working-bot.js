// Final working bot with minimal handlers to avoid conflicts
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { firestore } from './src/utils/firestore.js';
import { setupStartHandler } from './src/handlers/start.js';
import { loadI18n } from './src/utils/i18n.js';
import { loadServices } from './src/utils/loadServices.js';

dotenv.config();

console.log('🚀 BirrPay Bot - Final Working Version');

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  telegram: { webhookReply: false }
});

// Load resources
let i18n, services;
try {
  console.log("Loading i18n and services...");
  i18n = await loadI18n();
  services = await loadServices();
  console.log("Successfully loaded resources");
} catch (error) {
  console.error("Error loading resources:", error);
  i18n = { hero_title: { en: "Welcome", am: "እንኳን ደስ አለዎት" } };
  services = [];
}

// Language middleware
bot.use(async (ctx, next) => {
  try {
    if (ctx.from?.id && firestore) {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        if (userDoc.exists) {
          ctx.userLang = userDoc.data().language || ctx.from.language_code || 'en';
        } else {
          ctx.userLang = ctx.from.language_code || 'en';
        }
      } catch (error) {
        ctx.userLang = ctx.from?.language_code || 'en';
      }
    } else {
      ctx.userLang = ctx.from?.language_code || 'en';
    }
    
    if (ctx.userLang?.startsWith('am')) ctx.userLang = 'am';
    else ctx.userLang = 'en';
    
    ctx.i18n = i18n;
    ctx.services = services;
    
    return next();
  } catch (error) {
    console.error('Error in middleware:', error);
    ctx.userLang = 'en';
    ctx.i18n = i18n;
    ctx.services = services;
    return next();
  }
});

// Debug middleware
bot.use(async (ctx, next) => {
  if (ctx.message && ctx.message.text) {
    console.log(`📥 Command: "${ctx.message.text}" from user ${ctx.from.id}`);
  }
  return next();
});

console.log("Registering handlers...");

// Register ONLY the start handler (we know this works)
setupStartHandler(bot);

// Register our working admin command LAST
bot.command('admin', async (ctx) => {
  console.log(`🔧 ADMIN HANDLER TRIGGERED for user ${ctx.from.id}`);
  
  try {
    // Auth check (same as successful test)
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();
    
    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      console.log('❌ Admin access denied');
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
      return;
    }
    
    console.log('✅ Loading admin panel...');
    
    // Load real Firebase data
    const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, pendingPaymentsSnapshot, servicesSnapshot] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('subscriptions').get(),
      firestore.collection('payments').get(),
      firestore.collection('pendingPayments').get(),
      firestore.collection('services').get()
    ]);

    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => {
      const userData = doc.data();
      return userData.status !== 'banned' && userData.status !== 'suspended';
    }).length;

    const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'active'
    ).length;

    const pendingSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'pending'
    ).length;

    const totalPayments = paymentsSnapshot.size;
    const pendingPayments = pendingPaymentsSnapshot.size;
    
    let totalRevenue = 0;
    pendingPaymentsSnapshot.docs.forEach(doc => {
      const paymentData = doc.data();
      if (paymentData.status === 'approved' && paymentData.amount) {
        totalRevenue += parseFloat(paymentData.amount) || 0;
      }
    });

    const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Users:** ${totalUsers.toLocaleString()} total • ${activeUsers.toLocaleString()} active
┃ 📱 **Subscriptions:** ${activeSubscriptions.toLocaleString()} active • ${pendingSubscriptions.toLocaleString()} pending  
┃ 💳 **Payments:** ${totalPayments.toLocaleString()} total • ${pendingPayments.toLocaleString()} pending
┃ 💰 **Revenue:** ETB ${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}
┃ 🛍️ **Services:** ${servicesSnapshot.size} available
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🌐 **Web Admin Panel:** [Open Dashboard](https://bpayb.onrender.com/panel)

🎯 **Management Center:**`;

    const keyboard = [
      [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
      [{ text: '🎯 Custom Plans', callback_data: 'admin_custom_plans' }, { text: '💳 Payment Methods', callback_data: 'admin_payments' }],
      [{ text: '⏳ Pending Approvals', callback_data: 'admin_pending' }, { text: '📊 Analytics', callback_data: 'admin_analytics' }],
      [{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }],
      [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
    ];

    await ctx.reply(adminMessage, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });
    
    console.log('✅ Admin panel sent successfully');
    
  } catch (error) {
    console.error('❌ Error in admin handler:', error);
    await ctx.reply('❌ Error loading admin panel: ' + error.message);
  }
});

// Add admin button handlers
// Enhanced admin_users handler with ban/unban capabilities
bot.action('admin_users', async (ctx) => {
  try {
    console.log('👥 Admin users button clicked');
    
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    // Get users with different filters
    const [allUsersSnapshot, bannedUsersSnapshot] = await Promise.all([
      firestore.collection('users').orderBy('createdAt', 'desc').limit(20).get(),
      firestore.collection('users').where('status', '==', 'banned').limit(10).get()
    ]);

    const totalUsers = allUsersSnapshot.size;
    const bannedCount = bannedUsersSnapshot.size;
    const activeCount = totalUsers - bannedCount;

    let usersList = `👥 **User Management**\n\n`;
    usersList += `📊 **Overview:**\n`;
    usersList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    usersList += `👥 Total Users: ${totalUsers}\n`;
    usersList += `✅ Active: ${activeCount} • 🚫 Banned: ${bannedCount}\n\n`;
    
    usersList += `📋 **Recent Users (Latest 20):**\n`;
    usersList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    allUsersSnapshot.docs.forEach((doc, index) => {
      const userData = doc.data();
      const status = userData.status === 'banned' ? '🚫' : userData.status === 'suspended' ? '⏸️' : '✅';
      const username = userData.username ? `@${userData.username}` : 'No username';
      
      usersList += `${index + 1}. ${status} **${userData.firstName || 'Unknown'}**\n`;
      usersList += `   👤 ${username}\n`;
      usersList += `   📱 ID: \`${doc.id}\`\n`;
      usersList += `   📅 Joined: ${userData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}\n\n`;
    });

    const keyboard = [
      [
        { text: '👁️ View User Details', callback_data: 'view_user_prompt' },
        { text: '🚫 Ban/Unban User', callback_data: 'ban_user_prompt' }
      ],
      [
        { text: '📊 User Statistics', callback_data: 'user_stats' },
        { text: '🔍 Search Users', callback_data: 'search_users' }
      ],
      [{ text: '🔄 Refresh', callback_data: 'admin_users' }],
      [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
    ];

    await ctx.editMessageText(usersList, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_users:', error);
    await ctx.answerCbQuery('❌ Error loading users');
  }
});

// Enhanced admin_subscriptions handler (matching original button name)
bot.action('admin_subscriptions', async (ctx) => {
  try {
    console.log('📋 Admin subscriptions button clicked');
    
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    // Get subscription statistics
    const [allSubsSnapshot, activeSubsSnapshot, pendingSubsSnapshot] = await Promise.all([
      firestore.collection('subscriptions').get(),
      firestore.collection('subscriptions').where('status', '==', 'active').get(),
      firestore.collection('subscriptions').where('status', '==', 'pending').get()
    ]);

    const totalSubs = allSubsSnapshot.size;
    const activeSubs = activeSubsSnapshot.size;
    const pendingSubs = pendingSubsSnapshot.size;

    // Get recent subscriptions
    const recentSubsSnapshot = await firestore
      .collection('subscriptions')
      .orderBy('createdAt', 'desc')
      .limit(15)
      .get();

    let subsList = `📋 **Subscription Management**\n\n`;
    subsList += `📊 **Overview:**\n`;
    subsList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    subsList += `📱 Total: ${totalSubs} subscriptions\n`;
    subsList += `✅ Active: ${activeSubs} • ⏳ Pending: ${pendingSubs}\n\n`;
    
    subsList += `📋 **Recent Subscriptions (Latest 15):**\n`;
    subsList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    recentSubsSnapshot.docs.forEach((doc, index) => {
      const subData = doc.data();
      const statusIcon = subData.status === 'active' ? '✅' : subData.status === 'pending' ? '⏳' : '❌';
      subsList += `${index + 1}. ${statusIcon} **${subData.serviceName || subData.service || 'Unknown Service'}**\n`;
      subsList += `   👤 User: \`${subData.userId}\`\n`;
      subsList += `   💰 Amount: ${subData.amount || subData.price || 0} ETB\n`;
      subsList += `   📅 Status: ${subData.status || 'unknown'}\n\n`;
    });

    const keyboard = [
      [
        { text: '✅ Active Subscriptions', callback_data: 'admin_active' },
        { text: '⏳ Pending Approvals', callback_data: 'admin_pending_subs' }
      ],
      [
        { text: '🎯 Custom Plans', callback_data: 'admin_custom_plans' },
        { text: '📊 Subscription Stats', callback_data: 'admin_sub_stats' }
      ],
      [{ text: '🔄 Refresh', callback_data: 'admin_subscriptions' }],
      [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
    ];

    await ctx.editMessageText(subsList, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_subscriptions:', error);
    await ctx.answerCbQuery('❌ Error loading subscriptions');
  }
});

// Keep the old admin_subs for backward compatibility
bot.action('admin_subs', async (ctx) => {
  // Redirect to the enhanced subscription handler
  ctx.callbackQuery.data = 'admin_subscriptions';
  return bot.emit('callback_query', ctx.callbackQuery);
});

bot.action('admin_payments', async (ctx) => {
  try {
    console.log('💰 Admin payments button clicked');
    const paymentsSnapshot = await firestore.collection('pendingPayments').limit(15).get();
    
    let paymentsList = `💰 **Payment Management**\n\n💳 **Pending Payments (Latest 15):**\n`;
    paymentsList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    paymentsSnapshot.docs.forEach((doc, index) => {
      const paymentData = doc.data();
      const statusIcon = paymentData.status === 'approved' ? '✅' : paymentData.status === 'rejected' ? '❌' : '⏳';
      paymentsList += `${index + 1}. ${statusIcon} **${paymentData.amount || 0} ETB**\n`;
      paymentsList += `   👤 User: \`${paymentData.userId}\`\n`;
      paymentsList += `   🛍️ Service: ${paymentData.service || 'Unknown'}\n`;
      paymentsList += `   📅 Status: ${paymentData.status || 'pending'}\n\n`;
    });
    
    await ctx.editMessageText(paymentsList, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'admin_payments' }],
          [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_payments:', error);
    await ctx.answerCbQuery('❌ Error loading payments');
  }
});

bot.action('admin_services', async (ctx) => {
  try {
    console.log('🛍️ Admin services button clicked');
    const servicesSnapshot = await firestore.collection('services').get();
    
    let servicesList = `🛍️ **Service Management**\n\n📦 **Available Services:**\n`;
    servicesList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    servicesSnapshot.docs.forEach((doc, index) => {
      const serviceData = doc.data();
      servicesList += `${index + 1}. **${serviceData.name || doc.id}**\n`;
      servicesList += `   📝 Description: ${serviceData.description || 'No description'}\n`;
      servicesList += `   🏷️ ID: \`${doc.id}\`\n\n`;
    });
    
    await ctx.editMessageText(servicesList, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh', callback_data: 'admin_services' }],
          [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_services:', error);
    await ctx.answerCbQuery('❌ Error loading services');
  }
});

bot.action('admin_analytics', async (ctx) => {
  try {
    console.log('📊 Admin analytics button clicked');
    
    const [users, subs, payments] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('subscriptions').get(),
      firestore.collection('pendingPayments').get()
    ]);
    
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentUsers = users.docs.filter(doc => {
      const userData = doc.data();
      return userData.createdAt?.toDate?.() >= lastWeek;
    }).length;
    
    const activeSubs = subs.docs.filter(doc => doc.data().status === 'active').length;
    const pendingSubs = subs.docs.filter(doc => doc.data().status === 'pending').length;
    
    let totalRevenue = 0;
    payments.docs.forEach(doc => {
      const paymentData = doc.data();
      if (paymentData.status === 'approved' && paymentData.amount) {
        totalRevenue += parseFloat(paymentData.amount) || 0;
      }
    });
    
    const analyticsMsg = `📊 **Advanced Analytics**

📈 **Growth Statistics:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 **Total Users:** ${users.size}
📅 **New Users (Last 7 days):** ${recentUsers}
📋 **Total Subscriptions:** ${subs.size}
✅ **Active Subscriptions:** ${activeSubs}
⏳ **Pending Subscriptions:** ${pendingSubs}
💰 **Total Revenue:** ${totalRevenue.toFixed(2)} ETB
💳 **Pending Payments:** ${payments.size}

📊 **Conversion Rate:** ${subs.size > 0 ? ((activeSubs / subs.size) * 100).toFixed(1) : 0}%
💹 **Avg Revenue/User:** ${users.size > 0 ? (totalRevenue / users.size).toFixed(2) : 0} ETB

⏰ **Generated:** ${new Date().toLocaleString()}`;
    
    await ctx.editMessageText(analyticsMsg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh Analytics', callback_data: 'admin_analytics' }],
          [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_analytics:', error);
    await ctx.answerCbQuery('❌ Error loading analytics');
  }
});

bot.action('admin_settings', async (ctx) => {
  try {
    const settingsMsg = `⚙️ **System Settings**

🔧 **Configuration Options:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔐 **Admin Management**
📊 **Database Settings**
🛠️ **Bot Configuration**
💳 **Payment Methods**
🌐 **Language Settings**
📧 **Notification Settings**

⚠️ **Warning:** Changing settings requires admin privileges and may affect system operation.`;
    
    await ctx.editMessageText(settingsMsg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔐 Manage Admins', callback_data: 'admin_manage_admins' }],
          [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_settings:', error);
    await ctx.answerCbQuery('❌ Error loading settings');
  }
});

bot.action('admin_broadcast', async (ctx) => {
  try {
    const broadcastMsg = `🔔 **Broadcast Message**

📢 **Send message to all users:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ **Important:** Broadcasting sends messages to ALL registered users. Use responsibly.

📝 **Instructions:**
1. Type your message after clicking "Start Broadcast"
2. Message will be sent to all users
3. Process cannot be undone

📊 **Current user count:** Loading...`;
    
    await ctx.editMessageText(broadcastMsg, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📢 Start Broadcast', callback_data: 'admin_start_broadcast' }],
          [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_broadcast:', error);
    await ctx.answerCbQuery('❌ Error loading broadcast');
  }
});

bot.action('admin_export', async (ctx) => {
  try {
    const exportMsg = `📁 **Data Export**

💾 **Available Export Options:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 **Users Data** (CSV format)
📋 **Subscriptions Data** (CSV format)
💰 **Payments Data** (CSV format)
🛍️ **Services Data** (JSON format)
📊 **Analytics Report** (PDF format)

⚠️ **Note:** Export may take a few minutes for large datasets.`;
    
    await ctx.editMessageText(exportMsg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '👥 Export Users', callback_data: 'export_users' },
            { text: '📋 Export Subs', callback_data: 'export_subs' }
          ],
          [{ text: '📊 Full Report', callback_data: 'export_full' }],
          [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in admin_export:', error);
    await ctx.answerCbQuery('❌ Error loading export options');
  }
});

bot.action('admin_refresh', async (ctx) => {
  try {
    // Manually trigger admin panel refresh
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();
    
    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery('❌ Access denied');
      return;
    }
    
    // Reload admin panel (copy from admin command)
    const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, pendingPaymentsSnapshot, servicesSnapshot] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('subscriptions').get(),
      firestore.collection('payments').get(),
      firestore.collection('pendingPayments').get(),
      firestore.collection('services').get()
    ]);

    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => {
      const userData = doc.data();
      return userData.status !== 'banned' && userData.status !== 'suspended';
    }).length;

    const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'active'
    ).length;

    const pendingSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'pending'
    ).length;

    const totalPayments = paymentsSnapshot.size;
    const pendingPayments = pendingPaymentsSnapshot.size;
    
    let totalRevenue = 0;
    pendingPaymentsSnapshot.docs.forEach(doc => {
      const paymentData = doc.data();
      if (paymentData.status === 'approved' && paymentData.amount) {
        totalRevenue += parseFloat(paymentData.amount) || 0;
      }
    });

    const adminMessage = `🔧 **BirrPay Admin Panel**

📊 **Live System Statistics:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 **Users:** ${totalUsers} total (${activeUsers} active)
📋 **Subscriptions:** ${subscriptionsSnapshot.size} total
   ├── ✅ Active: ${activeSubscriptions}
   └── ⏳ Pending: ${pendingSubscriptions}
💰 **Payments:** ${totalPayments} total (${pendingPayments} pending)
💵 **Revenue:** ${totalRevenue.toFixed(2)} ETB
🛍️ **Services:** ${servicesSnapshot.size} available

⏰ **Updated:** ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Admin Quick Actions:**`;

    const keyboard = [
      [
        { text: '👥 Manage Users', callback_data: 'admin_users' },
        { text: '📋 Subscriptions', callback_data: 'admin_subs' }
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
        { text: '🔔 Broadcast Message', callback_data: 'admin_broadcast' },
        { text: '📁 Export Data', callback_data: 'admin_export' }
      ],
      [
        { text: '🔄 Refresh Stats', callback_data: 'admin_refresh' }
      ],
      [
        { text: '🏠 Back to Main Menu', callback_data: 'back_to_start' }
      ]
    ];

    await ctx.editMessageText(adminMessage, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });
    
    await ctx.answerCbQuery('🔄 Stats refreshed!');
    console.log('✅ Admin panel refreshed');
    
  } catch (error) {
    console.error('Error refreshing admin panel:', error);
    await ctx.answerCbQuery('❌ Error refreshing');
  }
});

bot.action('admin_back', async (ctx) => {
  try {
    // Same as refresh - go back to main admin panel
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();
    
    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery('❌ Access denied');
      return;
    }
    
    // Load main admin panel
    const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, pendingPaymentsSnapshot, servicesSnapshot] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('subscriptions').get(),
      firestore.collection('payments').get(),
      firestore.collection('pendingPayments').get(),
      firestore.collection('services').get()
    ]);

    const totalUsers = usersSnapshot.size;
    const activeUsers = usersSnapshot.docs.filter(doc => {
      const userData = doc.data();
      return userData.status !== 'banned' && userData.status !== 'suspended';
    }).length;

    const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'active'
    ).length;

    const pendingSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'pending'
    ).length;

    const totalPayments = paymentsSnapshot.size;
    const pendingPayments = pendingPaymentsSnapshot.size;
    
    let totalRevenue = 0;
    pendingPaymentsSnapshot.docs.forEach(doc => {
      const paymentData = doc.data();
      if (paymentData.status === 'approved' && paymentData.amount) {
        totalRevenue += parseFloat(paymentData.amount) || 0;
      }
    });

    const adminMessage = `🔧 **BirrPay Admin Panel**

📊 **Live System Statistics:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 **Users:** ${totalUsers} total (${activeUsers} active)
📋 **Subscriptions:** ${subscriptionsSnapshot.size} total
   ├── ✅ Active: ${activeSubscriptions}
   └── ⏳ Pending: ${pendingSubscriptions}
💰 **Payments:** ${totalPayments} total (${pendingPayments} pending)
💵 **Revenue:** ${totalRevenue.toFixed(2)} ETB
🛍️ **Services:** ${servicesSnapshot.size} available

⏰ **Updated:** ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Admin Quick Actions:**`;

    const keyboard = [
      [
        { text: '👥 Manage Users', callback_data: 'admin_users' },
        { text: '📋 Subscriptions', callback_data: 'admin_subs' }
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
        { text: '🔔 Broadcast Message', callback_data: 'admin_broadcast' },
        { text: '📁 Export Data', callback_data: 'admin_export' }
      ],
      [
        { text: '🔄 Refresh Stats', callback_data: 'admin_refresh' }
      ],
      [
        { text: '🏠 Back to Main Menu', callback_data: 'back_to_start' }
      ]
    ];

    await ctx.editMessageText(adminMessage, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });
    
    await ctx.answerCbQuery('⬅️ Back to admin panel');
    console.log('✅ Returned to admin panel');
    
  } catch (error) {
    console.error('Error returning to admin panel:', error);
    await ctx.answerCbQuery('❌ Error going back');
  }
});

// Handle back to start from admin
bot.action('back_to_start', async (ctx) => {
  try {
    await ctx.editMessageText('🏠 **Welcome back to BirrPay!**\n\nUse /start to see the main menu or /admin for admin panel.', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🏠 Main Menu', callback_data: 'start_menu' }]
        ]
      },
      parse_mode: 'Markdown'
    });
    await ctx.answerCbQuery();
  } catch (error) {
    console.error('Error in back_to_start:', error);
    await ctx.answerCbQuery();
  }
});

// ENHANCED ADMIN HANDLERS FROM ORIGINAL ADMIN.JS

// Handle pending payments review (KEY FEATURE)
bot.action('admin_pending', async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    console.log('⏳ Loading pending payments...');

    // Get all pending payments
    const pendingSnapshot = await firestore
      .collection('pendingPayments')
      .where('status', '==', 'proof_submitted')
      .get();

    if (pendingSnapshot.empty) {
      await ctx.editMessageText("✅ **No Pending Payment Approvals**\n\nAll payments have been processed.", {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });
      await ctx.answerCbQuery();
      return;
    }

    const pendingPayments = [];
    for (const doc of pendingSnapshot.docs) {
      const payment = { id: doc.id, ...doc.data() };
      
      // Get user info
      try {
        const userDoc = await firestore.collection('users').doc(payment.userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        payment.userInfo = {
          firstName: userData.firstName || 'Unknown',
          lastName: userData.lastName || '',
          username: userData.username || 'No username'
        };
      } catch (error) {
        console.error('Error fetching user info for payment:', payment.id, error);
        payment.userInfo = {
          firstName: 'Unknown',
          lastName: '',
          username: 'No username'
        };
      }
      
      pendingPayments.push(payment);
    }

    // Sort payments by creation date (newest first)
    pendingPayments.sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA;
    });

    // Show pending payments list
    let paymentsList = `⏳ **Pending Payment Approvals** (${pendingPayments.length})\n\n`;
    paymentsList += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    pendingPayments.forEach((payment, index) => {
      const userDisplay = payment.userInfo.username !== 'No username' 
        ? `@${payment.userInfo.username}`
        : `${payment.userInfo.firstName} ${payment.userInfo.lastName}`.trim();
      
      const amount = payment.price || payment.amount || 'N/A';
      const service = payment.serviceTitle || payment.service || 'Unknown Service';
      const date = payment.createdAt?.toDate ? payment.createdAt.toDate().toLocaleDateString() : 'Unknown';
      
      paymentsList += `${index + 1}. 💳 **${service}**\n`;
      paymentsList += `   👤 User: ${userDisplay}\n`;
      paymentsList += `   💰 Amount: ETB ${amount}\n`;
      paymentsList += `   📅 Date: ${date}\n`;
      paymentsList += `   🆔 ID: \`${payment.id}\`\n\n`;
    });

    const keyboard = [];
    // Add review buttons for each payment (limit to first 10)
    const paymentsToShow = pendingPayments.slice(0, 10);
    for (let i = 0; i < paymentsToShow.length; i++) {
      keyboard.push([{ 
        text: `📋 Review Payment ${i + 1}`, 
        callback_data: `review_payment_${paymentsToShow[i].id}` 
      }]);
    }
    
    keyboard.push([{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]);

    await ctx.editMessageText(paymentsList, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    await ctx.answerCbQuery();
    console.log('✅ Pending payments loaded');

  } catch (error) {
    console.error('Error loading pending payments:', error);
    await ctx.answerCbQuery('❌ Error loading pending payments');
  }
});

// Handle payment review
bot.action(/^review_payment_(.+)$/, async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const paymentId = ctx.match[1];
    const paymentDoc = await firestore.collection('pendingPayments').doc(paymentId).get();

    if (!paymentDoc.exists) {
      await ctx.answerCbQuery('❌ Payment not found');
      return;
    }

    const payment = paymentDoc.data();
    
    // Get user info
    const userDoc = await firestore.collection('users').doc(payment.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    const userDisplay = userData.username 
      ? `@${userData.username}`
      : `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();

    const reviewMessage = `💳 **Payment Review**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 **User:** ${userDisplay}
🛍️ **Service:** ${payment.serviceTitle || payment.service || 'Unknown'}
💰 **Amount:** ETB ${payment.price || payment.amount || 'N/A'}
💳 **Method:** ${payment.paymentMethod || 'Unknown'}
📅 **Date:** ${payment.createdAt?.toDate?.()?.toLocaleString() || 'Unknown'}
🆔 **Payment ID:** \`${paymentId}\`

📱 **User ID:** \`${payment.userId}\`
📋 **Status:** ${payment.status || 'pending'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 **Admin Actions:**`;

    const keyboard = [
      [
        { text: '✅ Approve Payment', callback_data: `approve_payment_${paymentId}` },
        { text: '❌ Reject Payment', callback_data: `reject_payment_${paymentId}` }
      ],
      [{ text: '👤 View User Details', callback_data: `view_user_${payment.userId}` }],
      [{ text: '🔙 Back to Pending', callback_data: 'admin_pending' }]
    ];

    await ctx.editMessageText(reviewMessage, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error reviewing payment:', error);
    await ctx.answerCbQuery('❌ Error loading payment details');
  }
});

// Handle payment approval
bot.action(/^approve_payment_(.+)$/, async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const paymentId = ctx.match[1];
    
    // Update payment status to approved
    await firestore.collection('pendingPayments').doc(paymentId).update({
      status: 'approved',
      approvedAt: new Date(),
      approvedBy: userId
    });

    await ctx.answerCbQuery('✅ Payment approved!');
    
    // Refresh to show updated pending list
    ctx.callbackQuery.data = 'admin_pending';
    await ctx.editMessageText('✅ Payment approved! Refreshing pending list...');
    
    // Trigger pending list refresh after a moment
    setTimeout(() => {
      bot.emit('callback_query', ctx.callbackQuery);
    }, 1000);

    console.log(`✅ Payment ${paymentId} approved by admin ${userId}`);

  } catch (error) {
    console.error('Error approving payment:', error);
    await ctx.answerCbQuery('❌ Error approving payment');
  }
});

// Handle payment rejection  
bot.action(/^reject_payment_(.+)$/, async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const paymentId = ctx.match[1];
    
    // Update payment status to rejected
    await firestore.collection('pendingPayments').doc(paymentId).update({
      status: 'rejected',
      rejectedAt: new Date(),
      rejectedBy: userId
    });

    await ctx.answerCbQuery('❌ Payment rejected');
    
    // Refresh to show updated pending list
    ctx.callbackQuery.data = 'admin_pending';
    await ctx.editMessageText('❌ Payment rejected. Refreshing pending list...');
    
    // Trigger pending list refresh after a moment
    setTimeout(() => {
      bot.emit('callback_query', ctx.callbackQuery);
    }, 1000);

    console.log(`❌ Payment ${paymentId} rejected by admin ${userId}`);

  } catch (error) {
    console.error('Error rejecting payment:', error);
    await ctx.answerCbQuery('❌ Error rejecting payment');
  }
});

// User management handlers (ban/unban functionality)

// Handle view user details
bot.action(/^view_user_(.+)$/, async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const targetUserId = ctx.match[1];
    const userDoc = await firestore.collection('users').doc(targetUserId).get();

    if (!userDoc.exists) {
      await ctx.answerCbQuery('❌ User not found');
      return;
    }

    const userData = userDoc.data();
    const username = userData.username ? `@${userData.username}` : 'No username';
    const status = userData.status || 'active';
    const joinDate = userData.createdAt?.toDate?.()?.toLocaleString() || 'Unknown';
    const language = userData.language === 'am' ? 'Amharic' : 'English';

    // Get user's subscriptions
    const subscriptionsSnapshot = await firestore
      .collection('subscriptions')
      .where('userId', '==', targetUserId)
      .get();

    const userMessage = `👤 **User Details**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 **Name:** ${userData.firstName || 'Unknown'} ${userData.lastName || ''}
🏷️ **Username:** ${username}
📱 **User ID:** \`${targetUserId}\`
📊 **Status:** ${status === 'banned' ? '🚫 Banned' : status === 'suspended' ? '⏸️ Suspended' : '✅ Active'}
🌐 **Language:** ${language}
📅 **Joined:** ${joinDate}

📋 **Subscriptions:** ${subscriptionsSnapshot.size} total
${subscriptionsSnapshot.docs.map((doc, i) => {
  const sub = doc.data();
  return `   ${i + 1}. ${sub.service || 'Unknown'} (${sub.status || 'unknown'})`;
}).join('\n') || '   No subscriptions'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 **Admin Actions:**`;

    const keyboard = [
      [
        status !== 'banned' 
          ? { text: '🚫 Ban User', callback_data: `ban_user_${targetUserId}` }
          : { text: '✅ Unban User', callback_data: `unban_user_${targetUserId}` }
      ],
      [{ text: '📋 View Subscriptions', callback_data: `user_subscriptions_${targetUserId}` }],
      [{ text: '💳 View Payments', callback_data: `user_payments_${targetUserId}` }],
      [{ text: '⬅️ Back to Users', callback_data: 'admin_users' }]
    ];

    await ctx.editMessageText(userMessage, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error viewing user details:', error);
    await ctx.answerCbQuery('❌ Error loading user details');
  }
});

// Handle ban user
bot.action(/^ban_user_(.+)$/, async (ctx) => {
  try {
    const adminUserId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(adminUserId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const targetUserId = ctx.match[1];
    
    // Check if trying to ban another admin
    if (adminDoc.data().userIds?.includes(targetUserId)) {
      await ctx.answerCbQuery('❌ Cannot ban an admin user');
      return;
    }

    const userDoc = await firestore.collection('users').doc(targetUserId).get();
    if (!userDoc.exists) {
      await ctx.answerCbQuery('❌ User not found');
      return;
    }

    const userData = userDoc.data();
    const username = userData.username ? `@${userData.username}` : userData.firstName || 'Unknown';

    // Update user status to banned
    await firestore.collection('users').doc(targetUserId).update({
      status: 'banned',
      bannedAt: new Date(),
      bannedBy: adminUserId
    });

    await ctx.answerCbQuery('🚫 User banned successfully');
    
    // Show confirmation message
    await ctx.editMessageText(`🚫 **User Banned**\n\n👤 User: ${username}\n📱 ID: \`${targetUserId}\`\n⏰ Banned: ${new Date().toLocaleString()}\n👮 By: Admin \`${adminUserId}\`\n\nThe user has been banned and can no longer use the bot.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Unban User', callback_data: `unban_user_${targetUserId}` }],
          [{ text: '⬅️ Back to Users', callback_data: 'admin_users' }]
        ]
      }
    });

    console.log(`🚫 User ${targetUserId} banned by admin ${adminUserId}`);

  } catch (error) {
    console.error('Error banning user:', error);
    await ctx.answerCbQuery('❌ Error banning user');
  }
});

// Handle unban user
bot.action(/^unban_user_(.+)$/, async (ctx) => {
  try {
    const adminUserId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(adminUserId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const targetUserId = ctx.match[1];
    const userDoc = await firestore.collection('users').doc(targetUserId).get();
    
    if (!userDoc.exists) {
      await ctx.answerCbQuery('❌ User not found');
      return;
    }

    const userData = userDoc.data();
    const username = userData.username ? `@${userData.username}` : userData.firstName || 'Unknown';

    // Update user status to active (remove ban)
    await firestore.collection('users').doc(targetUserId).update({
      status: 'active',
      unbannedAt: new Date(),
      unbannedBy: adminUserId,
      bannedAt: null,
      bannedBy: null
    });

    await ctx.answerCbQuery('✅ User unbanned successfully');
    
    // Show confirmation message
    await ctx.editMessageText(`✅ **User Unbanned**\n\n👤 User: ${username}\n📱 ID: \`${targetUserId}\`\n⏰ Unbanned: ${new Date().toLocaleString()}\n👮 By: Admin \`${adminUserId}\`\n\nThe user can now use the bot again.`, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚫 Ban User Again', callback_data: `ban_user_${targetUserId}` }],
          [{ text: '⬅️ Back to Users', callback_data: 'admin_users' }]
        ]
      }
    });

    console.log(`✅ User ${targetUserId} unbanned by admin ${adminUserId}`);

  } catch (error) {
    console.error('Error unbanning user:', error);
    await ctx.answerCbQuery('❌ Error unbanning user');
  }
});

// BROADCAST MESSAGING FEATURE
bot.action('admin_broadcast', async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    const adminDoc = await firestore.collection('config').doc('admins').get();

    if (!adminDoc.exists || !adminDoc.data().userIds?.includes(userId)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    console.log('📢 Admin broadcast button clicked');

    // Get user statistics for broadcast info
    const usersSnapshot = await firestore.collection('users').get();
    const activeUsers = usersSnapshot.docs.filter(doc => {
      const userData = doc.data();
      return userData.status !== 'banned' && userData.status !== 'suspended';
    }).length;

    const broadcastMessage = `📢 **Broadcast Message Center**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Send a message to all bot users**

📊 **Target Audience:**
👥 Total Users: ${usersSnapshot.size}
✅ Active Users: ${activeUsers}
🚫 Banned Users: ${usersSnapshot.size - activeUsers}

⚠️ **Important:**
• Messages will be sent to ALL active users
• Banned users will NOT receive messages
• This action cannot be undone
• Use responsibly

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 **Compose your broadcast message:**`;

    const keyboard = [
      [{ text: '📝 Compose Message', callback_data: 'compose_broadcast' }],
      [{ text: '📋 View Recent Broadcasts', callback_data: 'view_broadcasts' }],
      [{ text: '⬅️ Back to Admin', callback_data: 'admin_back' }]
    ];

    await ctx.editMessageText(broadcastMessage, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });

    await ctx.answerCbQuery();

  } catch (error) {
    console.error('Error in admin_broadcast:', error);
    await ctx.answerCbQuery('❌ Error loading broadcast center');
  }
});

console.log("✅ Enhanced handlers registered");

// Set commands menu
async function setupMenu() {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Main menu and services' },
      { command: 'admin', description: '🔑 Admin panel (admin only)' }
    ]);
    console.log("✅ Commands menu set");
  } catch (error) {
    console.error("❌ Menu setup failed:", error);
  }
}

// Start
async function start() {
  try {
    await setupMenu();
    console.log('🚀 Starting bot...');
    await bot.launch();
    console.log('✅ BirrPay Bot is running!');
    console.log('📱 Try /start and /admin');
    
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
    
  } catch (error) {
    console.error('❌ Error starting bot:', error);
  }
}

start();
