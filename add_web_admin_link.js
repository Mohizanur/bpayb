import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Find the admin panel message section
const adminMessagePattern = /const adminMessage = `🌟 \*\*BirrPay Admin Dashboard\*\* 🌟[\s\S]*?🎯 \*\*Management Center:/;

// New admin message with web panel link
const newAdminMessage = `const adminMessage = \`🌟 **BirrPay Admin Dashboard** 🌟

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

🌐 **Web Admin Panel:** [Open Dashboard](${process.env.WEB_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://' + (process.env.RENDER_SERVICE_NAME || 'bpayb') + '.onrender.com'}/panel)

🎯 **Management Center:**`;

// Replace the admin message pattern with the new one
content = content.replace(adminMessagePattern, newAdminMessage);

// Also update the keyboard layout to include the web admin button
const keyboardPattern = /const keyboard = \{[\s\S]*?inline_keyboard: \[[\s\S]*?\][\s\S]*?\}/;
const newKeyboard = `const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '📈 Analytics', callback_data: 'admin_stats' }],
          [{ text: '🌐 Web Admin', url: '${process.env.WEB_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://' + (process.env.RENDER_SERVICE_NAME || 'bpayb') + '.onrender.com'}/panel' }],
          [{ text: '💬 Broadcast', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      }`;

// Replace the keyboard pattern with the new one
content = content.replace(keyboardPattern, newKeyboard);

// Write the updated content back to the file
fs.writeFileSync('src/handlers/admin.js', content);
console.log('✅ Web admin panel link has been added to the admin interface!');
console.log(`🌐 Web Admin URL: ${process.env.WEB_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://' + (process.env.RENDER_SERVICE_NAME || 'bpayb') + '.onrender.com'}/panel`);
