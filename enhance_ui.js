import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Replace the old admin message with the new enhanced UI
const oldMessage = `🔧 **BirrPay Admin Panel**

👋 Welcome, Administrator!

📊 **Live Statistics:**
• 👥 Total Users: \${totalUsers}
• ✅ Active Users: \${activeUsers}
• 📱 Active Subscriptions: \${activeSubscriptions}
• ⏳ Pending Subscriptions: \${pendingSubscriptions}
• 💳 Total Payments: \${totalPayments}
• ⏳ Pending Payments: \${pendingPayments}
• 💰 Total Revenue: ETB \${totalRevenue.toFixed(2)}
• 🛍️ Available Services: \${servicesSnapshot.size}

**Available Actions:**`;

const newMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Users:** \${totalUsers.toLocaleString()} total • \${activeUsers.toLocaleString()} active
┃ 📱 **Subscriptions:** \${activeSubscriptions.toLocaleString()} active • \${pendingSubscriptions.toLocaleString()} pending  
┃ 💳 **Payments:** \${totalPayments.toLocaleString()} total • \${pendingPayments.toLocaleString()} pending
┃ 💰 **Revenue:** ETB \${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}
┃ 🛍️ **Services:** \${servicesSnapshot.size} available
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🎯 **Management Center:**`;

// Replace the content
content = content.replace(oldMessage, newMessage);

// Also enhance the keyboard layout
const oldKeyboard = `const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users Management', callback_data: 'admin_users' }],
          [{ text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }],
          [{ text: '🛠️ Support Messages', callback_data: 'admin_support' }],
          [{ text: '📈 Detailed Statistics', callback_data: 'admin_stats' }],
          [{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      };`;

const newKeyboard = `const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '🛠️ Support', callback_data: 'admin_support' }],
          [{ text: '📈 Analytics', callback_data: 'admin_stats' }, { text: '💬 Broadcast', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      };`;

content = content.replace(oldKeyboard, newKeyboard);

// Write the enhanced content back to the file
fs.writeFileSync('src/handlers/admin.js', content);
console.log('✅ Admin panel UI enhanced successfully!');
