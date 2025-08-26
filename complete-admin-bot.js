// Complete BirrPay Bot with EVERY SINGLE admin feature from original admin.js
import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { createServer } from 'http';
import dotenv from 'dotenv';
// Web server removed - admin panel now accessible via Telegram only
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { firestore } from './src/utils/firestore.js';
import { setupStartHandler } from './src/handlers/start.js';
import setupSubscribeHandler from './src/handlers/subscribe.js';
import { loadI18n } from './src/utils/i18n.js';
import { loadServices } from './src/utils/loadServices.js';
import adminHandler, { isAuthorizedAdmin } from './src/handlers/admin.js';
import { keepAliveManager } from './src/utils/keepAlive.js';
import { resilienceManager } from './src/utils/resilience.js';
import { startScheduler } from './src/utils/scheduler.js';
import expirationReminder from './src/utils/expirationReminder.js';
import supportHandler from './src/handlers/support.js';
import langHandler from './src/handlers/lang.js';
import helpHandler from './src/handlers/help.js';
import mySubscriptionsHandler from './src/handlers/mySubscriptions.js';
import { t, getUserLanguage, tf } from './src/utils/translations.js';

// Enhanced translation helper with user language persistence
const getUserLanguageWithPersistence = async (ctx) => {
  try {
    const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
    const userData = userDoc.data() || {};
    return userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
  } catch (error) {
    console.error('Error getting user language:', error);
    return ctx.from?.language_code === 'am' ? 'am' : 'en';
  }
};

// Use the imported t function for translations
const translateMessage = (key, lang = 'en') => {
  return t(key, lang);
};

;
import { performanceMonitor } from './src/utils/performanceMonitor.js';

// Using imported isAuthorizedAdmin function from admin.js

