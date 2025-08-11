import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Add the missing handlers before the closing brace of the adminHandler function
const missingHandlers = `
  // Handle admin_subscriptions action
  bot.action('admin_subscriptions', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
      const subscriptions = [];

      for (const doc of subscriptionsSnapshot.docs) {
        const subData = doc.data();
        // Get user info
        let userInfo = { username: 'Unknown', firstName: 'User', lastName: '' };
        try {
          const userDoc = await firestore.collection('users').doc(subData.userId).get();
          if (userDoc.exists) {
            userInfo = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
        }

        subscriptions.push({
          id: doc.id,
          ...subData,
          userInfo
        });
      }

      // Sort by creation date (newest first)
      subscriptions.sort((a, b) => {
        const aDate = a.createdAt?.toDate() || new Date(0);
        const bDate = b.createdAt?.toDate() || new Date(0);
        return bDate - aDate;
      });

      const activeCount = subscriptions.filter(s => s.status === 'active').length;
      const pendingCount = subscriptions.filter(s => s.status === 'pending').length;
      const expiredCount = subscriptions.filter(s => s.status === 'expired').length;

      const message = \`📊 **Subscription Management** 📊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 **Overview:**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🟢 **Active:** \${activeCount.toLocaleString()}
┃ 🟡 **Pending:** \${pendingCount.toLocaleString()}
┃ 🔴 **Expired:** \${expiredCount.toLocaleString()}
┃ 📊 **Total:** \${subscriptions.length.toLocaleString()}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📋 **Recent Subscriptions:**\`;

      // Show latest 5 subscriptions
      const recentSubs = subscriptions.slice(0, 5);
      recentSubs.forEach((sub, index) => {
        const userDisplay = sub.userInfo.username ? \`@\${sub.userInfo.username}\` : 
          \`\${sub.userInfo.firstName} \${sub.userInfo.lastName}\`.trim();
        const statusEmoji = sub.status === 'active' ? '🟢' : sub.status === 'pending' ? '🟡' : '🔴';
        const date = sub.createdAt?.toDate()?.toLocaleDateString() || 'Unknown';
        
        message += \`
\${index + 1}. \${statusEmoji} **\${userDisplay}**
   📱 Service: \${sub.serviceName || 'Unknown'}
   💰 Amount: ETB \${sub.amount || 'N/A'}
   📅 Date: \${date}\`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🟢 View Active', callback_data: 'admin_active' }, { text: '🟡 View Pending', callback_data: 'admin_pending' }],
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

      const payments = [];
      const pendingPayments = [];

      // Process regular payments
      for (const doc of paymentsSnapshot.docs) {
        const paymentData = doc.data();
        // Get user info
        let userInfo = { username: 'Unknown', firstName: 'User', lastName: '' };
        try {
          const userDoc = await firestore.collection('users').doc(paymentData.userId).get();
          if (userDoc.exists) {
            userInfo = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
        }

        payments.push({
          id: doc.id,
          ...paymentData,
          userInfo,
          type: 'processed'
        });
      }

      // Process pending payments
      for (const doc of pendingPaymentsSnapshot.docs) {
        const paymentData = doc.data();
        // Get user info
        let userInfo = { username: 'Unknown', firstName: 'User', lastName: '' };
        try {
          const userDoc = await firestore.collection('users').doc(paymentData.userId).get();
          if (userDoc.exists) {
            userInfo = userDoc.data();
          }
        } catch (error) {
          console.error('Error fetching user info:', error);
        }

        pendingPayments.push({
          id: doc.id,
          ...paymentData,
          userInfo,
          type: 'pending'
        });
      }

      const approvedCount = payments.filter(p => p.status === 'approved').length;
      const rejectedCount = payments.filter(p => p.status === 'rejected').length;
      const pendingCount = pendingPayments.length;

      // Calculate total revenue
      let totalRevenue = 0;
      payments.forEach(payment => {
        if (payment.status === 'approved' && payment.amount) {
          totalRevenue += parseFloat(payment.amount) || 0;
        }
      });

      const message = \`💳 **Payment Management** 💳

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 **Financial Overview:**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ✅ **Approved:** \${approvedCount.toLocaleString()}
┃ ❌ **Rejected:** \${rejectedCount.toLocaleString()}
┃ ⏳ **Pending:** \${pendingCount.toLocaleString()}
┃ 💎 **Total Revenue:** ETB \${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

📋 **Recent Activity:**\`;

      // Show recent payments (mix of processed and pending)
      const allPayments = [...payments, ...pendingPayments]
        .sort((a, b) => {
          const aDate = a.createdAt?.toDate() || new Date(0);
          const bDate = b.createdAt?.toDate() || new Date(0);
          return bDate - aDate;
        })
        .slice(0, 5);

      allPayments.forEach((payment, index) => {
        const userDisplay = payment.userInfo.username ? \`@\${payment.userInfo.username}\` : 
          \`\${payment.userInfo.firstName} \${payment.userInfo.lastName}\`.trim();
        const statusEmoji = payment.type === 'pending' ? '⏳' : 
          payment.status === 'approved' ? '✅' : '❌';
        const date = payment.createdAt?.toDate()?.toLocaleDateString() || 'Unknown';
        
        message += \`
\${index + 1}. \${statusEmoji} **\${userDisplay}**
   💰 Amount: ETB \${payment.amount || 'N/A'}
   📱 Service: \${payment.serviceName || 'Unknown'}
   📅 Date: \${date}\`;
      });

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '⏳ Pending Approvals', callback_data: 'admin_pending' }, { text: '✅ Approved', callback_data: 'admin_approved' }],
            [{ text: '❌ Rejected', callback_data: 'admin_rejected' }, { text: '📊 Revenue Stats', callback_data: 'admin_revenue' }],
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

// Find the position to insert the handlers (before the last closing brace)
const lastBraceIndex = content.lastIndexOf('}');
const beforeLastBrace = content.substring(0, lastBraceIndex);
const afterLastBrace = content.substring(lastBraceIndex);

// Insert the missing handlers
content = beforeLastBrace + missingHandlers + afterLastBrace;

// Write the enhanced content back to the file
fs.writeFileSync('src/handlers/admin.js', content);
console.log('✅ Missing subscription and payment handlers added successfully!');
