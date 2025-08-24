import fs from 'fs';

console.log('🔧 Starting comprehensive translation fix...');

// Fix complete-admin-bot.js
let content = fs.readFileSync('complete-admin-bot.js', 'utf8');

// Replace remaining hardcoded text in main bot file
const mainBotReplacements = [
  // Main menu buttons
  { from: "text: lang === \"am\" ? \"🚀 እንጀምር!\" : \"🚀 Let's Get Started!\"", to: "text: t('lets_get_started', lang)" },
  { from: "text: lang === \"am\" ? \"📊 የእኔ መዋቅሮች\" : \"📊 My Subscriptions\"", to: "text: t('my_subscriptions', lang)" },
  { from: "text: lang === \"am\" ? \"❓ እርዳታ\" : \"❓ Help\"", to: "text: t('help', lang)" },
  { from: "text: lang === \"am\" ? \"📞 ድጋፍ\" : \"📞 Support\"", to: "text: t('support', lang)" },
  { from: "text: lang === \"am\" ? \"🌐 ቋንቋ\" : \"🌐 Language\"", to: "text: t('language', lang)" },
  
  // Language selection buttons
  { from: "{ text: '🏠 ወደ ምናሌ ተመለስ', callback_data: 'back_to_menu' }", to: "{ text: t('back_to_menu', 'am'), callback_data: 'back_to_menu' }" },
  { from: "{ text: '🏠 Back to Menu', callback_data: 'back_to_menu' }", to: "{ text: t('back_to_menu', 'en'), callback_data: 'back_to_menu' }" },
  { from: "{ text: '🏠 ወደ ምናሌ ተመለስ', callback_data: 'back_to_menu' }", to: "{ text: t('back_to_menu', 'am'), callback_data: 'back_to_menu' }" },
  
  // Help text
  { from: "let helpText = lang === 'am'", to: "let helpText = t('help_intro', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_commands', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_features', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_support', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_language', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_admin', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_contact', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_faq', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_terms', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_privacy', lang)" },
  { from: "helpText += lang === 'am'", to: "helpText += t('help_end', lang)" },
  
  // FAQ text
  { from: "const faqText = lang === 'am'", to: "const faqText = t('faq_intro', lang)" },
  { from: "faqText += lang === 'am'", to: "faqText += t('faq_what', lang)" },
  { from: "faqText += lang === 'am'", to: "faqText += t('faq_how', lang)" },
  { from: "faqText += lang === 'am'", to: "faqText += t('faq_payment', lang)" },
  { from: "faqText += lang === 'am'", to: "faqText += t('faq_support', lang)" },
  { from: "faqText += lang === 'am'", to: "faqText += t('faq_security', lang)" },
  { from: "faqText += lang === 'am'", to: "faqText += t('faq_end', lang)" },
  
  // Current language text
  { from: "const currentLangText = currentLang === 'am' ? '🇪🇹 አማርኛ' : '🇺🇸 English';", to: "const currentLangText = t('current_language', currentLang);" }
];

mainBotReplacements.forEach(replacement => {
  content = content.replace(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.to);
});

fs.writeFileSync('complete-admin-bot.js', content);
console.log('✅ Fixed main bot file');

// Fix admin.js
let adminContent = fs.readFileSync('src/handlers/admin.js', 'utf8');

