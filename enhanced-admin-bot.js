// Enhanced BirrPay Bot with COMPLETE original admin features
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { firestore } from './src/utils/firestore.js';
import { setupStartHandler } from './src/handlers/start.js';
import { loadI18n } from './src/utils/i18n.js';
import { loadServices } from './src/utils/loadServices.js';

dotenv.config();

console.log('🚀 BirrPay Bot - COMPLETE Enhanced Version');

// Initialize Firebase and resources
(async () => {
  try {
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

    // Create bot instance
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // Add debug middleware to see all commands
    bot.use(async (ctx, next) => {
      if (ctx.message && ctx.message.text) {
        console.log(`📥 Command: "${ctx.message.text}" from user ${ctx.from.id}`);
      }
      return next();
    });

    // Register handlers
    console.log("Registering handlers...");
    setupStartHandler(bot);

    // EXACT ADMIN FEATURES FROM ORIGINAL ADMIN.JS

    // Helper function for admin security check (EXACT from original)
    const isAuthorizedAdmin = async (ctx) => {
      try {
        const userId = ctx.from?.id?.toString();
        if (!userId) return false;
        
        // Check against environment variable first (for backward compatibility)
        if (process.env.ADMIN_TELEGRAM_ID && userId === process.env.ADMIN_TELEGRAM_ID) {
          return true;
        }
        
        // Check against Firestore config
        const adminDoc = await firestore.collection('config').doc('admins').get();
        if (adminDoc.exists) {
          const admins = adminDoc.data().userIds || [];
          if (admins.includes(userId)) {
            return true;
          }
        }
        
        console.warn(`Unauthorized admin access attempt from user ${userId} (${ctx.from?.username || 'no username'})`);
        return false;
      } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
      }
    };

    // Helper function for error logging (EXACT from original)
    const logAdminAction = async (action, adminId, details = {}) => {
      try {
        await firestore.collection('adminLogs').add({
          action,
          adminId,
          details,
          timestamp: new Date(),
          userAgent: 'Telegram Bot'
        });
      } catch (error) {
        console.error('Error logging admin action:', error);
      }
    };

    // EXACT /admin command from original
    bot.command('admin', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.\n\n🔒 All access attempts are logged for security.");
        return;
      }

      // Log admin access
      await logAdminAction('admin_panel_access', ctx.from.id, {
        username: ctx.from.username,
        firstName: ctx.from.first_name
      });

      try {
        // Load real-time statistics
        const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, pendingPaymentsSnapshot, servicesSnapshot] = await Promise.all([
          firestore.collection('users').get(),
          firestore.collection('subscriptions').get(),
          firestore.collection('payments').get(),
          firestore.collection('pendingPayments').get(),
          firestore.collection('services').get()
        ]);

        // Calculate statistics
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
        
        // Calculate total revenue
        let totalRevenue = 0;
        pendingPaymentsSnapshot.docs.forEach(doc => {
          const paymentData = doc.data();
          if (paymentData.status === 'approved' && paymentData.price) {
            totalRevenue += parseFloat(paymentData.price) || 0;
          }
        });

        const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Total Users:** ${totalUsers}
┃ ✅ **Verified Users:** ${activeUsers}
┃ 🟢 **Active Subscriptions:** ${activeSubscriptions}
┃ 💳 **Total Payments:** ${totalPayments}
┃ 🎆 **Available Services:** ${servicesSnapshot.size}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔧 **Management Center** - Complete control over your platform`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔧 Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }],
            [{ text: '💰 Revenue Management', callback_data: 'admin_payments' }, { text: '💳 Payment Methods', callback_data: 'admin_payment_methods' }],
            [{ text: '📊 Performance', callback_data: 'admin_performance' }],
            [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
            [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.reply(adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        console.error('Error loading admin panel:', error);
        await ctx.reply('❌ Error loading admin panel.');
      }
    });

    // EXACT admin_users handler from original
    bot.action('admin_users', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      try {
        const page = 0;
        const filter = 'all';
        const limit = 10;
        const offset = page * limit;

        let query = firestore.collection('users');
        
        if (filter === 'banned') {
          query = query.where('status', '==', 'banned');
        } else if (filter === 'active') {
          query = query.where('status', '!=', 'banned');
        }

        const usersSnapshot = await query.orderBy('createdAt', 'desc').offset(offset).limit(limit).get();
        const totalUsersSnapshot = await firestore.collection('users').get();
        
        const totalUsers = totalUsersSnapshot.size;
        const bannedUsers = totalUsersSnapshot.docs.filter(doc => doc.data().status === 'banned').length;
        const activeUsers = totalUsers - bannedUsers;

        let usersList = `👥 **User Management** (Page ${page + 1})

📊 **Statistics:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Total Users:** ${totalUsers.toLocaleString()}
• **Active Users:** ${activeUsers.toLocaleString()}
• **Banned Users:** ${bannedUsers.toLocaleString()}

📋 **Users List** (Filter: ${filter === 'all' ? 'All Users' : filter === 'banned' ? 'Banned Users' : 'Active Users'}):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

        if (usersSnapshot.empty) {
          usersList += "📭 **No users found for the current filter.**";
        } else {
          usersSnapshot.docs.forEach((doc, index) => {
            const userData = doc.data();
            const userId = doc.id;
            const status = userData.status === 'banned' ? '🚫 Banned' : '✅ Active';
            const firstName = userData.firstName || 'Unknown';
            const lastName = userData.lastName || '';
            const username = userData.username ? `@${userData.username}` : 'No username';
            const joinDate = userData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown';

            usersList += `${offset + index + 1}. ${status} **${firstName} ${lastName}**
🏷️ Username: ${username}
📱 ID: \`${userId}\`
📅 Joined: ${joinDate}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
          });
        }

        // Pagination buttons
        const totalPages = Math.ceil(totalUsers / limit);
        const paginationRow = [];
        
        if (page > 0) {
          paginationRow.push({ text: '⬅️ Previous', callback_data: `users_prev_${page - 1}_${filter}` });
        }
        
        if (page < totalPages - 1) {
          paginationRow.push({ text: 'Next ➡️', callback_data: `users_next_${page + 1}_${filter}` });
        }

        const keyboard = {
          inline_keyboard: [
            // Filter buttons
            [
              { text: filter === 'all' ? '🔘 All' : '⚪ All', callback_data: `users_filter_all_${page}` },
              { text: filter === 'active' ? '🔘 Active' : '⚪ Active', callback_data: `users_filter_active_${page}` },
              { text: filter === 'banned' ? '🔘 Banned' : '⚪ Banned', callback_data: `users_filter_banned_${page}` }
            ],
            // Pagination
            ...(paginationRow.length > 0 ? [paginationRow] : []),
            // Management buttons
            [
              { text: '👁️ View User', callback_data: 'view_user_prompt' },
              { text: '🚫 Ban User', callback_data: 'ban_user_prompt' }
            ],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(usersList, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });

        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error loading users list:', error);
        await ctx.answerCbQuery('❌ Error loading users');
      }
    });

    // EXACT admin_subscriptions handler from original
    bot.action('admin_subscriptions', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      try {
        // Get subscription statistics
        const [subscriptionsSnapshot, activeSubsSnapshot, pendingSubsSnapshot] = await Promise.all([
          firestore.collection('subscriptions').get(),
          firestore.collection('subscriptions').where('status', '==', 'active').get(),
          firestore.collection('subscriptions').where('status', '==', 'pending').get()
        ]);

        const totalSubs = subscriptionsSnapshot.size;
        const activeSubs = activeSubsSnapshot.size;
        const pendingSubs = pendingSubsSnapshot.size;

        // Get recent subscriptions
        const recentSubsSnapshot = await firestore
          .collection('subscriptions')
          .orderBy('createdAt', 'desc')
          .limit(15)
          .get();

        let subsList = `📊 **Subscription Management**

📈 **Overview:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• **Total Subscriptions:** ${totalSubs.toLocaleString()}
• **Active Subscriptions:** ${activeSubs.toLocaleString()}
• **Pending Subscriptions:** ${pendingSubs.toLocaleString()}

📋 **Recent Subscriptions:**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;

        if (recentSubsSnapshot.empty) {
          subsList += "📭 **No subscriptions found.**";
        } else {
          for (const [index, doc] of recentSubsSnapshot.docs.entries()) {
            const subData = doc.data();
            const status = subData.status === 'active' ? '✅ Active' : 
                          subData.status === 'pending' ? '⏳ Pending' : 
                          subData.status === 'expired' ? '⏰ Expired' : '❌ Inactive';

            // Get user info
            let userInfo = 'Unknown User';
            try {
              const userDoc = await firestore.collection('users').doc(subData.userId).get();
              if (userDoc.exists) {
                const userData = userDoc.data();
                userInfo = userData.username ? `@${userData.username}` : 
                          `${userData.firstName || 'Unknown'} ${userData.lastName || ''}`.trim();
              }
            } catch (error) {
              console.error('Error fetching user for subscription:', doc.id);
            }

            subsList += `${index + 1}. ${status} **${subData.service || 'Unknown Service'}**
👤 User: ${userInfo}
📱 User ID: \`${subData.userId}\`
💰 Price: ${subData.price || 'N/A'} ETB
📅 Created: ${subData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

`;
          }
        }

        const keyboard = {
          inline_keyboard: [
            [
              { text: '✅ Active Subscriptions', callback_data: 'admin_active' },
              { text: '⏳ Pending Subscriptions', callback_data: 'admin_pending' }
            ],
            [
              { text: '🎯 Custom Requests', callback_data: 'admin_custom_requests' },
              { text: '📊 Statistics', callback_data: 'admin_stats' }
            ],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(subsList, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });

        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error loading subscriptions:', error);
        await ctx.answerCbQuery('❌ Error loading subscriptions');
      }
    });

    // EXACT admin_broadcast handler from original
    bot.action('admin_broadcast', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      try {
        // Get user count for broadcast preview
        const usersSnapshot = await firestore.collection('users').get();
        const activeUsers = usersSnapshot.docs.filter(doc => {
          const userData = doc.data();
          return userData.status !== 'banned' && userData.status !== 'suspended';
        }).length;

        const broadcastMessage = `💬 **Broadcast Message**

Send a message to all active users of the bot.

📊 **Target Audience:**
• Total Users: ${usersSnapshot.size}
• Active Users: ${activeUsers}
• Message will be sent to: ${activeUsers} users

**Instructions:**
1. Click "Start Broadcast" below
2. Type your message in the next message
3. The message will be sent to all active users

⚠️ **Warning:** This action cannot be undone.`;

        await ctx.editMessageText(broadcastMessage, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Start Broadcast', callback_data: 'start_broadcast' }],
              [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
            ]
          }
        });

        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error loading broadcast:', error);
        await ctx.answerCbQuery('❌ Error loading broadcast');
      }
    });

    // EXACT start_broadcast handler from original
    bot.action('start_broadcast', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      await ctx.editMessageText(
        "📝 **Send Broadcast Content**\n\nSend your broadcast content in the next message. All message types are supported!\n\n📋 **Supported Types:**\n• 📝 **Text** - Regular text messages\n• 🖼️ **Photos** - Images with optional captions\n• 🎥 **Videos** - Video files with optional captions\n• 📄 **Documents** - PDF, Word, Excel, etc.\n• 🎵 **Audio** - Music and audio files\n• 🎤 **Voice** - Voice messages\n• 🎬 **Animations** - GIFs and animations\n• 😀 **Stickers** - Telegram stickers\n• 📹 **Video Notes** - Round video messages\n\n💡 **Tips:**\n• Use *bold* and _italic_ in text/captions\n• Keep captions clear and concise\n• Large files may take longer to broadcast",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel', callback_data: 'admin_broadcast' }]
            ]
          }
        }
      );

      // Store broadcast state
      global.broadcastState = global.broadcastState || {};
      global.broadcastState[ctx.from.id] = { awaitingBroadcast: true };

      await ctx.answerCbQuery();
    });

    // EXACT back_to_admin handler from original
    bot.action('back_to_admin', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      // Re-trigger the admin command
      ctx.callbackQuery.data = 'refresh_admin';
      return bot.handleUpdate({ callback_query: ctx.callbackQuery });
    });

    // EXACT refresh_admin handler from original
    bot.action('refresh_admin', async (ctx) => {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.");
        return;
      }

      // Re-run the admin command logic to show updated stats
      try {
        // Load real-time statistics
        const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, pendingPaymentsSnapshot, servicesSnapshot] = await Promise.all([
          firestore.collection('users').get(),
          firestore.collection('subscriptions').get(),
          firestore.collection('payments').get(),
          firestore.collection('pendingPayments').get(),
          firestore.collection('services').get()
        ]);

        // Calculate statistics
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
        
        // Calculate total revenue
        let totalRevenue = 0;
        pendingPaymentsSnapshot.docs.forEach(doc => {
          const paymentData = doc.data();
          if (paymentData.status === 'approved' && paymentData.price) {
            totalRevenue += parseFloat(paymentData.price) || 0;
          }
        });

        const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Total Users:** ${totalUsers}
┃ ✅ **Verified Users:** ${activeUsers}
┃ 🟢 **Active Subscriptions:** ${activeSubscriptions}
┃ 💳 **Total Payments:** ${totalPayments}
┃ 🎆 **Available Services:** ${servicesSnapshot.size}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔧 **Management Center** - Complete control over your platform`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔧 Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }],
            [{ text: '💰 Revenue Management', callback_data: 'admin_payments' }, { text: '💳 Payment Methods', callback_data: 'admin_payment_methods' }],
            [{ text: '📊 Performance', callback_data: 'admin_performance' }],
            [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
            [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.editMessageText(adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error loading admin panel:', error);
        await ctx.answerCbQuery('❌ Error loading admin panel');
      }
    });

    console.log("✅ Complete admin handlers registered");

    // Set commands menu
    async function setupMenu() {
      try {
        await bot.telegram.setMyCommands([
          { command: 'start', description: '🏠 Main menu and services' },
          { command: 'admin', description: '🔑 Admin panel (admin only)' }
        ]);
        console.log("✅ Commands menu set");
      } catch (error) {
        console.error("❌ Error setting commands menu:", error);
      }
    }

    // Start the bot
    async function startBot() {
      console.log("🚀 Starting bot...");
      await setupMenu(); // Set commands menu on startup
      await bot.launch();
      console.log("✅ Bot started in polling mode with COMPLETE admin features.");
    }

    startBot();

  } catch (error) {
    console.error("❌ Failed to initialize:", error);
    process.exit(1);
  }
})();
