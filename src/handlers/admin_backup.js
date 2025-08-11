import { firestore } from "../utils/firestore.js";
import { getSupportMessages } from "../utils/database.js";

// Utility function to escape Markdown special characters
const escapeMarkdown = (text) => {
  if (!text) return '';
  return String(text).replace(/[_*\[\]()~`>#+\-={}|.!\\]/g, '\\$&');
};

// Helper function for admin security check
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

// Helper function to ignore callback query errors
const ignoreCallbackError = (error) => {
  if (error.message.includes('query is too old') || 
      error.message.includes('query ID is invalid')) {
    return; // Ignore these specific errors
  }
  console.error('Callback query error:', error);
};

// Helper function for error logging
const logAdminAction = async (action, adminId, details = {}) => {
  try {
    await firestore.collection('adminLogs').add({
      action,
      adminId,
      details,
      timestamp: new Date(),
      ip: details.ip || 'unknown'
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

// Helper function for user notifications
const notifyUser = async (bot, userId, message, options = {}) => {
  try {
    await bot.telegram.sendMessage(userId, message, {
      parse_mode: 'Markdown',
      ...options
    });
    return true;
  } catch (error) {
    console.error(`Failed to notify user ${userId}:`, error.message);
    return false;
  }
};

// Helper function to get user display info
const getUserDisplayInfo = (user) => {
  if (user.username) return `@${user.username}`;
  if (user.firstName && user.lastName) return `${user.firstName} ${user.lastName}`;
  if (user.firstName) return user.firstName;
  return `User ${user.userId || user.id || 'Unknown'}`;
};

export default function adminHandler(bot) {
  // Helper function to handle user lookup by ID/username
  const findUser = async (identifier) => {
    try {
      // Try to find by ID first
      const userDoc = await firestore.collection('users').doc(identifier).get();
      if (userDoc.exists) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      
      // Try to find by username (without @)
      const username = identifier.startsWith('@') ? identifier.slice(1) : identifier;
      const usersSnapshot = await firestore
        .collection('users')
        .where('username', '==', username)
        .limit(1)
        .get();
        
      if (!usersSnapshot.empty) {
        const userDoc = usersSnapshot.docs[0];
        return { id: userDoc.id, ...userDoc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding user:', error);
      return null;
    }
  };

  // Handle /ban command
  bot.command('ban', async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
      return;
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) {
      await ctx.reply("ℹ️ Usage: /ban <user_id_or_username> [reason]");
      return;
    }

    const userId = args[0];
    const reason = args.slice(1).join(' ') || 'No reason provided';
    
    try {
      const user = await findUser(userId);
      if (!user) {
        await ctx.reply("❌ User not found. Please provide a valid user ID or username.");
        return;
      }

      // Import banUser function at the top of the file
      const { banUser } = await import('../utils/database.js');
      const result = await banUser(user.id, reason);
      
      if (result.success) {
        await logAdminAction('user_banned', ctx.from.id, {
          targetUserId: user.id,
          targetUserInfo: getUserDisplayInfo(user),
          reason: reason
        });
        
        // Notify the banned user if possible
        try {
          await ctx.telegram.sendMessage(
            user.id,
            `🚫 You have been banned from using this bot.\n\nReason: ${reason}\n\nContact support if you believe this is a mistake.`
          );
        } catch (error) {
          console.error('Failed to notify banned user:', error);
        }
        
        await ctx.reply(`✅ Successfully banned ${getUserDisplayInfo(user)} (ID: ${user.id})`);
      } else {
        await ctx.reply(`❌ Failed to ban user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in ban command:', error);
      await ctx.reply("❌ An error occurred while processing your request.");
    }
  });

  // Handle /unban command
  bot.command('unban', async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.");
      return;
    }

    const args = ctx.message.text.split(' ').slice(1);
    if (args.length < 1) {
      await ctx.reply("ℹ️ Usage: /unban <user_id_or_username>");
      return;
    }

    const userId = args[0];
    
    try {
      const user = await findUser(userId);
      if (!user) {
        await ctx.reply("❌ User not found. Please provide a valid user ID or username.");
        return;
      }

      // Import unbanUser function at the top of the file
      const { unbanUser } = await import('../utils/database.js');
      const result = await unbanUser(user.id);
      
      if (result.success) {
        await logAdminAction('user_unbanned', ctx.from.id, {
          targetUserId: user.id,
          targetUserInfo: getUserDisplayInfo(user)
        });
        
        // Notify the unbanned user if possible
        try {
          await ctx.telegram.sendMessage(
            user.id,
            "✅ Your account has been unbanned. You can now use the bot again."
          );
        } catch (error) {
          console.error('Failed to notify unbanned user:', error);
        }
        
        await ctx.reply(`✅ Successfully unbanned ${getUserDisplayInfo(user)} (ID: ${user.id})`);
      } else {
        await ctx.reply(`❌ Failed to unban user: ${result.error}`);
      }
    } catch (error) {
      console.error('Error in unban command:', error);
      await ctx.reply('❌ An error occurred while processing the unban request.');
    }
  });
  
  // Handle pagination for users list
  bot.action(/^users_(prev|next)_(\d+)$/, async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const direction = ctx.match[1];
    let page = parseInt(ctx.match[2]);
    
    if (direction === 'next') {
      page++;
    } else if (direction === 'prev') {
      page--;
    }
    
    await ctx.answerCbQuery();
    await showUsersList(ctx, page);
  });
  
  // No-op handler for disabled navigation buttons
  bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
  });
  
  // Handle promote to admin
  bot.action(/^promote_(\d+)_(\d+)_(\w+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.").catch(ignoreCallbackError);
      return;
    }
    
    const [userId, page, filter] = ctx.match.slice(1);
    
    try {
      // Get admin config
      const adminDoc = await firestore.collection('config').doc('admins').get();
      const admins = adminDoc.exists ? adminDoc.data().userIds || [] : [];
      
      // Check if already admin
      if (admins.includes(userId)) {
        await ctx.answerCbQuery('User is already an admin');
        return;
      }
      
      // Add user to admin list
      await firestore.collection('config').doc('admins').set(
        { userIds: [...admins, userId] },
        { merge: true }
      );
      
      await logAdminAction('user_promoted', ctx.from.id, { promotedUserId: userId });
      await ctx.answerCbQuery('✅ User promoted to admin');
      
      // Refresh user details view
      await showUsersList(ctx, parseInt(page), filter);
      
    } catch (error) {
      console.error('Error promoting user to admin:', error);
      await ctx.answerCbQuery('❌ Failed to promote user').catch(ignoreCallbackError);
    }
  });
  
  // Handle demote admin
  bot.action(/^demote_(\d+)_(\d+)_(\w+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.").catch(ignoreCallbackError);
      return;
    }
    
    const [userId, page, filter] = ctx.match.slice(1);
    
    try {
      // Get admin config
      const adminDoc = await firestore.collection('config').doc('admins').get();
      const admins = adminDoc.exists ? adminDoc.data().userIds || [] : [];
      
      // Check if not an admin
      if (!admins.includes(userId)) {
        await ctx.answerCbQuery('User is not an admin');
        return;
      }
      
      // Prevent self-demotion
      if (userId === String(ctx.from.id)) {
        await ctx.answerCbQuery('❌ You cannot demote yourself');
        return;
      }
      
      // Remove user from admin list
      const updatedAdmins = admins.filter(id => id !== userId);
      await firestore.collection('config').doc('admins').set(
        { userIds: updatedAdmins },
        { merge: true }
      );
      
      await logAdminAction('user_demoted', ctx.from.id, { demotedUserId: userId });
      await ctx.answerCbQuery('✅ Admin privileges removed');
      
      // Refresh user details view
      await showUsersList(ctx, parseInt(page), filter);
      
    } catch (error) {
      console.error('Error demoting admin:', error);
      await ctx.answerCbQuery('❌ Failed to demote admin').catch(ignoreCallbackError);
    }
  });

  // Handle view user details with error handling
  bot.action(/^view_user_(\d+)(?:_(\d+)_(\w+))?$/, async (ctx) => {
    try {
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Access denied.").catch(ignoreCallbackError);
        return;
      }
      
      const [userId, page = '0', filter = 'all'] = ctx.match.slice(1);
      
      // Acknowledge the callback query with a short message
      try {
        await ctx.answerCbQuery('Loading user details...');
      } catch (error) {
        // Ignore errors for expired callbacks
        if (!error.message.includes('query is too old')) {
          console.error('Error answering callback query:', error);
        }
        return;
      }
      
      // Get user data from users collection
      const userDoc = await firestore.collection('users').doc(userId).get();
      
      if (!userDoc.exists) {
        await ctx.reply('❌ User not found');
        return;
      }
      
      const userData = userDoc.data();
      const userIdDisplay = userData.telegramId || userId;
      
      // Format user details with proper error handling for dates
      const formatDateSafe = (date, fallback = 'Never') => {
        try {
          // Handle Firestore timestamps and various date formats
          let d;
          if (!date) return fallback;
          if (date.seconds) { // Firestore timestamp
            d = new Date(date.seconds * 1000);
          } else if (date.toDate) { // Firestore timestamp object
            d = date.toDate();
          } else if (date instanceof Date) { // JavaScript Date
            d = date;
          } else {
            d = new Date(date);
          }
          
          // Check if date is valid
          if (isNaN(d.getTime())) return fallback;
          
          // Format the date in a user-friendly way
          return d.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          });
        } catch (e) {
          console.error('Date formatting error:', e);
          return fallback;
        }
      };
      
      const userDetails = `👤 *User Details*\n\n` +
        `*Basic Information*\n` +
        `├─ 👤 *Name:* ${escapeMarkdown(userData.firstName || 'N/A')} ${escapeMarkdown(userData.lastName || '')}\n` +
        `├─ ${userData.username ? `@${escapeMarkdown(userData.username)}` : 'No username'}\n` +
        `├─ 📱 *Phone:* ${userData.phoneNumber ? escapeMarkdown(userData.phoneNumber) : 'Not provided'}\n` +
        `├─ 🆔 *Telegram ID:* ${escapeMarkdown(String(userIdDisplay))}\n` +
        `├─ 🌐 *Language:* ${escapeMarkdown(userData.language || 'en')}\n` +
        `├─ 📅 *Joined:* ${formatDateSafe(userData.createdAt)}\n` +
        `└─ 🔄 *Last Active:* ${formatDateSafe(userData.lastActivity)}\n\n` +
        `*Account Status*\n` +
        `├─ 🔒 *Verified:* ${userData.phoneVerified ? '✅' : '❌'}\n` +
        `├─ 🚫 *Banned:* ${['banned', 'suspended'].includes(userData.status) ? '✅' : '❌'}\n` +
        `└─ ⭐ *Premium:* ${userData.isPremium ? '✅' : '❌'}`;
      
      // Create keyboard with action buttons
      const keyboard = [
        [
          { 
            text: '🔙 Back to Users', 
            callback_data: `users_filter_${filter}_${page}`
          }
        ]
      ];
      
      // Add ban/unban button based on current status
      const isBanned = ['banned', 'suspended'].includes(userData.status || '');
      
      // Check if user is admin
      let isAdmin = false;
      try {
        const adminDoc = await firestore.collection('config').doc('admins').get();
        if (adminDoc.exists) {
          const adminData = adminDoc.data();
          const adminIds = Array.isArray(adminData.userIds) ? adminData.userIds : [];
          isAdmin = adminIds.includes(userId);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
      
      // First row: Ban/Unban and Message buttons
      const actionRow = [];
      
      if (!isAdmin) {
        actionRow.push({
          text: isBanned ? '✅ Unban User' : '🚫 Ban User',
          callback_data: isBanned 
            ? `unban_${userId}_${page}_${filter}`
            : `ban_${userId}_${page}_${filter}`
        });
      }
      
      actionRow.push({
        text: '💬 Message',
        callback_data: `message_${userId}_${page}_${filter}`
      });
      
      keyboard.unshift(actionRow);
      
      // Add admin actions row
      const adminActionRow = [];
      
      if (isAdmin) {
        // For admins, show demote option if not the current user
        if (userId !== String(ctx.from.id)) {
          adminActionRow.push({
            text: '👎 Demote Admin',
            callback_data: `demote_${userId}_${page}_${filter}`
          });
        } else {
          adminActionRow.push({
            text: '⭐ You (Admin)',
            callback_data: 'noop'
          });
        }
      } else {
        // For non-admins, show promote option
        adminActionRow.push({
          text: '👑 Promote to Admin',
          callback_data: `promote_${userId}_${page}_${filter}`
        });
      }
      
      // Add admin actions row to keyboard if it has buttons
      if (adminActionRow.length > 0) {
        keyboard.unshift(adminActionRow);
      }
      
      // Edit the message with user details
      await ctx.editMessageText(userDetails, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard },
        disable_web_page_preview: true
      });
      
    } catch (error) {
      console.error('Error in view_user handler:', error);
      try {
        await ctx.answerCbQuery('❌ Error loading user details').catch(ignoreCallbackError);
      } catch (e) {
        // Ignore errors in error handling
      }
    }
  });

  // Handle ban user callback
  bot.action(/^ban_(.+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const userId = ctx.match[1];
    
    try {
      // Show ban reason input
      await ctx.editMessageText(
        "🚫 *Ban User*\n\nEnter the reason for banning this user:",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel', callback_data: 'cancel_ban' }]
            ]
          }
        }
      );
      
      // Wait for user to input reason
      const reasonResponse = await ctx.replyWithMarkdown("Please type the reason for banning this user:");
      
      // Create a message collector for the reason
      const reason = await new Promise((resolve) => {
        const collector = new Map();
        collector.set(ctx.from.id, { resolve });
        
        // Set a timeout for the response (30 seconds)
        const timeout = setTimeout(() => {
          collector.delete(ctx.from.id);
          resolve(null);
        }, 30000);
        
        // Handle the response
        bot.on('message', async (msg) => {
          if (msg.from.id === ctx.from.id && collector.has(msg.from.id)) {
            clearTimeout(timeout);
            collector.get(msg.from.id).resolve(msg.text);
            collector.delete(msg.from.id);
            
            // Delete the reason message
            try {
              await ctx.telegram.deleteMessage(ctx.chat.id, msg.message_id);
            } catch (e) {}
          }
        });
      });
      
      if (!reason) {
        await ctx.reply("Ban cancelled or timed out.");
        return;
      }
      
      // Import banUser function
      const { banUser } = await import('../utils/database.js');
      const result = await banUser(userId, reason);
      
      if (result.success) {
        await logAdminAction('user_banned', ctx.from.id, {
          targetUserId: userId,
          reason: reason
        });
        
        // Notify the user
        try {
          await ctx.telegram.sendMessage(
            userId,
            `🚫 *You have been banned from using this bot.*\n\n*Reason:* ${reason}\n\nIf you believe this is a mistake, please contact support.`,
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error('Failed to notify banned user:', error);
        }
        
        await ctx.reply(`✅ User has been banned successfully.\n*Reason:* ${reason}`, { parse_mode: 'Markdown' });
      } else {
        throw new Error(result.error || 'Failed to ban user');
      }
    } catch (error) {
      console.error('Error in ban action:', error);
      await ctx.answerCbQuery('❌ Failed to ban user');
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });
  
  // Handle unban user callback
  bot.action(/^unban_(.+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const userId = ctx.match[1];
    
    try {
      // Import unbanUser function
      const { unbanUser } = await import('../utils/database.js');
      const result = await unbanUser(userId);
      
      if (result.success) {
        await logAdminAction('user_unbanned', ctx.from.id, {
          targetUserId: userId
        });
        
        // Notify the user
        try {
          await ctx.telegram.sendMessage(
            userId,
            "✅ *Your account has been unbanned.*\n\nYou can now use the bot again.",
            { parse_mode: 'Markdown' }
          );
        } catch (error) {
          console.error('Failed to notify unbanned user:', error);
        }
        
        await ctx.answerCbQuery('✅ User unbanned');
        await ctx.reply("✅ User has been unbanned successfully.");
        
        // Refresh the users list
        ctx.match = ['users_page_0'];
        return handleUsersList(ctx);
      } else {
        throw new Error(result.error || 'Failed to unban user');
      }
    } catch (error) {
      console.error('Error in unban action:', error);
      await ctx.answerCbQuery('❌ Failed to unban user');
      await ctx.reply(`❌ Error: ${error.message}`);
    }
  });
  
  // Handle cancel ban
  bot.action('cancel_ban', async (ctx) => {
    await ctx.answerCbQuery('Ban cancelled');
    await ctx.deleteMessage();
  });
  
  // Helper function to handle users list display
  async function handleUsersList(ctx, page = 0) {
    const usersSnapshot = await firestore.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Sort users by status (banned users first)
    users.sort((a, b) => {
      const aBanned = a.status === 'banned' || a.status === 'suspended';
      const bBanned = b.status === 'banned' || b.status === 'suspended';
      if (aBanned === bBanned) return 0;
      return aBanned ? -1 : 1;
    });
    
    const pageSize = 5;
    const totalPages = Math.ceil(users.length / pageSize);
    const usersToShow = users.slice(page * pageSize, (page + 1) * pageSize);
    
    let message = `👥 *Users Management* (${users.length} total)\n\n`;
    usersToShow.forEach((user, index) => {
      const isBanned = user.status === 'banned' || user.status === 'suspended';
      const statusEmoji = isBanned ? '🔴' : '🟢';
      const userInfo = [
        `${statusEmoji} *${escapeMarkdown(user.firstName || 'No name')} ${escapeMarkdown(user.lastName || '')}`.trim(),
        user.username ? `@${escapeMarkdown(user.username)}` : 'No username',
        `📱 ${user.phoneNumber ? escapeMarkdown(user.phoneNumber) : 'No phone'}`,
        `📅 Joined: ${formatDateSafe(user.createdAt, 'Unknown')}`,
        `🔄 Last active: ${formatDateSafe(user.lastActivity, 'Never')}`,
        '\n' + '─'.repeat(30) + '\n'
      ].filter(Boolean).join('\n');
      message += userInfo;
    });
    
    message += `\nPage ${page + 1} of ${totalPages}`;

    const keyboard = {
      inline_keyboard: [
        ...usersToShow.map(user => {
          const isBanned = user.status === 'banned' || user.status === 'suspended';
          return [
            {
              text: isBanned ? `✅ Unban ${user.firstName || 'User'}` : `🚫 Ban ${user.firstName || 'User'}`,
              callback_data: isBanned ? `unban_${user.id}` : `ban_${user.id}`
            },
            {
              text: '👤 View',
              callback_data: `view_user_${user.id}`
            }
          ];
        }),
        [
          { text: '⬅️ Previous', callback_data: `users_prev_${page}` },
          { text: '🏠 Main Menu', callback_data: 'admin_menu' },
          { text: '➡️ Next', callback_data: `users_next_${page}` }
        ]
      ]
    };
    
    if (ctx.update.callback_query) {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      await ctx.answerCbQuery();
    } else {
      await ctx.reply(message, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  }

  // Handle /admin command
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
      paymentsSnapshot.docs.forEach(doc => {
        const paymentData = doc.data();
        if (paymentData.status === 'approved' && paymentData.amount) {
          totalRevenue += parseFloat(paymentData.amount) || 0;
        }
      });

      const adminMessage = `🔧 **BirrPay Admin Panel**

👋 Welcome, Administrator!

📊 **Live Statistics:**
• 👥 Total Users: ${totalUsers}
• ✅ Active Users: ${activeUsers}
• 📱 Active Subscriptions: ${activeSubscriptions}
• ⏳ Pending Subscriptions: ${pendingSubscriptions}
• 💳 Total Payments: ${totalPayments}
• ⏳ Pending Payments: ${pendingPayments}
• 💰 Total Revenue: ETB ${totalRevenue.toFixed(2)}
• 🛍️ Available Services: ${servicesSnapshot.size}

**Available Actions:**`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users Management', callback_data: 'admin_users' }],
          [{ text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }],
          [{ text: '🛠️ Support Messages', callback_data: 'admin_support' }],
          [{ text: '📈 Detailed Statistics', callback_data: 'admin_stats' }],
          [{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }],
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

  // Function to display users list with pagination and filters
  async function showUsersList(ctx, page = 0, filter = 'all') {
    try {
      // Check admin authorization
      if (!(await isAuthorizedAdmin(ctx))) {
        await ctx.answerCbQuery("❌ Unauthorized access");
        return;
      }

      // Get all users
      let usersSnapshot = await firestore.collection('users').get();
      let users = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        ref: doc.ref
      }));

      // Apply filters
      if (filter === 'active') {
        users = users.filter(user => !['banned', 'suspended'].includes(user.status || ''));
      } else if (filter === 'banned') {
        users = users.filter(user => ['banned', 'suspended'].includes(user.status || ''));
      } else if (filter === 'premium') {
        users = users.filter(user => user.isPremium === true);
      }

      if (users.length === 0) {
        const noUsersMessage = `No users found matching the selected filter: *${filter.charAt(0).toUpperCase() + filter.slice(1)}*`;
        await ctx.reply(noUsersMessage, { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Back to All Users', callback_data: 'admin_users' }],
              [{ text: '🏠 Main Menu', callback_data: 'admin_menu' }]
            ]
          }
        });
        return;
      }

      // Sort users by last activity (most recent first)
      users.sort((a, b) => {
        const aTime = a.lastActivity ? new Date(a.lastActivity) : new Date(0);
        const bTime = b.lastActivity ? new Date(b.lastActivity) : new Date(0);
        return bTime - aTime;
      });

      // Display users in a list with pagination and action buttons
      const pageSize = 5;
      const totalPages = Math.ceil(users.length / pageSize);
      
      // Ensure page is within bounds
      const safePage = Math.max(0, Math.min(page, totalPages - 1));
      const start = safePage * pageSize;
      const end = start + pageSize;
      const usersToShow = users.slice(start, end);

      // Escape all user data before displaying
      const escapedFilter = escapeMarkdown(filter);
      const filterDisplay = {
        'all': 'All',
        'active': 'Active',
        'banned': 'Banned',
        'premium': 'Premium'
      }[filter] || 'All';
      
      let message = `👥 *Users Management* (${users.length} ${filter === 'all' ? 'total' : escapedFilter})`;
      message += `\n\n📊 *Filters:* ${escapeMarkdown(filterDisplay)} users`;
      message += '\n' + '─'.repeat(30) + '\n\n';
      
      usersToShow.forEach((user, index) => {
        const isBanned = user.status === 'banned' || user.status === 'suspended';
        const statusEmoji = isBanned ? '🔴' : '🟢';
        const premiumBadge = user.isPremium ? '🌟 ' : '';
        // Format dates using our safe formatter
        const formatDateSafe = (date, fallback = 'Unknown') => {
          try {
            if (!date) return fallback;
            let d;
            if (date.seconds) d = new Date(date.seconds * 1000);
            else if (date.toDate) d = date.toDate();
            else d = new Date(date);
            
            if (isNaN(d.getTime())) return fallback;
            
            return d.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          } catch (e) {
            return fallback;
          }
        };
        
        // Escape all user data
        const firstName = escapeMarkdown(user.firstName || 'User');
        const lastName = escapeMarkdown(user.lastName || '');
        const username = user.username ? `@${escapeMarkdown(user.username)}` : 'No username';
        const phone = user.phoneNumber ? escapeMarkdown(user.phoneNumber) : 'No phone';
        const joinDate = formatDateSafe(user.createdAt, 'Unknown');
        const lastActive = formatDateSafe(user.lastActivity, 'Never');
        
        message += `${premiumBadge}${statusEmoji} *${firstName} ${lastName}*`.trim();
        message += `\n├─ 👤 ${username}`;
        message += `\n├─ 📱 ${phone}`;
        message += `\n├─ 📅 Joined: ${joinDate}`;
        message += `\n└─ 🔄 Last active: ${lastActive}`;
        message += '\n' + '─'.repeat(30) + '\n\n';
      });
      
      message += `📄 Page ${safePage + 1} of ${totalPages}`;

      // Create filter buttons with active state indication
      const filterButtons = [
        { 
          text: `👥 All ${filter === 'all' ? '✅' : ''}`, 
          callback_data: `users_filter_all_0` 
        },
        { 
          text: `🟢 Active ${filter === 'active' ? '✅' : ''}`, 
          callback_data: 'users_filter_active_0' 
        },
        { 
          text: `🔴 Banned ${filter === 'banned' ? '✅' : ''}`, 
          callback_data: 'users_filter_banned_0' 
        },
        { 
          text: `⭐ Premium ${filter === 'premium' ? '✅' : ''}`, 
          callback_data: 'users_filter_premium_0' 
        }
      ];

      // Create user action buttons with status indicators
      const userActionButtons = usersToShow.map(user => {
        const isBanned = user.status === 'banned' || user.status === 'suspended';
        const userStatus = isBanned ? '🔴 Banned' : (user.isPremium ? '⭐ Premium' : '🟢 Active');
        const userName = user.username ? `@${user.username}` : (user.firstName || `User ${user.id.substring(0, 6)}`);
        
        return [
          {
            text: `👤 ${userName} (${userStatus})`,
            callback_data: `view_user_${user.id}_${page}_${filter}`
          },
          {
            text: isBanned ? '✅ Unban' : '🚫 Ban',
            callback_data: isBanned ? `unban_${user.id}_${page}_${filter}` : `ban_${user.id}_${page}_${filter}`
          }
        ];
      });

      // Create pagination controls
      const paginationControls = [
        { 
          text: '⬅️ Previous', 
          callback_data: safePage > 0 ? `users_prev_${safePage}_${filter}` : 'noop',
          hide: safePage === 0
        },
        { 
          text: '🔄 Refresh', 
          callback_data: `users_filter_${filter}_${safePage}`
        },
        { 
          text: '🏠 Menu', 
          callback_data: 'admin_menu' 
        },
        { 
          text: '➡️ Next', 
          callback_data: safePage < totalPages - 1 ? `users_next_${safePage}_${filter}` : 'noop',
          hide: safePage >= totalPages - 1
        }
      ];

      // Combine all keyboard sections
      const keyboard = {
        inline_keyboard: [
          filterButtons.map(btn => ({
            ...btn,
            text: btn.text.replace(/\s*✅$/, '') + (btn.callback_data.includes(filter) ? ' ✅' : '')
          })),
          ...userActionButtons,
          paginationControls.filter(btn => !btn.hide)
        ]
      };

      // Filter out hidden buttons
      keyboard.inline_keyboard = keyboard.inline_keyboard.map(row => 
        row.filter(button => !button.hide)
      );

      if (ctx.update.callback_query) {
        try {
          // Only edit if the message has actually changed
          const currentText = ctx.update.callback_query.message?.text || '';
          const currentMarkup = ctx.update.callback_query.message?.reply_markup || {};
          
          // Check if content is different
          const isSameContent = currentText === message && 
            JSON.stringify(currentMarkup) === JSON.stringify(keyboard);
            
          if (!isSameContent) {
            await ctx.editMessageText(message, { 
              parse_mode: 'Markdown', 
              reply_markup: keyboard,
              disable_web_page_preview: true
            });
          }
          await ctx.answerCbQuery();
        } catch (error) {
          // Ignore "message not modified" errors
          if (!error.message.includes('message is not modified')) {
            console.error('Error updating message:', error);
            await ctx.answerCbQuery('Error updating message');
          } else {
            await ctx.answerCbQuery();
          }
        }
      } else {
        await ctx.reply(message, { 
          parse_mode: 'Markdown', 
          reply_markup: keyboard,
          disable_web_page_preview: true
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      await ctx.reply("❌ An error occurred while fetching users.");
    }
  }

  // Handle admin_users action (Manage Users button)
  bot.action('admin_users', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    await ctx.answerCbQuery();
    await showUsersList(ctx, 0);
  });

  // Handle pagination for users list with filter persistence
  bot.action(/^users_(prev|next)_(\d+)_(\w+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const direction = ctx.match[1];
    let page = parseInt(ctx.match[2]);
    const filter = ctx.match[3];
    
    if (direction === 'next') {
      page = Math.max(0, page - 1);
    } else if (direction === 'prev') {
      page++;
    }
    
    await ctx.answerCbQuery();
    await showUsersList(ctx, page, filter);
  });
  
  // Handle user filter changes
  bot.action(/^users_filter_(\w+)_(\d+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const filter = ctx.match[1];
    const page = parseInt(ctx.match[2]) || 0;
    
    await ctx.answerCbQuery(`Showing ${filter} users...`);
    await showUsersList(ctx, page, filter);
  });
  
  // No-op handler for disabled navigation buttons
  bot.action('noop', async (ctx) => {
    await ctx.answerCbQuery();
  });
  
  // Handle view user details with context
  bot.action(/^view_user_(.+?)(?:_(\d+)_(\w+))?$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    try {
      const [userId, returnPage = '0', returnFilter = 'all'] = ctx.match.slice(1);
      await ctx.answerCbQuery('Loading user details...');
      
      // Store current context for back navigation
      const context = {
        page: parseInt(returnPage) || 0,
        filter: returnFilter || 'all',
        timestamp: Date.now()
      };
    
    // Get user data from users collection
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      await ctx.answerCbQuery('❌ User not found');
      await showUsersList(ctx, 0, 'all');
      return;
    }
    
    const userData = userDoc.data();
    const userIdDisplay = userData.telegramId || userId;
    
    // Get user's subscriptions
    const subsSnapshot = await firestore.collection('subscriptions')
      .where('telegramUserID', '==', userIdDisplay)
      .get();
    
    // Get user's payments
    const paymentsSnapshot = await firestore.collection('payments')
      .where('userId', '==', userIdDisplay)
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    // Process subscriptions
    const activeSubs = [];
    const expiredSubs = [];
    let totalSpent = 0;
    
    subsSnapshot.docs.forEach(doc => {
      const sub = doc.data();
      if (sub.status === 'active') {
        activeSubs.push(sub);
      } else {
        expiredSubs.push(sub);
      }
    });
    
    // Process payments
    const recentPayments = [];
    paymentsSnapshot.docs.forEach(doc => {
      const payment = doc.data();
      totalSpent += parseFloat(payment.amount || 0);
      recentPayments.push(payment);
    });
    
    // Format subscription info with escaped values
    let subscriptionInfo = '';
    if (activeSubs.length > 0) {
      subscriptionInfo += '\n\n*Active Subscriptions:*\n';
      activeSubs.forEach(sub => {
        const serviceName = escapeMarkdown(sub.serviceName || 'Unknown Service');
        const planName = escapeMarkdown(sub.planName || 'No plan');
        const expiresAt = sub.expiresAt ? formatDate(sub.expiresAt) : 'No expiry';
        subscriptionInfo += `• ${serviceName} (${planName}) - Expires: ${expiresAt}\n`;
      });
    }
    
    if (expiredSubs.length > 0) {
      subscriptionInfo += '\n*Expired/Cancelled Subscriptions:*\n';
      expiredSubs.slice(0, 5).forEach(sub => {
        const serviceName = escapeMarkdown(sub.serviceName || 'Unknown Service');
        subscriptionInfo += `• ${serviceName} - ${escapeMarkdown(sub.status || 'unknown')}\n`;
      });
      if (expiredSubs.length > 5) {
        subscriptionInfo += `• ...and ${expiredSubs.length - 5} more\n`;
      }
    }
    
    // Format payment info with escaped values
    let paymentInfo = '';
    if (recentPayments.length > 0) {
      paymentInfo = '\n\n*Recent Payments:*\n';
      recentPayments.forEach(payment => {
        const amount = payment.amount ? parseFloat(payment.amount).toFixed(2) : '0.00';
        const status = escapeMarkdown(payment.status || 'completed');
        const date = payment.timestamp ? formatDate(payment.timestamp) : 'N/A';
        paymentInfo += `• ${amount} ETB - ${status} - ${date}\n`;
      });
    }
    
    // Helper function to format date safely
    const formatDate = (date) => {
      try {
        if (!date) return 'N/A';
        const d = date.toDate ? date.toDate() : new Date(date);
        return isNaN(d.getTime()) ? 'N/A' : d.toLocaleString();
      } catch (e) {
        return 'N/A';
      }
    };

      // Format user details with escaped values
      const userDetails = `👤 *User Details*\n\n` +
        `*Basic Information*\n` +
        `├─ 👤 *Name:* ${escapeMarkdown(userData.firstName || 'N/A')} ${escapeMarkdown(userData.lastName || '')}\n` +
        `├─ ${userData.username ? `@${escapeMarkdown(userData.username)}` : 'No username'}\n` +
        `├─ 📱 *Phone:* ${userData.phoneNumber ? escapeMarkdown(userData.phoneNumber) : 'Not provided'}\n` +
        `├─ 🆔 *Telegram ID:* ${escapeMarkdown(String(userIdDisplay))}\n` +
        `├─ 🌐 *Language:* ${escapeMarkdown(userData.language || 'en')}\n` +
        `├─ 📅 *Joined:* ${formatDate(userData.createdAt)}\n` +
        `└─ 🔄 *Last Active:* ${formatDate(userData.lastActivity)}\n\n` +
        `*Account Status*\n` +
        `├─ 🔒 *Verified:* ${userData.phoneVerified ? '✅' : '❌'}\n` +
        `├─ 🚫 *Banned:* ${['banned', 'suspended'].includes(userData.status) ? '✅' : '❌'}\n` +
        `└─ ⭐ *Premium:* ${userData.isPremium ? '✅' : '❌'}\n\n` +
        `*Subscription Stats*\n` +
        `├─ ✅ *Active:* ${activeSubs.length}\n` +
        `├─ ❌ *Expired:* ${expiredSubs.length}\n` +
        `└─ 💰 *Total Spent:* ${totalSpent.toFixed(2)} ETB` +
        subscriptionInfo +
        paymentInfo;
        
      // Add back button with context
      const backButton = [{
        text: '🔙 Back to User List',
        callback_data: `users_filter_${context.filter}_${context.page}`
      }];
      
      // Add ban/unban button based on current status
      const isBanned = ['banned', 'suspended'].includes(userData.status || '');
      const banButton = [{
        text: isBanned ? '✅ Unban User' : '🚫 Ban User',
        callback_data: isBanned 
          ? `unban_${userId}_${context.page}_${context.filter}`
          : `ban_${userId}_${context.page}_${context.filter}`
      }];
      
      // Add message user button
      const messageButton = [{
        text: '💬 Message User',
        callback_data: `message_user_${userId}_${context.page}_${context.filter}`
      }];
      
      // Add view subscriptions button if any exist
      const subscriptionsButton = [];
      if (activeSubs.length + expiredSubs.length > 0) {
        subscriptionsButton.push({
          text: '📋 View Subscriptions',
          callback_data: `view_user_subs_${userId}_${context.page}_${context.filter}`
        });
      }

      // Prepare keyboard with dynamic buttons
      const keyboard = [
        messageButton,
        banButton,
        subscriptionsButton,
        backButton
      ];

      // Add edit user button
      keyboard.push([{ 
        text: '📝 Edit User', 
        callback_data: `edit_user_${userId}` 
      }]);

      if (ctx.update.callback_query.message.text !== userDetails) {
        await ctx.editMessageText(userDetails, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard },
          disable_web_page_preview: true
        });
      }
    } catch (error) {
      console.error('Error showing user details:', error);
      await ctx.answerCbQuery('❌ Error loading user details');
      await showUsersList(ctx, 0, 'all');
    }
  });

  // Handle ban user
  bot.action(/^ban_(.+?)_(\d+)_(\w+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const [userId, page, filter] = ctx.match.slice(1);
    
    try {
      await firestore.collection('users').doc(userId).update({
        status: 'banned',
        updatedAt: new Date()
      });
      
      await ctx.answerCbQuery('✅ User banned successfully');
      await showUsersList(ctx, parseInt(page), filter);
      
      // Log the action
      await logAdminAction('user_banned', ctx.from.id, {
        targetUserId: userId,
        page,
        filter
      });
    } catch (error) {
      console.error('Error banning user:', error);
      await ctx.answerCbQuery('❌ Failed to ban user');
    }
  });

  // Handle unban user
  bot.action(/^unban_(.+?)_(\d+)_(\w+)$/, async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }
    
    const [userId, page, filter] = ctx.match.slice(1);
    
    try {
      await firestore.collection('users').doc(userId).update({
        status: 'active',
        updatedAt: new Date()
      });
      
      await ctx.answerCbQuery('✅ User unbanned successfully');
      await showUsersList(ctx, parseInt(page), filter);
      
      // Log the action
      await logAdminAction('user_unbanned', ctx.from.id, {
        targetUserId: userId,
        page,
        filter
      });
    } catch (error) {
      console.error('Error unbanning user:', error);
      await ctx.answerCbQuery('❌ Failed to unban user');
    }
  });

  // Handle support messages view
  bot.action('admin_support_messages', async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const messages = await getSupportMessages();
      const openMessages = messages.filter(msg => msg.status === 'open');
      
      if (openMessages.length === 0) {
        await ctx.editMessageText("✅ No open support messages at the moment.", {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
            ]
          }
        });
        return;
      }

      // Sort by creation date (newest first)
      openMessages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      // Show first message
      await showSupportMessage(ctx, openMessages, 0);
      
    } catch (error) {
      console.error('Error loading support messages:', error);
      await ctx.answerCbQuery('Error loading support messages');
    }
  });

  // Handle pending payments review
  bot.action('admin_pending', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
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

      // Sort payments by creation date (newest first) - client-side sorting
      pendingPayments.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order (newest first)
      });

      // Show first pending payment
      await showPendingPayment(ctx, pendingPayments, 0);
      
    } catch (error) {
      console.error('Error loading pending payments:', error);
      await ctx.answerCbQuery('❌ Error loading pending payments');
    }
  });

  // Helper function to display pending payment details
  const showPendingPayment = async (ctx, payments, index) => {
    if (index >= payments.length || index < 0) {
      await ctx.answerCbQuery('No more payments');
      return;
    }

    const payment = payments[index];
    const userDisplay = payment.userInfo.username !== 'No username' 
      ? `@${payment.userInfo.username}`
      : `${payment.userInfo.firstName} ${payment.userInfo.lastName}`.trim();

    // Format date safely
    const formatDate = (date) => {
      try {
        if (!date) return 'Unknown';
        const d = date.toDate ? date.toDate() : new Date(date);
        return d.toLocaleString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      } catch (error) {
        return 'Unknown';
      }
    };

    const message = `💳 **Payment Approval Required**

👤 **User:** ${escapeMarkdown(userDisplay)}
📱 **User ID:** \`${payment.userId}\`
💰 **Amount:** ${escapeMarkdown(payment.price || payment.amount || 'N/A')}
📅 **Service:** ${escapeMarkdown(payment.serviceName || 'N/A')}
⏱️ **Duration:** ${escapeMarkdown(payment.durationName || 'N/A')}
📝 **Reference:** ${escapeMarkdown(payment.paymentReference || payment.reference || 'N/A')}
🕒 **Submitted:** ${formatDate(payment.createdAt)}

📋 **Payment ${index + 1} of ${payments.length}**`;

    const keyboard = [
      [
        { text: '✅ Approve', callback_data: `approve_payment_${payment.id}` },
        { text: '❌ Reject', callback_data: `reject_payment_${payment.id}` }
      ]
    ];

    // Navigation buttons
    const navButtons = [];
    if (index > 0) {
      navButtons.push({ text: '⬅️ Previous', callback_data: `admin_pending_${index - 1}` });
    }
    if (index < payments.length - 1) {
      navButtons.push({ text: '➡️ Next', callback_data: `admin_pending_${index + 1}` });
    }
    if (navButtons.length > 0) {
      keyboard.push(navButtons);
    }

    keyboard.push([{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]);

    try {
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      if (!error.message.includes('message is not modified')) {
        console.error('Error showing pending payment:', error);
      }
    }
  };

  // Handle navigation between pending payments
  bot.action(/^admin_pending_(\d+)$/, async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    const index = parseInt(ctx.match[1]);
    
    try {
      // Re-fetch pending payments to ensure current data
      const pendingSnapshot = await firestore
        .collection('pendingPayments')
        .where('status', '==', 'proof_submitted')
        .get();

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
          payment.userInfo = {
            firstName: 'Unknown',
            lastName: '',
            username: 'No username'
          };
        }
        
        pendingPayments.push(payment);
      }

      // Sort payments by creation date (newest first) - client-side sorting
      pendingPayments.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB - dateA; // Descending order (newest first)
      });

      await showPendingPayment(ctx, pendingPayments, index);
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error navigating pending payments:', error);
      await ctx.answerCbQuery('❌ Error loading payment');
    }
  });

  // Handle back to admin action
  bot.action('back_to_admin', async (ctx) => {
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
      paymentsSnapshot.docs.forEach(doc => {
        const paymentData = doc.data();
        if (paymentData.status === 'approved' && paymentData.amount) {
          totalRevenue += parseFloat(paymentData.amount) || 0;
        }
      });

      const adminMessage = `🔧 **BirrPay Admin Panel**

👋 Welcome, Administrator!

📊 **Live Statistics:**
• 👥 Total Users: ${totalUsers}
• ✅ Active Users: ${activeUsers}
• 📱 Active Subscriptions: ${activeSubscriptions}
• ⏳ Pending Subscriptions: ${pendingSubscriptions}
• 💳 Total Payments: ${totalPayments}
• ⏳ Pending Payments: ${pendingPayments}
• 💰 Total Revenue: ETB ${totalRevenue.toFixed(2)}
• 🛍️ Available Services: ${servicesSnapshot.size}

**Available Actions:**`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users Management', callback_data: 'admin_users' }],
          [{ text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }],
          [{ text: '🛠️ Support Messages', callback_data: 'admin_support' }],
          [{ text: '📈 Detailed Statistics', callback_data: 'admin_stats' }],
          [{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      };

      await ctx.editMessageText(adminMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error returning to admin menu:', error);
      await ctx.answerCbQuery('❌ Error loading admin menu');
    }
  });

  // Handle statistics view
  bot.action('admin_stats', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      // Get comprehensive statistics
      const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, servicesSnapshot, supportSnapshot] = await Promise.all([
        firestore.collection('users').get(),
        firestore.collection('subscriptions').get(),
        firestore.collection('payments').get(),
        firestore.collection('services').get(),
        firestore.collection('supportMessages').get()
      ]);

      // Calculate detailed statistics
      const totalUsers = usersSnapshot.size;
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const userData = doc.data();
        return userData.status !== 'banned' && userData.status !== 'suspended';
      }).length;
      const bannedUsers = usersSnapshot.docs.filter(doc => doc.data().status === 'banned').length;
      const suspendedUsers = usersSnapshot.docs.filter(doc => doc.data().status === 'suspended').length;
      
      const totalSubscriptions = subscriptionsSnapshot.size;
      const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
      const pendingSubscriptions = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;
      const expiredSubscriptions = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'expired').length;
      const rejectedSubscriptions = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'rejected').length;
      
      const totalPayments = paymentsSnapshot.size;
      const approvedPayments = paymentsSnapshot.docs.filter(doc => doc.data().status === 'approved').length;
      const pendingPayments = paymentsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;
      const rejectedPayments = paymentsSnapshot.docs.filter(doc => doc.data().status === 'rejected').length;
      
      const totalSupport = supportSnapshot.size;
      const openSupport = supportSnapshot.docs.filter(doc => doc.data().status === 'open').length;
      const closedSupport = supportSnapshot.docs.filter(doc => doc.data().status === 'closed').length;
      
      // Calculate revenue and growth metrics
      let totalRevenue = 0;
      let monthlyRevenue = 0;
      let weeklyRevenue = 0;
      let dailyRevenue = 0;
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Service popularity tracking
      const serviceStats = {};
      
      paymentsSnapshot.docs.forEach(doc => {
        const paymentData = doc.data();
        if (paymentData.status === 'approved' && paymentData.amount) {
          const amount = parseFloat(paymentData.amount) || 0;
          totalRevenue += amount;
          
          // Track service popularity
          if (paymentData.serviceName) {
            serviceStats[paymentData.serviceName] = (serviceStats[paymentData.serviceName] || 0) + 1;
          }
          
          // Check payment timing
          if (paymentData.createdAt) {
            const paymentDate = paymentData.createdAt.toDate ? paymentData.createdAt.toDate() : new Date(paymentData.createdAt);
            
            if (paymentDate.getMonth() === currentMonth && paymentDate.getFullYear() === currentYear) {
              monthlyRevenue += amount;
            }
            if (paymentDate >= weekAgo) {
              weeklyRevenue += amount;
            }
            if (paymentDate >= dayAgo) {
              dailyRevenue += amount;
            }
          }
        }
      });
      
      // Calculate user growth
      let newUsersThisMonth = 0;
      let newUsersThisWeek = 0;
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.createdAt) {
          const userDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
          if (userDate.getMonth() === currentMonth && userDate.getFullYear() === currentYear) {
            newUsersThisMonth++;
          }
          if (userDate >= weekAgo) {
            newUsersThisWeek++;
          }
        }
      });
      
      // Get most popular service
      const mostPopularService = Object.keys(serviceStats).reduce((a, b) => 
        serviceStats[a] > serviceStats[b] ? a : b, 'None');
      
      const statsMessage = `📈 **Comprehensive Statistics**

👥 **Users Overview:**
• Total Users: ${totalUsers}
• Active Users: ${activeUsers}
• Banned Users: ${bannedUsers}
• Suspended Users: ${suspendedUsers}
• New This Month: ${newUsersThisMonth}
• New This Week: ${newUsersThisWeek}

📊 **Subscriptions:**
• Total: ${totalSubscriptions}
• ✅ Active: ${activeSubscriptions}
• ⏳ Pending: ${pendingSubscriptions}
• ❌ Rejected: ${rejectedSubscriptions}
• ⏰ Expired: ${expiredSubscriptions}

💳 **Payments:**
• Total Processed: ${totalPayments}
• ✅ Approved: ${approvedPayments}
• ⏳ Pending: ${pendingPayments}
• ❌ Rejected: ${rejectedPayments}

💰 **Revenue Analytics:**
• Today: ETB ${dailyRevenue.toFixed(2)}
• This Week: ETB ${weeklyRevenue.toFixed(2)}
• This Month: ETB ${monthlyRevenue.toFixed(2)}
• All Time: ETB ${totalRevenue.toFixed(2)}

🛍️ **Services:**
• Available Services: ${servicesSnapshot.size}
• Most Popular: ${mostPopularService}

🛠️ **Support:**
• Total Tickets: ${totalSupport}
• Open Tickets: ${openSupport}
• Closed Tickets: ${closedSupport}

📅 **Report Generated:**
${new Date().toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short'
      })}`;

      await ctx.editMessageText(statsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔄 Refresh Stats', callback_data: 'admin_stats' }],
            [{ text: '📊 Service Analytics', callback_data: 'service_analytics' }],
            [{ text: '📈 Growth Metrics', callback_data: 'growth_metrics' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error loading statistics:', error);
      await ctx.answerCbQuery('❌ Error loading statistics');
    }
  });

  // Handle broadcast functionality
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

  // Handle broadcast message input
  bot.action('start_broadcast', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    await ctx.editMessageText(
      "📝 **Send Broadcast Message**\n\nPlease type your broadcast message in the next message. It will be sent to all active users.\n\n💡 **Tips:**\n• Use *bold* for emphasis\n• Use _italic_ for style\n• Use `code` for technical terms\n• Keep messages clear and concise",
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

  // Handle text messages for broadcast
  bot.on('text', async (ctx, next) => {
    try {
      const userId = ctx.from?.id;
      if (userId && global.broadcastState && global.broadcastState[userId]?.awaitingBroadcast) {
        if (!(await isAuthorizedAdmin(ctx))) {
          delete global.broadcastState[userId];
          return next();
        }

        const message = ctx.message.text;
        delete global.broadcastState[userId];

        await processBroadcast(ctx, message);
        return;
      }
    } catch (error) {
      console.error('Error in broadcast text handler:', error);
    }
    return next();
  });

  // Handle broadcast message processing
  const processBroadcast = async (ctx, message) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      return;
    }

    try {
      // Show processing message
      const processingMsg = await ctx.reply('📡 **Broadcasting message...**\n\nPlease wait while we send your message to all users.', {
        parse_mode: 'Markdown'
      });

      // Get all active users
      const usersSnapshot = await firestore.collection('users').get();
      const activeUsers = usersSnapshot.docs.filter(doc => {
        const userData = doc.data();
        return userData.status !== 'banned' && userData.status !== 'suspended';
      });

      let successCount = 0;
      let failCount = 0;
      const failedUsers = [];

      // Send message to all active users with rate limiting
      for (let i = 0; i < activeUsers.length; i++) {
        const userDoc = activeUsers[i];
        try {
          await ctx.telegram.sendMessage(userDoc.id, `📢 **Admin Broadcast**\n\n${message}`, {
            parse_mode: 'Markdown'
          });
          successCount++;
          
          // Rate limiting: wait 50ms between messages to avoid hitting Telegram limits
          if (i < activeUsers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50));
          }
        } catch (error) {
          console.error(`Failed to send broadcast to user ${userDoc.id}:`, error.message);
          failCount++;
          failedUsers.push(userDoc.id);
        }
      }

      // Delete processing message
      try {
        await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
      } catch (error) {
        // Ignore delete errors
      }

      const resultMessage = `✅ **Broadcast Complete**

📊 **Results:**
• ✅ Successfully sent: ${successCount}
• ❌ Failed to send: ${failCount}
• 👥 Total active users: ${activeUsers.length}
• 📈 Success rate: ${((successCount / activeUsers.length) * 100).toFixed(1)}%

📝 **Message sent:**
${message.length > 100 ? message.substring(0, 100) + '...' : message}`;

      await ctx.reply(resultMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });

      // Log the broadcast action
      await logAdminAction('broadcast_sent', ctx.from.id, {
        message: message.substring(0, 200), // Limit message length in logs
        successCount,
        failCount,
        totalUsers: activeUsers.length,
        failedUsers: failedUsers.slice(0, 10) // Limit failed users in logs
      });

    } catch (error) {
      console.error('Error processing broadcast:', error);
      await ctx.reply('❌ Error sending broadcast message. Please try again.');
    }
  };

  // Handle back to admin action
  bot.action('back_to_admin', async (ctx) => {
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
      paymentsSnapshot.docs.forEach(doc => {
        const paymentData = doc.data();
        if (paymentData.status === 'approved' && paymentData.amount) {
          totalRevenue += parseFloat(paymentData.amount) || 0;
        }
      });

      const adminMessage = `🔧 **BirrPay Admin Panel**

👋 Welcome, Administrator!

📊 **Live Statistics:**
• 👥 Total Users: ${totalUsers}
• ✅ Active Users: ${activeUsers}
• 📱 Active Subscriptions: ${activeSubscriptions}
• ⏳ Pending Subscriptions: ${pendingSubscriptions}
• 💳 Total Payments: ${totalPayments}
• ⏳ Pending Payments: ${pendingPayments}
• 💰 Total Revenue: ETB ${totalRevenue.toFixed(2)}
• 🛍️ Available Services: ${servicesSnapshot.size}

**Available Actions:**`;

      const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users Management', callback_data: 'admin_users' }],
          [{ text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }],
          [{ text: '🛠️ Support Messages', callback_data: 'admin_support' }],
          [{ text: '📈 Detailed Statistics', callback_data: 'admin_stats' }],
          [{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }],
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
}