// Replace hardcoded text in admin handlers
const adminReplacements = [
  // Admin panel buttons
  { from: "[{ text: '❌ Cancel', callback_data: 'cancel_ban' }]", to: "[{ text: t('cancel', lang), callback_data: 'cancel_ban' }]" },
  { from: "[{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }]", to: "[{ text: t('users', lang), callback_data: 'admin_users' }, { text: t('subscriptions', lang), callback_data: 'admin_subscriptions' }]" },
  { from: "[{ text: '💳 Payment Methods', callback_data: 'admin_payments' }]", to: "[{ text: t('payment_methods', lang), callback_data: 'admin_payments' }]" },
  { from: "[{ text: '💬 Broadcast Message', callback_data: 'admin_broadcast' }]", to: "[{ text: t('broadcast_message', lang), callback_data: 'admin_broadcast' }]" },
  { from: "[{ text: '🌐 Web Admin', url: 'https://bpayb.onrender.com/panel' }]", to: "[{ text: t('web_admin', lang), url: 'https://bpayb.onrender.com/panel' }]" },
  { from: "{ text: '🏠 Main Menu', callback_data: 'admin_menu' }", to: "{ text: t('main_menu', lang), callback_data: 'admin_menu' }" },
  { from: "[{ text: '🛍️ Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }]", to: "[{ text: t('manage_services', lang), callback_data: 'admin_manage_services' }, { text: t('add_service', lang), callback_data: 'admin_add_service' }]" },
  { from: "[{ text: '📊 Performance', callback_data: 'admin_performance' }]", to: "[{ text: t('performance', lang), callback_data: 'admin_performance' }]" },
  { from: "[{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]", to: "[{ text: t('refresh_panel', lang), callback_data: 'refresh_admin' }]" },
  
  // Back buttons
  { from: "[{ text: '🔙 Back to All Users', callback_data: 'admin_users' }]", to: "[{ text: t('back_to_all_users', lang), callback_data: 'admin_users' }]" },
  { from: "[{ text: '🏠 Main Menu', callback_data: 'admin_menu' }]", to: "[{ text: t('main_menu', lang), callback_data: 'admin_menu' }]" },
  { from: "[{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]", to: "[{ text: t('back_to_admin', lang), callback_data: 'back_to_admin' }]" },
  
  // User filter buttons
  { from: "text: `👥 All ${filter === 'all' ? '✅' : ''}`,", to: "text: `${t('all_users', lang)} ${filter === 'all' ? '✅' : ''}`,", },
  { from: "text: `🟢 Active ${filter === 'active' ? '✅' : ''}`,", to: "text: `${t('active_users', lang)} ${filter === 'active' ? '✅' : ''}`,", },
  { from: "text: `🔴 Banned ${filter === 'banned' ? '✅' : ''}`,", to: "text: `${t('banned_users', lang)} ${filter === 'banned' ? '✅' : ''}`,", },
  { from: "text: `⭐ Premium ${filter === 'premium' ? '✅' : ''}`,", to: "text: `${t('premium_users', lang)} ${filter === 'premium' ? '✅' : ''}`,", },
  
  // Subscription management
  { from: "[{ text: '🟢 Active Subscriptions', callback_data: 'admin_active' }]", to: "[{ text: t('active_subscriptions', lang), callback_data: 'admin_active' }]" },
  { from: "[{ text: '🟡 Pending Payments', callback_data: 'admin_pending' }]", to: "[{ text: t('pending_payments', lang), callback_data: 'admin_pending' }]" },
  { from: "[{ text: '🔙 Back to Subscriptions', callback_data: 'admin_subscriptions' }]", to: "[{ text: t('back_to_subscriptions', lang), callback_data: 'admin_subscriptions' }]" },
  { from: "[{ text: '📋 View All Requests', callback_data: 'view_all_custom_requests' }]", to: "[{ text: t('view_all_requests', lang), callback_data: 'view_all_custom_requests' }]" },
  
  // Payment methods
  { from: "[{ text: '➕ Add Payment Method', callback_data: 'add_payment_method' }]", to: "[{ text: t('add_payment_method', lang), callback_data: 'add_payment_method' }]" },
  { from: "[{ text: '✏️ Edit Payment Methods', callback_data: 'edit_payment_methods' }]", to: "[{ text: t('edit_payment_methods', lang), callback_data: 'edit_payment_methods' }]" },
  { from: "[{ text: '🔄 Toggle Method Status', callback_data: 'toggle_payment_methods' }]", to: "[{ text: t('toggle_payment_methods', lang), callback_data: 'toggle_payment_methods' }]" },
  { from: "[{ text: '🔙 Back to Payment Methods', callback_data: 'admin_payments' }]", to: "[{ text: t('back_to_payment_methods', lang), callback_data: 'admin_payments' }]" },
  
  // Performance and analytics
  { from: "[{ text: '🔄 Refresh Stats', callback_data: 'admin_stats' }]", to: "[{ text: t('refresh_stats', lang), callback_data: 'admin_stats' }]" },
  { from: "[{ text: '📊 Service Analytics', callback_data: 'service_analytics' }]", to: "[{ text: t('service_analytics', lang), callback_data: 'service_analytics' }]" },
  { from: "[{ text: '📈 Growth Metrics', callback_data: 'growth_metrics' }]", to: "[{ text: t('growth_metrics', lang), callback_data: 'growth_metrics' }]" },
  
  // Broadcast
  { from: "[{ text: '📝 Start Broadcast', callback_data: 'start_broadcast' }]", to: "[{ text: t('start_broadcast', lang), callback_data: 'start_broadcast' }]" },
  { from: "[{ text: '❌ Cancel', callback_data: 'admin_broadcast' }]", to: "[{ text: t('cancel', lang), callback_data: 'admin_broadcast' }]" },
  
  // Custom requests
  { from: "{ text: `📋 Pending Requests (${pendingCount})`, callback_data: 'view_custom_requests' }", to: "{ text: `${t('pending_requests', lang)} (${pendingCount})`, callback_data: 'view_custom_requests' }" },
  { from: "{ text: '📊 Request History', callback_data: 'custom_plan_history' }", to: "{ text: t('request_history', lang), callback_data: 'custom_plan_history' }" },
  { from: "{ text: '⬅️ Back to Admin', callback_data: 'admin_panel' }", to: "{ text: t('back_to_admin', lang), callback_data: 'admin_panel' }" },
  { from: "[{ text: '🔄 Try Again', callback_data: 'admin_custom_plans' }]", to: "[{ text: t('try_again', lang), callback_data: 'admin_custom_plans' }]" },
  { from: "[{ text: '⬅️ Back', callback_data: 'admin_custom_plans' }]", to: "[{ text: t('back', lang), callback_data: 'admin_custom_plans' }]" },
  { from: "{ text: '⬅️ Back', callback_data: 'admin_custom_plans' }", to: "{ text: t('back', lang), callback_data: 'admin_custom_plans' }" },
  { from: "[{ text: '🔄 Try Again', callback_data: 'view_custom_requests' }]", to: "[{ text: t('try_again', lang), callback_data: 'view_custom_requests' }]" },
  { from: "[{ text: '⬅️ Back', callback_data: 'admin_custom_plans' }]", to: "[{ text: t('back', lang), callback_data: 'admin_custom_plans' }]" }
];

