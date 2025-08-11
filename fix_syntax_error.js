import fs from 'fs';

// Read the admin.js file
let content = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Fix the syntax error in the keyboard definition
const oldKeyboardCode = `    const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '📈 Analytics', callback_data: 'admin_stats' }],
          [{ text: '🌐 Web Admin', url: 'https://bpayb.onrender.com/panel' }],
          [{ text: '💬 Broadcast', callback_data: 'admin_broadcast' }],
          [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
        ]
      }),
        [
          { text: '⬅️ Previous', callback_data: \`users_prev_\${page}\` },
          { text: '🏠 Main Menu', callback_data: 'admin_menu' },
          { text: '➡️ Next', callback_data: \`users_next_\${page}\` }
        ]
      ]
    };`;

const fixedKeyboardCode = `    const keyboard = {
        inline_keyboard: [
          [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
          [{ text: '💳 Payments', callback_data: 'admin_payments' }, { text: '📈 Analytics', callback_data: 'admin_stats' }],
          [{ text: '🌐 Web Admin', url: 'https://bpayb.onrender.com/panel' }],
          [{ text: '💬 Broadcast', callback_data: 'admin_broadcast' }],
          [
            { text: '⬅️ Previous', callback_data: \`users_prev_\${page}\` },
            { text: '🏠 Main Menu', callback_data: 'admin_menu' },
            { text: '➡️ Next', callback_data: \`users_next_\${page}\` }
          ]
        ]
      };`;

// Replace the old keyboard code with the fixed version
content = content.replace(oldKeyboardCode, fixedKeyboardCode);

// Write the fixed content back to the file
fs.writeFileSync('src/handlers/admin.js', content);
console.log('✅ Fixed syntax error in admin.js');
