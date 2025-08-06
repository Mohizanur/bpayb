import { firestore } from "../utils/firestore.js";
import { escapeMarkdownV2 } from "../utils/i18n.js";

export default function adminHandler(bot) {
  // Admin panel main menu
  bot.command("admin", async (ctx) => {
    if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
      await ctx.reply("❌ Access denied. Admin only command.");
      return;
    }

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
        await ctx.editMessageText('✅ No pending subscription requests!', {
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

      let pendingList = '🔄 **Pending Subscription Requests:**\n\n';
      const buttons = [];

      pendingSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const date = new Date(data.requestedAt).toLocaleDateString();
        
        pendingList += `**${index + 1}.** ${data.serviceName}\n`;
        pendingList += `👤 User ID: ${data.telegramUserID}\n`;
        pendingList += `💰 Amount: ${data.price} ETB\n`;
        pendingList += `📅 Date: ${date}\n\n`;

        buttons.push([
          {
            text: `📋 Review #${index + 1}`,
            callback_data: `review_sub_${doc.id}`
          }
        ]);
      });

      buttons.push([
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

      const reviewMessage = `📋 **Subscription Review**

🎯 **Service:** ${subData.serviceName}
👤 **User ID:** ${subData.telegramUserID}
💰 **Amount:** ${subData.price} ETB
📅 **Requested:** ${date}
📸 **Screenshot:** ${subData.paymentScreenshot ? 'Uploaded' : 'Not uploaded'}

**Actions:**`;

      await ctx.editMessageText(reviewMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: '📸 View Screenshot',
                callback_data: `view_screenshot_${subscriptionId}`
              }
            ],
            [
              {
                text: '✅ Approve',
                callback_data: `approve_sub_${subscriptionId}`
              },
              {
                text: '❌ Reject',
                callback_data: `reject_sub_${subscriptionId}`
              }
            ],
            [
              {
                text: '💬 Contact User',
                callback_data: `contact_user_${subData.telegramUserID}`
              }
            ],
            [
              {
                text: '🔙 Back to Pending',
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

      // Notify user
      try {
        const userNotification = `✅ **Subscription Approved!**

🎯 **Service:** ${subData.serviceName}
💰 **Amount:** ${subData.price} ETB
📅 **Valid Until:** ${new Date(activeSubscription.endDate).toLocaleDateString()}

Your subscription is now active! You can access your service immediately.

Use /mysubs to view all your subscriptions.`;

        await bot.telegram.sendMessage(subData.telegramUserID, userNotification, {
          parse_mode: 'Markdown'
        });
      } catch (notifyError) {
        console.log("Could not notify user:", notifyError);
      }

      await ctx.answerCbQuery('✅ Subscription approved successfully!');
      
      // Refresh the admin panel
      await ctx.editMessageText(`✅ **Subscription Approved**\n\nSubscription for ${subData.serviceName} has been approved and activated.`, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔙 Back to Pending',
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

      // Notify user
      try {
        const userNotification = `❌ **Subscription Request Rejected**

🎯 **Service:** ${subData.serviceName}
💰 **Amount:** ${subData.price} ETB

Your subscription request has been rejected. This could be due to:
• Invalid payment screenshot
• Incorrect payment amount
• Payment not received

Please contact support if you believe this is an error.
Use /support to get help.`;

        await bot.telegram.sendMessage(subData.telegramUserID, userNotification, {
          parse_mode: 'Markdown'
        });
      } catch (notifyError) {
        console.log("Could not notify user:", notifyError);
      }

      await ctx.answerCbQuery('❌ Subscription rejected');
      
      // Refresh the admin panel
      await ctx.editMessageText(`❌ **Subscription Rejected**\n\nSubscription for ${subData.serviceName} has been rejected.`, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔙 Back to Pending',
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

    // Trigger admin command again
    ctx.command = { command: 'admin' };
    await adminHandler.apply(this, [bot]);
    const adminCommand = bot.commands.find(cmd => cmd.command === 'admin');
    if (adminCommand) {
      await adminCommand.handler(ctx);
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
      const stats = firestore.getStats ? firestore.getStats() : {
        totalUsers: 0,
        activeSubscriptions: 0,
        totalRevenue: 0,
        pendingTickets: 0,
        paidUsers: 0
      };

      const statsMessage = `📊 **System Statistics**

👥 **Users:**
• Total: ${stats.totalUsers}
• Premium: ${stats.paidUsers}

📺 **Subscriptions:**
• Active: ${stats.activeSubscriptions}
• Pending: ${stats.pendingTickets}

💰 **Revenue:**
• Total: ${stats.totalRevenue} ETB
• Average per user: ${stats.totalUsers > 0 ? Math.round(stats.totalRevenue / stats.totalUsers) : 0} ETB

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
}