adminReplacements.forEach(replacement => {
  adminContent = adminContent.replace(new RegExp(replacement.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement.to);
});

fs.writeFileSync('src/handlers/admin.js', adminContent);
console.log('✅ Fixed admin handlers');

// Update translations.js with all new keys
let translationsContent = fs.readFileSync('src/utils/translations.js', 'utf8');

// Add comprehensive translation keys
const newTranslations = `
  // Main menu
  'lets_get_started': { en: "🚀 Let's Get Started!", am: "🚀 እንጀምር!" },
  'my_subscriptions': { en: "📊 My Subscriptions", am: "📊 የእኔ መዋቅሮች" },
  'help': { en: "❓ Help", am: "❓ እርዳታ" },
  'support': { en: "📞 Support", am: "📞 ድጋፍ" },
  'language': { en: "🌐 Language", am: "🌐 ቋንቋ" },
  'back_to_menu': { en: "🏠 Back to Menu", am: "🏠 ወደ ምናሌ ተመለስ" },
  'current_language': { en: "🇺🇸 English", am: "🇪🇹 አማርኛ" },
  
  // Help system
  'help_intro': { en: "🤖 *BirrPay Bot Help*\\n\\n", am: "🤖 *BirrPay Bot እርዳታ*\\n\\n" },
  'help_commands': { en: "📋 *Available Commands:*\\n", am: "📋 *የሚገኙ ትዕዛዞች:*\\n" },
  'help_features': { en: "✨ *Features:*\\n", am: "✨ *ባህሪያት:*\\n" },
  'help_support': { en: "📞 *Support:*\\n", am: "📞 *ድጋፍ:*\\n" },
  'help_language': { en: "🌐 *Language:*\\n", am: "🌐 *ቋንቋ:*\\n" },
  'help_admin': { en: "🔧 *Admin:*\\n", am: "🔧 *አስተዳደሪ:*\\n" },
  'help_contact': { en: "📧 *Contact:*\\n", am: "📧 *አድራሻ:*\\n" },
  'help_faq': { en: "❓ *FAQ:*\\n", am: "❓ *የተደጋጋሚ ጥያቄዎች:*\\n" },
  'help_terms': { en: "📜 *Terms:*\\n", am: "📜 *ውሎች:*\\n" },
  'help_privacy': { en: "🔒 *Privacy:*\\n", am: "🔒 *ግላዊነት:*\\n" },
  'help_end': { en: "\\nFor more help, contact support.", am: "\\nለተጨማሪ እርዳታ ድጋፍ ያግኙ።" },
  
  // FAQ system
  'faq_intro': { en: "❓ *Frequently Asked Questions*\\n\\n", am: "❓ *የተደጋጋሚ ጥያቄዎች*\\n\\n" },
  'faq_what': { en: "🤔 *What is BirrPay?*\\n", am: "🤔 *BirrPay ምንድን ነው?*\\n" },
  'faq_how': { en: "🔧 *How does it work?*\\n", am: "🔧 *እንዴት ይሰራል?*\\n" },
  'faq_payment': { en: "💳 *Payment methods?*\\n", am: "💳 *የክፍያ ዘዴዎች?*\\n" },
  'faq_support': { en: "📞 *How to get support?*\\n", am: "📞 *ድጋፍ እንዴት ማግኘት ይቻላል?*\\n" },
  'faq_security': { en: "🔒 *Is it secure?*\\n", am: "🔒 *ደህንነቱ የተጠበቀ ነው?*\\n" },
  'faq_end': { en: "\\nFor more questions, contact support.", am: "\\nለተጨማሪ ጥያቄዎች ድጋፍ ያግኙ።" },
  
  // Admin panel
  'cancel': { en: "❌ Cancel", am: "❌ ሰርዝ" },
  'web_admin': { en: "🌐 Web Admin", am: "🌐 ድህረ ገጽ አስተዳደሪ" },
  'back_to_all_users': { en: "🔙 Back to All Users", am: "🔙 ወደ ሁሉም ተጠቃሚዎች ተመለስ" },
  'all_users': { en: "👥 All", am: "👥 ሁሉም" },
  'active_users': { en: "🟢 Active", am: "🟢 ንቁ" },
  'banned_users': { en: "🔴 Banned", am: "🔴 የተከለከለ" },
  'premium_users': { en: "⭐ Premium", am: "⭐ ፕሪሚየም" },
  'active_subscriptions': { en: "🟢 Active Subscriptions", am: "🟢 ንቁ ምዝገባዎች" },
  'pending_payments': { en: "🟡 Pending Payments", am: "🟡 የተጠበቁ ክፍያዎች" },
  'back_to_subscriptions': { en: "🔙 Back to Subscriptions", am: "🔙 ወደ ምዝገባዎች ተመለስ" },
  'view_all_requests': { en: "📋 View All Requests", am: "📋 ሁሉንም ጥያቄዎች ይመልከቱ" },
  'add_payment_method': { en: "➕ Add Payment Method", am: "➕ የክፍያ ዘዴ ጨምር" },
  'edit_payment_methods': { en: "✏️ Edit Payment Methods", am: "✏️ የክፍያ ዘዴዎችን አስተካክል" },
  'toggle_payment_methods': { en: "🔄 Toggle Method Status", am: "🔄 የዘዴ ሁኔታ ቀይር" },
  'back_to_payment_methods': { en: "🔙 Back to Payment Methods", am: "🔙 ወደ የክፍያ ዘዴዎች ተመለስ" },
  'refresh_stats': { en: "🔄 Refresh Stats", am: "🔄 ስታትስቲክስ አድስ" },
  'service_analytics': { en: "📊 Service Analytics", am: "📊 የአገልግሎት ትንተና" },
  'growth_metrics': { en: "📈 Growth Metrics", am: "📈 የእድገት መለኪያዎች" },
  'start_broadcast': { en: "📝 Start Broadcast", am: "📝 ድምጽ ማሰራጫ ጀምር" },
  'pending_requests': { en: "📋 Pending Requests", am: "📋 የተጠበቁ ጥያቄዎች" },
  'request_history': { en: "📊 Request History", am: "📊 የጥያቄ ታሪክ" },
  'try_again': { en: "🔄 Try Again", am: "🔄 እንደገና ሞክር" },
  'back': { en: "⬅️ Back", am: "⬅️ ወደ ኋላ" }
`;

// Insert new translations before the closing brace
const insertIndex = translationsContent.lastIndexOf('};');
if (insertIndex !== -1) {
  translationsContent = translationsContent.slice(0, insertIndex) + newTranslations + translationsContent.slice(insertIndex);
  fs.writeFileSync('src/utils/translations.js', translationsContent);
  console.log('✅ Added comprehensive translation keys');
}

console.log('✅ Fixed all hardcoded text in complete-admin-bot.js and admin.js');
console.log('📝 Added comprehensive translation keys for all user interactions');
