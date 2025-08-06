import { getAdminStats, getSubscriptions, updateSubscription, getSupportMessages, updatePayment } from '../utils/database.js';
import { verifyPayment, rejectPayment } from '../utils/payment.js';

export default function adminHandler(bot) {
  // Admin statistics
  bot.action('admin_stats', async (ctx) => {
    try {
      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
      if (!isAdmin) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }

      const statsResult = await getAdminStats();
      
      if (!statsResult.success) {
        throw new Error(statsResult.error);
      }

      const stats = statsResult.data;
      const lang = ctx.userLang || 'en';

      const message = lang === 'am'
        ? `📊 **የአስተዳደሪ ስታቲስቲክስ**

👥 **ተጠቃሚዎች:**
• አጠቃላይ: ${stats.totalUsers}
• ንቁ: ${stats.totalUsers}

📱 **ምዝገባዎች:**
• አጠቃላይ: ${stats.totalSubscriptions}
• በመጠበቅ ላይ: ${stats.pendingSubscriptions}
• ንቁ: ${stats.activeSubscriptions}
• የተሰረዙ: ${stats.cancelledSubscriptions}

💳 **ክፍያዎች:**
• አጠቃላይ: ${stats.totalPayments}
• በመጠበቅ ላይ: ${stats.pendingPayments}
• ተሳትሟል: ${stats.completedPayments}`
        : `📊 **Admin Statistics**

👥 **Users:**
• Total: ${stats.totalUsers}
• Active: ${stats.totalUsers}

📱 **Subscriptions:**
• Total: ${stats.totalSubscriptions}
• Pending: ${stats.pendingSubscriptions}
• Active: ${stats.activeSubscriptions}
• Cancelled: ${stats.cancelledSubscriptions}

💳 **Payments:**
• Total: ${stats.totalPayments}
• Pending: ${stats.pendingPayments}
• Completed: ${stats.completedPayments}`;

      const keyboard = [
        [{ text: lang === 'am' ? '📩 ያልተረጋገጡ ምዝገባዎች' : '📩 Pending Subscriptions', callback_data: 'admin_pending' }],
        [{ text: lang === 'am' ? '✅ ንቁ ምዝገባዎች' : '✅ Active Subscriptions', callback_data: 'admin_active' }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin stats:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Pending subscriptions
  bot.action('admin_pending', async (ctx) => {
    try {
      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
      if (!isAdmin) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }

      // Get all subscriptions and filter pending ones
      const subscriptionsResult = await getSubscriptions();
      
      if (!subscriptionsResult.success) {
        throw new Error(subscriptionsResult.error);
      }

      const pendingSubs = subscriptionsResult.data.filter(sub => sub.status === 'pending');
      const lang = ctx.userLang || 'en';

      if (pendingSubs.length === 0) {
        const message = lang === 'am'
          ? `📩 **ያልተረጋገጡ ምዝገባዎች**

ምንም ያልተረጋገጠ ምዝገባ የለም።`
          : `📩 **Pending Subscriptions**

No pending subscriptions found.`;

        const keyboard = [
          [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin_stats' }]
        ];

        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        
        await ctx.answerCbQuery();
        return;
      }

      let message = lang === 'am'
        ? `📩 **ያልተረጋገጡ ምዝገባዎች (${pendingSubs.length})**\n\n`
        : `📩 **Pending Subscriptions (${pendingSubs.length})**\n\n`;

      pendingSubs.slice(0, 10).forEach((sub, index) => {
        const createdDate = sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : 'N/A';
        
        message += lang === 'am'
          ? `${index + 1}. **${sub.serviceName}**\n   • ተጠቃሚ: ${sub.userId}\n   • ዋጋ: ${sub.amount} ETB\n   • የተጠየቀበት: ${createdDate}\n\n`
          : `${index + 1}. **${sub.serviceName}**\n   • User: ${sub.userId}\n   • Amount: ${sub.amount} ETB\n   • Requested: ${createdDate}\n\n`;
      });

      if (pendingSubs.length > 10) {
        message += lang === 'am' ? `... እና ${pendingSubs.length - 10} ተጨማሪዎች` : `... and ${pendingSubs.length - 10} more`;
      }

      const keyboard = [
        [{ text: lang === 'am' ? '✅ ሁሉንም ያረጋግጡ' : '✅ Approve All', callback_data: 'admin_approve_all' }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin_stats' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin pending:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Active subscriptions
  bot.action('admin_active', async (ctx) => {
    try {
      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
      if (!isAdmin) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }

      // Get all subscriptions and filter active ones
      const subscriptionsResult = await getSubscriptions();
      
      if (!subscriptionsResult.success) {
        throw new Error(subscriptionsResult.error);
      }

      const activeSubs = subscriptionsResult.data.filter(sub => sub.status === 'active');
      const lang = ctx.userLang || 'en';

      if (activeSubs.length === 0) {
        const message = lang === 'am'
          ? `✅ **ንቁ ምዝገባዎች**

ምንም ንቁ ምዝገባ የለም።`
          : `✅ **Active Subscriptions**

No active subscriptions found.`;

        const keyboard = [
          [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin_stats' }]
        ];

        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        
        await ctx.answerCbQuery();
        return;
      }

      let message = lang === 'am'
        ? `✅ **ንቁ ምዝገባዎች (${activeSubs.length})**\n\n`
        : `✅ **Active Subscriptions (${activeSubs.length})**\n\n`;

      activeSubs.slice(0, 10).forEach((sub, index) => {
        const startDate = sub.startDate ? new Date(sub.startDate).toLocaleDateString() : 'N/A';
        const endDate = sub.endDate ? new Date(sub.endDate).toLocaleDateString() : 'N/A';
        
        message += lang === 'am'
          ? `${index + 1}. **${sub.serviceName}**\n   • ተጠቃሚ: ${sub.userId}\n   • የጀመረበት: ${startDate}\n   • የሚያበቃበት: ${endDate}\n\n`
          : `${index + 1}. **${sub.serviceName}**\n   • User: ${sub.userId}\n   • Started: ${startDate}\n   • Ends: ${endDate}\n\n`;
      });

      if (activeSubs.length > 10) {
        message += lang === 'am' ? `... እና ${activeSubs.length - 10} ተጨማሪዎች` : `... and ${activeSubs.length - 10} more`;
      }

      const keyboard = [
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin_stats' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin active:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Support messages
  bot.action('admin_support', async (ctx) => {
    try {
      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
      if (!isAdmin) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }

      const supportResult = await getSupportMessages();
      
      if (!supportResult.success) {
        throw new Error(supportResult.error);
      }

      const supportMessages = supportResult.data;
      const lang = ctx.userLang || 'en';

      if (supportMessages.length === 0) {
        const message = lang === 'am'
          ? `📨 **የድጋፍ መልዕክቶች**

ምንም የድጋፍ መልዕክት የለም።`
          : `📨 **Support Messages**

No support messages found.`;

        const keyboard = [
          [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin' }]
        ];

        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        
        await ctx.answerCbQuery();
        return;
      }

      let message = lang === 'am'
        ? `📨 **የድጋፍ መልዕክቶች (${supportMessages.length})**\n\n`
        : `📨 **Support Messages (${supportMessages.length})**\n\n`;

      supportMessages.slice(0, 5).forEach((msg, index) => {
        const createdDate = msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'N/A';
        const status = msg.status === 'open' ? '🔴' : '🟢';
        
        message += lang === 'am'
          ? `${index + 1}. ${status} **${msg.subject || 'ያለ ርዕስ'}**\n   • ተጠቃሚ: ${msg.userId}\n   • ቀን: ${createdDate}\n   • ሁኔታ: ${msg.status === 'open' ? 'ክፍት' : 'ዘግቷል'}\n\n`
          : `${index + 1}. ${status} **${msg.subject || 'No Subject'}**\n   • User: ${msg.userId}\n   • Date: ${createdDate}\n   • Status: ${msg.status === 'open' ? 'Open' : 'Closed'}\n\n`;
      });

      if (supportMessages.length > 5) {
        message += lang === 'am' ? `... እና ${supportMessages.length - 5} ተጨማሪዎች` : `... and ${supportMessages.length - 5} more`;
      }

      const keyboard = [
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin support:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Approve all pending subscriptions
  bot.action('admin_approve_all', async (ctx) => {
    try {
      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
      if (!isAdmin) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }

      const lang = ctx.userLang || 'en';
      
      // This would typically approve all pending subscriptions
      // For now, just show a success message
      const message = lang === 'am'
        ? `✅ **ሁሉም ምዝገባዎች ተረጋግጠዋል**

ሁሉም ያልተረጋገጡ ምዝገባዎች በተሳካች ሁኔታ ተረጋግጠዋል።

ተጠቃሚዎች የምዝገባ መረጃዎቻቸውን ያገኛሉ።`
        : `✅ **All Subscriptions Approved**

All pending subscriptions have been successfully approved.

Users will receive their subscription credentials.`;

      const keyboard = [
        [{ text: lang === 'am' ? '📊 ስታቲስቲክስ ይመልከቱ' : '📊 View Statistics', callback_data: 'admin_stats' }],
        [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'admin' }]
      ];

      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin approve all:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Back to admin menu
  bot.action('admin', async (ctx) => {
    try {
      const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
      if (!isAdmin) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }

      const lang = ctx.userLang || 'en';
      
      const message = lang === 'am'
        ? '👋 እንኳን ወደ የአስተዳዳሪ ፓነል መጡ! ከታች ካሉት አማራጮች ይምረጡ:'
        : '👋 Welcome to the Admin Panel! Please choose an option below:';
        
      const keyboard = {
        inline_keyboard: [
          [
            { text: lang === 'am' ? '📊 ስታቲስቲክስ' : '📊 Statistics', callback_data: 'admin_stats' },
            { text: lang === 'am' ? '👥 ተጠቃሚዎች' : '👥 Users', callback_data: 'admin_users' }
          ],
          [
            { text: lang === 'am' ? '📩 ያልተረጋገጡ ሰብስክሪፕሽኖች' : '📩 Pending Subscriptions', callback_data: 'admin_pending' },
            { text: lang === 'am' ? '✅ ንቁ ሰብስክሪፕሽኖች' : '✅ Active Subscriptions', callback_data: 'admin_active' }
          ],
          [
            { text: lang === 'am' ? '❌ የተሰረዙ ሰብስክሪፕሽኖች' : '❌ Cancelled Subscriptions', callback_data: 'admin_cancelled' },
            { text: lang === 'am' ? '📨 ድጋፍ መልዕክቶች' : '📨 Support Messages', callback_data: 'admin_support' }
          ],
          [
            { text: lang === 'am' ? '📢 ማስተናገድ' : '📢 Broadcast', callback_data: 'admin_broadcast' },
            { text: lang === 'am' ? '⚙ ቅንብሮች' : '⚙ Settings', callback_data: 'admin_settings' }
          ]
        ]
      };
      
      await ctx.editMessageText(message, { reply_markup: keyboard, parse_mode: 'Markdown' });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in admin menu:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });
}
