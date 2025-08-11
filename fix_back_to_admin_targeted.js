import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Find and replace the back_to_admin handler's old UI message
const oldBackToAdminPattern = /const adminMessage = `🔧 \*\*BirrPay Admin Panel\*\*\n\n👋 Welcome, Administrator!\n\n📊 \*\*Live Statistics:\*\*\n• 👥 Total Users: \$\{totalUsers\}\n• ✅ Active Users: \$\{activeUsers\}\n• 📱 Active Subscriptions: \$\{activeSubscriptions\}\n• ⏳ Pending Subscriptions: \$\{pendingSubscriptions\}\n• 💳 Total Payments: \$\{totalPayments\}\n• ⏳ Pending Payments: \$\{pendingPayments\}\n• 💰 Total Revenue: ETB \$\{totalRevenue\.toFixed\(2\)\}\n• 🛍️ Available Services: \$\{servicesSnapshot\.size\}\n\n\*\*Available Actions:\*\*`;/g;

const newBackToAdminMessage = `const adminMessage = \`🌟 **BirrPay Admin Dashboard** 🌟

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

🎯 **Management Center:**\`;`;

// Replace using regex
content = content.replace(oldBackToAdminPattern, newBackToAdminMessage);

// Also try a more direct string replacement approach
const directOldPattern = `const adminMessage = \`🔧 **BirrPay Admin Panel**

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

**Available Actions:**\`;`;

const directNewPattern = `const adminMessage = \`🌟 **BirrPay Admin Dashboard** 🌟

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

🎯 **Management Center:**\`;`;

// Try direct replacement
content = content.replace(directOldPattern, directNewPattern);

// Also update the keyboard layout in back_to_admin handler
const oldKeyboardPattern = `const keyboard = {
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

const newKeyboardPattern = `const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '🛠️ Support', callback_data: 'admin_support' }],
          [{ text: '📈 Analytics', callback_data: 'admin_stats' }, { text: '💬 Broadcast', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      };`;

content = content.replace(oldKeyboardPattern, newKeyboardPattern);

// Write the enhanced content back to the file
fs.writeFileSync('src/handlers/admin.js', content);
console.log('✅ Back to admin handler UI fixed with targeted approach!');
