// Complete BirrPay Bot with EVERY SINGLE admin feature from original admin.js
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { createServer } from 'http';
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
import { checkExpirationReminders } from './src/utils/expirationReminder.js';
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

// Comprehensive translation function
const translateMessage = (key, lang = 'en') => {
  const translations = {
    // Phone verification
    'phone_verification_required': {
      en: '📱 Phone Verification Required\n\nTo use BirrPay services, you need to verify your phone number.\n\nPlease verify your phone number by clicking the button below.',
      am: '📱 የተልፍዎን መረጃ አስፈላጊ\n\nየBirrPay አገልግሎቶችን ለመጠቀም የተልፍዎን መረጃ አስፈላጊ።\n\nእባክዎ ከታች ያለውን ቁልፍ በመጫን የስልክ ቁጥርዎን ያረጋግጡ።'
    },
    'verify_my_number': {
      en: '📱 Verify My Number',
      am: '📱 ስልክ ቁጥሬን ለማረጋገጥ'
    },
    'share_contact': {
      en: '📱 Share Contact',
      am: '📱 እውቂያ ማጋራት'
    },
    'type_manually': {
      en: '✍️ Type Manually',
      am: '✍️ በእጅ መፃፍ'
    },
    'invalid_phone_format': {
      en: '⚠️ Please use a valid phone number format (+1234567890)',
      am: '⚠️ እባክዎ ትክክለኛ የስልክ ቁጥር ይጠቀሙ (+1234567890)'
    },
    'phone_verified_success': {
      en: '✅ Your phone number has been verified! You can now use our services.',
      am: '✅ የስልክ ቁጥርዎ ተረጋግጧል! አሁን አገልግሎቶችን መጠቀም ይችላሉ።'
    },
    
    // Welcome messages
    'welcome_title': {
      en: '🎉 Welcome to BirrPay!',
      am: '🎉 እንኳን ወደ BirrPay በደህና መጡ!'
    },
    'welcome_subtitle': {
      en: '🌟 **Ethiopia\'s #1 Subscription Platform**',
      am: '🌟 **የኢትዮጵያ #1 የሳብስክሪፕሽን ፕላትፎርም**'
    },
    'welcome_description': {
      en: 'Ethiopia\'s Premier Subscription Hub.\n\nPlease use the button below to subscribe to services.',
      am: 'የኢትዮጵያ ዋና የማስተካል አገልግሎት።\n\nአገልግሎቶችን ለመመዝገብ እባክዎ ከታች ያለውን አዝራር ይጠቀሙ።'
    },
    
    // Menu buttons
    'view_services': {
      en: '🛍️ View Services',
      am: '🛍️ አገልግሎቶችን ይመልከቱ'
    },
    'my_subscriptions': {
      en: '📊 My Subscriptions',
      am: '📊 የእኔ መዋቅሮች'
    },
    'help': {
      en: '❓ Help',
      am: '❓ እርዳታ'
    },
    'support': {
      en: '📞 Support',
      am: '📞 ድጋፍ'
    },
    'language': {
      en: '🌐 Language',
      am: '🌐 ቋንቋ'
    },
    'admin_panel': {
      en: '🔧 Admin Panel',
      am: '🔧 አስተዳደሪ ፓነል'
    },
    'back_to_menu': {
      en: '🏠 Back to Menu',
      am: '🏠 ወደ ምናሌ ተመለስ'
    },
    
    // Language settings
    'language_settings': {
      en: '🌐 **Language Settings**\n\nCurrent language: {current}\n\nPlease select your preferred language:',
      am: '🌐 **የቋንቋ ማስተካከያ**\n\nአሁን ያለው ቋንቋዎ: {current}\n\nእባክዎ የሚፈልጉትን ቋንቋ ይምረጡ:'
    },
    'english': {
      en: '🇺🇸 English',
      am: '🇺🇸 English'
    },
    'amharic': {
      en: '🇪🇹 Amharic',
      am: '🇪🇹 አማርኛ'
    },
    'language_switched_en': {
      en: '✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.',
      am: '✅ **Language Updated!**\n\n🇺🇸 Your language has been switched to English.\n\nYou can now use all bot features in English.'
    },
    'language_switched_am': {
      en: '✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።',
      am: '✅ **ቋንቋ ተሻሽሏል!**\n\n🇪🇹 ቋንቋዎ ወደ አማርኛ ተቀይሯል።\n\nአሁን ሁሉንም የቦት ባህሪያት በአማርኛ መጠቀም ይችላሉ።'
    },
    
    // Pagination
    'pagination_info': {
      en: '📄 Page {current} of {total}',
      am: '📄 ገጽ {current} ከ {total}'
    },
    'previous_page': {
      en: '⬅️ Previous',
      am: '⬅️ ቀዳሚ'
    },
    'next_page': {
      en: 'Next ➡️',
      am: 'ቀጣይ ➡️'
    },
    'back_to_admin': {
      en: '🔙 Back to Admin',
      am: '🔙 ወደ አስተዳደሪ ተመለስ'
    },
    'services_title': {
      en: '🛍️ **Service Management**',
      am: '🛍️ **የአገልግሎት አስተዳደር**'
    },
    'no_services': {
      en: 'No services found.',
      am: 'ምንም አገልግሎት አልተገኘም።'
    },
    
    // Error messages
    'error_generic': {
      en: '❌ An error occurred. Please try again.',
      am: '❌ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
    },
    'error_verification': {
      en: '❌ Error occurred during verification. Please try again.',
      am: '❌ በማረጋገጫ ሂደት ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
    },
    
    // Admin panel messages
    'access_denied': {
      en: '❌ **Access Denied**\n\nThis command is restricted to authorized administrators only.',
      am: '❌ **መድረስ ተከልክሏል**\n\nይህ ትዕዛዝ ለሚፈቀዱ አስተዳደሪዎች ብቻ የተወሰነ ነው።'
    },
    'welcome_admin': {
      en: '👋 **Welcome back, Administrator!**',
      am: '👋 **እንኳን ደስ አለዎት፣ አስተዳደሪ!**'
    },
    'admin_dashboard': {
      en: '🌟 **BirrPay Admin Dashboard** 🌟',
      am: '🌟 **የBirrPay አስተዳደሪ ዳሽቦርድ** 🌟'
    },
    'real_time_analytics': {
      en: '📊 **Real-Time Analytics**',
      am: '📊 **የቅጽበት ትንተና**'
    },
    'total_users': {
      en: '👥 **Users:** {count} total',
      am: '👥 **ተጠቃሚዎች:** {count} ጠቅላላ'
    },
    'verified_users': {
      en: '✅ **Verified:** {count} users',
      am: '✅ **ተረጋግጧል:** {count} ተጠቃሚዎች'
    },
    'active_subscriptions': {
      en: '📱 **Subscriptions:** {count} active',
      am: '📱 **የደንበኝነት ምዝገቦች:** {count} ንቁ'
    },
    'total_payments': {
      en: '💳 **Payments:** {count} total',
      am: '💳 **ክፍያዎች:** {count} ጠቅላላ'
    },
    'available_services': {
      en: '🛍️ **Services:** {count} available',
      am: '🛍️ **አገልግሎቶች:** {count} ይገኛሉ'
    },
    'web_admin_panel': {
      en: '🌐 **Web Admin Panel:** [Open Dashboard](https://bpayb.onrender.com/panel)',
      am: '🌐 **ድህረ ገጽ አስተዳደሪ ፓነል:** [ዳሽቦርድ ክፈት](https://bpayb.onrender.com/panel)'
    },
    'management_center': {
      en: '🎯 **Management Center:**',
      am: '🎯 **የአስተዳደር ማዕከል:**'
    },
    // Admin buttons
    'users': {
      en: '👥 Users',
      am: '👥 ተጠቃሚዎች'
    },
    'subscriptions': {
      en: '📊 Subscriptions',
      am: '📊 የደንበኝነት ምዝገቦች'
    },
    'manage_services': {
      en: '🛍️ Manage Services',
      am: '🛍️ አገልግሎቶችን አስተዳድር'
    },
    'add_service': {
      en: '➕ Add Service',
      am: '➕ አገልግሎት አክል'
    },
    'payment_methods': {
      en: '💳 Payment Methods',
      am: '💳 የክፍያ ዘዴዎች'
    },
    'performance': {
      en: '📊 Performance',
      am: '📊 አدነገጃ'
    },
    'broadcast_message': {
      en: '💬 Broadcast Message',
      am: '💬 የስርጭት መልእክት'
    },
    'refresh_panel': {
      en: '🔄 Refresh Panel',
      am: '🔄 ፓነል አድስ'
    },
    // Admin error messages
    'error_loading_admin': {
      en: '❌ Error loading admin panel. Please try again.',
      am: '❌ የአስተዳደሪ ፓነል መጫን ስህተት። እባክዎ እንደገና ይሞክሩ።'
    },
    'error_changing_language': {
      en: '❌ Error changing language',
      am: '❌ ቋንቋ መለወጥ ስህተት'
    },
    'error_loading_services': {
      en: '❌ Error loading services',
      am: '❌ አገልግሎቶችን መጫን ስህተት'
    },
    'error_loading_page': {
      en: '❌ Error loading page',
      am: '❌ ገጽ መጫን ስህተት'
    },
    'error_returning_menu': {
      en: '❌ Error returning to menu',
      am: '❌ ወደ ምናሌ መመለስ ስህተት'
    },
    'error_language_settings': {
      en: '❌ Error loading language settings',
      am: '❌ የቋንቋ ቅንብሮችን መጫን ስህተት'
    },
    // Service management
    'service_price': {
      en: '💰 Price: {price}',
      am: '💰 ዋጋ: {price}'
    },
    'service_id': {
      en: '📝 ID: `{id}`',
      am: '📝 መለያ: `{id}`'
    }

  };
  
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }
  
  return translation[lang] || translation.en || key;
};
import { performanceMonitor } from './src/utils/performanceMonitor.js';