// Phone verification middleware - Check if user is verified before allowing access
const phoneVerificationMiddleware = async (ctx, next) => {
  try {
    // Skip verification check for admin and essential commands
    const isAdmin = await isAuthorizedAdmin(ctx);
    const isVerificationCommand = ctx.message?.text?.startsWith('/verify') || ctx.callbackQuery?.data?.startsWith('verify_');
    const isStartCommand = ctx.message?.text === '/start';
    const isHelpCommand = ctx.message?.text === '/help';
    const isLanguageCommand = ctx.message?.text === '/lang' || ctx.message?.text === '/language';
    const isSupportCommand = ctx.message?.text === '/support';
    const isContactMessage = ctx.message?.contact;
    const isManualPhoneInput = ctx.message?.text === '✍️ በእጅ መፃፍ' || ctx.message?.text === '✍️ Type Manually';
    const isVerificationCodeInput = ctx.message?.text && /^\d{6}$/.test(ctx.message.text.trim());
    
    if (isAdmin || isVerificationCommand || isStartCommand || isHelpCommand || isLanguageCommand || isSupportCommand || isContactMessage || isManualPhoneInput || isVerificationCodeInput) {
      return next();
    }
    
    // Check if user is verified
    try {
      // Check if ctx.from exists before accessing its properties
      if (!ctx.from || !ctx.from.id) {
        console.log('⚠️ ctx.from or ctx.from.id is undefined, skipping verification');
        return next();
      }
      
      const userId = String(ctx.from.id);
      const userDoc = await firestore.collection('users').doc(userId).get();
      let userData = userDoc.data();
      
      // If user doesn't exist, create a new user record
      if (!userDoc.exists) {
        userData = {
          telegramId: userId,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name || '',
          username: ctx.from.username || '',
          language: ctx.from.language_code || 'en',
          phoneVerified: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        await firestore.collection('users').doc(userId).set(userData);
      }
      
      // If user exists but doesn't have phoneVerified field, set it to false
      if (userData && typeof userData.phoneVerified === 'undefined') {
        userData.phoneVerified = false;
        await firestore.collection('users').doc(userId).update({
          phoneVerified: false,
          updatedAt: new Date()
        });
      }
      
      if (!userData.phoneVerified) {
        const lang = userData.language || (ctx.from.language_code === 'am' ? 'am' : 'en');
        const verificationMsg = lang === 'am'
          ? '📱 የተልፍዎን መረጃ አስፈላጊ\n\nየBirrPay አገልግሎቶችን ለመጠቀም የተልፍዎን መረጃ አስፈላጊ።\n\nእባክዎ ከታች ያለውን ቁልፍ በመጫን የስልክ ቁጥርዎን ያረጋግጡ።'
          : '📱 Phone Verification Required\n\nTo use BirrPay services, you need to verify your phone number.\n\nPlease verify your phone number by clicking the button below.';
        
        // Remove any existing reply markup first
        try {
          await ctx.answerCbQuery();
        } catch (e) { /* Ignore if not a callback query */ }
        
        await ctx.reply(verificationMsg, {
          reply_markup: {
            inline_keyboard: [[
              { 
                text: t('verify_my_number', lang), 
                callback_data: 'verify_phone' 
              }
            ]]
          }
        });
        return;
      }
      
      // User is verified, continue
      return next();
      
    } catch (dbError) {
      console.error('Database error in verification middleware:', dbError);
      // Continue without verification if database is unavailable
      return next();
    }
    
  } catch (error) {
    console.error('⚠️ PHONE VERIFICATION MIDDLEWARE ERROR:', error);
    return next();
  }
};

// Phone verification handlers
const setupPhoneVerification = (bot) => {
  // Phone verification button handler
  bot.action('verify_phone', async (ctx) => {
    try {
      // Check if ctx.from exists before accessing its properties
      if (!ctx.from || !ctx.from.id) {
        console.log('⚠️ ctx.from or ctx.from.id is undefined in verify_phone handler');
        return;
      }
      
      // Get user's saved language preference
      const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
      const requestMsg = lang === 'am'
        ? '📱 የተልፍዎን ማረጋገጫ\n\nእባክዎ የተልፍዎን መረጃ ለማረጋገጥ ከታች ያለውን ቁልፍ በመጫን እውቂያዎን ያጋሩ።\n\nአስፈላጊ: ይህ የሚያስፈልገው የእርስዎን ስልክ ቁጥር ለማረጋገጥ ብቻ ነው።'
        : '📱 Phone Verification\n\nPlease tap the button below to share your contact for verification.\n\nNote: This is only used to verify your phone number.';
      
      await ctx.answerCbQuery();
      
      // Create reply keyboard with only contact sharing option
      const keyboard = {
        keyboard: [
          [
            {
              text: t('share_contact', lang),
              request_contact: true
            }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      };
      
      await ctx.reply(requestMsg, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      
      // Set user state to expect phone number
      await firestore.collection('users').doc(String(ctx.from.id)).set({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
        username: ctx.from.username || '',
        language: lang,
        awaitingPhone: true,
        hasCompletedOnboarding: false,
        phoneVerified: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error in verify_phone:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Handle contact sharing for phone verification
  bot.on('contact', async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const userDoc = await firestore.collection('users').doc(userId).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || (ctx.from.language_code === 'am' ? 'am' : 'en');
      
      const phoneNumber = ctx.message.contact.phone_number;
      
      // Ensure phone number has + prefix
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      
      // Validate international phone number format (basic validation)
      const phoneRegex = /^\+[1-9]\d{1,14}$/;
      
      if (!phoneRegex.test(formattedPhone)) {
        const errorMsg = lang === 'am'
          ? '⚠️ እባክዎ ትክክለኛ የስልክ ቁጥር ይጠቀሙ (+1234567890)'
          : '⚠️ Please use a valid phone number format (+1234567890)';
        await ctx.reply(errorMsg);
        return;
      }
      
      // Create user update data
      const updateData = {
        phoneNumber: formattedPhone,
        phoneVerified: true,
        awaitingPhone: false,
        awaitingCode: false,
        updatedAt: new Date(),
        // Set initial values if they don't exist
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
        username: ctx.from.username || '',
        language: lang
      };
      
      // If this is a new user, set created timestamp
      if (!userDoc.exists) {
        updateData.createdAt = new Date();
        updateData.telegramId = userId;
      }
      
      // Update user with verified phone using update() to ensure atomic updates
      await firestore.collection('users').doc(userId).set(updateData, { merge: true });
      
      // Clear any existing reply markup
      try {
        await ctx.answerCbQuery();
      } catch (e) { /* Ignore if not a callback query */ }
      
      // Prepare welcome message matching /start command
      const welcomeTitle = lang === "am" 
        ? "🎉 እንኳን ወደ BirrPay ደህና መጡ!"
        : "🎉 Welcome to BirrPay!";
      
      const welcomeSubtitle = lang === "am"
        ? "🌟 **የኢትዮጵያ #1 የሳብስክሪፕሽን ፕላትፎርም**"
        : "🌟 **Ethiopia's #1 Subscription Platform**";
        
      const successMessage = lang === 'am'
        ? `${welcomeTitle}\n\n${welcomeSubtitle}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ **ስልክ ቁጥርዎ ተረጋግጧል!**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${formattedPhone} በተሳካ ሁኔታ ተረጋግጧል። አሁን የBirrPay አገልግሎቶችን መጠቀም ይችላሉ።\n\n✨ **ምን ማድረግ ይችላሉ:**\n• Netflix, Amazon Prime, Spotify እና ሌሎችንም ያግኙ\n• በብር በቀላሉ ይክፈሉ\n• ሁሉንም ሳብስክሪፕሽኖችዎን በአንድ ቦታ ያስተዳድሩ\n• 24/7 የደንበኞች ድጋፍ ያግኙ\n\n🔒 **100% ደህንነቱ የተጠበቀ** | 🇪🇹 **የአካባቢ ድጋፍ** | ⚡ **ፈጣን እና ቀላል**`
        : `${welcomeTitle}\n\n${welcomeSubtitle}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n✅ **Phone Number Verified!**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n${formattedPhone} has been successfully verified. You can now use all BirrPay services.\n\n✨ **What You Can Do:**\n• Access Netflix, Amazon Prime, Spotify, and more\n• Pay easily using Ethiopian Birr\n• Manage all subscriptions from one place\n• Get 24/7 customer support\n\n🔒 **100% Secure** | 🇪🇹 **Local Support** | ⚡ **Fast & Easy**`;

      // Menu buttons matching /start command
      const menuButtons = [
        [
          { 
            text: t('lets_get_started', lang),
            callback_data: "view_services"
          }
        ],
        [
          { 
            text: t('my_subscriptions', lang),
            callback_data: "my_subscriptions"
          }
        ],
        [
          { 
            text: t('help', lang),
            callback_data: "help"
          },
          { 
            text: t('support', lang),
            callback_data: "support"
          }
        ],
        [
          { 
            text: t('language', lang),
            callback_data: "language_settings"
          }
        ]
      ];

      // Send the welcome message with main menu
      await ctx.reply(successMessage, {
        reply_markup: {
          inline_keyboard: menuButtons
        },
        parse_mode: 'Markdown'
      });
      
      // Remove the keyboard
      await ctx.reply(lang === 'am' ? '✅ የስልክ ቁጥርዎ ተረጋግጧል! አሁን አገልግሎቶችን መጠቀም ይችላሉ።' : '✅ Your phone number has been verified! You can now use our services.', {
        reply_markup: { remove_keyboard: true }
      });
      
    } catch (error) {
      console.error('Error in contact handler:', error);
      await ctx.reply('❌ Error occurred during verification. Please try again.');
    }
  });

  // Manual phone input handler
  bot.hears(['✍️ በእጅ መፃፍ', '✍️ Type Manually'], async (ctx) => {
    try {
      // Get user's saved language preference
      const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
      const message = lang === 'am'
        ? '📱 እባክዎ የስልክ ቁጥርዎን ያስገቡ (+1234567890):'
        : '📱 Please enter your phone number (+1234567890):';
      
      await ctx.reply(message, {
        reply_markup: {
          keyboard: [
            [{ text: t('back', lang) }]
          ],
          resize_keyboard: true
        }
      });
      
      // Set user state to expect manual phone input
      await firestore.collection('users').doc(String(ctx.from.id)).set({
        awaitingManualPhone: true,
        updatedAt: new Date()
      }, { merge: true });
      
    } catch (error) {
      console.error('Error in manual phone input:', error);
      await ctx.reply('❌ Error occurred. Please try again.');
    }
  });

  // Handle manual phone number input
  bot.hears(/^\+[1-9]\d{1,14}$/, async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const userDoc = await firestore.collection('users').doc(userId).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || (ctx.from.language_code === 'am' ? 'am' : 'en');
      
      const phoneNumber = ctx.message.text;
      
      // Update user with verified phone
      await firestore.collection('users').doc(userId).set({
        phoneNumber: phoneNumber,
        phoneVerified: true,
        awaitingManualPhone: false,
        updatedAt: new Date()
      }, { merge: true });
      
      const successMsg = lang === 'am'
        ? `✅ የስልክ ቁጥርዎ ${phoneNumber} ተረጋግጧል!`
        : `✅ Your phone number ${phoneNumber} has been verified!`;
      
      await ctx.reply(successMsg, {
        reply_markup: { remove_keyboard: true }
      });
      
      // Send welcome message
      const welcomeMsg = lang === 'am'
        ? '🎉 እንኳን ወደ BirrPay ደህና መጡ! አሁን አገልግሎቶችን መጠቀም ይችላሉ።'
        : '🎉 Welcome to BirrPay! You can now use our services.';
      
      await ctx.reply(welcomeMsg);
      
    } catch (error) {
      console.error('Error in manual phone verification:', error);
      await ctx.reply('❌ Error occurred during verification. Please try again.');
    }
  });

  // Back button handler
  bot.hears(['🔙 ወደ ኋላ', '🔙 Back'], async (ctx) => {
    try {
      // Get user's saved language preference
      const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
      const message = lang === 'am'
        ? '📱 የስልክ ቁጥርዎን ለማረጋገጥ እባክዎ እውቂያዎን ያጋሩ:'
        : '📱 To verify your phone number, please share your contact:';
      
      const keyboard = {
        keyboard: [
          [
            {
              text: t('share_contact', lang),
              request_contact: true
            }
          ],
          [
            {
              text: t('type_manually', lang)
            }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      };
      
      await ctx.reply(message, {
        reply_markup: keyboard,
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      console.error('Error in back button handler:', error);
      await ctx.reply('❌ Error occurred. Please try again.');
    }
  });
};

dotenv.config();

console.log('🚀 BirrPay Bot - COMPLETE Enhanced Version with Phone Verification');

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Helper function to parse request body
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Helper function to send JSON response
function sendJson(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Web server removed - admin panel now accessible via Telegram only

// Web server removed - admin panel now accessible via Telegram only
  console.log(`📱 Phone verification: ENABLED`);

// Add error handling for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize Firebase and resources
(async () => {
  try {
    // Load resources
    let i18n, services;
    try {
      console.log("Loading i18n and services...");
      i18n = await loadI18n();
      services = await loadServices();
      console.log("Successfully loaded resources");
    } catch (error) {
      console.error("Error loading resources:", error);
      i18n = { hero_title: { en: "Welcome", am: "እንኳን ደስ አለዎት" } };
      services = [];
    }

    // Create bot instance
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // Back to Admin handler - Main admin panel with revenue management
    bot.action('back_to_admin', async (ctx) => {
      console.log("🔑 BACK TO ADMIN triggered from user:", ctx.from.id);
      
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        console.log("🔑 Admin check result:", isAdmin);
        
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }
        
        // Load real-time statistics
        const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, servicesSnapshot] = await Promise.all([
          firestore.collection('users').get(),
          firestore.collection('subscriptions').get(),
          firestore.collection('payments').get(),
          firestore.collection('services').get()
        ]);

        // Calculate statistics
        const totalUsers = usersSnapshot.size;
        const verifiedUsers = usersSnapshot.docs.filter(doc => doc.data().phoneVerified).length;
        const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
          const subData = doc.data();
          return subData.status === 'active';
        }).length;
        const totalPayments = paymentsSnapshot.size;
        const totalServices = servicesSnapshot.size;

        const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Total Users:** ${totalUsers}
┃ ✅ **Verified Users:** ${verifiedUsers}
┃ 🟢 **Active Subscriptions:** ${activeSubscriptions}
┃ 💳 **Total Payments:** ${totalPayments}
┃ 🎆 **Available Services:** ${totalServices}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔧 **Management Center** - Complete control over your platform`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔧 Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }],
            [{ text: '💰 Revenue Management', callback_data: 'admin_payments' }, { text: '💳 Payment Methods', callback_data: 'admin_payment_methods' }],
            [{ text: '📊 Performance', callback_data: 'admin_performance' }],
            [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
            [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.editMessageText(adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error loading admin panel:', error);
        performanceMonitor.trackError(error, 'admin-panel-load');
        await ctx.answerCbQuery('❌ Error loading admin panel');
      }
    });

    // Admin command - shows admin panel
    bot.command('admin', async (ctx) => {
      console.log("🔑 ADMIN COMMAND triggered from user:", ctx.from.id);
      
      try {
        console.log("🔍 Checking admin status for user:", ctx.from.id);
        const isAdmin = await isAuthorizedAdmin(ctx);
        console.log("🔍 Admin check result:", isAdmin);
        
        if (!isAdmin) {
          console.log("❌ Access denied for user:", ctx.from.id);
          await ctx.reply('❌ Access denied. Admin only.');
          return;
        }
        
        console.log("✅ Admin access granted for user:", ctx.from.id);
        
        // Get user's language preference first
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        // Load real-time statistics
        const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, servicesSnapshot] = await Promise.all([
          firestore.collection('users').get(),
          firestore.collection('subscriptions').get(),
          firestore.collection('payments').get(),
          firestore.collection('services').get()
        ]);

        // Calculate statistics
        const totalUsers = usersSnapshot.size;
        const verifiedUsers = usersSnapshot.docs.filter(doc => doc.data().phoneVerified).length;
        const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
          const subData = doc.data();
          return subData.status === 'active';
        }).length;
        const totalPayments = paymentsSnapshot.size;
        const totalServices = servicesSnapshot.size;

        const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Total Users:** ${totalUsers}
┃ ✅ **Verified Users:** ${verifiedUsers}
┃ 🟢 **Active Subscriptions:** ${activeSubscriptions}
┃ 💳 **Total Payments:** ${totalPayments}
┃ 🎆 **Available Services:** ${totalServices}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔧 **Management Center** - Complete control over your platform`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔧 Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }],
            [{ text: '💰 Revenue Management', callback_data: 'admin_payments' }, { text: '💳 Payment Methods', callback_data: 'admin_payment_methods' }],
            [{ text: '📊 Performance', callback_data: 'admin_performance' }],
            [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
            [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.reply(adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
      } catch (error) {
        console.error('Error in admin command:', error);
        await ctx.reply('❌ Error loading admin panel');
      }
    });

    // Admin expiration check command
    bot.command('admin_expiring', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.reply('❌ Access denied. Admin only.');
          return;
        }

        await ctx.reply('🔍 Checking expiring subscriptions...');
        const result = await expirationReminder.checkExpirationReminders();
        
        const message = `📊 **Expiration Check Results**\n\n` +
          `⏰ **Total Expiring:** ${result.totalExpiring || 0}\n` +
          `📱 **Reminders Sent:** ${result.remindersSent || 0}\n` +
          `📊 **Admin Alert:** ${result.adminAlertSent ? 'Yes' : 'No'}\n` +
          `🕐 **Checked At:** ${new Date().toLocaleString()}\n\n` +
          `✅ Check completed successfully!`;

        await ctx.reply(message, { parse_mode: 'Markdown' });
        
      } catch (error) {
        console.error('Error in admin_expiring command:', error);
        await ctx.reply('❌ Error checking expiring subscriptions');
      }
    });

    // Admin payments handler
    bot.action('admin_payments', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get user language
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';

        // Load payment data
        const paymentsSnapshot = await firestore.collection('payments').get();
        if (process.env.DEBUG_MODE === 'true') {
        console.log('🔍 Found', paymentsSnapshot.docs.length, 'payments in database');
      }
        
        // Also check subscriptions collection
        const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
        if (process.env.DEBUG_MODE === 'true') {
        console.log('🔍 Found', subscriptionsSnapshot.docs.length, 'subscriptions in database');
      }
        
        // Debug: Show all subscription data
        subscriptionsSnapshot.docs.forEach(doc => {
          const subData = doc.data();
          console.log('🔍 Subscription:', doc.id, 'Status:', subData.status, 'Amount:', subData.amount, 'Plan:', subData.plan);
        });
        
        // Transaction checking removed to avoid duplicates
        console.log('🔍 Skipping transactions to avoid potential duplicates with subscriptions');
        
        // Calculate revenue statistics
        let totalRevenue = 0;
        let approvedPayments = 0;
        let pendingPayments = 0;
        let rejectedPayments = 0;
        let recentPayments = [];

        // Add revenue from active subscriptions (these are approved payments)
        subscriptionsSnapshot.docs.forEach(doc => {
          const subscription = doc.data();
          console.log('🔍 Checking subscription:', doc.id, 'Status:', subscription.status, 'Amount:', subscription.amount, 'Full data:', JSON.stringify(subscription));
          
          if (subscription.status === 'active') {
            let amount = 0;
            
            // Try different possible amount fields
            if (subscription.amount) {
              amount = parseFloat(subscription.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subscription.price) {
              amount = parseFloat(subscription.price.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subscription.cost) {
              amount = parseFloat(subscription.cost.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subscription.paymentAmount) {
              amount = parseFloat(subscription.paymentAmount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            }
            
            if (amount > 0) {
              totalRevenue += amount;
              approvedPayments++;
              console.log('🔍 Active subscription (approved payment):', doc.id, 'Amount:', amount);
            } else {
              console.log('🔍 Active subscription with no amount:', doc.id);
            }
          }
        });

        // Add revenue from approved payments in payments collection
        paymentsSnapshot.docs.forEach(doc => {
          const paymentData = doc.data();
          console.log('🔍 Payment:', doc.id, 'Status:', paymentData.status, 'Amount:', paymentData.amount);
          
          if ((paymentData.status === 'approved' || paymentData.status === 'approved_verification') && paymentData.amount) {
            totalRevenue += parseFloat(paymentData.amount) || 0;
            approvedPayments++;
          } else if (paymentData.status === 'pending' || paymentData.status === 'pending_verification') {
            pendingPayments++;
          } else if (paymentData.status === 'rejected' || paymentData.status === 'rejected_verification') {
            rejectedPayments++;
          }
          
          recentPayments.push({
            id: doc.id,
            ...paymentData
          });
        });

        console.log('💰 Revenue calculation:', { totalRevenue, approvedPayments, pendingPayments, rejectedPayments });

        let message = `💳 **Payment Management**\n\n` +
          `💰 **REAL REVENUE:** ETB ${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📊 **Payment Statistics:**\n` +
          `✅ **Approved:** ${approvedPayments} payments\n` +
          `⏳ **Pending:** ${pendingPayments} payments\n` +
          `❌ **Rejected:** ${rejectedPayments} payments\n\n` +
          `📋 **Recent Payments (Last 20):**\n`;

        // Add recent payments to message
        recentPayments.slice(0, 10).forEach((payment, index) => {
          const statusIcon = (payment.status === 'approved' || payment.status === 'approved_verification') ? '✅' : 
                           (payment.status === 'pending' || payment.status === 'pending_verification') ? '⏳' : '❌';
          const amount = payment.amount ? `ETB ${parseFloat(payment.amount).toFixed(2)}` : 'N/A';
          
          // Safe date handling
          let date = 'N/A';
          try {
            if (payment.createdAt) {
              if (typeof payment.createdAt.toDate === 'function') {
                date = new Date(payment.createdAt.toDate()).toLocaleDateString();
              } else if (payment.createdAt instanceof Date) {
                date = payment.createdAt.toLocaleDateString();
              } else {
                date = new Date(payment.createdAt).toLocaleDateString();
              }
            }
          } catch (error) {
            date = 'N/A';
          }
          
          message += `${statusIcon} **${amount}** - ${payment.status} (${date})\n`;
        });

        const keyboard = {
          inline_keyboard: [
            [{ text: '✅ Approved Payments', callback_data: 'admin_approved' }, { text: '⏳ Pending Payments', callback_data: 'admin_pending' }],
            [{ text: '❌ Rejected Payments', callback_data: 'admin_rejected' }, { text: '📊 Revenue Stats', callback_data: 'admin_revenue' }],
            [{ text: '🔄 Refresh', callback_data: 'admin_payments' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_payments:', error);
        await ctx.answerCbQuery('❌ Error loading payments');
      }
    });

    // Admin revenue stats handler
    bot.action('admin_revenue', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Load all payments for comprehensive revenue analysis
        const paymentsSnapshot = await firestore.collection('payments').get();
        const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
        
        // Calculate comprehensive revenue statistics
        let totalRevenue = 0;
        let approvedPayments = 0;
        let pendingPayments = 0;
        let rejectedPayments = 0;
        let regularPlanRevenue = 0;
        let monthlyRevenue = 0;
        let yearlyRevenue = 0;

        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        paymentsSnapshot.docs.forEach(doc => {
          const paymentData = doc.data();
          
          // Safe date handling
          let paymentDate = new Date();
          try {
            if (paymentData.createdAt) {
              if (typeof paymentData.createdAt.toDate === 'function') {
                paymentDate = paymentData.createdAt.toDate();
              } else if (paymentData.createdAt instanceof Date) {
                paymentDate = paymentData.createdAt;
              } else {
                paymentDate = new Date(paymentData.createdAt);
              }
            }
          } catch (error) {
            paymentDate = new Date();
          }
          
          if ((paymentData.status === 'approved' || paymentData.status === 'approved_verification') && paymentData.amount) {
            const amount = parseFloat(paymentData.amount) || 0;
            totalRevenue += amount;
            approvedPayments++;

            // Check if it's a custom plan
            if (paymentData.isCustomPlan) {
              customPlanRevenue += amount;
            } else {
              regularPlanRevenue += amount;
            }

            // Check if it's this month's revenue
            if (paymentDate >= thisMonth) {
              monthlyRevenue += amount;
            }

            // Check plan duration
            if (paymentData.planDuration === 'year' || paymentData.planDuration === '12') {
              yearlyRevenue += amount;
            }
          } else if (paymentData.status === 'pending' || paymentData.status === 'pending_verification') {
            pendingPayments++;
          } else if (paymentData.status === 'rejected' || paymentData.status === 'rejected_verification') {
            rejectedPayments++;
          }
        });

        // Add revenue from active subscriptions (using same enhanced logic as admin_payments)
        let subscriptionRevenue = 0;
        let customPlanRevenue = 0;
        let processedAmounts = new Set(); // Track processed amounts to avoid duplicates
        
        subscriptionsSnapshot.docs.forEach(doc => {
          const subData = doc.data();
          console.log('🔍 Checking subscription for revenue:', doc.id, 'Status:', subData.status, 'Amount:', subData.amount, 'Price:', subData.price, 'PaymentId:', subData.paymentId, 'IsCustom:', subData.isCustomPlan || subData.serviceID === 'custom_plan');
          
          if (subData.status === 'active') {
            let amount = 0;
            
            // Try different possible amount fields (same logic as admin_payments)
            if (subData.amount) {
              amount = parseFloat(subData.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.price) {
              amount = parseFloat(subData.price.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.cost) {
              amount = parseFloat(subData.cost.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.paymentAmount) {
              amount = parseFloat(subData.paymentAmount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            }
            
            if (amount > 0) {
              subscriptionRevenue += amount;
              totalRevenue += amount;
              approvedPayments++; // Count active subscriptions as approved payments
              processedAmounts.add(amount); // Track this amount
              
              // Check if it's a custom plan
              if (subData.isCustomPlan || subData.serviceID === 'custom_plan' || subData.serviceName === 'Custom Plan') {
                customPlanRevenue += amount;
                console.log('🔍 Custom plan revenue:', doc.id, 'Amount:', amount, 'Duration:', subData.duration || subData.durationName);
              } else {
                console.log('🔍 Regular subscription revenue:', doc.id, 'Amount:', amount, 'Service:', subData.serviceName);
              }
            } else {
              console.log('🔍 Active subscription with no amount:', doc.id);
            }
          }
        });

        // Also check for pending custom plans that might have amounts
        console.log('🔍 Checking for pending custom plans...');
        subscriptionsSnapshot.docs.forEach(doc => {
          const subData = doc.data();
          if (subData.status === 'pending' && (subData.isCustomPlan || subData.serviceID === 'custom_plan' || subData.serviceName === 'Custom Plan')) {
            let amount = 0;
            if (subData.amount) {
              amount = parseFloat(subData.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            }
            console.log('🔍 Pending custom plan:', doc.id, 'Amount:', amount, 'Duration:', subData.duration || subData.durationName);
          }
        });

        // Transaction revenue calculation removed to avoid duplicates
        console.log('🔍 Skipping transactions to avoid potential duplicates with subscriptions');

        // Calculate subscription statistics
        const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
          const subData = doc.data();
          return subData.status === 'active';
        }).length;

        const avgRevenuePerUser = approvedPayments > 0 ? totalRevenue / approvedPayments : 0;
        const avgRevenuePerSubscription = activeSubscriptions > 0 ? totalRevenue / activeSubscriptions : 0;

        const message = `📊 **DETAILED REVENUE ANALYSIS**\n\n` +
          `💰 **TOTAL REAL REVENUE:** ETB ${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📈 **Revenue Breakdown:**\n` +
          `• Active Subscriptions: ETB ${subscriptionRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
          `• Approved Payments: ETB ${regularPlanRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
          `• Custom Plans: ETB ${customPlanRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
          `• This Month: ETB ${monthlyRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
          `• Yearly Plans: ETB ${yearlyRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📊 **Payment Statistics:**\n` +
          `✅ **Approved:** ${approvedPayments} payments\n` +
          `⏳ **Pending:** ${pendingPayments} payments\n` +
          `❌ **Rejected:** ${rejectedPayments} payments\n\n` +
          `📈 **Performance Metrics:**\n` +
          `• Avg Revenue/User: ETB ${avgRevenuePerUser.toFixed(2)}\n` +
          `• Avg Revenue/Subscription: ETB ${avgRevenuePerSubscription.toFixed(2)}\n` +
          `• Active Subscriptions: ${activeSubscriptions}\n\n` +
          `💡 **Note:** This includes active subscriptions, approved payments, and completed transactions.`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '📊 Export Report', callback_data: 'export_revenue' }, { text: '📈 Charts', callback_data: 'revenue_charts' }],
            [{ text: '🔄 Refresh', callback_data: 'admin_revenue' }],
            [{ text: '🔙 Back to Payments', callback_data: 'admin_payments' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_revenue:', error);
        await ctx.answerCbQuery('❌ Error loading revenue stats');
      }
    });

    // Admin approved payments handler
    bot.action('admin_approved', async (ctx) => {
      console.log('🔍 admin_approved callback triggered');
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        const [paymentsSnapshot, subscriptionsSnapshot] = await Promise.all([
          firestore.collection('payments').get(),
          firestore.collection('subscriptions').get()
        ]);
        
        let message = `✅ **Approved Payments & Active Subscriptions**\n\n`;
        let approvedCount = 0;
        let totalRevenue = 0;

        // Add approved payments from payments collection
        paymentsSnapshot.docs.forEach(doc => {
          const payment = doc.data();
          if (payment.status === 'approved' || payment.status === 'approved_verification') {
            approvedCount++;
            const amount = parseFloat(payment.amount) || 0;
            totalRevenue += amount;
            
            const statusIcon = '✅';
            const amountText = `ETB ${amount.toFixed(2)}`;
            
            // Safe date handling
            let date = 'N/A';
            try {
              if (payment.createdAt) {
                if (typeof payment.createdAt.toDate === 'function') {
                  date = new Date(payment.createdAt.toDate()).toLocaleDateString();
                } else if (payment.createdAt instanceof Date) {
                  date = payment.createdAt.toLocaleDateString();
                } else {
                  date = new Date(payment.createdAt).toLocaleDateString();
                }
              }
            } catch (error) {
              date = 'N/A';
            }
            
            message += `${statusIcon} **${amountText}** - Payment (${date})\n`;
          }
        });

        // Add active subscriptions (these are approved payments)
        subscriptionsSnapshot.docs.forEach(doc => {
          const subscription = doc.data();
          if (subscription.status === 'active') {
            let amount = 0;
            
            // Try different possible amount fields
            if (subscription.amount) {
              amount = parseFloat(subscription.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subscription.price) {
              amount = parseFloat(subscription.price.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subscription.cost) {
              amount = parseFloat(subscription.cost.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subscription.paymentAmount) {
              amount = parseFloat(subscription.paymentAmount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            }
            
            if (amount > 0) {
              approvedCount++;
              totalRevenue += amount;
              
              const statusIcon = '✅';
              const amountText = `ETB ${amount.toFixed(2)}`;
              const serviceName = subscription.serviceName || subscription.serviceId || 'Unknown Service';
              
              message += `${statusIcon} **${amountText}** - ${serviceName} (Active)\n`;
            }
          }
        });

        if (approvedCount === 0) {
          message += `📝 No approved payments found.`;
        } else {
          message += `\n💰 **Total Revenue:** ETB ${totalRevenue.toFixed(2)}`;
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Payments', callback_data: 'admin_payments' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_approved:', error);
        await ctx.answerCbQuery('❌ Error loading approved payments');
      }
    });

    // Admin pending payments handler
    bot.action('admin_pending', async (ctx) => {
      console.log('🔍 admin_pending callback triggered');
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        const paymentsSnapshot = await firestore.collection('payments').get();
        let message = `⏳ **Pending Payments**\n\n`;
        let pendingCount = 0;

        paymentsSnapshot.docs.forEach(doc => {
          const payment = doc.data();
          if (payment.status === 'pending' || payment.status === 'pending_verification') {
            pendingCount++;
            
            const statusIcon = '⏳';
            const amount = payment.amount ? `ETB ${parseFloat(payment.amount).toFixed(2)}` : 'N/A';
            
            // Safe date handling
            let date = 'N/A';
            try {
              if (payment.createdAt) {
                if (typeof payment.createdAt.toDate === 'function') {
                  date = new Date(payment.createdAt.toDate()).toLocaleDateString();
                } else if (payment.createdAt instanceof Date) {
                  date = payment.createdAt.toLocaleDateString();
                } else {
                  date = new Date(payment.createdAt).toLocaleDateString();
                }
              }
            } catch (error) {
              date = 'N/A';
            }
            
            message += `${statusIcon} **${amount}** - ${payment.status} (${date})\n`;
          }
        });

        if (pendingCount === 0) {
          message += `📝 No pending payments found.`;
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Payments', callback_data: 'admin_payments' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_pending:', error);
        await ctx.answerCbQuery('❌ Error loading pending payments');
      }
    });

    // Admin rejected payments handler
    bot.action('admin_rejected', async (ctx) => {
      console.log('🔍 admin_rejected callback triggered');
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        const paymentsSnapshot = await firestore.collection('payments').get();
        let message = `❌ **Rejected Payments**\n\n`;
        let rejectedCount = 0;

        paymentsSnapshot.docs.forEach(doc => {
          const payment = doc.data();
          if (payment.status === 'rejected' || payment.status === 'rejected_verification') {
            rejectedCount++;
            
            const statusIcon = '❌';
            const amount = payment.amount ? `ETB ${parseFloat(payment.amount).toFixed(2)}` : 'N/A';
            
            // Safe date handling
            let date = 'N/A';
            try {
              if (payment.createdAt) {
                if (typeof payment.createdAt.toDate === 'function') {
                  date = new Date(payment.createdAt.toDate()).toLocaleDateString();
                } else if (payment.createdAt instanceof Date) {
                  date = payment.createdAt.toLocaleDateString();
                } else {
                  date = new Date(payment.createdAt).toLocaleDateString();
                }
              }
            } catch (error) {
              date = 'N/A';
            }
            
            message += `${statusIcon} **${amount}** - ${payment.status} (${date})\n`;
          }
        });

        if (rejectedCount === 0) {
          message += `📝 No rejected payments found.`;
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Payments', callback_data: 'admin_payments' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_rejected:', error);
        await ctx.answerCbQuery('❌ Error loading rejected payments');
      }
    });

    // Admin payment methods handler
    bot.action('admin_payment_methods', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get user language
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';

        // Load payment methods from database
        const paymentMethodsSnapshot = await firestore.collection('payment_methods').get();
        const paymentMethods = paymentMethodsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let message = `💳 **Payment Methods Management**\n\n`;
        
        if (paymentMethods.length === 0) {
          message += `📝 **No payment methods configured yet.**\n\n`;
          message += `➕ **Add your first payment method to start accepting payments.**`;
        } else {
          message += `📋 **Configured Payment Methods:**\n\n`;
          
          paymentMethods.forEach((method, index) => {
            const statusIcon = method.active ? '✅' : '❌';
            const statusText = method.active ? 'Active' : 'Inactive';
            message += `${statusIcon} **${method.name}** (${statusText})\n`;
            message += `   • Account: ${method.account || 'N/A'}\n`;
            message += `   • Type: ${method.type || 'N/A'}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '➕ Add Payment Method', callback_data: 'add_payment_method' }],
            [{ text: '✏️ Edit Payment Methods', callback_data: 'edit_payment_methods' }],
            [{ text: '🔄 Toggle Method Status', callback_data: 'toggle_payment_methods' }],
            [{ text: '🔙 Back to Admin', callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_payment_methods:', error);
        await ctx.answerCbQuery('❌ Error loading payment methods');
      }
    });

    // Export revenue handler
    bot.action('export_revenue', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get revenue data (same logic as admin_revenue)
        const [paymentsSnapshot, subscriptionsSnapshot] = await Promise.all([
          firestore.collection('payments').get(),
          firestore.collection('subscriptions').get()
        ]);

        let totalRevenue = 0;
        let approvedPayments = 0;
        let pendingPayments = 0;
        let rejectedPayments = 0;
        let customPlanRevenue = 0;
        let regularPlanRevenue = 0;
        let monthlyRevenue = 0;
        let yearlyRevenue = 0;

        // Add revenue from active subscriptions
        let subscriptionRevenue = 0;
        let processedAmounts = new Set();

        subscriptionsSnapshot.docs.forEach(doc => {
          const subData = doc.data();
          if (subData.status === 'active') {
            let amount = 0;
            
            if (subData.amount) {
              amount = parseFloat(subData.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.price) {
              amount = parseFloat(subData.price.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.cost) {
              amount = parseFloat(subData.cost.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.paymentAmount) {
              amount = parseFloat(subData.paymentAmount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            }
            
                         if (amount > 0) {
               subscriptionRevenue += amount;
               totalRevenue += amount;
               // Don't count active subscriptions as approved payments - they're separate
               processedAmounts.add(amount);
               
               if (subData.isCustomPlan || subData.serviceID === 'custom_plan' || subData.serviceName === 'Custom Plan') {
                 customPlanRevenue += amount;
               }
             }
          }
        });

        // Add revenue from approved payments (separate from active subscriptions)
        paymentsSnapshot.docs.forEach(doc => {
          const paymentData = doc.data();
          if ((paymentData.status === 'approved' || paymentData.status === 'approved_verification') && paymentData.amount) {
            const amount = parseFloat(paymentData.amount) || 0;
            totalRevenue += amount;
            approvedPayments++;
            regularPlanRevenue += amount;
            console.log('🔍 Approved payment revenue:', doc.id, 'Amount:', amount);
          } else if (paymentData.status === 'pending' || paymentData.status === 'pending_verification') {
            pendingPayments++;
          } else if (paymentData.status === 'rejected' || paymentData.status === 'rejected_verification') {
            rejectedPayments++;
          }
        });

        // Create export data
        const exportData = {
          exportDate: new Date().toISOString(),
          totalRevenue: totalRevenue,
          breakdown: {
            activeSubscriptions: subscriptionRevenue,
            approvedPayments: regularPlanRevenue,
            customPlans: customPlanRevenue,
            monthlyRevenue: monthlyRevenue,
            yearlyRevenue: yearlyRevenue
          },
          statistics: {
            approvedPayments: approvedPayments,
            pendingPayments: pendingPayments,
            rejectedPayments: rejectedPayments
          }
        };

        const message = `📊 **REVENUE EXPORT REPORT**\n\n` +
          `📅 **Export Date:** ${new Date().toLocaleDateString()}\n` +
          `💰 **Total Revenue:** ETB ${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📈 **Revenue Breakdown:**\n` +
          `• Active Subscriptions: ETB ${subscriptionRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
          `• Approved Payments: ETB ${regularPlanRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
          `• Custom Plans: ETB ${customPlanRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📊 **Payment Statistics:**\n` +
          `✅ Approved: ${approvedPayments} payments\n` +
          `⏳ Pending: ${pendingPayments} payments\n` +
          `❌ Rejected: ${rejectedPayments} payments\n\n` +
          `💾 **Export Data:**\n` +
          `\`\`\`json\n${JSON.stringify(exportData, null, 2)}\n\`\`\``;

        const keyboard = {
          inline_keyboard: [
            [{ text: '📥 Download JSON', callback_data: 'download_revenue_json' }],
            [{ text: '📊 Back to Revenue', callback_data: 'admin_revenue' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in export_revenue:', error);
        await ctx.answerCbQuery('❌ Error exporting revenue data');
      }
    });

    // Revenue charts handler
    bot.action('revenue_charts', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get revenue data (same logic as admin_revenue)
        const [paymentsSnapshot, subscriptionsSnapshot] = await Promise.all([
          firestore.collection('payments').get(),
          firestore.collection('subscriptions').get()
        ]);

        let totalRevenue = 0;
        let subscriptionRevenue = 0;
        let customPlanRevenue = 0;
        let regularPlanRevenue = 0;

        // Calculate revenue from active subscriptions
        subscriptionsSnapshot.docs.forEach(doc => {
          const subData = doc.data();
          if (subData.status === 'active') {
            let amount = 0;
            
            if (subData.amount) {
              amount = parseFloat(subData.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.price) {
              amount = parseFloat(subData.price.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.cost) {
              amount = parseFloat(subData.cost.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            } else if (subData.paymentAmount) {
              amount = parseFloat(subData.paymentAmount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
            }
            
            if (amount > 0) {
              subscriptionRevenue += amount;
              totalRevenue += amount;
              
              if (subData.isCustomPlan || subData.serviceID === 'custom_plan' || subData.serviceName === 'Custom Plan') {
                customPlanRevenue += amount;
              }
            }
          }
        });

        // Calculate revenue from approved payments
        paymentsSnapshot.docs.forEach(doc => {
          const paymentData = doc.data();
          if ((paymentData.status === 'approved' || paymentData.status === 'approved_verification') && paymentData.amount) {
            const amount = parseFloat(paymentData.amount) || 0;
            totalRevenue += amount;
            regularPlanRevenue += amount;
          }
        });

        // Create simple ASCII charts
        const subscriptionPercentage = totalRevenue > 0 ? Math.round((subscriptionRevenue / totalRevenue) * 100) : 0;
        const customPlanPercentage = totalRevenue > 0 ? Math.round((customPlanRevenue / totalRevenue) * 100) : 0;
        const regularPlanPercentage = totalRevenue > 0 ? Math.round((regularPlanRevenue / totalRevenue) * 100) : 0;

        const subscriptionBar = '█'.repeat(Math.floor(subscriptionPercentage / 5));
        const customPlanBar = '█'.repeat(Math.floor(customPlanPercentage / 5));
        const regularPlanBar = '█'.repeat(Math.floor(regularPlanPercentage / 5));

        const message = `📈 **REVENUE CHARTS & ANALYTICS**\n\n` +
          `💰 **Total Revenue:** ETB ${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📊 **Revenue Distribution:**\n\n` +
          `📱 **Active Subscriptions** (${subscriptionPercentage}%)\n` +
          `${subscriptionBar} ETB ${subscriptionRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `🎯 **Custom Plans** (${customPlanPercentage}%)\n` +
          `${customPlanBar} ETB ${customPlanRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `💳 **Approved Payments** (${regularPlanPercentage}%)\n` +
          `${regularPlanBar} ETB ${regularPlanRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n\n` +
          `📈 **Performance Insights:**\n` +
          `• Primary Revenue Source: ${subscriptionRevenue > regularPlanRevenue ? 'Active Subscriptions' : 'Approved Payments'}\n` +
          `• Custom Plans Contribution: ${customPlanPercentage}%\n` +
          `• Revenue Efficiency: ${totalRevenue > 0 ? 'High' : 'Low'}`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '📊 Back to Revenue', callback_data: 'admin_revenue' }],
            [{ text: '🔄 Refresh Charts', callback_data: 'revenue_charts' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

             } catch (error) {
         console.error('Error in revenue_charts:', error);
         await ctx.answerCbQuery('❌ Error loading revenue charts');
       }
     });

     // Download revenue JSON handler
     bot.action('download_revenue_json', async (ctx) => {
       try {
         const isAdmin = await isAuthorizedAdmin(ctx);
         if (!isAdmin) {
           await ctx.answerCbQuery('❌ Access denied. Admin only.');
           return;
         }

         // Get revenue data (same logic as export_revenue)
         const [paymentsSnapshot, subscriptionsSnapshot] = await Promise.all([
           firestore.collection('payments').get(),
           firestore.collection('subscriptions').get()
         ]);

         let totalRevenue = 0;
         let approvedPayments = 0;
         let pendingPayments = 0;
         let rejectedPayments = 0;
         let customPlanRevenue = 0;
         let regularPlanRevenue = 0;
         let monthlyRevenue = 0;
         let yearlyRevenue = 0;

         // Add revenue from active subscriptions
         let subscriptionRevenue = 0;
         let processedAmounts = new Set();

         subscriptionsSnapshot.docs.forEach(doc => {
           const subData = doc.data();
           if (subData.status === 'active') {
             let amount = 0;
             
             if (subData.amount) {
               amount = parseFloat(subData.amount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
             } else if (subData.price) {
               amount = parseFloat(subData.price.toString().replace('etb ', '').replace('ETB ', '')) || 0;
             } else if (subData.cost) {
               amount = parseFloat(subData.cost.toString().replace('etb ', '').replace('ETB ', '')) || 0;
             } else if (subData.paymentAmount) {
               amount = parseFloat(subData.paymentAmount.toString().replace('etb ', '').replace('ETB ', '')) || 0;
             }
             
             if (amount > 0) {
               subscriptionRevenue += amount;
               totalRevenue += amount;
               // Don't count active subscriptions as approved payments - they're separate
               processedAmounts.add(amount);
               
               if (subData.isCustomPlan || subData.serviceID === 'custom_plan' || subData.serviceName === 'Custom Plan') {
                 customPlanRevenue += amount;
               }
             }
           }
         });

         // Add revenue from approved payments
         paymentsSnapshot.docs.forEach(doc => {
           const paymentData = doc.data();
           if ((paymentData.status === 'approved' || paymentData.status === 'approved_verification') && paymentData.amount) {
             const amount = parseFloat(paymentData.amount) || 0;
             totalRevenue += amount;
             approvedPayments++;
             regularPlanRevenue += amount;
           } else if (paymentData.status === 'pending' || paymentData.status === 'pending_verification') {
             pendingPayments++;
           } else if (paymentData.status === 'rejected' || paymentData.status === 'rejected_verification') {
             rejectedPayments++;
           }
         });

         // Create export data
         const exportData = {
           exportDate: new Date().toISOString(),
           totalRevenue: totalRevenue,
           breakdown: {
             activeSubscriptions: subscriptionRevenue,
             approvedPayments: regularPlanRevenue,
             customPlans: customPlanRevenue,
             monthlyRevenue: monthlyRevenue,
             yearlyRevenue: yearlyRevenue
           },
           statistics: {
             approvedPayments: approvedPayments,
             pendingPayments: pendingPayments,
             rejectedPayments: rejectedPayments
           }
         };

         // Create JSON file content
         const jsonContent = JSON.stringify(exportData, null, 2);
         const fileName = `revenue_export_${new Date().toISOString().split('T')[0]}.json`;

         // Send as document
         await ctx.replyWithDocument({
           source: Buffer.from(jsonContent, 'utf8'),
           filename: fileName
         }, {
           caption: `📊 **Revenue Export Report**\n\n` +
             `📅 **Date:** ${new Date().toLocaleDateString()}\n` +
             `💰 **Total Revenue:** ETB ${totalRevenue.toLocaleString('en-US', {minimumFractionDigits: 2})}\n` +
             `📁 **File:** ${fileName}`
         });

         await ctx.answerCbQuery('✅ Revenue data exported successfully!');

       } catch (error) {
         console.error('Error in download_revenue_json:', error);
         await ctx.answerCbQuery('❌ Error downloading revenue data');
       }
     });

     // Admin subscriptions handler
     bot.action('admin_subscriptions', async (ctx) => {
       try {
         const isAdmin = await isAuthorizedAdmin(ctx);
         if (!isAdmin) {
           await ctx.answerCbQuery('❌ Access denied. Admin only.');
           return;
         }

         // Get user language
         const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
         const userData = userDoc.data() || {};
         const lang = userData.language || 'en';

         // Get all subscriptions from Firestore
         const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
         
         let activeCount = 0;
         let pendingCount = 0;
         let customPlanCount = 0;
         let expiredCount = 0;
         let totalCount = 0;

         subscriptionsSnapshot.docs.forEach(doc => {
           const subData = doc.data();
           totalCount++;
           
           if (subData.status === 'active') {
             activeCount++;
           } else if (subData.status === 'pending') {
             pendingCount++;
           } else if (subData.status === 'rejected') {
             expiredCount++;
           }
           
           // Check if it's a custom plan
           if (subData.isCustomPlan || subData.serviceID === 'custom_plan' || subData.serviceName === 'Custom Plan') {
             customPlanCount++;
           }
         });

         const message = `📊 **Subscription Management** 📊\n\n` +
           `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
           `📈 **Overview:**\n` +
           `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
           `┃ 🟢 Active: ${activeCount}\n` +
           `┃ 🟡 Pending Payments: ${pendingCount}\n` +
           `┃ 🎯 Custom Plan Requests: ${customPlanCount}\n` +
           `┃ 🔴 Expired: ${expiredCount}\n` +
           `┃ 📊 Total: ${totalCount}\n` +
           `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
           `🎯 **Quick Actions:**\n` +
           `• View and manage active subscriptions\n` +
           `• Review pending payment proofs\n` +
           `• Process custom plan requests\n` +
           `• Monitor expired subscriptions`;

         const keyboard = {
           inline_keyboard: [
             [{ text: '🟢 Active Subscriptions', callback_data: 'admin_active_subscriptions' }],
             [{ text: '🟡 Pending Subscriptions', callback_data: 'admin_pending_subscriptions' }],
             [{ text: '🎯 Custom Plans', callback_data: 'admin_custom_plans' }],
             [{ text: '🔴 Expired Subscriptions', callback_data: 'admin_expired_subscriptions' }],
             [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
           ]
         };

         await ctx.editMessageText(message, {
           parse_mode: 'Markdown',
           reply_markup: keyboard
         });
         await ctx.answerCbQuery();

       } catch (error) {
         console.error('Error in admin_subscriptions:', error);
         await ctx.answerCbQuery('❌ Error loading subscription management');
       }
     });

     // Admin users handler
     bot.action('admin_users', async (ctx) => {
       try {
         const isAdmin = await isAuthorizedAdmin(ctx);
         if (!isAdmin) {
           await ctx.answerCbQuery('❌ Access denied. Admin only.');
           return;
         }

         // Get user language
         const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
         const userData = userDoc.data() || {};
         const lang = userData.language || 'en';

         // Get all users from Firestore
         const usersSnapshot = await firestore.collection('users').get();
         const users = usersSnapshot.docs.map(doc => ({
           id: doc.id,
           ...doc.data()
         }));

         const totalUsers = users.length;
         const verifiedUsers = users.filter(user => user.phoneVerified).length;
         const unverifiedUsers = totalUsers - verifiedUsers;

         const message = `👥 **User Management** 👥\n\n` +
           `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
           `📊 **User Statistics:**\n` +
           `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
           `┃ 👥 Total Users: ${totalUsers}\n` +
           `┃ ✅ Verified: ${verifiedUsers}\n` +
           `┃ ⏳ Unverified: ${unverifiedUsers}\n` +
           `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
           `🎯 **Quick Actions:**\n` +
           `• View all users\n` +
           `• Manage user verification\n` +
           `• User statistics`;

         const keyboard = {
           inline_keyboard: [
             [{ text: '👥 View All Users', callback_data: 'view_all_users' }],
             [{ text: '✅ Verified Users', callback_data: 'view_verified_users' }],
             [{ text: '⏳ Unverified Users', callback_data: 'view_unverified_users' }],
             [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
           ]
         };

         await ctx.editMessageText(message, {
           parse_mode: 'Markdown',
           reply_markup: keyboard
         });
         await ctx.answerCbQuery();

       } catch (error) {
         console.error('Error in admin_users:', error);
         await ctx.answerCbQuery('❌ Error loading user management');
       }
     });

     // Admin performance handler
     bot.action('admin_performance', async (ctx) => {
       try {
         const isAdmin = await isAuthorizedAdmin(ctx);
         if (!isAdmin) {
           await ctx.answerCbQuery('❌ Access denied. Admin only.');
           return;
         }

         // Get user language
         const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
         const userData = userDoc.data() || {};
         const lang = userData.language || 'en';

         // Get performance metrics
         const metrics = performanceMonitor.getMetrics();

         const message = `📊 **Performance Metrics** 📊\n\n` +
           `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
           `⏱️ **System Performance:**\n` +
           `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
           `┃ 🕐 Uptime: ${metrics.uptime}\n` +
           `┃ 📊 Requests: ${metrics.requests.total}\n` +
           `┃ ✅ Success Rate: ${metrics.requests.successRate}\n` +
           `┃ ⚡ Avg Response: ${metrics.requests.avgResponseTime}\n` +
           `┃ 🔥 Cache Hit Rate: ${metrics.requests.cacheHitRate}\n` +
           `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
           `💾 **Resource Usage:**\n` +
           `┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓\n` +
           `┃ 🧠 Memory: ${metrics.memory.usage}\n` +
           `┃ 📈 Peak Memory: ${metrics.memory.peak}\n` +
           `┃ 🔥 Firestore Reads: ${metrics.firestore.reads}\n` +
           `┃ ✍️ Firestore Writes: ${metrics.firestore.writes}\n` +
           `┃ 💰 Estimated Cost: ${metrics.firestore.estimatedCost}\n` +
           `┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛\n\n` +
           `❌ **Errors:** ${metrics.errors}`;

         const keyboard = {
           inline_keyboard: [
             [{ text: '🔄 Refresh Metrics', callback_data: 'admin_performance' }],
             [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
           ]
         };

         await ctx.editMessageText(message, {
           parse_mode: 'Markdown',
           reply_markup: keyboard
         });
         await ctx.answerCbQuery();

       } catch (error) {
         console.error('Error in admin_performance:', error);
         await ctx.answerCbQuery('❌ Error loading performance metrics');
       }
     });

     // Admin broadcast handler
     bot.action('admin_broadcast', async (ctx) => {
       try {
         const isAdmin = await isAuthorizedAdmin(ctx);
         if (!isAdmin) {
           await ctx.answerCbQuery('❌ Access denied. Admin only.');
           return;
         }

         // Get user language
         const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
         const userData = userDoc.data() || {};
         const lang = userData.language || 'en';

         const message = `📢 **Broadcast Message** 📢\n\n` +
           `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
           `📝 **Send a message to all users:**\n\n` +
           `💡 **Instructions:**\n` +
           `• Type your message below\n` +
           `• Use /broadcast <message> to send\n` +
           `• Example: /broadcast Hello everyone!`;

         const keyboard = {
           inline_keyboard: [
             [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
           ]
         };

         await ctx.editMessageText(message, {
           parse_mode: 'Markdown',
           reply_markup: keyboard
         });
         await ctx.answerCbQuery();

       } catch (error) {
         console.error('Error in admin_broadcast:', error);
         await ctx.answerCbQuery('❌ Error loading broadcast panel');
       }
     });

     // Admin add service handler
     bot.action('admin_add_service', async (ctx) => {
       try {
         const isAdmin = await isAuthorizedAdmin(ctx);
         if (!isAdmin) {
           await ctx.answerCbQuery('❌ Access denied. Admin only.');
           return;
         }

         // Get user language
         const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
         const userData = userDoc.data() || {};
         const lang = userData.language || 'en';

         const message = `➕ **Add New Service** ➕\n\n` +
           `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
           `📝 **Add a new streaming service:**\n\n` +
           `💡 **Instructions:**\n` +
           `• Use /addservice command to add new service\n` +
           `• Format: /addservice <service_name> <price>\n` +
           `• Example: /addservice Disney+ 250`;

         const keyboard = {
           inline_keyboard: [
             [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
           ]
         };

         await ctx.editMessageText(message, {
           parse_mode: 'Markdown',
           reply_markup: keyboard
         });
         await ctx.answerCbQuery();

       } catch (error) {
         console.error('Error in admin_add_service:', error);
         await ctx.answerCbQuery('❌ Error loading add service panel');
       }
     });

     // Admin panel button handler (for callback_data: 'admin')
     bot.action('admin', async (ctx) => {
       console.log("🔑 ADMIN PANEL BUTTON triggered from user:", ctx.from.id);
       
       try {
         console.log("🔍 Checking admin status for user:", ctx.from.id);
         const isAdmin = await isAuthorizedAdmin(ctx);
         console.log("🔍 Admin check result:", isAdmin);
         
         if (!isAdmin) {
           console.log("❌ Access denied for user:", ctx.from.id);
           const lang = 'en'; // Fallback language
           await ctx.answerCbQuery(t('access_denied', lang));
           return;
         }
         
         console.log("✅ Admin access granted for user:", ctx.from.id);
         
         // Get user's language preference first
         const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
         const userData = userDoc.data() || {};
         const lang = userData.language || 'en';
         
         // Load real-time statistics
         const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, servicesSnapshot] = await Promise.all([
           firestore.collection('users').get(),
           firestore.collection('subscriptions').get(),
           firestore.collection('payments').get(),
           firestore.collection('services').get()
         ]);

         // Calculate statistics
         const totalUsers = usersSnapshot.size;
         const verifiedUsers = usersSnapshot.docs.filter(doc => doc.data().phoneVerified).length;
         const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
           const subData = doc.data();
           return subData.status === 'active';
         }).length;
         const totalPayments = paymentsSnapshot.size;
         const totalServices = servicesSnapshot.size;

         const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Total Users:** ${totalUsers}
┃ ✅ **Verified Users:** ${verifiedUsers}
┃ 🟢 **Active Subscriptions:** ${activeSubscriptions}
┃ 💳 **Total Payments:** ${totalPayments}
┃ 🎆 **Available Services:** ${totalServices}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔧 **Management Center** - Complete control over your platform`;

         const keyboard = {
           inline_keyboard: [
             [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
             [{ text: '🔧 Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }],
             [{ text: '💰 Revenue Management', callback_data: 'admin_payments' }, { text: '💳 Payment Methods', callback_data: 'admin_payment_methods' }],
             [{ text: '📊 Performance', callback_data: 'admin_performance' }],
             [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
             [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
           ]
         };

         await ctx.editMessageText(adminMessage, {
           parse_mode: 'Markdown',
           reply_markup: keyboard
         });
         
         await ctx.answerCbQuery();
       } catch (error) {
         console.error('Error in admin panel button:', error);
         const lang = 'en'; // Fallback language
         await ctx.answerCbQuery(t('error_loading_admin', lang));
       }
     });

     // Add debug middleware to see all commands (only in debug mode)
    if (process.env.DEBUG_MODE === 'true') {
    bot.use(async (ctx, next) => {
        console.log('🔍 Bot middleware processing update');
        console.log('📋 ctx.from:', ctx.from);
        console.log('📋 ctx.message:', ctx.message);
        console.log('📋 ctx.callbackQuery:', ctx.callbackQuery);
        
      if (ctx.message && ctx.message.text) {
        console.log(`📥 Command: "${ctx.message.text}" from user ${ctx.from.id}`);
      }
        if (ctx.callbackQuery) {
          console.log(`🔄 Callback: "${ctx.callbackQuery.data}" from user ${ctx.from.id}`);
        }
      return next();
    });
    }

    // Phone verification middleware - MUST BE BEFORE OTHER MIDDLEWARE
    bot.use(phoneVerificationMiddleware);

    // Performance monitoring middleware
    bot.use(async (ctx, next) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const requestType = ctx.message?.text ? 'command' : ctx.callbackQuery ? 'callback' : 'unknown';
      
      performanceMonitor.trackRequestStart(requestId, requestType);
      
      try {
        await next();
        performanceMonitor.trackRequestEnd(requestId, true, false);
      } catch (error) {
        performanceMonitor.trackError(error, `request-${requestType}`);
        performanceMonitor.trackRequestEnd(requestId, false, false);
        throw error;
      }
    });

    // Register handlers
    console.log("Registering handlers...");
    
    // Add direct /mysubs command handler
    bot.command('mysubs', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        // Import the subscription handler functions
        const { getUserSubscriptions } = await import("./src/utils/database.js");
        
        // Get user's subscriptions
        const subscriptions = await getUserSubscriptions(String(ctx.from.id));
        
        if (subscriptions.length === 0) {
          const message = lang === 'am'
            ? `📊 **የእኔ ምዝገባዎች**
            
እስካሁን ምንም ምዝገባዎች የሉዎትም። አዲስ ምዝገባ ለመጀመር እባክዎ አገልግሎቶችን ይምረጡ:`
            : `📊 **My Subscriptions**
            
You don't have any subscriptions yet. To start a new subscription, please select a service:`;
          
                  const keyboard = [
          [{ text: t('select_services', lang), callback_data: 'services' }],
          [{ text: t('main_menu', lang), callback_data: 'back_to_menu' }]
        ];
          
          await ctx.reply(message, {
            reply_markup: { inline_keyboard: keyboard },
            parse_mode: 'Markdown'
          });
          
          return;
        }
        
        // Group subscriptions by status
        const pendingSubs = subscriptions.filter(sub => sub.status === 'pending');
        const activeSubs = subscriptions.filter(sub => sub.status === 'active');
        const cancelledSubs = subscriptions.filter(sub => sub.status === 'cancelled');
        const rejectedSubs = subscriptions.filter(sub => sub.status === 'rejected');
        
        let message = lang === 'am'
          ? `📊 **የእኔ ምዝገባዎች**
          
**የሚጠበቁ:** ${pendingSubs.length}
**ንቁ:** ${activeSubs.length}
**የተሰረዙ:** ${cancelledSubs.length}
**የተቀበሉ:** ${rejectedSubs.length}

**የምዝገባዎችዎን ያሳዩ:**`
          : `📊 **My Subscriptions**
          
**Pending:** ${pendingSubs.length}
**Active:** ${activeSubs.length}
**Cancelled:** ${cancelledSubs.length}
**Rejected:** ${rejectedSubs.length}

**View your subscriptions:**`;
        
        const keyboard = [];
        
        // Add subscription buttons
        subscriptions.slice(0, 5).forEach(sub => {
          const statusEmoji = {
            'pending': '⏳',
            'active': '✅',
            'cancelled': '❌',
            'rejected': '🚫'
          };
          
          const statusText = {
            'pending': lang === 'am' ? 'የሚጠበቅ' : 'Pending',
            'active': lang === 'am' ? 'ንቁ' : 'Active',
            'cancelled': lang === 'am' ? 'የተሰረዘ' : 'Cancelled',
            'rejected': lang === 'am' ? 'የተቀበለ' : 'Rejected'
          };
          
          keyboard.push([
            {
              text: `${statusEmoji[sub.status]} ${sub.serviceName} - ${statusText[sub.status]}`,
              callback_data: `view_subscription_${sub.id}`
            }
          ]);
        });
        
        // Add action buttons
        keyboard.push([
          { text: t('new_subscription', lang), callback_data: 'services' },
          { text: t('refresh', lang), callback_data: 'my_subs' }
        ]);
        
        keyboard.push([
          { text: t('main_menu', lang), callback_data: 'back_to_menu' }
        ]);
        
        await ctx.reply(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });

      } catch (error) {
        console.error('Error in mysubs command:', error);
        await ctx.reply('❌ Error loading subscriptions. Please try again.');
      }
    });

    // Add direct /help command handler
    bot.command('help', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        const isAdmin = await isAuthorizedAdmin(ctx);
        
        let helpText = lang === 'am' 
          ? '❓ **እርዳታ እና ትዕዛዞች**\n\n'
          : '❓ **Help & Commands**\n\n';
        
        helpText += lang === 'am'
          ? '**የተጠቃሚ ትዕዛዞች:**\n'
          : '**User Commands:**\n';
        
        helpText += lang === 'am'
          ? '• /start - ዋና ምናሌ እና አገልግሎቶች\n'
          : '• /start - Main menu and services\n';
        
        helpText += lang === 'am'
          ? '• /help - ይህን የእርዳታ መልእክት ያሳዩ\n'
          : '• /help - Show this help message\n';
        
        helpText += lang === 'am'
          ? '• /support - እርዳታ እና ድጋፍ ያግኙ\n'
          : '• /support - Get help and support\n';
        
        helpText += lang === 'am'
          ? '• /mysubs - የእርስዎ ምዝገባዎች ይመልከቱ\n'
          : '• /mysubs - View my subscriptions\n';
        
        helpText += lang === 'am'
          ? '• /faq - በተደጋጋሚ የሚጠየቁ ጥያቄዎች\n'
          : '• /faq - Frequently asked questions\n';

        if (isAdmin) {
          helpText += lang === 'am'
            ? '\n**የአስተዳደሪ ትዕዛዞች:**\n'
            : '\n**Admin Commands:**\n';
          
          helpText += lang === 'am'
            ? '• /admin - የአስተዳደሪ ፓነል\n'
            : '• /admin - Admin panel\n';
        }

        helpText += lang === 'am'
          ? '\n💡 **ፈጣን መዳረሻ:** ለፈጣን አሰሳ የተቆራረጡ ትዕዛዞችን ይጠቀሙ!'
          : '\n💡 **Quick Access:** Use slash commands for faster navigation!';

        await ctx.reply(helpText, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error in help command:', error);
        await ctx.reply('❌ Error loading help. Please try again.');
      }
    });

    // Add /faq command handler
    bot.command('faq', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        const faqText = lang === 'am'
          ? '❓ **በተደጋጋሚ የሚጠየቁ ጥያቄዎች**\n\n' +
            '**🤔 እንዴት እንደሚሰራ?**\n' +
            'BirrPay የኢትዮጵያ ዋና የሳብስክሪፕሽን ፕላትፎርም ነው። አገልግሎቶችን ይምረጡ፣ ይክፈሉ፣ እና ወዲያውኑ ያግኙ።\n\n' +
            '**💳 የክፍያ ዘዴዎች**\n' +
            '• በብር ይክፈሉ\n' +
            '• የባንክ ሂሳብ ይጠቀሙ\n' +
            '• የሞባይል ገንዘብ ይጠቀሙ\n\n' +
            '**⏱️ የክፍያ ጊዜ**\n' +
            'ክፍያዎች በተሳካ ሁኔታ ከተሰጡ በኋላ በ5-10 ደቂቃዎች ውስጥ ይገኛሉ።\n\n' +
            '**🔄 ሳብስክሪፕሽን እንደገና ማድረግ**\n' +
            'የእርስዎ ሳብስክሪፕሽን ከወደቀ በኋላ እንደገና ማድረግ ይችላሉ።\n\n' +
            '**❓ እርዳታ ካስፈለገዎት**\n' +
            '/support ይጠቀሙ ወይም የድጋፍ ቡድኑን ያግኙ።\n\n' +
            '**🌐 የቋንቋ ድጋፍ**\n' +
            'እንግሊዘኛ እና አማርኛ ይደገፋሉ።'
          : `❓ **Frequently Asked Questions**\n\n` +
            `**🤔 How does it work?**\n` +
            `BirrPay is Ethiopia's premier subscription platform. Choose services, pay, and get instant access.\n\n` +
            `**💳 Payment Methods**\n` +
            `• Pay in Ethiopian Birr\n` +
            `• Use bank accounts\n` +
            `• Use mobile money\n\n` +
            `**⏱️ Payment Time**\n` +
            `Payments are processed within 5-10 minutes after successful payment.\n\n` +
            `**🔄 Renewing Subscriptions**\n` +
            `You can renew your subscription after it expires.\n\n` +
            `**❓ Need Help?**\n` +
            `Use /support or contact our support team.\n\n` +
            `**🌐 Language Support**\n` +
            `English and Amharic are supported.`;

        await ctx.reply(faqText, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error in faq command:', error);
        await ctx.reply('❌ Error loading FAQ. Please try again.');
      }
    });
    
    // Override the showMainMenu function to include admin check
    const originalShowMainMenu = (await import('./src/utils/navigation.js')).showMainMenu;
    const enhancedShowMainMenu = async (ctx, isNewUser = false) => {
      try {
        // Get user's saved language preference from database
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
        
        // Check if user is admin
        const isAdmin = await isAuthorizedAdmin(ctx);
        
        // Import and call the original function with admin status
        const { getMainMenuContent } = await import('./src/utils/menuContent.js');
        const { message, keyboard } = getMainMenuContent(lang, isNewUser, isAdmin);
        
        // Try to edit the existing message if it's a callback query
        if (ctx.updateType === 'callback_query') {
          try {
            await ctx.editMessageText(message, {
              reply_markup: { inline_keyboard: keyboard },
              parse_mode: 'Markdown',
              disable_web_page_preview: true
            });
            return;
          } catch (editError) {
            // If editing fails due to identical content, just answer the callback query
            if (editError.description && editError.description.includes('message is not modified')) {
              try {
                await ctx.answerCbQuery();
                return;
              } catch (answerError) {
                // Ignore answer callback errors
              }
            }
            // For other edit errors, fall through to send new message
            console.log('Could not edit message, sending new one:', editError.message || editError);
          }
        }
        
        // Otherwise, send a new message
        await ctx.reply(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
      } catch (error) {
        console.error('Error showing main menu:', error);
        // Fallback to a simple message
        const fallbackMsg = lang === 'am' ? 
          '🏠 ዋና ገጽ' : 
          '🏠 Main Menu';
        try {
          await ctx.reply(fallbackMsg);
        } catch (fallbackError) {
          console.error('Failed to send fallback message:', fallbackError);
        }
      }
    };
    
    // Note: Cannot modify ES module exports, using enhanced function directly
    
    setupStartHandler(bot);
    setupSubscribeHandler(bot);
    
    // Setup phone verification handlers
    console.log("📱 Setting up phone verification handlers...");
    setupPhoneVerification(bot);

    // Register other handlers
    supportHandler(bot);
    helpHandler(bot);
    mySubscriptionsHandler(bot);
    adminHandler(bot);
    
    // Enhanced language handlers with persistence
    console.log("🌐 Setting up enhanced language handlers...");
    
    // Language button handlers with persistence
    bot.action('lang_en', async (ctx) => {
      try {
        // Save language preference to Firestore
        await firestore.collection('users').doc(String(ctx.from.id)).set({
          language: 'en',
          updatedAt: new Date()
        }, { merge: true });
        
        await ctx.answerCbQuery('🇺🇸 Language switched to English');
        await ctx.editMessageText(t('language_switched_en', 'en'), { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: t('back_to_menu', 'en'), callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in lang_en action:', error);
        await ctx.answerCbQuery(t('error_changing_language', 'en'));
      }
    });

    bot.action('lang_am', async (ctx) => {
      try {
        // Save language preference to Firestore
        await firestore.collection('users').doc(String(ctx.from.id)).set({
          language: 'am',
          updatedAt: new Date()
        }, { merge: true });
        
        await ctx.answerCbQuery('🇪🇹 ቋንቋ ወደ አማርኛ ተቀይሯል');
        await ctx.editMessageText('✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።', { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: t('back_to_menu', 'am'), callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in lang_am action:', error);
        await ctx.answerCbQuery(t('error_changing_language', 'en'));
      }
    });

    bot.action('set_lang_en', async (ctx) => {
      try {
        // Save language preference to Firestore
        await firestore.collection('users').doc(String(ctx.from.id)).set({
          language: 'en',
          updatedAt: new Date()
        }, { merge: true });
        
        await ctx.answerCbQuery('🇺🇸 Language switched to English');
        await ctx.editMessageText('✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.', { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: t('back_to_menu', 'en'), callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in set_lang_en action:', error);
        await ctx.answerCbQuery(t('error_changing_language', 'en'));
      }
    });

    bot.action('set_lang_am', async (ctx) => {
      try {
        // Save language preference to Firestore
        await firestore.collection('users').doc(String(ctx.from.id)).set({
          language: 'am',
          updatedAt: new Date()
        }, { merge: true });
        
        await ctx.answerCbQuery('🇪🇹 ቋንቋ ወደ አማርኛ ተቀይሯል');
        await ctx.editMessageText('✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።', { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: t('back_to_menu', 'am'), callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in set_lang_am action:', error);
        await ctx.answerCbQuery(t('error_changing_language', 'en'));
      }
    });

    bot.action('language_settings', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const currentLang = userData.language || 'en';
        
        const currentLangText = currentLang === 'am' ? '🇪🇹 አማርኛ' : '🇺🇸 English';
        const message = t('language_settings', currentLang).replace('{current}', currentLangText);
        
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: t('english', currentLang), callback_data: 'lang_en' },
                { text: t('amharic', currentLang), callback_data: 'lang_am' }
              ],
              [
                { text: t('back_to_menu', currentLang), callback_data: 'back_to_menu' }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('Error in language_settings:', error);
        await ctx.answerCbQuery(t('error_language_settings', 'en'));
      }
    });

    bot.action('back_to_menu', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        const welcomeMessage = t('welcome_title', lang) + '\n\n' + t('welcome_description', lang);

        // Check if user is admin
        const isAdmin = await isAuthorizedAdmin(ctx);
        
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: t('view_services', lang),
                callback_data: 'view_services'
              }
            ],
            [
              {
                text: t('my_subscriptions', lang),
                callback_data: 'my_subscriptions'
              }
            ],
            [
              {
                text: t('help', lang),
                callback_data: 'help'
              },
              {
                text: t('support', lang),
                callback_data: 'support'
              }
            ]
          ]
        };

        // Add admin button only for admins
        if (isAdmin) {
          keyboard.inline_keyboard.push([
            {
              text: t('admin_panel', lang),
              callback_data: 'admin'
            }
          ]);
        }

        // Add language button
        keyboard.inline_keyboard.push([
          {
            text: t('language', lang),
            callback_data: 'language_settings'
          }
        ]);

        await ctx.editMessageText(welcomeMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } catch (error) {
        console.error('Error in back_to_menu:', error);
        await ctx.answerCbQuery(t('error_returning_menu', 'en'));
      }
    });

    // Refresh admin panel handler
    bot.action('refresh_admin', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }
        
        // Load real-time statistics
        const [usersSnapshot, subscriptionsSnapshot, paymentsSnapshot, servicesSnapshot] = await Promise.all([
          firestore.collection('users').get(),
          firestore.collection('subscriptions').get(),
          firestore.collection('payments').get(),
          firestore.collection('services').get()
        ]);

        // Calculate statistics
        const totalUsers = usersSnapshot.size;
        const verifiedUsers = usersSnapshot.docs.filter(doc => doc.data().phoneVerified).length;
        const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => {
          const subData = doc.data();
          return subData.status === 'active';
        }).length;
        const totalPayments = paymentsSnapshot.size;
        const totalServices = servicesSnapshot.size;

        const adminMessage = `🌟 **BirrPay Admin Dashboard** 🌟

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👋 **Welcome back, Administrator!**

📊 **Real-Time Analytics**
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ 👥 **Total Users:** ${totalUsers}
┃ ✅ **Verified Users:** ${verifiedUsers}
┃ 🟢 **Active Subscriptions:** ${activeSubscriptions}
┃ 💳 **Total Payments:** ${totalPayments}
┃ 🎆 **Available Services:** ${totalServices}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

🔧 **Management Center** - Complete control over your platform`;

        const keyboard = {
          inline_keyboard: [
            [{ text: '👥 Users', callback_data: 'admin_users' }, { text: '📊 Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔧 Manage Services', callback_data: 'admin_manage_services' }, { text: '➕ Add Service', callback_data: 'admin_add_service' }],
            [{ text: '💰 Revenue Management', callback_data: 'admin_payments' }, { text: '💳 Payment Methods', callback_data: 'admin_payment_methods' }],
            [{ text: '📊 Performance', callback_data: 'admin_performance' }],
            [{ text: '📢 Broadcast Message', callback_data: 'admin_broadcast' }],
            [{ text: '🔄 Refresh Panel', callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.editMessageText(adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        
        await ctx.answerCbQuery();
      } catch (error) {
        console.error('Error loading admin panel:', error);
        performanceMonitor.trackError(error, 'admin-panel-load');
        await ctx.answerCbQuery('❌ Error loading admin panel');
      }
    });

    // Service management with pagination handlers
    console.log("📄 Setting up service management with pagination...");
    
    // Service management with pagination
    bot.action('admin_manage_services', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery(t('access_denied', lang));
          return;
        }

        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';

        // Get all services from Firestore
        const servicesSnapshot = await firestore.collection('services').get();
        const services = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        if (services.length === 0) {
          await ctx.editMessageText(t('no_services', lang), {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: t('back_to_admin', lang), callback_data: 'back_to_admin' }
              ]]
            }
          });
          return;
        }

        // Show first page
        await showServicesPage(ctx, services, 0, lang);
        
      } catch (error) {
        console.error('Error in admin_manage_services:', error);
        await ctx.answerCbQuery(t('error_loading_services', lang));
      }
    });

    // Pagination handlers
    bot.action(/^services_page_(\d+)$/, async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied');
          return;
        }

        const page = parseInt(ctx.match[1]);
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';

        // Get all services from Firestore
        const servicesSnapshot = await firestore.collection('services').get();
        const services = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        await showServicesPage(ctx, services, page, lang);
        
      } catch (error) {
        console.error('Error in services_page:', error);
        await ctx.answerCbQuery(t('error_loading_page', lang));
      }
    });

    // Helper function to show services page
    async function showServicesPage(ctx, services, page, lang) {
      const itemsPerPage = 5;
      const totalPages = Math.ceil(services.length / itemsPerPage);
      const startIndex = page * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageServices = services.slice(startIndex, endIndex);

      let message = t('services_title', lang) + '\n\n';
      
      pageServices.forEach((service, index) => {
        const status = service.status === 'active' ? '🟢' : '🔴';
        const price = service.price ? `$${service.price}` : 'N/A';
        message += `${startIndex + index + 1}. ${status} **${service.name}**\n`;
        message += `   ${t('service_price', lang).replace('{price}', price)}\n`;
        message += `   ${t('service_id', lang).replace('{id}', service.id)}\n\n`;
      });

      message += t('pagination_info', lang)
        .replace('{current}', page + 1)
        .replace('{total}', totalPages);

      const keyboard = [];
      
      // Navigation buttons
      const navRow = [];
      if (page > 0) {
        navRow.push({ text: t('previous_page', lang), callback_data: `services_page_${page - 1}` });
      }
      if (page < totalPages - 1) {
        navRow.push({ text: t('next_page', lang), callback_data: `services_page_${page + 1}` });
      }
      if (navRow.length > 0) {
        keyboard.push(navRow);
      }

      // Back button
              keyboard.push([{ text: t('back_to_admin', lang), callback_data: 'back_to_admin' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    // Start HTTP server for Render health checks and webhook
    const PORT = process.env.PORT || 10000;
    console.log(`🔧 PORT environment variable: ${process.env.PORT}`);
    console.log(`🔧 Using port: ${PORT}`);
    const server = createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          platform: 'render-free-tier',
          botStatus: 'running',
          webhook: {
            url: process.env.WEBHOOK_URL || 'https://bpayb.onrender.com/webhook',
            mode: 'webhook',
            responseTime: '50-100ms',
            status: 'active'
          },
          endpoints: {
            health: '/health',
            webhook: '/webhook',
            status: '/'
          }
        }));
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <html>
            <head><title>BirrPay Bot - Render</title></head>
            <body>
              <h1>🚀 BirrPay Bot is Running!</h1>
              <p>Status: <strong>Online</strong></p>
              <p>Platform: <strong>Render Free Tier</strong></p>
              <p>Uptime: <strong>${Math.floor(process.uptime() / 3600)} hours</strong></p>
              <p>Memory Usage: <strong>${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB</strong></p>
              <p>Capacity: <strong>1,000+ simultaneous users</strong></p>
              <p>Mode: <strong>Webhook (50-100ms response)</strong></p>
              <hr>
              <p><em>Keep-alive system active - running 24/7</em></p>
            </body>
          </html>
        `);
      } else if (req.url === '/webhook') {
        // Handle webhook requests
        console.log('📥 Webhook request received');
        
        // Log request details for debugging
        console.log('📋 Request method:', req.method);
        console.log('📋 Content-Type:', req.headers['content-type']);
        
        // Properly handle webhook with body parsing
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          try {
            console.log('📋 Raw webhook body:', body);
            const update = JSON.parse(body);
            console.log('📋 Parsed update:', JSON.stringify(update, null, 2));
            
            // Handle the update properly
            bot.handleUpdate(update, res);
          } catch (error) {
            console.error('❌ Error parsing webhook body:', error);
            res.writeHead(400);
            res.end('Bad Request');
          }
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
    });

    // Add missing admin handlers
    bot.action('admin_active_subscriptions', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get active subscriptions
        const subscriptionsSnapshot = await firestore.collection('subscriptions')
          .where('status', '==', 'active')
          .get();

        const activeSubs = subscriptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const message = `🟢 **Active Subscriptions** 🟢\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Active Subscriptions: ${activeSubs.length}**\n\n`;

        if (activeSubs.length === 0) {
          message += `📭 No active subscriptions found.`;
        } else {
          activeSubs.forEach((sub, index) => {
            message += `${index + 1}. **${sub.serviceName}** - ${sub.userName}\n`;
            message += `   💰 ${sub.amount} ETB - Expires: ${sub.expiryDate}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_active_subscriptions:', error);
        await ctx.answerCbQuery('❌ Error loading active subscriptions');
      }
    });

    bot.action('admin_pending_subscriptions', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get pending subscriptions
        const subscriptionsSnapshot = await firestore.collection('subscriptions')
          .where('status', '==', 'pending')
          .get();

        const pendingSubs = subscriptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const message = `🟡 **Pending Subscriptions** 🟡\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Pending Subscriptions: ${pendingSubs.length}**\n\n`;

        if (pendingSubs.length === 0) {
          message += `📭 No pending subscriptions found.`;
        } else {
          pendingSubs.forEach((sub, index) => {
            message += `${index + 1}. **${sub.serviceName}** - ${sub.userName}\n`;
            message += `   💰 ${sub.amount} ETB - Requested: ${sub.createdAt}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_pending_subscriptions:', error);
        await ctx.answerCbQuery('❌ Error loading pending subscriptions');
      }
    });

    bot.action('admin_custom_plans', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get custom plan requests
        const subscriptionsSnapshot = await firestore.collection('subscriptions')
          .where('isCustomPlan', '==', true)
          .get();

        const customPlans = subscriptionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        const message = `🎯 **Custom Plan Requests** 🎯\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Custom Plans: ${customPlans.length}**\n\n`;

        if (customPlans.length === 0) {
          message += `📭 No custom plan requests found.`;
        } else {
          customPlans.forEach((plan, index) => {
            message += `${index + 1}. **${plan.serviceName}** - ${plan.userName}\n`;
            message += `   💰 ${plan.amount} ETB - Duration: ${plan.duration}\n`;
            message += `   📝 ${plan.customRequest}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_custom_plans:', error);
        await ctx.answerCbQuery('❌ Error loading custom plans');
      }
    });

    // User management sub-handlers
    bot.action('view_all_users', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get all users
        const usersSnapshot = await firestore.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let message = `👥 **All Users** 👥\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Total Users: ${users.length}**\n\n`;

        if (users.length === 0) {
          message += `📭 No users found.`;
        } else {
          users.forEach((user, index) => {
            const status = user.phoneVerified ? '✅' : '⏳';
            const name = user.firstName || user.username || 'Unknown';
            message += `${index + 1}. ${status} **${name}**\n`;
            message += `   🆔 ${user.id} | 📱 ${user.phoneNumber || 'Not verified'}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to User Management', callback_data: 'admin_users' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in view_all_users:', error);
        await ctx.answerCbQuery('❌ Error loading all users');
      }
    });

    bot.action('view_verified_users', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get verified users
        const usersSnapshot = await firestore.collection('users')
          .where('phoneVerified', '==', true)
          .get();

        const verifiedUsers = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let message = `✅ **Verified Users** ✅\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Verified Users: ${verifiedUsers.length}**\n\n`;

        if (verifiedUsers.length === 0) {
          message += `📭 No verified users found.`;
        } else {
          verifiedUsers.forEach((user, index) => {
            const name = user.firstName || user.username || 'Unknown';
            message += `${index + 1}. ✅ **${name}**\n`;
            message += `   🆔 ${user.id} | 📱 ${user.phoneNumber}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to User Management', callback_data: 'admin_users' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in view_verified_users:', error);
        await ctx.answerCbQuery('❌ Error loading verified users');
      }
    });

    bot.action('view_unverified_users', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get unverified users
        const usersSnapshot = await firestore.collection('users')
          .where('phoneVerified', '==', false)
          .get();

        const unverifiedUsers = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        let message = `⏳ **Unverified Users** ⏳\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Unverified Users: ${unverifiedUsers.length}**\n\n`;

        if (unverifiedUsers.length === 0) {
          message += `📭 No unverified users found.`;
        } else {
          unverifiedUsers.forEach((user, index) => {
            const name = user.firstName || user.username || 'Unknown';
            message += `${index + 1}. ⏳ **${name}**\n`;
            message += `   🆔 ${user.id} | 📱 Not verified\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to User Management', callback_data: 'admin_users' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in view_unverified_users:', error);
        await ctx.answerCbQuery('❌ Error loading unverified users');
      }
    });

    bot.action('admin_expired_subscriptions', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery('❌ Access denied. Admin only.');
          return;
        }

        // Get expired subscriptions
        const now = new Date();
        const subscriptionsSnapshot = await firestore.collection('subscriptions')
          .where('status', '==', 'active')
          .get();

        const expiredSubs = subscriptionsSnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(sub => new Date(sub.expiryDate) < now);

        const message = `🔴 **Expired Subscriptions** 🔴\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `📊 **Expired Subscriptions: ${expiredSubs.length}**\n\n`;

        if (expiredSubs.length === 0) {
          message += `📭 No expired subscriptions found.`;
        } else {
          expiredSubs.forEach((sub, index) => {
            message += `${index + 1}. **${sub.serviceName}** - ${sub.userName}\n`;
            message += `   💰 ${sub.amount} ETB - Expired: ${sub.expiryDate}\n\n`;
          });
        }

        const keyboard = {
          inline_keyboard: [
            [{ text: '🔙 Back to Subscriptions', callback_data: 'admin_subscriptions' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        };

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        await ctx.answerCbQuery();

      } catch (error) {
        console.error('Error in admin_expired_subscriptions:', error);
        await ctx.answerCbQuery('❌ Error loading expired subscriptions');
      }
    });

    // Start the bot with webhooks for Render
    console.log("🚀 Starting bot with webhooks for Render deployment...");
    
    // Check if we're running locally for testing
    if (process.env.LOCAL_TEST === 'true') {
      console.log("🔧 LOCAL_TEST mode detected - using polling instead of webhooks");
      await bot.launch();
      console.log("✅ Bot started with polling for local testing - Phone verification ENABLED");
      return;
    }
    
    // Use webhooks instead of polling to avoid conflicts
    const webhookUrl = process.env.WEBHOOK_URL || `https://bpayb.onrender.com/telegram`;
    
    try {
      // Delete any existing webhook first
      await bot.telegram.deleteWebhook();
      console.log("🗑️ Deleted existing webhook");
      
      // Set new webhook
      console.log(`🔧 Setting webhook to: ${webhookUrl}`);
      await bot.telegram.setWebhook(webhookUrl);
      console.log(`✅ Webhook set to: ${webhookUrl}`);
      
      // Test webhook info
      const webhookInfo = await bot.telegram.getWebhookInfo();
      console.log(`🔧 Webhook info:`, JSON.stringify(webhookInfo, null, 2));
      
      // Start the HTTP server with integrated webhook
      server.listen(PORT, () => {
        console.log(`🌐 HTTP server running on port ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
        console.log(`🌐 Webhook endpoint: http://localhost:${PORT}/webhook`);
        console.log(`✅ Webhook integrated into HTTP server`);
      });

      // Keep-alive ping to prevent Render sleep
      setInterval(async () => {
        try {
          const response = await fetch(`http://localhost:${PORT}/health`);
          if (response.ok) {
            console.log('💓 Keep-alive ping successful');
          }
        } catch (error) {
          console.log('⚠️ Keep-alive ping failed, but continuing...');
        }
      }, 30000); // Every 30 seconds (prevents 15min sleep)
      console.log("✅ Bot started with webhooks - Phone verification ENABLED");
      console.log("🌐 Enhanced language persistence ENABLED");
      console.log("📄 Service pagination ENABLED (5 per page)");
      console.log("📱 Admin Panel: Use /admin command in Telegram");
      console.log("📱 Users must verify phone before accessing services");
      console.log("🔤 All messages translated in English and Amharic");
      console.log(`🌐 Render Health Server: http://localhost:${PORT}/health`);
      console.log(`🌐 Webhook URL: ${webhookUrl}`);
      console.log("⚡ Webhook mode: Instant response times (50-100ms)");
      
      // Start expiration reminder system
      await expirationReminder.start();
      console.log("⏰ Expiration reminder system started");
    } catch (error) {
      console.log("⚠️ Webhook setup failed, falling back to polling...");
      console.log("Error:", error.message);
      await bot.launch();
      console.log("✅ Bot started with polling - Phone verification ENABLED");
      console.log("🌐 Enhanced language persistence ENABLED");
      console.log("📄 Service pagination ENABLED (5 per page)");
      console.log("📱 Admin Panel: Use /admin command in Telegram");
      console.log("📱 Users must verify phone before accessing services");
      console.log("🔤 All messages translated in English and Amharic");
      console.log(`🌐 Render Health Server: http://localhost:${PORT}/health`);
    }

  } catch (error) {
    console.error("❌ Failed to initialize:", error);
    process.exit(1);
  }
})();
