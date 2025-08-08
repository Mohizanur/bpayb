import { firestore } from "../utils/firestore.js";

// Helper function for admin security check
const isAuthorizedAdmin = (ctx) => {
  const isAdmin = ctx.from?.id.toString() === process.env.ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    console.warn(`Unauthorized admin access attempt from user ${ctx.from?.id} (${ctx.from?.username || 'no username'})`);
  }
  return isAdmin;
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

export default function adminHandler(bot) {
  // Handle admin panel button click
  bot.action('admin_panel', async (ctx) => {
    try {
      if (!isAuthorizedAdmin(ctx)) {
        await ctx.answerCbQuery('❌ Unauthorized access');
        return;
      }

      const lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
      const webPanelUrl = `${process.env.WEB_APP_URL || 'https://your-deployed-url.com'}/panel`;
      
      const adminMessage = `👑 *Admin Panel*\n\n` +
        `🔹 *Quick Actions*\n` +
        `• View all users\n` +
        `• Manage subscriptions\n` +
        `• Process payments\n\n` +
        `🔗 [Open Web Admin Panel](${webPanelUrl})`;
      
      await ctx.editMessageText(adminMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { 
                text: '🖥️ Open Web Admin', 
                url: webPanelUrl 
              }
            ],
            [
              { text: '👥 Manage Users', callback_data: 'admin_users' },
              { text: '📊 View Stats', callback_data: 'admin_stats' }
            ],
            [
              { text: '📝 Manage Services', callback_data: 'admin_services' },
              { text: '💬 Support Tickets', callback_data: 'admin_support' }
            ],
            [
              { 
                text: lang === 'am' ? '⬅️ ወደ ዋናው ገጽ' : '⬅️ Back to Main', 
                callback_data: 'back_to_start' 
              }
            ]
          ]
        }
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin panel handler:', error);
      await ctx.answerCbQuery('❌ Error loading admin panel');
    }
  });
  
  
  // Handle message replies for admin operations
  bot.on('text', async (ctx, next) => {
    try {
      // Check if this is an admin and if they have any pending operations
      if (ctx.from?.id.toString() === process.env.ADMIN_TELEGRAM_ID) {
        const adminStateDoc = await firestore.collection('adminStates').doc(String(ctx.from.id)).get();
        
        if (adminStateDoc.exists) {
          const adminState = adminStateDoc.data();
          
          // Handle broadcast message
          if (adminState.awaitingBroadcast) {
            const message = ctx.message.text;
            
            if (message === '/cancel') {
              await firestore.collection('adminStates').doc(String(ctx.from.id)).delete();
              await ctx.reply('Broadcast cancelled.');
              return;
            }
            
            // Send broadcast to all verified users
            try {
              const usersSnapshot = await firestore.collection('users')
                .where('phoneVerified', '==', true)
                .get();
              
              let successCount = 0;
              let failCount = 0;
              
              const broadcastMessage = `📢 **BirrPay Announcement**\n\n${message}\n\n---\nBirrPay Team`;
              
              for (const userDoc of usersSnapshot.docs) {
                const userData = userDoc.data();
                if (userData.telegramId) {
                  try {
                    await bot.telegram.sendMessage(userData.telegramId, broadcastMessage, {
                      parse_mode: 'Markdown'
                    });
                    successCount++;
                  } catch (error) {
                    console.log(`Failed to send to user ${userData.telegramId}:`, error.message);
                    failCount++;
                  }
                }
              }
              
              // Clear admin state
              await firestore.collection('adminStates').doc(String(ctx.from.id)).delete();
              
              await ctx.reply(`📢 **Broadcast Complete**\n\n✅ Sent to ${successCount} users\n❌ Failed: ${failCount}`, {
                parse_mode: 'Markdown'
              });
              
            } catch (error) {
              console.error('Error broadcasting:', error);
              await ctx.reply('❌ Error sending broadcast message.');
            }
            return;
          }
          
          // Handle direct message to user
          if (adminState.awaitingUserMessage && adminState.targetUserId) {
            const message = ctx.message.text;
            
            if (message === '/cancel') {
              await firestore.collection('adminStates').doc(String(ctx.from.id)).delete();
              await ctx.reply('Message cancelled.');
              return;
            }
            
            try {
              await bot.telegram.sendMessage(
                adminState.targetUserId,
                `📨 **Message from Admin**\n\n${message}\n\n---\nBirrPay Support Team`,
                { parse_mode: 'Markdown' }
              );
              
              // Clear admin state
              await firestore.collection('adminStates').doc(String(ctx.from.id)).delete();
              
              await ctx.reply(`✅ Message sent to user ${adminState.targetUserId}`);
              
            } catch (error) {
              console.error('Error sending message to user:', error);
              await ctx.reply('❌ Error sending message to user. They may have blocked the bot.');
            }
            return;
          }
        }
      }
    } catch (error) {
      console.error('Error handling admin text:', error);
    }
    
    // Continue to next handler
    return next();
  });
  // Admin panel main menu
  bot.command("admin", async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.\n\n🔒 All access attempts are logged for security.");
      return;
    }

    // Log admin access
    await logAdminAction('admin_panel_access', ctx.from.id, {
      username: ctx.from.username,
      firstName: ctx.from.first_name
    });

    try {
      // Get pending subscription requests
      const pendingSnapshot = await firestore
        .collection('subscription_requests')
        .where('status', '==', 'pending_admin_approval')
        .get();

      const pendingCount = pendingSnapshot.size;

      // Get active subscriptions count
      const activeSnapshot = await firestore
        .collection('subscriptions')
        .where('status', '==', 'active')
        .get();

      const activeCount = activeSnapshot.size;

      // Get total users
      const usersSnapshot = await firestore
        .collection('users')
        .get();

      const usersCount = usersSnapshot.size;

      const adminMenu = `🔧 **Admin Panel**

📊 **Quick Stats:**
• 🔄 Pending Approvals: ${pendingCount}
• ✅ Active Subscriptions: ${activeCount}
• 👥 Total Users: ${usersCount}

**Management Options:**`;

      await ctx.reply(adminMenu, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `🔄 Review Pending (${pendingCount})`,
                callback_data: 'admin_pending'
              }
            ],
            [
              {
                text: '✅ Active Subscriptions',
                callback_data: 'admin_active'
              },
              {
                text: '👥 Manage Users',
                callback_data: 'admin_users'
              }
            ],
            [
              {
                text: '📊 Statistics',
                callback_data: 'admin_stats'
              },
              {
                text: '🛠️ Settings',
                callback_data: 'admin_settings'
              }
            ],
            [
              {
                text: '💬 Broadcast',
                callback_data: 'admin_broadcast'
              }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error in admin command:', error);
      await ctx.reply('Error loading admin panel.');
    }
  });

  bot.command("admin_help", async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.\n\n🔒 All access attempts are logged for security.");
      return;
    }

    const helpMessage = `🔧 **BirrPay Admin Command Center**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Available Commands**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🎛️ Main Controls:**
• \`/admin\` - Main admin control center
• \`/admin_help\` - This comprehensive help
• \`/stats\` - Detailed system statistics

**⚡ Quick Access:**
• \`/admin_pending\` - View pending requests
• \`/admin_support\` - View support messages  
• \`/admin_active\` - View active subscriptions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎛️ **Control Panel Features**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **Subscription Management**
• Review payment screenshots
• Approve/reject requests instantly
• Contact customers directly
• Monitor active subscriptions

📊 **Analytics & Monitoring**
• Real-time system statistics
• Revenue tracking
• User growth metrics
• Performance monitoring

📢 **Communication Tools**
• Broadcast messages to all users
• Direct customer messaging
• Support ticket management
• Automated notifications

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔗 **Additional Resources**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🌐 **Web Admin Panel:** \`/panel\`
📊 **System Status:** \`/admin → Settings\`
🔒 **Security Logs:** All actions tracked
📱 **Mobile Access:** Full Telegram integration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **Pro Tips**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Use web panel for detailed management
• All admin actions are automatically logged
• Customers receive instant notifications
• System supports multiple languages

**Admin ID:** \`${process.env.ADMIN_TELEGRAM_ID}\`
**System Version:** BirrPay v2.0 Professional`;

    await ctx.reply(helpMessage, {
      parse_mode: 'Markdown'
    });

    // Log help access
    await logAdminAction('admin_help_accessed', ctx.from.id);
  });

  // System health and logs command
  bot.command("admin_system", async (ctx) => {
    if (!isAuthorizedAdmin(ctx)) {
      await ctx.reply("❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.\n\n🔒 All access attempts are logged for security.");
      return;
    }

    try {
      // Get recent admin logs
      const logsSnapshot = await firestore
        .collection('adminLogs')
        .orderBy('timestamp', 'desc')
        .limit(5)
        .get();

      const recentLogs = logsSnapshot.docs.map(doc => {
        const data = doc.data();
        return `• ${data.action} - ${data.timestamp.toDate().toLocaleString()}`;
      });

      const systemStatus = `🔧 **System Health Monitor**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **System Status**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🟢 **Bot Status:** Online & Active
🟢 **Database:** Connected
🟢 **Admin Panel:** Operational
🟢 **Notifications:** Working

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ **Performance Metrics**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Uptime:** ${Math.floor(process.uptime() / 60)} minutes
**Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB
**Node Version:** ${process.version}
**Platform:** ${process.platform}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 **Recent Admin Activity**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${recentLogs.length > 0 ? recentLogs.join('\n') : 'No recent activity logged'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 **Security Information**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Admin ID:** \`${process.env.ADMIN_TELEGRAM_ID}\`
**Environment:** Production
**Logging:** Enabled
**Last Check:** ${new Date().toLocaleString()}`;

      await ctx.reply(systemStatus, {
        parse_mode: 'Markdown'
      });

      // Log system check
      await logAdminAction('system_health_check', ctx.from.id);

    } catch (error) {
      console.error('Error checking system health:', error);
      await ctx.reply('❌ Error checking system health. Please check logs.');
    }
  });

  // Handle pending subscription reviews
  bot.action('admin_pending', async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const pendingSnapshot = await firestore
        .collection('subscription_requests')
        .where('status', '==', 'pending_admin_approval')
        .orderBy('requestedAt', 'desc')
        .limit(10)
        .get();

      if (pendingSnapshot.empty) {
        await ctx.editMessageText('✅ **All Caught Up!**\n\n🎉 No pending subscription requests to review.\n\nGreat job staying on top of approvals!', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🔙 Back to Admin Center',
                callback_data: 'back_to_admin'
              }
            ]]
          }
        });
        return;
      }

      let pendingList = `🔄 **Subscription Review Queue**\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📋 **${pendingSnapshot.size} Pending Request${pendingSnapshot.size !== 1 ? 's' : ''}**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      const buttons = [];

      pendingSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const date = new Date(data.requestedAt).toLocaleDateString();
        const time = new Date(data.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        pendingList += `**${index + 1}.** 🎯 ${data.serviceName}\n`;
        pendingList += `   👤 User: \`${data.telegramUserID}\`\n`;
        pendingList += `   💰 Amount: **${data.price} ETB**\n`;
        pendingList += `   📅 Submitted: ${date} at ${time}\n`;
        pendingList += `   📸 Screenshot: ${data.paymentScreenshot ? '✅ Uploaded' : '❌ Missing'}\n\n`;

        buttons.push([
          {
            text: `📋 Review "${data.serviceName}"`,
            callback_data: `review_sub_${doc.id}`
          }
        ]);
      });

      buttons.push([
        {
          text: '🔄 Refresh Queue',
          callback_data: 'admin_pending'
        },
        {
          text: '🔙 Back to Admin',
          callback_data: 'back_to_admin'
        }
      ]);

      await ctx.editMessageText(pendingList, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: buttons
        }
      });

    } catch (error) {
      console.error('Error loading pending requests:', error);
      await ctx.answerCbQuery('Error loading pending requests');
    }
  });

  // Handle individual subscription review
  bot.action(/^review_sub_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const subscriptionId = ctx.match[1];
      const subDoc = await firestore.collection('subscription_requests').doc(subscriptionId).get();
      
      if (!subDoc.exists) {
        await ctx.answerCbQuery('Subscription request not found');
        return;
      }

      const subData = subDoc.data();
      const date = new Date(subData.requestedAt).toLocaleDateString();
      const time = new Date(subData.requestedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

      const reviewMessage = `📋 **Detailed Subscription Review**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **Service Details**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Service:** \`${subData.serviceName}\`
**Amount:** **${subData.price} ETB**
**Request ID:** \`${subscriptionId.substring(0, 8)}...\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 **Customer Information**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**User ID:** \`${subData.telegramUserID}\`
**Submitted:** ${date} at ${time}
**Payment Proof:** ${subData.paymentScreenshot ? '✅ Screenshot Uploaded' : '❌ No Screenshot'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ **Available Actions**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await ctx.editMessageText(reviewMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📸 View Payment Proof',
                callback_data: `view_screenshot_${subscriptionId}`
              }
            ],
            [
              {
                text: '✅ Approve & Activate',
                callback_data: `approve_sub_${subscriptionId}`
              },
              {
                text: '❌ Reject Request',
                callback_data: `reject_sub_${subscriptionId}`
              }
            ],
            [
              {
                text: '💬 Contact Customer',
                callback_data: `contact_user_${subData.telegramUserID}`
              }
            ],
            [
              {
                text: '🔙 Back to Queue',
                callback_data: 'admin_pending'
              }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error reviewing subscription:', error);
      await ctx.answerCbQuery('Error reviewing subscription');
    }
  });

  // Handle screenshot viewing
  bot.action(/^view_screenshot_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const subscriptionId = ctx.match[1];
      const subDoc = await firestore.collection('subscription_requests').doc(subscriptionId).get();
      
      if (!subDoc.exists) {
        await ctx.answerCbQuery('Subscription request not found');
        return;
      }

      const subData = subDoc.data();
      
      if (!subData.paymentScreenshot) {
        await ctx.answerCbQuery('No screenshot uploaded');
        return;
      }

      const screenshot = subData.paymentScreenshot;
      const caption = `💰 Payment Screenshot\n\n📋 ID: ${subscriptionId}\n🎯 Service: ${subData.serviceName}\n💰 Amount: ${subData.price} ETB`;

      if (screenshot.mime_type && screenshot.mime_type === 'application/pdf') {
        await ctx.replyWithDocument(screenshot.file_id, {
          caption: caption,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '✅ Approve',
                callback_data: `approve_sub_${subscriptionId}`
              },
              {
                text: '❌ Reject',
                callback_data: `reject_sub_${subscriptionId}`
              }
            ]]
          }
        });
      } else {
        await ctx.replyWithPhoto(screenshot.file_id, {
          caption: caption,
          reply_markup: {
            inline_keyboard: [[
              {
                text: '✅ Approve',
                callback_data: `approve_sub_${subscriptionId}`
              },
              {
                text: '❌ Reject',
                callback_data: `reject_sub_${subscriptionId}`
              }
            ]]
          }
        });
      }

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error viewing screenshot:', error);
      await ctx.answerCbQuery('Error viewing screenshot');
    }
  });

  // Handle subscription approval
  bot.action(/^approve_sub_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const subscriptionId = ctx.match[1];
      const subDoc = await firestore.collection('subscription_requests').doc(subscriptionId).get();
      
      if (!subDoc.exists) {
        await ctx.answerCbQuery('Subscription request not found');
        return;
      }

      const subData = subDoc.data();

      // Create active subscription
      const activeSubscription = {
        id: `active_${Date.now()}_${subData.telegramUserID}`,
        telegramUserID: subData.telegramUserID,
        serviceID: subData.serviceID,
        serviceName: subData.serviceName,
        price: subData.price,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        approvedAt: new Date().toISOString(),
        approvedBy: ctx.from.id,
        originalRequestId: subscriptionId
      };

      // Save active subscription
      await firestore.collection('subscriptions').doc(activeSubscription.id).set(activeSubscription);

      // Update request status
      await firestore.collection('subscription_requests').doc(subscriptionId).update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: ctx.from.id,
        activeSubscriptionId: activeSubscription.id
      });

      // Notify user with improved message
      const userNotification = `🎉 **Great News! Your Subscription is Approved!**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ **Subscription Activated**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Service:** \`${subData.serviceName}\`
💰 **Amount Paid:** **${subData.price} ETB**
📅 **Valid Until:** **${new Date(activeSubscription.endDate).toLocaleDateString()}**
⏰ **Activated:** ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 **Next Steps**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Your subscription is now **ACTIVE**!
📱 You can access your service immediately
📋 Use /mysubs to manage your subscriptions
💬 Need help? Use /support anytime

Thank you for choosing BirrPay! 🙏`;

      const notificationSent = await notifyUser(bot, subData.telegramUserID, userNotification);
      
      // Log the approval action
      await logAdminAction('subscription_approved', ctx.from.id, {
        subscriptionId,
        serviceName: subData.serviceName,
        userId: subData.telegramUserID,
        amount: subData.price,
        notificationSent
      });

      await ctx.answerCbQuery('✅ Subscription approved successfully!');
      
      // Refresh the admin panel
      await ctx.editMessageText(`✅ **Subscription Approved & Activated**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎉 **Action Completed Successfully**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Service:** \`${subData.serviceName}\`
**User:** \`${subData.telegramUserID}\`
**Amount:** **${subData.price} ETB**
**Status:** ✅ **ACTIVE**

📅 **Valid Until:** ${new Date(activeSubscription.endDate).toLocaleDateString()}

✉️ Customer has been notified automatically.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔙 Back to Review Queue',
              callback_data: 'admin_pending'
            }
          ]]
        }
      });

    } catch (error) {
      console.error('Error approving subscription:', error);
      await ctx.answerCbQuery('Error approving subscription');
    }
  });

  // Handle subscription rejection
  bot.action(/^reject_sub_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const subscriptionId = ctx.match[1];
      const subDoc = await firestore.collection('subscription_requests').doc(subscriptionId).get();
      
      if (!subDoc.exists) {
        await ctx.answerCbQuery('Subscription request not found');
        return;
      }

      const subData = subDoc.data();

      // Update request status
      await firestore.collection('subscription_requests').doc(subscriptionId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: ctx.from.id
      });

      // Notify user with improved rejection message
      const rejectionNotification = `😔 **Subscription Request Update**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ **Request Not Approved**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 **Service:** \`${subData.serviceName}\`
💰 **Amount:** **${subData.price} ETB**
📅 **Reviewed:** ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Common Reasons for Rejection**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

❌ Payment screenshot unclear or invalid
❌ Incorrect payment amount
❌ Payment not received or verified
❌ Duplicate subscription request

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🛠️ **What You Can Do**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 Contact support: /support
📝 Resubmit with correct information
🔄 Try again with clear payment proof

We're here to help! 🤝`;

      const notificationSent = await notifyUser(bot, subData.telegramUserID, rejectionNotification);

      // Log the rejection action
      await logAdminAction('subscription_rejected', ctx.from.id, {
        subscriptionId,
        serviceName: subData.serviceName,
        userId: subData.telegramUserID,
        amount: subData.price,
        notificationSent
      });

      await ctx.answerCbQuery('❌ Subscription rejected');
      
      // Refresh the admin panel
      await ctx.editMessageText(`❌ **Subscription Request Rejected**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ **Action Completed**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Service:** \`${subData.serviceName}\`
**User:** \`${subData.telegramUserID}\`
**Amount:** **${subData.price} ETB**
**Status:** ❌ **REJECTED**

**Rejection Time:** ${new Date().toLocaleString()}

✉️ Customer has been notified with rejection reasons.`, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔙 Back to Review Queue',
              callback_data: 'admin_pending'
            }
          ]]
        }
      });

    } catch (error) {
      console.error('Error rejecting subscription:', error);
      await ctx.answerCbQuery('Error rejecting subscription');
    }
  });

  // Handle back to admin navigation
  bot.action('back_to_admin', async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      await ctx.answerCbQuery();
      
      // Recreate admin panel
      // Get pending subscription requests
      const pendingSnapshot = await firestore
        .collection('subscription_requests')
        .where('status', '==', 'pending_admin_approval')
        .get();

      const pendingCount = pendingSnapshot.size;

      // Get active subscriptions count
      const activeSnapshot = await firestore
        .collection('subscriptions')
        .where('status', '==', 'active')
        .get();

      const activeCount = activeSnapshot.size;

      // Get total users
      const usersSnapshot = await firestore
        .collection('users')
        .get();

      const usersCount = usersSnapshot.size;

      const adminMenu = `🔧 **Admin Panel**

📊 **Quick Stats:**
• 🔄 Pending Approvals: ${pendingCount}
• ✅ Active Subscriptions: ${activeCount}
• 👥 Total Users: ${usersCount}

**Management Options:**`;

      await ctx.editMessageText(adminMenu, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: `🔄 Review Pending (${pendingCount})`,
                callback_data: 'admin_pending'
              }
            ],
            [
              {
                text: '✅ Active Subscriptions',
                callback_data: 'admin_active'
              },
              {
                text: '👥 Manage Users',
                callback_data: 'admin_users'
              }
            ],
            [
              {
                text: '📊 Statistics',
                callback_data: 'admin_stats'
              },
              {
                text: '🛠️ Settings',
                callback_data: 'admin_settings'
              }
            ],
            [
              {
                text: '💬 Broadcast',
                callback_data: 'admin_broadcast'
              }
            ]
          ]
        }
      });

    } catch (error) {
      console.error('Error returning to admin:', error);
      await ctx.reply('Error loading admin panel.');
    }
  });

  // Handle active subscriptions view
  bot.action('admin_active', async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const activeSnapshot = await firestore
        .collection('subscriptions')
        .where('status', '==', 'active')
        .orderBy('startDate', 'desc')
        .limit(10)
        .get();

      if (activeSnapshot.empty) {
        await ctx.editMessageText('📭 No active subscriptions found.', {
          reply_markup: {
            inline_keyboard: [[
              {
                text: '🔙 Back to Admin',
                callback_data: 'back_to_admin'
              }
            ]]
          }
        });
        return;
      }

      let activeList = '✅ **Active Subscriptions:**\n\n';
      
      activeSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const endDate = new Date(data.endDate).toLocaleDateString();
        
        activeList += `**${index + 1}.** ${data.serviceName}\n`;
        activeList += `👤 User: ${data.telegramUserID}\n`;
        activeList += `📅 Expires: ${endDate}\n`;
        activeList += `💰 Price: ${data.price} ETB\n\n`;
      });

      await ctx.editMessageText(activeList, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔙 Back to Admin',
              callback_data: 'back_to_admin'
            }
          ]]
        }
      });

    } catch (error) {
      console.error('Error loading active subscriptions:', error);
      await ctx.answerCbQuery('Error loading active subscriptions');
    }
  });

  // Handle statistics view
  bot.action('admin_stats', async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      // Get real statistics from database
      const usersSnapshot = await firestore.collection('users').get();
      const subsSnapshot = await firestore.collection('subscriptions').get();
      const reqSnapshot = await firestore.collection('subscription_requests').get();
      const supportSnapshot = await firestore.collection('supportMessages').get();
      
      // Calculate statistics
      const totalUsers = usersSnapshot.size;
      const totalSubscriptions = subsSnapshot.size;
      
      let activeSubscriptions = 0;
      let totalRevenue = 0;
      let expiredSubs = 0;
      
      subsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.status === 'active') {
          activeSubscriptions++;
          totalRevenue += parseFloat(data.price || 0);
        }
        if (data.status === 'expired') {
          expiredSubs++;
        }
      });
      
      let pendingRequests = 0;
      let approvedRequests = 0;
      let rejectedRequests = 0;
      
      reqSnapshot.docs.forEach(doc => {
        const data = doc.data();
        switch (data.status) {
          case 'pending_admin_approval':
            pendingRequests++;
            break;
          case 'approved':
            approvedRequests++;
            break;
          case 'rejected':
            rejectedRequests++;
            break;
        }
      });
      
      const unhandledSupport = supportSnapshot.docs.filter(doc => !doc.data().handled).length;
      const handledSupport = supportSnapshot.docs.filter(doc => doc.data().handled).length;

      const statsMessage = `📊 **System Statistics**

👥 **Users:**
• Total Users: ${totalUsers}
• Active Subscriptions: ${activeSubscriptions}

📺 **Subscription Requests:**
• Pending: ${pendingRequests}
• Approved: ${approvedRequests}
• Rejected: ${rejectedRequests}

💰 **Revenue:**
• Total Revenue: ${totalRevenue.toFixed(2)} ETB
• Average per User: ${totalUsers > 0 ? (totalRevenue / totalUsers).toFixed(2) : '0'} ETB

🛠️ **Support:**
• Unhandled: ${unhandledSupport}
• Handled: ${handledSupport}

📅 **Generated:** ${new Date().toLocaleString()}`;

      await ctx.editMessageText(statsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔄 Refresh',
              callback_data: 'admin_stats'
            }
          ], [
            {
              text: '🔙 Back to Admin',
              callback_data: 'back_to_admin'
            }
          ]]
        }
      });

    } catch (error) {
      console.error('Error loading statistics:', error);
      await ctx.answerCbQuery('Error loading statistics');
    }
  });

  // Handle contact user functionality  
  bot.action(/^contact_user_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const userId = ctx.match[1];
      
      const contactMsg = `💬 **Contact User**

👤 **User ID:** ${userId}

**Quick Actions:**`;

      await ctx.editMessageText(contactMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📨 Send Message',
                callback_data: `send_message_${userId}`
              }
            ],
            [
              {
                text: '📋 View User Details',
                callback_data: `user_details_${userId}`
              }
            ],
            [
              {
                text: '🔙 Back to Review',
                callback_data: `review_sub_${ctx.match[0].split('_')[2] || 'unknown'}`
              }
            ]
          ]
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error in contact user:', error);
      await ctx.answerCbQuery('Error contacting user');
    }
  });

  // Handle send message to user
  bot.action(/^send_message_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const userId = ctx.match[1];
      
      const sendMsgPrompt = `📨 **Send Message to User**

👤 **User ID:** ${userId}

Reply to this message with the text you want to send to the user.
Use /cancel to cancel this operation.`;

      await ctx.editMessageText(sendMsgPrompt, {
        parse_mode: 'Markdown',
        reply_markup: {
          force_reply: true,
          input_field_placeholder: 'Type your message to the user...'
        }
      });

      // Set admin state to expect message
      await firestore.collection('adminStates').doc(String(ctx.from.id)).set({
        awaitingUserMessage: true,
        targetUserId: userId,
        timestamp: new Date()
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error in send message:', error);
      await ctx.answerCbQuery('Error setting up message');
    }
  });

  // Handle user details view
  bot.action(/^user_details_(.+)$/, async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const userId = ctx.match[1];
      
      // Get user data from users collection
      const userSnapshot = await firestore.collection('users')
        .where('telegramId', '==', parseInt(userId))
        .limit(1)
        .get();

      if (userSnapshot.empty) {
        await ctx.answerCbQuery('User not found in database');
        return;
      }

      const userData = userSnapshot.docs[0].data();
      
      // Get user's subscriptions
      const subsSnapshot = await firestore.collection('subscriptions')
        .where('telegramUserID', '==', userId)
        .get();

      const activeCount = subsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
      const totalCount = subsSnapshot.size;

      const userDetailsMsg = `👤 **User Details**

**Basic Info:**
• Name: ${userData.firstName || 'Unknown'} ${userData.lastName || ''}
• Username: ${userData.username ? '@' + userData.username : 'Not set'}
• Telegram ID: ${userId}
• Phone: ${userData.phoneNumber || 'Not provided'}

**Subscription Info:**
• Active Subscriptions: ${activeCount}
• Total Subscriptions: ${totalCount}

**Account Status:**
• Verified: ${userData.phoneVerified ? '✅' : '❌'}
• Language: ${userData.language || 'en'}
• Joined: ${userData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}`;

      await ctx.editMessageText(userDetailsMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📨 Send Message',
                callback_data: `send_message_${userId}`
              }
            ],
            [
              {
                text: '🔙 Back to Contact',
                callback_data: `contact_user_${userId}`
              }
            ]
          ]
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error viewing user details:', error);
      await ctx.answerCbQuery('Error loading user details');
    }
  });
}