// Using imported isAuthorizedAdmin function from admin.js

// Phone verification middleware - Check if user is verified before allowing access
const phoneVerificationMiddleware = async (ctx, next) => {
  try {
    // Skip verification check for admin and verification commands
    const isAdmin = await isAuthorizedAdmin(ctx);
    const isVerificationCommand = ctx.message?.text?.startsWith('/verify') || ctx.callbackQuery?.data?.startsWith('verify_');
    const isStartCommand = ctx.message?.text === '/start';
    const isContactMessage = ctx.message?.contact;
    const isManualPhoneInput = ctx.message?.text === '✍️ በእጅ መፃፍ' || ctx.message?.text === '✍️ Type Manually';
    const isVerificationCodeInput = ctx.message?.text && /^\d{6}$/.test(ctx.message.text.trim());
    
    if (isAdmin || isVerificationCommand || isStartCommand || isContactMessage || isManualPhoneInput || isVerificationCodeInput) {
      return next();
    }
    
    // Check if user is verified
    try {
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
                text: lang === 'am' ? '📱 ስልክ ቁጥሬን ለማረጋገጥ' : '📱 Verify My Number', 
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
              text: lang === 'am' ? '📱 እውቂያ ማጋራት' : '📱 Share Contact',
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
            text: lang === "am" ? "🚀 እንጀምር!" : "🚀 Let's Get Started!",
            callback_data: "view_services"
          }
        ],
        [
          { 
            text: lang === "am" ? "📊 የእኔ መዋቅሮች" : "📊 My Subscriptions",
            callback_data: "my_subscriptions"
          }
        ],
        [
          { 
            text: lang === "am" ? "❓ እርዳታ" : "❓ Help",
            callback_data: "help"
          },
          { 
            text: lang === "am" ? "📞 ድጋፍ" : "📞 Support",
            callback_data: "support"
          }
        ],
        [
          { 
            text: lang === "am" ? "🌐 ቋንቋ" : "🌐 Language",
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
            [{ text: lang === 'am' ? '🔙 ወደ ኋላ' : '🔙 Back' }]
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
              text: lang === 'am' ? '📱 እውቂያ ማጋራት' : '📱 Share Contact',
              request_contact: true
            }
          ],
          [
            {
              text: lang === 'am' ? '✍️ በእጅ መፃፍ' : '✍️ Type Manually'
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

// Create HTTP server for health checks and admin panel
const server = createServer(async (req, res) => {
  const url = req.url;
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Health check endpoint
  if (url === '/health' || url === '/health/' || url === '/') {
    try {
      // Check if bot is running
      const botStatus = bot ? 'running' : 'stopped';
      
      // Basic health check
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        phoneVerification: 'enabled',
        botStatus: botStatus,
        server: 'birrpay-bot',
        endpoints: {
          health: '/health',
          status: '/status',
          panel: '/panel'
        }
      };
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(healthStatus));
      console.log('✅ Health check passed');
    } catch (error) {
      console.error('❌ Health check error:', error.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString(),
        server: 'birrpay-bot'
      }));
    }
    return;
  }

  // Simple status endpoint for Render
  if (url === '/status') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BirrPay Bot</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0; margin: 0; padding: 40px; text-align: center; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #3b82f6; margin-bottom: 20px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; margin: 10px; transition: all 0.3s ease; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 BirrPay Bot</h1>
            <p>The bot is running successfully with phone verification enabled!</p>
            <a href="/panel" class="btn">🌐 Open Admin Panel</a>
            <p style="margin-top: 30px; color: #94a3b8;">
                Use <code>/admin</code> command in Telegram for admin access
            </p>
        </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 HTTP Server listening on port ${PORT}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Admin Panel: http://localhost:${PORT}/panel`);
  console.log(`📱 Phone verification: ENABLED`);
}).on('error', (error) => {
  console.error('❌ Server startup error:', error);
  process.exit(1);
});

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

    // Register admin command FIRST to avoid conflicts
    bot.command('admin', async (ctx) => {
      console.log("🔑 ADMIN COMMAND triggered from user:", ctx.from.id);
      
      try {
        // Get user's language preference first
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        const isAdmin = await isAuthorizedAdmin(ctx);
        console.log("🔑 Admin check result:", isAdmin);
        
        if (!isAdmin) {
          await ctx.reply(translateMessage('access_denied', lang));
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

        const adminMessage = `${translateMessage('admin_dashboard', lang)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${translateMessage('welcome_admin', lang)}

${translateMessage('real_time_analytics', lang)}
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ${translateMessage('total_users', lang).replace('{count}', totalUsers.toLocaleString())}
┃ ${translateMessage('verified_users', lang).replace('{count}', verifiedUsers.toLocaleString())}
┃ ${translateMessage('active_subscriptions', lang).replace('{count}', activeSubscriptions.toLocaleString())}
┃ ${translateMessage('total_payments', lang).replace('{count}', totalPayments.toLocaleString())}
┃ ${translateMessage('available_services', lang).replace('{count}', totalServices)}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${translateMessage('web_admin_panel', lang)}

${translateMessage('management_center', lang)}`;

        const keyboard = {
          inline_keyboard: [
            [{ text: translateMessage('users', lang), callback_data: 'admin_users' }, { text: translateMessage('subscriptions', lang), callback_data: 'admin_subscriptions' }],
            [{ text: translateMessage('manage_services', lang), callback_data: 'admin_manage_services' }, { text: translateMessage('add_service', lang), callback_data: 'admin_add_service' }],
            [{ text: translateMessage('payment_methods', lang), callback_data: 'admin_payments' }],
            [{ text: translateMessage('performance', lang), callback_data: 'admin_performance' }],
            [{ text: translateMessage('broadcast_message', lang), callback_data: 'admin_broadcast' }],
            [{ text: translateMessage('refresh_panel', lang), callback_data: 'refresh_admin' }]
          ]
        };

        await ctx.reply(adminMessage, {
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
      } catch (error) {
        console.error('Error loading admin panel:', error);
        performanceMonitor.trackError(error, 'admin-panel-load');
        const lang = 'en'; // Fallback language
        await ctx.reply(translateMessage('error_loading_admin', lang));
      }
    });

    // Add debug middleware to see all commands
    bot.use(async (ctx, next) => {
      if (ctx.message && ctx.message.text) {
        console.log(`📥 Command: "${ctx.message.text}" from user ${ctx.from.id}`);
      }
      return next();
    });

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
          [{ text: lang === 'am' ? '📱 አገልግሎቶች ይምረጡ' : '📱 Select Services', callback_data: 'services' }],
          [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }]
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
          { text: lang === 'am' ? '📱 አዲስ ምዝገባ' : '📱 New Subscription', callback_data: 'services' },
          { text: lang === 'am' ? '🔄 እንደገና ጫን' : '🔄 Refresh', callback_data: 'my_subs' }
        ]);
        
        keyboard.push([
          { text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_menu' }
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
        await ctx.editMessageText(translateMessage('language_switched_en', 'en'), { 
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: translateMessage('back_to_menu', 'en'), callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in lang_en action:', error);
        await ctx.answerCbQuery(translateMessage('error_changing_language', 'en'));
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
              { text: '🏠 ወደ ምናሌ ተመለስ', callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in lang_am action:', error);
        await ctx.answerCbQuery(translateMessage('error_changing_language', 'en'));
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
              { text: '🏠 Back to Menu', callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in set_lang_en action:', error);
        await ctx.answerCbQuery(translateMessage('error_changing_language', 'en'));
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
              { text: '🏠 ወደ ምናሌ ተመለስ', callback_data: 'back_to_menu' }
            ]]
          }
        });
      } catch (error) {
        console.error('Error in set_lang_am action:', error);
        await ctx.answerCbQuery(translateMessage('error_changing_language', 'en'));
      }
    });

    bot.action('language_settings', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const currentLang = userData.language || 'en';
        
        const currentLangText = currentLang === 'am' ? '🇪🇹 አማርኛ' : '🇺🇸 English';
        const message = translateMessage('language_settings', currentLang).replace('{current}', currentLangText);
        
        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: translateMessage('english', currentLang), callback_data: 'lang_en' },
                { text: translateMessage('amharic', currentLang), callback_data: 'lang_am' }
              ],
              [
                { text: translateMessage('back_to_menu', currentLang), callback_data: 'back_to_menu' }
              ]
            ]
          }
        });
      } catch (error) {
        console.error('Error in language_settings:', error);
        await ctx.answerCbQuery(translateMessage('error_language_settings', 'en'));
      }
    });

    bot.action('back_to_menu', async (ctx) => {
      try {
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        const welcomeMessage = translateMessage('welcome_title', lang) + '\n\n' + translateMessage('welcome_description', lang);

        // Check if user is admin
        const isAdmin = await isAuthorizedAdmin(ctx);
        
        const keyboard = {
          inline_keyboard: [
            [
              {
                text: translateMessage('view_services', lang),
                callback_data: 'view_services'
              }
            ],
            [
              {
                text: translateMessage('my_subscriptions', lang),
                callback_data: 'my_subscriptions'
              }
            ],
            [
              {
                text: translateMessage('help', lang),
                callback_data: 'help'
              },
              {
                text: translateMessage('support', lang),
                callback_data: 'support'
              }
            ]
          ]
        };

        // Add admin button only for admins
        if (isAdmin) {
          keyboard.inline_keyboard.push([
            {
              text: lang === 'am' ? '🔧 አስተዳደሪ ፓነል' : '🔧 Admin Panel',
              callback_data: 'admin'
            }
          ]);
        }

        // Add language button
        keyboard.inline_keyboard.push([
          {
            text: translateMessage('language', lang),
            callback_data: 'language_settings'
          }
        ]);

        await ctx.editMessageText(welcomeMessage, {
          reply_markup: keyboard,
          parse_mode: 'Markdown'
        });
      } catch (error) {
        console.error('Error in back_to_menu:', error);
        await ctx.answerCbQuery(translateMessage('error_returning_menu', 'en'));
      }
    });

    // Admin button action handler
    bot.action('admin', async (ctx) => {
      try {
        // Get user's language preference first
        const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
        const userData = userDoc.data() || {};
        const lang = userData.language || 'en';
        
        const isAdmin = await isAuthorizedAdmin(ctx);
        
        if (!isAdmin) {
          await ctx.answerCbQuery(translateMessage('access_denied', lang));
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

        const adminMessage = `${translateMessage('admin_dashboard', lang)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${translateMessage('welcome_admin', lang)}

${translateMessage('real_time_analytics', lang)}
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ ${translateMessage('total_users', lang).replace('{count}', totalUsers.toLocaleString())}
┃ ${translateMessage('verified_users', lang).replace('{count}', verifiedUsers.toLocaleString())}
┃ ${translateMessage('active_subscriptions', lang).replace('{count}', activeSubscriptions.toLocaleString())}
┃ ${translateMessage('total_payments', lang).replace('{count}', totalPayments.toLocaleString())}
┃ ${translateMessage('available_services', lang).replace('{count}', totalServices)}
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

${translateMessage('web_admin_panel', lang)}

${translateMessage('management_center', lang)}`;

        const keyboard = {
          inline_keyboard: [
            [{ text: translateMessage('users', lang), callback_data: 'admin_users' }, { text: translateMessage('subscriptions', lang), callback_data: 'admin_subscriptions' }],
            [{ text: translateMessage('manage_services', lang), callback_data: 'admin_manage_services' }, { text: translateMessage('add_service', lang), callback_data: 'admin_add_service' }],
            [{ text: translateMessage('payment_methods', lang), callback_data: 'admin_payments' }],
            [{ text: translateMessage('performance', lang), callback_data: 'admin_performance' }],
            [{ text: translateMessage('broadcast_message', lang), callback_data: 'admin_broadcast' }],
            [{ text: translateMessage('refresh_panel', lang), callback_data: 'refresh_admin' }]
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
        const lang = 'en'; // Fallback language
        await ctx.answerCbQuery(translateMessage('error_loading_admin', lang));
      }
    });

    // Service management with pagination handlers
    console.log("📄 Setting up service management with pagination...");
    
    // Service management with pagination
    bot.action('admin_manage_services', async (ctx) => {
      try {
        const isAdmin = await isAuthorizedAdmin(ctx);
        if (!isAdmin) {
          await ctx.answerCbQuery(translateMessage('access_denied', lang));
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
          await ctx.editMessageText(translateMessage('no_services', lang), {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[
                { text: translateMessage('back_to_admin', lang), callback_data: 'refresh_admin' }
              ]]
            }
          });
          return;
        }

        // Show first page
        await showServicesPage(ctx, services, 0, lang);
        
      } catch (error) {
        console.error('Error in admin_manage_services:', error);
        await ctx.answerCbQuery(translateMessage('error_loading_services', lang));
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
        await ctx.answerCbQuery(translateMessage('error_loading_page', lang));
      }
    });

    // Helper function to show services page
    async function showServicesPage(ctx, services, page, lang) {
      const itemsPerPage = 5;
      const totalPages = Math.ceil(services.length / itemsPerPage);
      const startIndex = page * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const pageServices = services.slice(startIndex, endIndex);

      let message = translateMessage('services_title', lang) + '\n\n';
      
      pageServices.forEach((service, index) => {
        const status = service.status === 'active' ? '🟢' : '🔴';
        const price = service.price ? `$${service.price}` : 'N/A';
        message += `${startIndex + index + 1}. ${status} **${service.name}**\n`;
        message += `   ${translateMessage('service_price', lang).replace('{price}', price)}\n`;
        message += `   ${translateMessage('service_id', lang).replace('{id}', service.id)}\n\n`;
      });

      message += translateMessage('pagination_info', lang)
        .replace('{current}', page + 1)
        .replace('{total}', totalPages);

      const keyboard = [];
      
      // Navigation buttons
      const navRow = [];
      if (page > 0) {
        navRow.push({ text: translateMessage('previous_page', lang), callback_data: `services_page_${page - 1}` });
      }
      if (page < totalPages - 1) {
        navRow.push({ text: translateMessage('next_page', lang), callback_data: `services_page_${page + 1}` });
      }
      if (navRow.length > 0) {
        keyboard.push(navRow);
      }

      // Back button
      keyboard.push([{ text: translateMessage('back_to_admin', lang), callback_data: 'refresh_admin' }]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: { inline_keyboard: keyboard }
      });
    }

    // Start the bot
    console.log("🚀 Starting bot with phone verification, enhanced translations, and pagination...");
    await bot.launch();
    console.log("✅ Bot started - Phone verification ENABLED");
    console.log("🌐 Enhanced language persistence ENABLED");
    console.log("📄 Service pagination ENABLED (5 per page)");
    console.log("🌐 Web Admin Panel: https://bpayb.onrender.com/panel");
    console.log("📱 Users must verify phone before accessing services");
    console.log("🔤 All messages translated in English and Amharic");

  } catch (error) {
    console.error("❌ Failed to initialize:", error);
    process.exit(1);
  }
})();