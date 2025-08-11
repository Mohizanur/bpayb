import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Find the position just before the last closing brace of the adminHandler function
// Look for the pattern that indicates the end of the function
const lastClosingBrace = content.lastIndexOf('}');
const beforeLastBrace = content.substring(0, lastClosingBrace);

// Add the clean handlers
const cleanHandlers = `
  // Handle admin_subscriptions action
  bot.action('admin_subscriptions', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
      
      const activeCount = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
      const pendingCount = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'pending').length;
      const expiredCount = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'expired').length;
      const totalCount = subscriptionsSnapshot.size;

      const message = \`📊 **Subscription Management** 📊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 **Overview:**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🟢 **Active:** \${activeCount.toLocaleString()}
┃ 🟡 **Pending:** \${pendingCount.toLocaleString()}
┃ 🔴 **Expired:** \${expiredCount.toLocaleString()}
┃ 📊 **Total:** \${totalCount.toLocaleString()}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🎯 **Quick Actions:**
• View and manage active subscriptions
• Review pending subscription requests
• Monitor expired subscriptions
• Generate subscription reports\`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🟢 Active Subscriptions', callback_data: 'admin_active' }],
            [{ text: '🟡 Pending Requests', callback_data: 'admin_pending' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      await ctx.answerCbQuery('❌ Error loading subscriptions');
    }
  });

  // Handle admin_payments action
  bot.action('admin_payments', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const [paymentsSnapshot, pendingPaymentsSnapshot] = await Promise.all([
        firestore.collection('payments').get(),
        firestore.collection('pendingPayments').get()
      ]);

      const approvedCount = paymentsSnapshot.docs.filter(doc => doc.data().status === 'approved').length;
      const rejectedCount = paymentsSnapshot.docs.filter(doc => doc.data().status === 'rejected').length;
      const pendingCount = pendingPaymentsSnapshot.size;
      const totalCount = paymentsSnapshot.size;

      // Calculate total revenue
      let totalRevenue = 0;
      paymentsSnapshot.docs.forEach(doc => {
        const paymentData = doc.data();
        if (paymentData.status === 'approved' && paymentData.amount) {
          totalRevenue += parseFloat(paymentData.amount) || 0;
        }
      });

      const message = \`💳 **Payment Management** 💳

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 **Financial Overview:**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ **Approved:** \${approvedCount.toLocaleString()}
┃ ❌ **Rejected:** \${rejectedCount.toLocaleString()}
┃ ⏳ **Pending:** \${pendingCount.toLocaleString()}
┃ 📊 **Total Processed:** \${totalCount.toLocaleString()}
┃ 💎 **Total Revenue:** ETB \${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🎯 **Quick Actions:**
• Review pending payment approvals
• View approved payment history
• Check rejected payments
• Generate revenue reports\`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏳ Pending Approvals', callback_data: 'admin_pending' }],
            [{ text: '✅ Approved Payments', callback_data: 'admin_approved' }],
            [{ text: '❌ Rejected Payments', callback_data: 'admin_rejected' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error loading payments:', error);
      await ctx.answerCbQuery('❌ Error loading payments');
    }
  });

`;

// Insert the handlers before the last closing brace
const newContent = beforeLastBrace + cleanHandlers + '}';

// Write the content back to the file
fs.writeFileSync('src/handlers/admin.js', newContent);
console.log('✅ Clean subscription and payment handlers added successfully!');
