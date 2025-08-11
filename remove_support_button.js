import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Find and update the keyboard layout to remove the support button
const oldKeyboardPattern = `const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '🛠️ Support', callback_data: 'admin_support' }],
          [{ text: '📈 Analytics', callback_data: 'admin_stats' }, { text: '💬 Broadcast', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      };`;

const newKeyboardLayout = `const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '📈 Analytics', callback_data: 'admin_stats' }],
          [{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      };`;

// Replace the old keyboard layout with the new one
content = content.replace(oldKeyboardPattern, newKeyboardLayout);

// Also update any other instances of the support button in the file
content = content.replace(
  /\{ text: '🛠️ Support', callback_data: 'admin_support' \},?/g,
  ''
);

// Write the updated content back to the file
fs.writeFileSync('src/handlers/admin.js', content);
console.log('✅ Support button has been removed from the admin panel!');
