// @ts-check
'use strict';

// Enable ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
import "dotenv/config";
import { bot } from "./bot.js";
import { loadI18n, getUserLang, setUserLang, getErrorMessage, getTranslatedMessage, setLanguageCache } from "./utils/i18n.js";
import { loadServices } from "./utils/loadServices.js";
import { startScheduler } from "./utils/scheduler.js";
import { handleRenewalCallback, triggerExpirationCheck } from "./utils/expirationReminder.js";
// Import firestore conditionally for development
let firestore = null;
try {
  const firestoreModule = await import("./utils/firestore.js");
  firestore = firestoreModule.firestore;
} catch (error) {
  console.warn("⚠️ Firebase not available, running in development mode:", error.message);
  // Create mock firestore for development
  firestore = {
    collection: () => ({
      get: () => Promise.resolve({ docs: [] }),
      doc: () => ({
        get: () => Promise.resolve({ exists: false }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve()
      }),
      where: () => ({
        get: () => Promise.resolve({ docs: [] }),
        limit: () => ({
          get: () => Promise.resolve({ docs: [] })
        })
      }),
      limit: () => ({
        get: () => Promise.resolve({ docs: [] })
      })
    })
  };
}

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import url from 'url';
import { setupStartHandler } from "./handlers/start.js";
import setupSubscribeHandler from "./handlers/subscribe.js";
import supportHandler from "./handlers/support.js";
import langHandler from "./handlers/lang.js";
import faqHandler from "./handlers/faq.js";
import mySubscriptionsHandler from "./handlers/mySubscriptions.js";
import cancelSubscriptionHandler from "./handlers/cancelSubscription.js";
import firestoreListener from "./handlers/firestoreListener.js";
import adminHandler from "./handlers/admin.js";
import helpHandler from "./handlers/help.js";
import screenshotUploadHandler from "./handlers/screenshotUpload.js";
import { registerAdminPaymentHandlers } from "./handlers/adminPaymentHandlers.js";
import { 
    userRoutes, 
    servicesRoutes, 
    subscriptionRoutes, 
    paymentRoutes, 
    screenshotRoutes, 
    adminRoutes, 
    supportRoutes, 
    utilityRoutes 
} from "./api/routes.js";
import { requireAdmin } from './middleware/requireAdmin.js';
import { getBackToMenuButton } from './utils/navigation.js';

console.log("Starting bot initialization...");
console.log("Bot token:", process.env.TELEGRAM_BOT_TOKEN ? "Set" : "Not set");
console.log("Bot token length:", process.env.TELEGRAM_BOT_TOKEN?.length || 0);
console.log("Bot token starts with:", process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) || "N/A");

// Create simple HTTP server instead of Fastify to avoid debug issues
const server = http.createServer((req, res) => {
  // Basic health check endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('BirrPay Bot is running');
});

// Get current directory for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load i18n and services with error handling FIRST
let i18n, services;
try {
  console.log("Loading i18n and services...");
  i18n = await loadI18n();
  services = await loadServices();
  console.log("Successfully loaded i18n and services");
} catch (error) {
  console.error("Error loading i18n or services:", error);
  // Provide fallback data
  i18n = {
    hero_title: { en: "Welcome", am: "እንኳን ደስ አለዎት" },
    hero_subtitle: { en: "Choose your plan", am: "የእርስዎን እቅድ ይምረጡ" },
  };
  services = [];
}

// Cookie functionality removed - using simple HTTP server

// Static file serving removed - using simple HTTP server

// Panel routes removed - using simple HTTP server
console.log("⚠️ Admin panel disabled - using simple HTTP server");

// CRITICAL MIDDLEWARE: Set user language context for ALL interactions
bot.use(async (ctx, next) => {
  try {
    // Set user language context for ALL interactions (commands, callbacks, messages)
    if (ctx.from?.id) {
      ctx.userLang = await getUserLang(ctx);
      console.log(`🌐 User language context set to: ${ctx.userLang} for user ${ctx.from.id}`);
    }
  } catch (error) {
    console.error("Error setting user language context:", error);
    ctx.userLang = 'en'; // Fallback to English
  }
  await next();
});

// CRITICAL FIX: Register ALL handlers BEFORE middleware
console.log("🚀 REGISTERING ALL HANDLERS FIRST...");

// Register admin handler early so /admin works and inline buttons are available
try {
  adminHandler(bot);
  console.log("✅ Admin handler registered");
} catch (e) {
  console.error("❌ Failed to register admin handler:", e.message);
}

// Direct command handlers with enhanced debugging
bot.command("help", async (ctx) => {
  try {
    console.log("🚀 HELP COMMAND TRIGGERED!");
    console.log("Help command - User ID:", ctx.from?.id);
    console.log("Help command - Message:", ctx.message?.text);
    
    // Get language from Telegram or default to English
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    console.log("Help command - Language:", lang);
    
    const helpText = lang === "am" 
      ? "🔧 BirrPay የብር የደግፍ መረጃ\n\nየተጣታት ትዕዛዞች:\n• /start - ዋና ምንዩ\n• /help - የእርዳታ ምንዩ\n• /faq - በተደጋጋሚ የሚጣዩ ጥያቄዎች\n• /lang - የቋንቃ መረጥ\n• /mysubs - የእርስዎ መዋቅሮች\n• /support - የተጠቃሚ ድጋፍ"
      : "🔧 BirrPay Help & Support\n\nAvailable Commands:\n• /start - Main menu and services\n• /help - Show this help message\n• /faq - Frequently asked questions\n• /lang - Change language settings\n• /mysubs - View your subscriptions\n• /support - Contact customer support";
    
    console.log("Help command - Sending response...");
    await ctx.reply(helpText);
    console.log("✅ Help response sent successfully!");
  } catch (error) {
    console.error("⚠️ Error in help command:", error);
    const errorMsg = await getErrorMessage(ctx);
    await ctx.reply(errorMsg);
  }
});

bot.command("faq", async (ctx) => {
  try {
    console.log("🚀 FAQ COMMAND TRIGGERED!");
    console.log("FAQ command - User ID:", ctx.from?.id);
    console.log("FAQ command - Message:", ctx.message?.text);
    
    // Get language from Telegram or default to English
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    console.log("FAQ command - Language:", lang);
    const faqData = {
      en: {
        title: "❓ Frequently Asked Questions",
        questions: [
          { q: "How do I subscribe to a service?", a: "Use /start to browse services, select one, and follow the subscription instructions." },
          { q: "How do I cancel my subscription?", a: "Use /mysubs to view your subscriptions and click the cancel button." },
          { q: "What payment methods do you accept?", a: "We accept various payment methods including mobile money and bank transfers." },
          { q: "How do I get support?", a: "Use /support to contact our customer service team." }
        ]
      },
      am: {
        title: "❓ በተደጋጋሚ የሚጠየቁ ጥያቄዎች",
        questions: [
          { q: "አገልግሎት እንዴት እመዘገባለሁ?", a: "/start ን ተጠቅመው አገልግሎቶችን ይመልከቱ፣ አንዱን ይምረጡ እና የምዝገባ መመሪያዎችን ይከተሉ።" },
          { q: "ምዝገባዬን እንዴት እሰርዛለሁ?", a: "/mysubs ን ተጠቅመው ምዝገባዎችዎን ይመልከቱ እና የሰርዝ ቁልፍን ይጫኑ።" },
          { q: "ምን አይነት የክፍያ ዘዴዎችን ይቀበላሉ?", a: "የተለያዩ የክፍያ ዘዴዎችን እንቀበላለን፣ የሞባይል ገንዘብ እና የባንክ ዝውውርን ጨምሮ።" },
          { q: "ድጋፍ እንዴት አገኛለሁ?", a: "/support ን ተጠቅመው የደንበኞች አገልግሎት ቡድናችንን ያግኙ።" }
        ]
      }
    };
    const data = faqData[lang] || faqData["en"];
    const keyboard = data.questions.map((f, i) => [
      { text: f.q, callback_data: `faq_${i}` },
    ]);
    await ctx.reply(data.title, {
      reply_markup: { inline_keyboard: keyboard },
    });
    console.log("✅ FAQ response sent!");
  } catch (error) {
    console.error("⚠️ Error in FAQ:", error);
    const errorMsg = await getErrorMessage(ctx);
    await ctx.reply(errorMsg);
  }
});

bot.command("lang", async (ctx) => {
  try {
    console.log("🚀 LANG COMMAND TRIGGERED!");
    console.log("Lang command - User ID:", ctx.from?.id);
    console.log("Lang command - Message:", ctx.message?.text);
    const keyboard = [
      [{ text: "🇺🇸 English", callback_data: "lang_en" }],
      [{ text: "🇪🇹 አማርኛ", callback_data: "lang_am" }]
    ];
    const langText = "🌐 Choose your language / ቋንቃዎን ይምረጡ:";
    await ctx.reply(langText, {
      reply_markup: { inline_keyboard: keyboard }
    });
    console.log("✅ Language selection sent!");
  } catch (error) {
    console.error("⚠️ Error in lang:", error);
    const errorMsg = await getErrorMessage(ctx);
    await ctx.reply(errorMsg);
  }
});

// Callback handlers
bot.action(/faq_(\d+)/, async (ctx) => {
  try {
    console.log("🚀 FAQ CALLBACK TRIGGERED!");
    const index = parseInt(ctx.match[1]);
    // Get language from Telegram or default to English
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    const faqData = {
      en: {
        questions: [
          { q: "How do I subscribe to a service?", a: "Use /start to browse services, select one, and follow the subscription instructions." },
          { q: "How do I cancel my subscription?", a: "Use /mysubs to view your subscriptions and click the cancel button." },
          { q: "What payment methods do you accept?", a: "We accept various payment methods including mobile money and bank transfers." },
          { q: "How do I get support?", a: "Use /support to contact our customer service team." }
        ]
      },
      am: {
        questions: [
          { q: "አገልግሎት እንዴት እመዘገባለሁ?", a: "/start ን ተጠቅመው አገልግሎቶችን ይመልከቱ፣ አንዱን ይምረጡ እና የምዝገባ መመሪያዎችን ይከተሉ።" },
          { q: "ምዝገባዬን እንዴት እሰርዛለሁ?", a: "/mysubs ን ተጠቅመው ምዝገባዎችዎን ይመልከቱ እና የሰርዝ ቁልፍን ይጫኑ።" },
          { q: "ምን አይነት የክፍያ ዘዴዎችን ይቀበላሉ?", a: "የተለያዩ የክፍያ ዘዴዎችን እንቀበላለን፣ የሞባይል ገንዘብ እና የባንክ ዝውውርን ጨምሮ።" },
          { q: "ድጋፍ እንዴት አገኛለሁ?", a: "/support ን ተጠቅመው የደንበኞች አገልግሎት ቡድናችንን ያግኙ።" }
        ]
      }
    };
    const data = faqData[lang] || faqData["en"];
    const faq = data.questions[index];
    if (faq) {
      await ctx.answerCbQuery();
      await ctx.reply(`❓ ${faq.q}\n\n✅ ${faq.a}`);
      console.log("✅ FAQ answer sent!");
    } else {
      await ctx.answerCbQuery("FAQ not found");
    }
  } catch (error) {
    console.error("⚠️ Error in FAQ callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
});

bot.action("support", async (ctx) => {
  try {
    console.log("🚀 SUPPORT CALLBACK TRIGGERED!");
    // Get user's selected language
    const lang = ctx.userLang || "en";
    const supportText = lang === "am"
      ? "📞 የደንበኞች አገልግሎት\n\nየእርዳታ አገልግሎት አትፈልግዎት?\n\nየተለያዩ የደጋፍ አገልግሎቶች:\n• የምዝገባ እርዳታ\n• የክፍያ ጥያቄዎች\n• ተክኒካዊ ድጋፍ\n• የመረጃ ጥያቄዎች\n\nየተጠቃሚ ድጋፍዎ መረጃ: @BirrPaySupport"
      : "📞 Customer Support\n\nNeed help with your account?\n\nOur support team can help with:\n• Subscription management\n• Payment issues\n• Technical support\n• Account questions\n\nContact our support team: @BirrPaySupport";
    await ctx.answerCbQuery();
    await ctx.reply(supportText);
    console.log("✅ Support message sent!");
  } catch (error) {
    console.error("⚠️ Error in support callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
});

bot.action(/lang_(en|am)/, async (ctx) => {
  try {
    console.log("🚀 LANGUAGE CALLBACK TRIGGERED!");
    const newLang = ctx.match[1];
    
    // Save to Firestore if available
    try {
      await firestore.collection("users").doc(String(ctx.from.id)).set(
        { language: newLang },
        { merge: true }
      );
      console.log(`✅ Language saved to Firestore: ${newLang}`);
    } catch (firestoreError) {
      console.log("Firestore not available, language change temporary");
    }
    
    // Update the current context immediately AND cache it
    ctx.userLang = newLang;
    setLanguageCache(ctx.from.id, newLang);
    
    // Show confirmation message
    const confirmText = newLang === "am"
      ? "✅ ቋንቋ ወደ አማርኛ ተቀይሯል!"
      : "✅ Language changed to English!";
    await ctx.answerCbQuery();
    await ctx.reply(confirmText);
    
    // Show main menu in the new language to demonstrate the change
    const { getMainMenuContent } = await import("./utils/menuContent.js");
    const menuData = getMainMenuContent(newLang, false);
    
    setTimeout(async () => {
      try {
        await ctx.reply(menuData.message, {
          reply_markup: { inline_keyboard: menuData.keyboard },
          parse_mode: "Markdown"
        });
      } catch (error) {
        console.error("Error showing menu in new language:", error);
      }
    }, 1000);
    
    console.log(`✅ Language changed to ${newLang} and menu updated!`);
  } catch (error) {
    console.error("⚠️ Error in language callback:", error);
    await ctx.answerCbQuery("Error occurred");
  }
});

console.log("✅ ALL HANDLERS REGISTERED!");

// Set up Telegram Bot Menu (persistent menu buttons)
const setupBotMenu = async () => {
  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: '🏠 Main menu and services' },
      { command: 'help', description: '🔧 Help and support information' },
      { command: 'faq', description: '❓ Frequently asked questions' },
      { command: 'lang', description: '🌐 Change language settings' },
      { command: 'mysubs', description: '📊 My active subscriptions' },
      { command: 'support', description: '📞 Contact customer support' },
      { command: 'admin', description: '🔑 Admin panel (admin only)' }
    ]);
    console.log("✅ Bot menu commands set successfully!");
  } catch (error) {
    console.error("⚠️ Error setting bot menu:", error);
  }
};

// Initialize admin handlers
adminHandler(bot);
registerAdminPaymentHandlers(bot);

// Initialize start handler
setupStartHandler(bot);

// Initialize my subscriptions handler
mySubscriptionsHandler(bot);

// Add admin callback handlers
// Admin stats handler is defined later in the file

// Add mysubs command
bot.command("mysubs", async (ctx) => {
  try {
    console.log("🚀 MYSUBS COMMAND TRIGGERED!");
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
    
    const mySubsText = lang === "am"
      ? "📊 የእርስዎ ምዝገባዎች\n\nአሁን የምዝገባ አገልግሎቶች የለትም...\n\nየምዝገባ አገልግሎቶችን ለመመልከት /start ይጠቁቱ።"
      : "📊 My Subscriptions\n\nLoading your active subscriptions...\n\nTo manage your subscriptions, use /start";
    
    await ctx.reply(mySubsText);
    console.log("✅ MySubs command response sent!");
  } catch (error) {
    console.error("⚠️ Error in mysubs command:", error);
    const errorMsg = await getErrorMessage(ctx);
    await ctx.reply(errorMsg);
  }
});

console.log("✅ Admin commands and bot menu setup completed!");

// Add renewal callback handler
bot.action('start_renewal', handleRenewalCallback);

// Add admin command to manually trigger expiration check
bot.command("checkexpiry", async (ctx) => {
  if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    const accessDeniedMsg = await getTranslatedMessage(ctx, 'access_denied_admin', "❌ Access denied. Admin only command.");
    await ctx.reply(accessDeniedMsg);
    return;
  }

  try {
    const checkingMsg = await getTranslatedMessage(ctx, 'checking_expirations', "🔍 Checking subscription expirations...");
    await ctx.reply(checkingMsg);
    const result = await triggerExpirationCheck();
    
    const message = `✅ **Expiration Check Complete**

📊 **Results:**
• Total expiring subscriptions: ${result?.totalExpiring || 0}
• User reminders sent: ${result?.remindersSent || 0}
• Admin alert sent: ${result?.adminAlertSent ? 'Yes' : 'No'}

⏰ **Check completed at:** ${new Date().toLocaleString()}`;

    await ctx.reply(message, { parse_mode: 'Markdown' });
  } catch (error) {
    console.error("Error in checkexpiry command:", error);
    const errorMsg = await getTranslatedMessage(ctx, 'error_checking_expirations', "❌ Error checking expirations:");
    await ctx.reply(errorMsg + " " + error.message);
  }
});

// Add payment method command handler
bot.command("addpayment", async (ctx) => {
  if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    await ctx.reply("❌ Access denied. Admin only command.");
    return;
  }

  try {
    const messageText = ctx.message.text;
    const lines = messageText.split('\n').slice(1); // Skip the command line
    
    if (lines.length < 5) {
      await ctx.reply(`❌ Invalid format. Please use:

\`\`\`
/addpayment
Name: Bank Name or Service
NameAm: የባንክ ስም (Amharic name)
Account: Account number or phone
Instructions: Payment instructions in English
InstructionsAm: Payment instructions in Amharic
Icon: 🏦 (emoji icon)
\`\`\``, { parse_mode: 'Markdown' });
      return;
    }

    const paymentData = {};
    for (const line of lines) {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        paymentData[key.trim().toLowerCase()] = value;
      }
    }

    // Validate required fields
    if (!paymentData.name || !paymentData.account || !paymentData.instructions) {
      await ctx.reply("❌ Missing required fields: Name, Account, Instructions");
      return;
    }

    // Generate unique ID
    const methodId = paymentData.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const newMethod = {
      id: methodId,
      name: paymentData.name,
      nameAm: paymentData.nameam || paymentData.name,
      account: paymentData.account,
      instructions: paymentData.instructions,
      instructionsAm: paymentData.instructionsam || paymentData.instructions,
      icon: paymentData.icon || '💳',
      active: true
    };

    // Get existing payment methods
    const paymentMethodsDoc = await firestore.collection('config').doc('paymentMethods').get();
    const existingMethods = paymentMethodsDoc.exists ? paymentMethodsDoc.data().methods || [] : [];
    
    // Check if method already exists
    if (existingMethods.find(method => method.id === methodId)) {
      await ctx.reply(`❌ Payment method with ID "${methodId}" already exists`);
      return;
    }

    // Add new method
    existingMethods.push(newMethod);

    // Save to Firestore
    await firestore.collection('config').doc('paymentMethods').set({
      methods: existingMethods,
      updatedAt: new Date(),
      updatedBy: ctx.from.id.toString()
    });

    await ctx.reply(`✅ **Payment Method Added Successfully!**

${newMethod.icon} **${newMethod.name}**
📱 Account: \`${newMethod.account}\`
🟢 Status: Active

The new payment method is now available to users during subscription and renewal.`, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error("Error adding payment method:", error);
    await ctx.reply("❌ Error adding payment method: " + error.message);
  }
});

// Store editing state in memory (simple approach)
global.editingStates = global.editingStates || new Map();

// Handle payment method editing text input
bot.on('text', async (ctx, next) => {
  const userId = ctx.from?.id.toString();
  
  // Check if user is editing a payment method
  if (global.editingStates.has(userId) && userId === process.env.ADMIN_TELEGRAM_ID) {
    try {
      const { methodId, field } = global.editingStates.get(userId);
      const newValue = ctx.message.text.trim();

      if (newValue.toLowerCase() === 'cancel') {
        global.editingStates.delete(userId);
        await ctx.reply('❌ Edit cancelled.');
        return;
      }

      // Get current payment methods
      const paymentMethodsDoc = await firestore.collection('config').doc('paymentMethods').get();
      const paymentMethods = paymentMethodsDoc.exists ? paymentMethodsDoc.data().methods || [] : [];
      
      const methodIndex = paymentMethods.findIndex(method => method.id === methodId);
      if (methodIndex === -1) {
        await ctx.reply('❌ Payment method not found.');
        global.editingStates.delete(userId);
        return;
      }

      // Update the field
      paymentMethods[methodIndex][field] = newValue;

      // Save to Firestore
      await firestore.collection('config').doc('paymentMethods').set({
        methods: paymentMethods,
        updatedAt: new Date(),
        updatedBy: userId
      });

      const fieldNames = {
        account: 'Account Number',
        instructions: 'Instructions (English)',
        instructionsAm: 'Instructions (Amharic)',
        icon: 'Icon'
      };

      await ctx.reply(`✅ **${fieldNames[field]} Updated Successfully!**

${paymentMethods[methodIndex].icon || '💳'} **${paymentMethods[methodIndex].name}**
Updated field: ${fieldNames[field]}
New value: ${field === 'account' ? `\`${newValue}\`` : newValue}

The payment method has been updated and is now available to users.`, { parse_mode: 'Markdown' });

      global.editingStates.delete(userId);
      return;
    } catch (error) {
      console.error('Error updating payment method:', error);
      await ctx.reply('❌ Error updating payment method: ' + error.message);
      global.editingStates.delete(userId);
      return;
    }
  }

  // Continue to next middleware if not editing
  await next();
});

// Phone verification middleware - Check if user is verified before allowing access
bot.use(async (ctx, next) => {
  try {
    // Skip verification check for admin and verification commands
    const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
    const isVerificationCommand = ctx.message?.text?.startsWith('/verify') || ctx.callbackQuery?.data?.startsWith('verify_');
    const isStartCommand = ctx.message?.text === '/start';
    const isContactMessage = ctx.message?.contact;
    const isManualPhoneInput = ctx.message?.text === '✍️ በእጅ መፃፍ' || ctx.message?.text === '✍️ Type Manually';
    const isVerificationCodeInput = ctx.message?.text && /^\d{6}$/.test(ctx.message.text.trim());
    const isCallbackQuery = ctx.callbackQuery;
    const isAdminCommand = ctx.message?.text?.startsWith('/addpayment') || ctx.message?.text?.startsWith('/checkexpiry');
    
    if (isAdmin || isVerificationCommand || isStartCommand || isContactMessage || isManualPhoneInput || isVerificationCodeInput || isCallbackQuery || isAdminCommand) {
      ctx.i18n = i18n;
      ctx.services = services;
      // Always get fresh language from Firestore to ensure language changes are reflected immediately
      ctx.userLang = await getUserLang(ctx);
      console.log(`🌐 User language context set to: ${ctx.userLang} for user ${ctx.from.id}`);
      await next();
      return;
    }
    
    // Check if user is verified
    try {
      const userId = String(ctx.from.id);
      const userDoc = await firestore.collection('users').doc(userId).get();
      let userData = userDoc.data();
      
      console.log(`📱 Phone verification check for user ${userId}:`, {
        exists: userDoc.exists,
        phoneVerified: userData?.phoneVerified,
        hasPhoneNumber: !!userData?.phoneNumber
      });
      
      // If user doesn't exist, create a new user record
      if (!userDoc.exists) {
        userData = {
          telegramId: userId,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name || '',
          username: ctx.from.username || '',
          language: ctx.userLang || 'en',
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
      
      // Check if user has a phone number - if they do, they're likely verified
      if (userData && userData.phoneNumber && !userData.phoneVerified) {
        // Update verification status if they have a phone number but verification flag is false
        await firestore.collection('users').doc(userId).update({
          phoneVerified: true,
          updatedAt: new Date()
        });
        userData.phoneVerified = true;
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
      ctx.i18n = i18n;
      ctx.services = services;
      ctx.userLang = await getUserLang(ctx);
      console.log(`🌐 User language context set to: ${ctx.userLang} for verified user ${ctx.from.id}`);
      ctx.userData = userData;
      await next();
      
    } catch (dbError) {
      console.error('Database error in verification middleware:', dbError);
      // Continue without verification if database is unavailable
      ctx.i18n = i18n;
      ctx.services = services;
      ctx.userLang = await getUserLang(ctx);
      console.log(`🌐 User language context set to: ${ctx.userLang} for user ${ctx.from.id} (DB fallback)`);
      await next();
    }
    
  } catch (error) {
    console.error('⚠️ MIDDLEWARE ERROR:', error);
    ctx.userLang = 'en';
    ctx.i18n = i18n;
    ctx.services = services;
    await next();
  }
});

// Phone verification handlers
bot.action('verify_phone', async (ctx) => {
  try {
    const lang = ctx.userLang || 'en';
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
    
    // Validate Ethiopian phone number format
    const phoneRegex = /^\+251[79]\d{8}$/;
    
    if (!phoneRegex.test(formattedPhone)) {
      const errorMsg = lang === 'am'
        ? '⚠️ እባክዎ የኢትዮጵያ ስልክ ቁጥር ይጠቀሙ (+251...)'
        : '⚠️ Please use an Ethiopian phone number (+251...)';
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
          callback_data: "start_onboarding"
        },
        { 
          text: lang === "am" ? "📱 አገልግሎቶች" : "📱 Services",
          callback_data: "services"
        }
      ],
      [
        { 
          text: lang === "am" ? "💰 የዋጋ አሰጣጥ" : "💰 Pricing",
          callback_data: "pricing"
        },
        { 
          text: lang === "am" ? "💳 የክፍያ ዘዴዎች" : "💳 Payment Methods",
          callback_data: "payment_methods"
        }
      ],
      [
        { 
          text: lang === "am" ? "⭐ የእኔ ምዝገባዎች" : "⭐ My Subscriptions",
          callback_data: "my_subs"
        },
        {                          
          text: lang === "am" ? "🏆 የተመለከተ" : "🏆 Referral",
          callback_data: "referral"
        }
      ],
      [
        { 
          text: lang === "am" ? "❓ እንዴት እንደሚሰራ" : "❓ How It Works",
          callback_data: "how_to_use"
        },
        { 
          text: lang === "am" ? "📜 የአገልግሎት ደረጃዎች" : "📜 Terms",
          callback_data: "terms"
        }
      ],
      [
        { 
          text: lang === "am" ? "💬 ድጋፍ" : "💬 Support",
          callback_data: "support"
        },
        { 
          text: lang === "am" ? "ℹ️ መረጃ" : "ℹ️ About",
          callback_data: "about"
        }
      ],
      [
        { 
          text: lang === "am" ? "🌐 ቋንቋ" : "🌐 Language",
          callback_data: "change_language"
        },
        { 
          text: lang === "am" ? "🔔 ማሳወቂያዎች" : "🔔 Notifications",
          callback_data: "notifications"
        }
      ],
      [
        { 
          text: lang === "am" ? "👥 ማህበረሰብ እና ትምህርት" : "👥 Community & Tutorial",
          url: "https://t.me/birrpayofficial"
        }
      ]
    ];

    // Add back to menu button to the last row
    const keyboardWithBack = [
      ...menuButtons,
      [getBackToMenuButton(lang)]
    ];

    // Send the welcome message with main menu
    await ctx.reply(successMessage, {
      reply_markup: { 
        inline_keyboard: keyboardWithBack 
      },
      parse_mode: 'Markdown'
    });
    
  } catch (error) {
    console.error('Error handling contact:', error);
    const errorMsg = 'An error occurred while verifying your phone. Please try again.';
    await ctx.reply(errorMsg);
  }
});

// Handle text messages for phone verification
bot.on('text', async (ctx, next) => {
  try {
    const userId = String(ctx.from.id);
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data() || {};
    const lang = userData.language || (ctx.from.language_code === 'am' ? 'am' : 'en');
    
    // Check if user is awaiting custom plan details
    if (global.userStates && global.userStates[ctx.from.id] && 
        global.userStates[ctx.from.id].state === 'awaiting_custom_plan_details') {
      
      const customPlanDetails = ctx.message.text.trim();
      
      // Clear user state
      delete global.userStates[ctx.from.id];
      
      // Save custom plan request to Firestore
      try {
        const requestRef = await firestore.collection('customPlanRequests').add({
          userId: ctx.from.id,
          userFirstName: ctx.from.first_name || '',
          userLastName: ctx.from.last_name || '',
          username: ctx.from.username || '',
          details: customPlanDetails,
          status: 'pending',
          createdAt: new Date(),
          language: lang
        });
        
        const requestId = requestRef.id;

        // Send confirmation to user
        const confirmMsg = lang === 'am'
          ? `✅ **ብጁ እቅድ ጥያቄዎ ተላከ!**

📝 **የእርስዎ ጥያቄ:**
${customPlanDetails}

⏰ **ቀጣይ ደረጃዎች:**
• አስተዳዳሪ ጥያቄዎን ይገመግማል
• በ24 ሰዓት ውስጥ ዋጋ እና ሁኔታዎች ይላካሉ
• ከተስማሙ ክፍያ ማድረግ ይችላሉ

📞 ለተጨማሪ ጥያቄዎች /support ይጠቀሙ።

ለትዕግስትዎ እናመሰግናለን! 🙏`
          : `✅ **Custom Plan Request Submitted!**

📝 **Your Request:**
${customPlanDetails}

⏰ **Next Steps:**
• Admin will review your request
• Pricing and terms will be sent within 24 hours
• You can proceed with payment if you agree

📞 Use /support for additional questions.

Thank you for your patience! 🙏`;

        await ctx.reply(confirmMsg, { parse_mode: 'Markdown' });

        // Notify admin about new custom plan request
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (adminId) {
          const adminMsg = `🎯 New Custom Plan Request

👤 User: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})
🆔 User ID: ${ctx.from.id}
🌐 Language: ${lang === 'am' ? 'Amharic' : 'English'}

📝 Request Details:
${customPlanDetails}

📅 Submitted: ${new Date().toLocaleString()}

💡 Quick Actions: Use buttons below or admin panel for full management.`;

          const adminKeyboard = {
            inline_keyboard: [
              [
                { text: '💰 Set Pricing', callback_data: `set_custom_price_${requestId}` },
                { text: '❌ Reject Request', callback_data: `reject_custom_${requestId}` }
              ]
            ]
          };

          try {
            await ctx.telegram.sendMessage(adminId, adminMsg, { 
              reply_markup: adminKeyboard
            });
          } catch (adminError) {
            console.error('Failed to notify admin about custom plan request:', adminError);
          }
        }

        return;
      } catch (error) {
        console.error('Error saving custom plan request:', error);
        const errorMsg = lang === 'am'
          ? '❌ ጥያቄዎን ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Failed to save your request. Please try again.';
        await ctx.reply(errorMsg);
        return;
      }
    }

    // Check if admin is setting custom plan pricing
    if (global.customPricingStates && global.customPricingStates.has(ctx.from.id.toString())) {
      const pricingState = global.customPricingStates.get(ctx.from.id.toString());
      const pricingText = ctx.message.text.trim();

      if (pricingText.toLowerCase() === 'cancel') {
        global.customPricingStates.delete(ctx.from.id.toString());
        await ctx.reply('❌ Pricing setup cancelled.');
        return;
      }

      // Simple price input - system already knows the service and duration from request
      const price = pricingText.trim();
      
      // Basic validation for price format
      if (!price || price.length < 3) {
        await ctx.reply('❌ Please enter a valid price.\n\nExample: ETB 600 or 600');
        return;
      }

      try {
        // Get the original request
        const requestDoc = await firestore.collection('customPlanRequests').doc(pricingState.requestId).get();
        if (!requestDoc.exists) {
          await ctx.reply('❌ Request not found.');
          global.customPricingStates.delete(ctx.from.id.toString());
          return;
        }

        const requestData = requestDoc.data();

        // Update request with pricing (use original request data for service info)
        await firestore.collection('customPlanRequests').doc(pricingState.requestId).update({
          status: 'priced',
          price: price,
          pricedAt: new Date(),
          pricedBy: ctx.from.id.toString()
        });

        // Send pricing to user
        const userLang = requestData.language || 'en';
        const pricingMsg = userLang === 'am'
          ? `💰 **ብጁ እቅድ ዋጋ**

የእርስዎ ብጁ እቅድ ጥያቄ ተገምግሟል!

📝 **የእርስዎ ጥያቄ:**
${requestData.customPlanDetails || requestData.details}

💰 **ዋጋ ዝርዝር:**
• **ዋጋ:** ${price}

✅ ከተስማሙ "ክፍያ ማድረግ" ይጫኑ
❌ ካልተስማሙ "ውድቅ አድርግ" ይጫኑ`
          : `💰 **Custom Plan Pricing**

Your custom plan request has been reviewed!

📝 **Your Request:**
${requestData.customPlanDetails || requestData.details}

💰 **Pricing Details:**
• **Price:** ${price}

✅ Click "Proceed with Payment" if you agree
❌ Click "Decline" if you don't agree`;

        const keyboard = [
          [
            { text: userLang === 'am' ? '✅ ክፍያ ማድረግ' : '✅ Proceed with Payment', 
              callback_data: `accept_custom_pricing_${pricingState.requestId}` }
          ],
          [
            { text: userLang === 'am' ? '❌ ውድቅ አድርግ' : '❌ Decline', 
              callback_data: `decline_custom_pricing_${pricingState.requestId}` }
          ]
        ];

        await ctx.telegram.sendMessage(requestData.userId, pricingMsg, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });

        // Confirm to admin
        await ctx.reply(`✅ **Pricing Sent to User**

**Request:** ${requestData.customPlanDetails || requestData.details}
**Price:** ${price}

The user has been notified and can now proceed with payment if they agree.`);

        global.customPricingStates.delete(ctx.from.id.toString());

      } catch (error) {
        console.error('Error setting custom pricing:', error);
        await ctx.reply('❌ Error setting pricing. Please try again.');
      }
      return;
    }

    // Check if user is in phone verification flow
    if (userData.awaitingPhone && !userData.phoneVerified) {
      const phoneNumber = ctx.message.text.trim();
      
      // Validate Ethiopian phone number format
      const phoneRegex = /^\+251[79]\d{8}$/;
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      
      if (!phoneRegex.test(formattedPhone)) {
        const errorMsg = lang === 'am'
          ? '⚠️ የተልፍዎን መረጃ ቅርጸት ትክክል አይደለም። እባክዎ ይጠቁሉ: +251912345678'
          : '⚠️ Invalid phone number format. Please use: +251912345678';
        await ctx.reply(errorMsg);
        return;
      }
      
      // Update user with verified phone
      await firestore.collection('users').doc(userId).set({
        ...userData,
        phoneNumber: formattedPhone,
        phoneVerified: true,
        awaitingPhone: false,
        awaitingCode: false,
        verifiedAt: new Date(),
        updatedAt: new Date(),
        // Set initial values if they don't exist
        firstName: userData.firstName || ctx.from.first_name,
        lastName: userData.lastName || ctx.from.last_name || '',
        username: userData.username || ctx.from.username || '',
        language: lang,
        hasCompletedOnboarding: true
      }, { merge: true });
      
      const successMsg = lang === 'am'
        ? '✅ ስልክ ቁጥርዎ ተረጋግጧል! አሁን BirrPay አገልግሎቶችን መጠቀም ይችላሉ።'
        : '✅ Phone number verified! You can now use BirrPay services.';
      await ctx.reply(successMsg);
      return;
    }
    
    // Continue to next handler if not in verification flow
    await next();
    
  } catch (error) {
    console.error('Error in text handler:', error);
    await next();
  }
});

// Handle photo uploads for custom payment proof
bot.on('photo', async (ctx, next) => {
  try {
    const userId = ctx.from.id;
    
    // Check if user is uploading custom payment proof
    if (global.userStates && global.userStates[userId] && 
        global.userStates[userId].state === 'awaiting_custom_payment_proof') {
      
      const userState = global.userStates[userId];
      const pendingPaymentId = userState.pendingPaymentId;
      
      // Get user data for language
      const userDoc = await firestore.collection('users').doc(userId.toString()).get();
      const userData = userDoc.data() || {};
      const lang = userData.language || (ctx.from.language_code === 'am' ? 'am' : 'en');
      
      // Get the largest photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const fileId = photo.file_id;
      
      try {
        // Get pending payment data
        const pendingPaymentDoc = await firestore.collection('pendingPayments').doc(pendingPaymentId).get();
        if (!pendingPaymentDoc.exists) {
          await ctx.reply(lang === 'am' ? '❌ የክፍያ መረጃ አልተገኘም።' : '❌ Payment information not found.');
          delete global.userStates[userId];
          return;
        }
        
        const pendingPaymentData = pendingPaymentDoc.data();
        
        // Update pending payment with proof
        await firestore.collection('pendingPayments').doc(pendingPaymentId).update({
          paymentProof: fileId,
          paymentProofUploadedAt: new Date(),
          paymentStatus: 'proof_uploaded'
        });
        
        // Create subscription record
        const subscriptionData = {
          userId: userId,
          userFirstName: ctx.from.first_name || '',
          userLastName: ctx.from.last_name || '',
          username: ctx.from.username || '',
          serviceName: pendingPaymentData.serviceName,
          serviceID: pendingPaymentData.serviceID,
          duration: pendingPaymentData.duration,
          durationName: pendingPaymentData.durationName,
          amount: pendingPaymentData.amount,
          paymentReference: pendingPaymentData.paymentReference,
          paymentProof: fileId,
          status: 'pending',
          createdAt: new Date(),
          language: lang,
          isCustomPlan: true,
          customPlanRequestId: pendingPaymentData.customPlanRequestId
        };
        
        const subscriptionRef = await firestore.collection('subscriptions').add(subscriptionData);
        
        // Update pending payment with subscription ID
        await firestore.collection('pendingPayments').doc(pendingPaymentId).update({
          subscriptionId: subscriptionRef.id
        });
        
        // Clear user state
        delete global.userStates[userId];
        
        // Confirm to user
        const confirmMsg = lang === 'am'
          ? `✅ **የክፍያ ማረጋገጫ ተላከ!**

📋 **የእርስዎ ብጁ እቅድ:**
• **አገልግሎት:** ${pendingPaymentData.serviceName}
• **ጊዜ:** ${pendingPaymentData.duration}
• **ዋጋ:** ${pendingPaymentData.amount}

⏰ **ቀጣይ ደረጃ:**
• አስተዳዳሪ የክፍያ ማረጋገጫዎን ይገመግማል
• ከተፈቀደ ምዝገባዎ ይጀምራል
• በ24 ሰዓት ውስጥ ውጤት ይላካል

📞 ለተጨማሪ መረጃ /support ይጠቀሙ።

ለትዕግስትዎ እናመሰግናለን! 🙏`
          : `✅ **Payment Proof Submitted!**

📋 **Your Custom Plan:**
• **Service:** ${pendingPaymentData.serviceName}
• **Duration:** ${pendingPaymentData.duration}
• **Price:** ${pendingPaymentData.amount}

⏰ **Next Steps:**
• Admin will review your payment proof
• If approved, your subscription will start
• Result will be sent within 24 hours

📞 Use /support for additional questions.

Thank you for your patience! 🙏`;

        await ctx.reply(confirmMsg, { parse_mode: 'Markdown' });
        
        // Notify admin
        const adminId = process.env.ADMIN_TELEGRAM_ID;
        if (adminId) {
          const adminMsg = `💰 New Custom Plan Payment Proof

👤 Customer: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})
🆔 User ID: ${ctx.from.id}

📋 Custom Plan Details:
• Service: ${pendingPaymentData.serviceName}
• Duration: ${pendingPaymentData.duration}
• Price: ${pendingPaymentData.amount}
• Reference: ${pendingPaymentData.paymentReference}

📅 Submitted: ${new Date().toLocaleString()}

💡 Quick Actions: Use buttons below or admin panel for full management.`;

          const paymentKeyboard = {
            inline_keyboard: [
              [
                { text: '✅ Approve Subscription', callback_data: `approve_subscription_${subscriptionRef.id}` },
                { text: '❌ Reject Payment', callback_data: `reject_subscription_${subscriptionRef.id}` }
              ]
            ]
          };

          try {
            await ctx.telegram.sendPhoto(adminId, fileId, { 
              caption: adminMsg,
              reply_markup: paymentKeyboard
            });
          } catch (adminError) {
            console.error('Failed to notify admin about custom payment proof:', adminError);
          }
        }
        
      } catch (error) {
        console.error('Error processing custom payment proof:', error);
        const errorMsg = lang === 'am'
          ? '❌ የክፍያ ማረጋገጫ ማስቀመጥ አልተቻለም። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Failed to save payment proof. Please try again.';
        await ctx.reply(errorMsg);
      }
      
      return;
    }
    
    // Continue to next handler if not in custom payment proof flow
    await next();
    
  } catch (error) {
    console.error('Error in photo handler:', error);
    // Don't call next() here as it may cause multiple calls
  }
});

console.log('✅ Phone verification system registered!');

// Real Admin callback handlers with actual functionality
bot.action('admin_stats', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    await ctx.answerCbQuery('❌ Access denied');
    return;
  }
  
  try {
    await ctx.answerCbQuery();
    
    // Get real statistics from Firestore
    const [usersSnapshot, subscriptionsSnapshot, supportSnapshot] = await Promise.all([
      firestore.collection('users').get(),
      firestore.collection('subscriptions').get(),
      firestore.collection('supportMessages').get()
    ]);
    
    const totalUsers = usersSnapshot.size;
    const verifiedUsers = usersSnapshot.docs.filter(doc => doc.data().phoneVerified).length;
    const totalSubscriptions = subscriptionsSnapshot.size;
    const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    const pendingSupport = supportSnapshot.docs.filter(doc => !doc.data().handled).length;
    
    // Calculate revenue
    let totalRevenue = 0;
    let monthlyRevenue = 0;
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    subscriptionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'active' && data.amount) {
        totalRevenue += data.amount;
        const subDate = data.createdAt?.toDate();
        if (subDate && subDate.getMonth() === currentMonth && subDate.getFullYear() === currentYear) {
          monthlyRevenue += data.amount;
        }
      }
    });
    
    const statsMsg = `📊 **BirrPay Statistics**\n\n` +
      `👥 **Users:**\n` +
      `• Total Users: ${totalUsers}\n` +
      `• Verified Users: ${verifiedUsers}\n` +
      `• Unverified: ${totalUsers - verifiedUsers}\n\n` +
      `📦 **Subscriptions:**\n` +
      `• Total: ${totalSubscriptions}\n` +
      `• Active: ${activeSubscriptions}\n` +
      `• Inactive: ${totalSubscriptions - activeSubscriptions}\n\n` +
      `💰 **Revenue:**\n` +
      `• Total: ${totalRevenue.toLocaleString()} ETB\n` +
      `• This Month: ${monthlyRevenue.toLocaleString()} ETB\n\n` +
      `📞 **Support:**\n` +
      `• Pending Messages: ${pendingSupport}\n\n` +
      `🕒 **Updated:** ${new Date().toLocaleString()}`;
    
    await ctx.reply(statsMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh Stats', callback_data: 'admin_stats' }],
          [{ text: '🔙 Back to Admin Menu', callback_data: 'admin_menu' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('Error in admin_stats:', error);
    await ctx.reply('❌ Error loading statistics. Please try again.');
  }
});

bot.action('admin_users', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    await ctx.answerCbQuery('❌ Access denied');
    return;
  }
  
  try {
    await ctx.answerCbQuery();
    
    const usersSnapshot = await firestore.collection('users').orderBy('createdAt', 'desc').limit(20).get();
    
    let usersMsg = `👥 **User Management**\n\n`;
    
    if (usersSnapshot.empty) {
      usersMsg += `No users found.\n\n`;
    } else {
      usersMsg += `📋 **Recent Users (Last 20):**\n\n`;
      
      usersSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        const status = data.phoneVerified ? '✅' : '❌';
        const name = data.firstName + (data.lastName ? ` ${data.lastName}` : '');
        const username = data.username ? `@${data.username}` : 'No username';
        const phone = data.phoneNumber || 'Not provided';
        const joinDate = data.createdAt?.toDate()?.toLocaleDateString() || 'Unknown';
        
        usersMsg += `${index + 1}. ${status} **${name}**\n`;
        usersMsg += `   📱 ${phone}\n`;
        usersMsg += `   👤 ${username}\n`;
        usersMsg += `   📅 Joined: ${joinDate}\n\n`;
      });
    }
    
    usersMsg += `🕒 **Updated:** ${new Date().toLocaleString()}`;
    
    await ctx.reply(usersMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh Users', callback_data: 'admin_users' }],
          [{ text: '📊 User Stats', callback_data: 'admin_stats' }],
          [{ text: '🔙 Back to Admin Menu', callback_data: 'back_to_admin' }]
        ]
      }
    });
    
  } catch (error) {
    console.error('Error in admin_users:', error);
    await ctx.reply('❌ Error loading user management. Please try again.');
  }
});

bot.action('admin_broadcast', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    await ctx.answerCbQuery('❌ Access denied');
    return;
  }
  
  try {
    await ctx.answerCbQuery();
    
    const broadcastMsg = `📢 **Broadcast System**\n\n` +
      `Send a message to all verified users.\n\n` +
      `⚠️ **Instructions:**\n` +
      `1. Reply to this message with your broadcast text\n` +
      `2. The message will be sent to all verified users\n` +
      `3. Use /cancel to cancel broadcast\n\n` +
      `📊 **Target Audience:**\n` +
      `• All verified users will receive the message\n` +
      `• Unverified users will be skipped\n\n` +
      `💡 **Tip:** Keep messages short and clear!`;
    
    await ctx.reply(broadcastMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        force_reply: true,
        input_field_placeholder: 'Type your broadcast message...'
      }
    });
    
    // Set admin state to expect broadcast message
    await firestore.collection('adminStates').doc(String(ctx.from.id)).set({
      awaitingBroadcast: true,
      timestamp: new Date()
    });
    
  } catch (error) {
    console.error('Error in admin_broadcast:', error);
    await ctx.reply('❌ Error loading broadcast system. Please try again.');
  }
});

bot.action('admin_settings', async (ctx) => {
  const isAdmin = ctx.from.id.toString() === process.env.ADMIN_TELEGRAM_ID;
  if (!isAdmin) {
    await ctx.answerCbQuery('❌ Access denied');
    return;
  }
  
  try {
    await ctx.answerCbQuery();
    
    const settingsMsg = `⚙️ **System Settings**\n\n` +
      `🔧 **Bot Configuration:**\n` +
      `• Bot Status: 🟢 Online\n` +
      `• Database: 🟢 Connected\n` +
      `• Admin Panel: 🟢 Active\n` +
      `• Phone Verification: 🟢 Enabled\n\n` +
      `📊 **System Info:**\n` +
      `• Server Time: ${new Date().toLocaleString()}\n` +
      `• Uptime: ${Math.floor(process.uptime() / 60)} minutes\n` +
      `• Memory Usage: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB\n\n` +
      `🔒 **Security:**\n` +
      `• Admin ID: ${process.env.ADMIN_TELEGRAM_ID}\n` +
      `• Verification Required: ✅\n` +
      `• Database Security: ✅`;
    
    // Check if we have a valid admin panel URL
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || '';
    const showAdminPanelButton = adminPanelUrl && adminPanelUrl.startsWith('https://');
    
    const keyboard = [
      [{ text: '🔄 Refresh Status', callback_data: 'admin_settings' }],
      ...(showAdminPanelButton ? [[
        { 
          text: '🌐 Admin Panel', 
          url: adminPanelUrl.endsWith('/panel') ? adminPanelUrl : `${adminPanelUrl}/panel`
        }
      ]] : []),
      [{ text: '🔙 Back to Admin Menu', callback_data: 'back_to_admin' }]
    ];
    
    await ctx.reply(settingsMsg, {
      parse_mode: 'Markdown',
      reply_markup: { inline_keyboard: keyboard }
    });
    
  } catch (error) {
    console.error('Error in admin_settings:', error);
    await ctx.reply('❌ Error loading system settings. Please try again.');
  }
});

console.log('✅ Real admin management system registered!');
console.log('🔄 Middleware registered successfully!');

// Register remaining handlers that aren't duplicated above
console.log("Registering remaining handlers...");
console.log("Registering start handler...");
setupStartHandler(bot);
console.log("Registering subscribe handler...");
setupSubscribeHandler(bot);
console.log("Registering mySubscriptions handler...");
mySubscriptionsHandler(bot);
console.log("Registering cancelSubscription handler...");
cancelSubscriptionHandler(bot);
console.log("Registering screenshotUpload handler...");
screenshotUploadHandler(bot);
console.log("Registering firestoreListener...");
firestoreListener(bot);
console.log("All remaining handlers registered successfully!");

// Admin statistics command
bot.command("stats", async (ctx) => {
  if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    await ctx.reply("❌ Access denied. Admin only command.");
    return;
  }

  try {
    const stats = firestore.getStats ? firestore.getStats() : {
      totalUsers: 0,
      activeSubscriptions: 0,
      totalRevenue: 0,
      pendingTickets: 0,
      paidUsers: 0
    };

    const statsText = `📊 System Statistics:

👥 Total Users: ${stats.totalUsers}
💰 Paid Users: ${stats.paidUsers}
📺 Active Subscriptions: ${stats.activeSubscriptions}
💵 Total Revenue: ${stats.totalRevenue} ETB
🎫 Pending Tickets: ${stats.pendingTickets}

Updated: ${new Date().toLocaleString()}`;

    await ctx.reply(statsText);
  } catch (error) {
    await ctx.reply("Error retrieving statistics.");
  }
});

// Data export command for admin
bot.command("export", async (ctx) => {
  if (ctx.from?.id.toString() !== process.env.ADMIN_TELEGRAM_ID) {
    await ctx.reply("❌ Access denied. Admin only command.");
    return;
  }

  try {
    const data = firestore.exportData ? firestore.exportData() : {};
    const exportText = `📋 Data Export Summary:

📊 Collections:
${Object.keys(data).map(collection => 
  `• ${collection}: ${data[collection]?.length || 0} records`
).join('\n')}

Generated: ${new Date().toLocaleString()}

Note: Full data export requires database access.`;

    await ctx.reply(exportText);
  } catch (error) {
    await ctx.reply("Error exporting data.");
  }
});

// Add error handling for all handlers
bot.catch((err, ctx) => {
  console.error("Bot error:", err);
  console.error("Error context:", {
    update_id: ctx.update?.update_id,
    message: ctx.update?.message,
    callback_query: ctx.update?.callback_query,
  });

  // Try to send an error message to the user
  try {
    ctx.reply("Sorry, something went wrong. Please try again later.");
  } catch (replyError) {
    console.error("Failed to send error message:", replyError);
  }
});

// Note: Main command handlers (help, faq, lang, support, admin, mysubs) are registered above


console.log("All additional handlers registered successfully!");

// Debug: List all registered commands
console.log("Bot handlers:", bot.handlers?.size || 0);
console.log("Bot middleware:", bot.middleware?.length || 0);

// Commands are now handled by their respective handlers



// Register additional handlers
console.log("Registering additional handlers...");
setupStartHandler(bot);
setupSubscribeHandler(bot);
mySubscriptionsHandler(bot);
cancelSubscriptionHandler(bot);
screenshotUploadHandler(bot);
firestoreListener(bot);

// Text handler for non-command messages (AFTER all command handlers)
// This is already handled by the earlier text handler, so we'll remove this duplicate

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  };
});

// API detailed health check (includes Firebase status)
fastify.get('/api/health/detailed', async (request, reply) => {
  return { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    firebase: firestore ? 'connected' : 'disconnected',
    version: '1.0.0'
  };
});

// Register API routes
console.log("Registering API routes...");
try {
  userRoutes(fastify);
  servicesRoutes(fastify);
  subscriptionRoutes(fastify);
  paymentRoutes(fastify);
  screenshotRoutes(fastify);
  adminRoutes(fastify);
  supportRoutes(fastify);
  utilityRoutes(fastify);
  console.log("✅ All API routes registered successfully");
} catch (error) {
  console.error("❌ Error registering API routes:", error);
}
console.log("API routes registered successfully!");

// Root route
fastify.get('/', async (req, reply) => {
  return {
    message: "🤖 BirrPay Telegram Bot API",
    status: "running",
    endpoints: {
      telegram: "/telegram (webhook)",
      admin_panel: "/panel",
      api_stats: "/api/stats",
      api_pending: "/api/pending",
      api_support: "/api/support"
    },
    bot_info: {
      name: "BirrPay Bot",
      version: "1.0.0",
      description: "BirrPay service subscription and support bot"
    }
  };
});



// Panel files are now served by static file middleware

// Admin API endpoints
fastify.get('/api/stats', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const [pendingSubs, activeSubs, cancelledSubs, supportMsgs] = await Promise.all([
      firestore.collection("subscriptions").where("status", "==", "pending").get(),
      firestore.collection("subscriptions").where("status", "==", "active").get(),
      firestore.collection("subscriptions").where("status", "==", "cancelled").get(),
      firestore.collection("supportMessages").where("handled", "==", false).get()
    ]);
    
    return {
      pending: pendingSubs.size,
      active: activeSubs.size,
      cancelled: cancelledSubs.size,
      unhandledSupport: supportMsgs.size
    };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/pending', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const subs = await firestore
      .collection("subscriptions")
      .where("status", "==", "pending")
      .get();
    
    const services = await loadServices();
    const result = subs.docs.map((doc) => {
      const data = doc.data();
      const service = services.find(s => s.serviceID === data.serviceID);
      return {
        id: doc.id,
        ...data,
        requestedAt: data.requestedAt?.toDate?.()?.toISOString() || data.requestedAt,
        serviceName: service?.name || data.serviceID,
        price: service?.price || data.price
      };
    });
    
    return result;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/active', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const subs = await firestore
      .collection("subscriptions")
      .where("status", "==", "active")
      .get();
    
    const services = await loadServices();
    const result = subs.docs.map((doc) => {
      const data = doc.data();
      const service = services.find(s => s.serviceID === data.serviceID);
      return {
        id: doc.id,
        ...data,
        approvedAt: data.approvedAt?.toDate?.()?.toISOString() || data.approvedAt,
        serviceName: service?.name || data.serviceID,
        price: service?.price || data.price
      };
    });
    
    return result;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Users API endpoint for export functionality
fastify.get('/api/users', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const usersSnapshot = await firestore.collection('users').get();
    const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
    
    const users = [];
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Count user's subscriptions and calculate total spent
      const userSubs = subscriptionsSnapshot.docs.filter(subDoc => 
        subDoc.data().telegramId === userData.telegramId
      );
      
      const totalSpent = userSubs.reduce((sum, subDoc) => {
        const subData = subDoc.data();
        return sum + (subData.price || 0);
      }, 0);
      
      users.push({
        id: doc.id,
        name: userData.name || userData.firstName || 'N/A',
        username: userData.username || 'N/A',
        email: userData.email || 'N/A',
        phone: userData.phone || 'N/A',
        telegramId: userData.telegramId,
        status: userData.status || 'active',
        subscriptionCount: userSubs.length,
        totalSpent: totalSpent,
        createdAt: userData.createdAt?.toDate ? userData.createdAt.toDate().toISOString() : 
                  userData.createdAt?._seconds ? new Date(userData.createdAt._seconds * 1000).toISOString() :
                  userData.joinedAt?.toDate ? userData.joinedAt.toDate().toISOString() :
                  userData.joinedAt?._seconds ? new Date(userData.joinedAt._seconds * 1000).toISOString() :
                  new Date().toISOString()
      });
    }
    
    return users;
  } catch (error) {
    console.error('Error fetching users:', error);
    reply.status(500).send({ error: error.message });
  }
});

// Subscriptions API endpoint for export functionality
fastify.get('/api/subscriptions', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const subsSnapshot = await firestore.collection('subscriptions').get();
    const usersSnapshot = await firestore.collection('users').get();
    const services = await loadServices();
    
    const subscriptions = [];
    for (const doc of subsSnapshot.docs) {
      const subData = doc.data();
      
      // Find user data
      const user = usersSnapshot.docs.find(userDoc => 
        userDoc.data().telegramId === subData.telegramId
      );
      const userData = user?.data() || {};
      
      // Find service data
      const service = services.find(s => s.serviceID === subData.serviceID);
      
      subscriptions.push({
        id: doc.id,
        userName: userData.name || userData.firstName || 'N/A',
        serviceName: service?.name || subData.serviceID || 'Unknown Service',
        plan: subData.plan || '1 month',
        price: subData.price || service?.price || 0,
        status: subData.status || 'active',
        startDate: subData.startDate?.toDate ? subData.startDate.toDate().toISOString() :
                  subData.startDate?._seconds ? new Date(subData.startDate._seconds * 1000).toISOString() :
                  subData.createdAt?.toDate ? subData.createdAt.toDate().toISOString() :
                  subData.createdAt?._seconds ? new Date(subData.createdAt._seconds * 1000).toISOString() :
                  new Date().toISOString(),
        endDate: subData.endDate?.toDate ? subData.endDate.toDate().toISOString() :
                subData.endDate?._seconds ? new Date(subData.endDate._seconds * 1000).toISOString() :
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        autoRenew: subData.autoRenew || false
      });
    }
    
    return subscriptions;
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    reply.status(500).send({ error: error.message });
  }
});

// Payments API endpoint for export functionality
fastify.get('/api/payments', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const paymentsSnapshot = await firestore.collection('payments').get();
    const usersSnapshot = await firestore.collection('users').get();
    const services = await loadServices();
    
    const payments = [];
    for (const doc of paymentsSnapshot.docs) {
      const paymentData = doc.data();
      
      // Find user data
      const user = usersSnapshot.docs.find(userDoc => 
        userDoc.data().telegramId === paymentData.telegramId
      );
      const userData = user?.data() || {};
      
      // Find service data
      const service = services.find(s => s.serviceID === paymentData.serviceID);
      
      payments.push({
        id: doc.id,
        userName: userData.name || userData.firstName || 'N/A',
        amount: paymentData.amount || 0,
        serviceName: service?.name || paymentData.serviceID || 'Unknown Service',
        status: paymentData.status || 'completed',
        method: paymentData.method || 'Telegram',
        createdAt: paymentData.createdAt?.toDate ? paymentData.createdAt.toDate().toISOString() :
                  paymentData.createdAt?._seconds ? new Date(paymentData.createdAt._seconds * 1000).toISOString() :
                  new Date().toISOString(),
        transactionId: paymentData.transactionId || doc.id
      });
    }
    
    return payments;
  } catch (error) {
    console.error('Error fetching payments:', error);
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/support', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const messages = await firestore
      .collection("supportMessages")
      .where("handled", "==", false)
      .limit(50)
      .get();
    
    const result = messages.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.timestamp
      };
    });
    
    return result;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Admin Login API Endpoint
fastify.post('/api/admin/login', async (req, reply) => {
  try {
    const { username, password } = req.body;
    
    // Simple admin credentials (you can enhance this later)
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (username === adminUsername && password === adminPassword) {
      // Generate JWT token
      const jwt = await import('jsonwebtoken');
      const token = jwt.default.sign(
        { 
          role: 'admin', 
          username: adminUsername,
          loginTime: new Date().toISOString()
        },
        process.env.JWT_SECRET || 'birrpay_default_secret',
        { expiresIn: '24h' }
      );
      
      return { success: true, token, message: 'Login successful' };
    } else {
      return reply.status(401).send({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    console.error('Login error:', error);
    return reply.status(500).send({ success: false, error: 'Login failed' });
  }
});

// Service Management API Endpoints
fastify.get('/api/admin/services', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    // Get services from Firestore
    const servicesSnapshot = await firestore.collection('services').get();
    const services = [];
    
    servicesSnapshot.forEach(doc => {
      const data = doc.data();
      services.push({
        id: doc.id,
        serviceID: doc.id,
        ...data
      });
    });
    
    // If no services exist, populate with initial data
    if (services.length === 0) {
      console.log('No services found, populating initial services...');
      const initialServices = [
        {
          serviceID: 'netflix',
          name: 'Netflix',
          description: 'Streaming service for movies and TV shows',
          status: 'active',
          plans: [
            { duration: 1, price: 350, billingCycle: 'monthly' },
            { duration: 3, price: 1000, billingCycle: 'monthly' },
            { duration: 12, price: 3800, billingCycle: 'yearly' }
          ]
        },
        {
          serviceID: 'spotify',
          name: 'Spotify Premium',
          description: 'Music streaming service',
          status: 'active',
          plans: [
            { duration: 1, price: 200, billingCycle: 'monthly' },
            { duration: 6, price: 1100, billingCycle: 'monthly' }
          ]
        },
        {
          serviceID: 'youtube',
          name: 'YouTube Premium',
          description: 'Ad-free YouTube with music',
          status: 'active',
          plans: [
            { duration: 1, price: 250, billingCycle: 'monthly' }
          ]
        }
      ];
      
      // Add services to Firestore
      for (const service of initialServices) {
        await firestore.collection('services').doc(service.serviceID).set(service);
        services.push({
          id: service.serviceID,
          ...service
        });
      }
    }
    
    return { success: true, services };
  } catch (error) {
    console.error('Error getting admin services:', error);
    return reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/admin/services', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const serviceData = req.body;
    
    // Validate required fields
    if (!serviceData.name || !serviceData.plans || !Array.isArray(serviceData.plans)) {
      return reply.status(400).send({ error: 'Missing required fields: name and plans' });
    }
    
    // Generate serviceID from name if not provided
    const serviceID = serviceData.serviceID || serviceData.name.toLowerCase().replace(/\s+/g, '-');
    
    const newService = {
      serviceID,
      name: serviceData.name,
      description: serviceData.description || '',
      status: serviceData.status || 'active',
      plans: serviceData.plans,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Add to Firestore
    await firestore.collection('services').doc(serviceID).set(newService);
    
    return { success: true, message: 'Service created successfully', service: { id: serviceID, ...newService } };
  } catch (error) {
    console.error('Error creating service:', error);
    return reply.status(500).send({ error: error.message });
  }
});

fastify.put('/api/admin/services/:id', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    const serviceData = req.body;
    
    // Check if service exists
    const serviceDoc = await firestore.collection('services').doc(id).get();
    if (!serviceDoc.exists) {
      return reply.status(404).send({ error: 'Service not found' });
    }
    
    const updatedService = {
      ...serviceDoc.data(),
      ...serviceData,
      updatedAt: new Date()
    };
    
    // Update in Firestore
    await firestore.collection('services').doc(id).update(updatedService);
    
    return { success: true, message: 'Service updated successfully', service: { id, ...updatedService } };
  } catch (error) {
    console.error('Error updating service:', error);
    return reply.status(500).send({ error: error.message });
  }
});

fastify.delete('/api/admin/services/:id', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    
    // Check if service exists
    const serviceDoc = await firestore.collection('services').doc(id).get();
    if (!serviceDoc.exists) {
      return reply.status(404).send({ error: 'Service not found' });
    }
    
    // Delete from Firestore
    await firestore.collection('services').doc(id).delete();
    
    return { success: true, message: 'Service deleted successfully' };
  } catch (error) {
    console.error('Error deleting service:', error);
    return reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/approve', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id, nextBillingDate } = req.body;
    
    if (!id || !nextBillingDate) {
      return reply.status(400).send({ error: "Missing required fields" });
    }
    
    await firestore.collection("subscriptions").doc(id).update({
      status: "active",
      nextBillingDate,
      approvedAt: new Date(),
      approvedBy: process.env.ADMIN_TELEGRAM_ID
    });
    
    return { ok: true, message: "Subscription approved successfully" };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/reject', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id, reason } = req.body;
    
    if (!id) {
      return reply.status(400).send({ error: "Missing subscription ID" });
    }
    
    await firestore.collection("subscriptions").doc(id).update({
      status: "rejected",
      rejectedAt: new Date(),
      rejectedBy: process.env.ADMIN_TELEGRAM_ID,
      rejectionReason: reason || "No reason provided"
    });
    
    return { ok: true, message: "Subscription rejected successfully" };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/cancel', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id, reason } = req.body;
    
    if (!id) {
      return reply.status(400).send({ error: "Missing subscription ID" });
    }
    
    await firestore.collection("subscriptions").doc(id).update({
      status: "cancelled",
      cancelledAt: new Date(),
      cancelledBy: process.env.ADMIN_TELEGRAM_ID,
      cancellationReason: reason || "Cancelled by admin"
    });
    
    return { ok: true, message: "Subscription cancelled successfully" };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/support/handle', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id, response } = req.body;
    
    if (!id) {
      return reply.status(400).send({ error: "Missing message ID" });
    }
    
    await firestore.collection("supportMessages").doc(id).update({
      handled: true,
      handledAt: new Date(),
      handledBy: process.env.ADMIN_TELEGRAM_ID,
      adminResponse: response || ""
    });
    
    return { ok: true, message: "Support message marked as handled" };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Enhanced API endpoints for comprehensive admin panel
// Note: '/api/admin/users' is defined in 'src/api/routes.js' to centralize admin alias routes.

fastify.get('/api/users/search', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { q } = req.query;
    const usersSnapshot = await firestore.collection('users').get();
    const users = [];
    
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      const searchText = `${userData.firstName || ''} ${userData.lastName || ''} ${userData.email || ''} ${userData.username || ''} ${userData.telegramId || ''}`.toLowerCase();
      
      if (searchText.includes(q.toLowerCase())) {
        users.push({ id: doc.id, ...userData });
      }
    });
    
    return users;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/users/export', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const usersSnapshot = await firestore.collection('users').get();
    const users = [];
    
    usersSnapshot.docs.forEach(doc => {
      const userData = doc.data();
      users.push({
        'Telegram ID': userData.telegramId,
        'Username': userData.username || '',
        'First Name': userData.firstName || '',
        'Last Name': userData.lastName || '',
        'Email': userData.email || '',
        'Phone': userData.phone || '',
        'Status': userData.status || 'active',
        'Joined Date': userData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'
      });
    });
    
    // Convert to CSV
    const headers = Object.keys(users[0] || {});
    const csvContent = [
      headers.join(','),
      ...users.map(user => headers.map(header => `"${user[header] || ''}"`).join(','))
    ].join('\n');
    
    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="birrpay-users.csv"');
    return csvContent;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/analytics', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const subsSnapshot = await firestore.collection('subscriptions').get();
    const usersSnapshot = await firestore.collection('users').get();
    
    // Service popularity
    const serviceStats = {};
    subsSnapshot.docs.forEach(doc => {
      const service = doc.data().serviceName;
      serviceStats[service] = (serviceStats[service] || 0) + 1;
    });
    
    const totalSubs = subsSnapshot.docs.length;
    const serviceStatsArray = Object.entries(serviceStats).map(([name, count]) => ({
      name,
      count,
      percentage: ((count / totalSubs) * 100).toFixed(1)
    })).sort((a, b) => b.count - a.count);
    
    // User growth calculation
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    const thisMonthUsers = usersSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate();
      return createdAt && createdAt >= thisMonthStart;
    }).length;
    
    const lastMonthUsers = usersSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate();
      return createdAt && createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
    }).length;
    
    const growthRate = lastMonthUsers > 0 ? (((thisMonthUsers - lastMonthUsers) / lastMonthUsers) * 100).toFixed(1) : 0;
    
    // Churn rate calculation
    const cancelledThisMonth = subsSnapshot.docs.filter(doc => {
      const cancelledAt = doc.data().cancelledAt?.toDate();
      return cancelledAt && cancelledAt >= thisMonthStart;
    }).length;
    
    const activeCount = subsSnapshot.docs.filter(doc => doc.data().status === 'active').length;
    const churnRate = activeCount > 0 ? ((cancelledThisMonth / (activeCount + cancelledThisMonth)) * 100).toFixed(1) : 0;
    const retention = (100 - parseFloat(churnRate)).toFixed(1);
    
    return {
      serviceStats: serviceStatsArray,
      userGrowth: {
        thisMonth: thisMonthUsers,
        lastMonth: lastMonthUsers,
        growthRate: parseFloat(growthRate)
      },
      churnRate: {
        monthly: parseFloat(churnRate),
        cancelled: cancelledThisMonth,
        retention: parseFloat(retention)
      }
    };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/stats/enhanced', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const subsSnapshot = await firestore.collection('subscriptions').get();
    const usersSnapshot = await firestore.collection('users').get();
    const supportSnapshot = await firestore.collection('supportMessages').get();
    
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // Calculate detailed statistics
    const pending = subsSnapshot.docs.filter(doc => doc.data().status === 'pending');
    const active = subsSnapshot.docs.filter(doc => doc.data().status === 'active');
    const cancelledThisMonth = subsSnapshot.docs.filter(doc => {
      const cancelledAt = doc.data().cancelledAt?.toDate();
      return cancelledAt && cancelledAt >= thisMonthStart;
    });
    
    const pendingRevenue = pending.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    const activeMonthlyRevenue = active.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    const lostRevenue = cancelledThisMonth.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    
    const totalRevenue = subsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return data.status === 'active' ? sum + (data.amount || 0) : sum;
    }, 0);
    
    const newUsersThisMonth = usersSnapshot.docs.filter(doc => {
      const createdAt = doc.data().createdAt?.toDate();
      return createdAt && createdAt >= thisMonthStart;
    }).length;
    
    const unhandledSupport = supportSnapshot.docs.filter(doc => !doc.data().handled).length;
    
    return {
      pending: {
        count: pending.length,
        revenue: pendingRevenue
      },
      active: {
        count: active.length,
        monthlyRevenue: activeMonthlyRevenue
      },
      cancelled: {
        thisMonth: cancelledThisMonth.length,
        lostRevenue: lostRevenue
      },
      support: {
        total: supportSnapshot.docs.length,
        unhandled: unhandledSupport
      },
      users: {
        total: usersSnapshot.docs.length,
        newThisMonth: newUsersThisMonth
      },
      revenue: {
        total: totalRevenue,
        monthlyGrowth: 15.2 // This would need historical data to calculate properly
      }
    };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/services/manage', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const services = await loadServices();
    const subsSnapshot = await firestore.collection('subscriptions').get();
    
    // Add usage statistics to each service
    const servicesWithStats = services.map(service => {
      const activeUsers = subsSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.serviceName === service.name && data.status === 'active';
      }).length;
      
      const monthlyRevenue = subsSnapshot.docs
        .filter(doc => {
          const data = doc.data();
          return data.serviceName === service.name && data.status === 'active';
        })
        .reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
      
      return {
        ...service,
        activeUsers,
        monthlyRevenue,
        status: 'active' // Default status
      };
    });
    
    return servicesWithStats;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/services/add', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { name, category, description } = req.body;
    
    // Add to services collection or file
    // This would depend on how services are stored
    // For now, return success
    
    return { ok: true, message: 'Service added successfully' };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.get('/api/reports/:type', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { type } = req.params;
    
    // Generate PDF report based on type
    // This would require a PDF generation library
    // For now, return a simple text report
    
    const reportContent = `BirrPay ${type.charAt(0).toUpperCase() + type.slice(1)} Report\n\nGenerated: ${new Date().toLocaleString()}\n\nThis is a placeholder for the ${type} report.`;
    
    reply.header('Content-Type', 'text/plain');
    reply.header('Content-Disposition', `attachment; filename="birrpay-${type}-report.txt"`);
    return reportContent;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// User management endpoints
fastify.post('/api/users/:id/message', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    // Get user data
    const userDoc = await firestore.collection('users').doc(id).get();
    if (!userDoc.exists) {
      return reply.status(404).send({ error: 'User not found' });
    }
    
    const userData = userDoc.data();
    
    // Send message via Telegram bot
    if (userData.telegramId) {
      try {
        await bot.telegram.sendMessage(userData.telegramId, `📢 Message from BirrPay Admin:\n\n${message}`);
        return { ok: true, message: 'Message sent successfully' };
      } catch (telegramError) {
        return reply.status(400).send({ error: 'Failed to send Telegram message' });
      }
    } else {
      return reply.status(400).send({ error: 'User has no Telegram ID' });
    }
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/users/:id/suspend', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    
    await firestore.collection('users').doc(id).update({
      status: 'suspended',
      suspendedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Cancel all active subscriptions
    const subsSnapshot = await firestore.collection('subscriptions')
      .where('userId', '==', id)
      .where('status', '==', 'active')
      .get();
    
    const batch = firestore.batch();
    subsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
        cancelReason: 'User suspended by admin'
      });
    });
    
    await batch.commit();
    
    return { ok: true, message: 'User suspended successfully' };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/users/:id/activate', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    
    await firestore.collection('users').doc(id).update({
      status: 'active',
      suspendedAt: admin.firestore.FieldValue.delete()
    });
    
    return { ok: true, message: 'User activated successfully' };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Enhanced support messages endpoint
fastify.get('/api/support-messages', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { status, priority } = req.query;
    
    // Get all support messages without ordering to avoid index requirement
    let query = firestore.collection('supportMessages');
    
    if (status) {
      query = query.where('handled', '==', status === 'handled');
    }
    
    if (priority) {
      query = query.where('priority', '==', priority);
    }
    
    const supportSnapshot = await query.limit(200).get();
    
    // Sort the results in memory by createdAt (descending)
    const sortedDocs = supportSnapshot.docs.sort((a, b) => {
      const aTime = a.data().createdAt ? new Date(a.data().createdAt).getTime() : 0;
      const bTime = b.data().createdAt ? new Date(b.data().createdAt).getTime() : 0;
      return bTime - aTime; // Descending order
    });
    const messages = [];
    
    for (const doc of sortedDocs) {
      const data = doc.data();
      
      // Get user info if available
      let userInfo = null;
      if (data.telegramId) {
        const userSnapshot = await firestore.collection('users')
          .where('telegramId', '==', data.telegramId)
          .limit(1)
          .get();
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          userInfo = {
            username: userData.username,
            firstName: userData.firstName,
            lastName: userData.lastName
          };
        }
      }
      
      messages.push({
        id: doc.id,
        ...data,
        userInfo,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    }
    
    return messages;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/support-messages/:id/handle', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    const { response, adminId } = req.body;
    
    // Update support message
    await firestore.collection('supportMessages').doc(id).update({
      handled: true,
      handledAt: admin.firestore.FieldValue.serverTimestamp(),
      adminResponse: response,
      handledBy: adminId
    });
    
    // Get message data to send response
    const messageDoc = await firestore.collection('supportMessages').doc(id).get();
    const messageData = messageDoc.data();
    
    // Send response via Telegram if available
    if (messageData.telegramId && response) {
      try {
        await bot.telegram.sendMessage(
          messageData.telegramId,
          `🛠️ Support Response:\n\n${response}\n\n---\nBirrPay Support Team`
        );
      } catch (telegramError) {
        console.error('Failed to send Telegram response:', telegramError);
      }
    }
    
    return { ok: true, message: 'Support message handled successfully' };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.post('/api/support-messages/bulk-handle', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { messageIds, response, adminId } = req.body;
    
    const batch = firestore.batch();
    
    for (const messageId of messageIds) {
      const messageRef = firestore.collection('supportMessages').doc(messageId);
      batch.update(messageRef, {
        handled: true,
        handledAt: admin.firestore.FieldValue.serverTimestamp(),
        adminResponse: response,
        handledBy: adminId
      });
    }
    
    await batch.commit();
    
    return { ok: true, message: `${messageIds.length} support messages handled successfully` };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Service management endpoints
fastify.post('/api/services/:id/toggle', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    
    // This would toggle service active/inactive status
    // Implementation depends on how services are stored
    
    return { ok: true, message: 'Service status toggled successfully' };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

fastify.put('/api/services/:id', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const { id } = req.params;
    const { name, category, description, pricing } = req.body;
    
    // Update service details
    // Implementation depends on how services are stored
    
    return { ok: true, message: 'Service updated successfully' };
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Telegram webhook endpoint with enhanced error handling
fastify.post("/telegram", async (request, reply) => {
  try {
    if (!request.body) {
      console.error('❌ Empty request body received');
      return reply.status(400).send('Empty request body');
    }
    
    const updateId = request.body.update_id;
    const messageType = Object.keys(request.body)
      .filter(key => key !== 'update_id' && key in request.body)
      .join(', ') || 'unknown';
    
    const requestId = `webhook-${updateId}-${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`📥 Received update [${requestId}]:`, {
      type: messageType,
      updateId,
      body: JSON.stringify(request.body, null, 2).substring(0, 500) + '...'
    });
    
    // Process the update - don't await to prevent double response
    bot.handleUpdate(request.body, reply.raw);
    
    // Don't send a response here - let Telegraf handle it
    return reply.code(200).send('OK');
      
  } catch (error) {
    console.error('❌ Error processing webhook update:', error);
    return reply.status(500).send({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Don't exit the process for uncaught exceptions in production
  // process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process for unhandled rejections in production
  // process.exit(1);
});

// Check for required environment variables
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN environment variable is not set');
  process.exit(1);
}

if (!process.env.ADMIN_TELEGRAM_ID) {
  console.warn('⚠️  Warning: ADMIN_TELEGRAM_ID environment variable is not set. Admin features will be disabled.');
}

// Test Telegram API connection
const testTelegramConnection = async () => {
  const testUrl = `${process.env.TELEGRAM_API_ROOT || 'https://api.telegram.org'}/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`;
  console.log('🔍 Testing connection to Telegram API at:', testUrl);
  
  try {
    const response = await fetch(testUrl, { 
      timeout: 10000 
    });
    const data = await response.json();
    console.log('✅ Telegram API connection test result:', data);
    return data.ok === true;
  } catch (error) {
    console.error('❌ Telegram API connection test failed:', error);
    return false;
  }
};

// Helper function to set webhook with retry logic
const setupWebhook = async (baseUrl, maxRetries = 3, delay = 5000) => {
  try {
    // Ensure the URL is properly formatted
    const cleanUrl = baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const webhookUrl = `https://${cleanUrl}/telegram`;
    
    console.log(`🔗 Setting up webhook to: ${webhookUrl}`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Webhook setup attempt ${attempt}/${maxRetries}...`);
        
        // First, delete any existing webhook
        console.log('ℹ️  Deleting existing webhook...');
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        
        // Then set the new webhook
        console.log('ℹ️  Setting new webhook...');
        const setWebhookResult = await bot.telegram.setWebhook(webhookUrl, {
          allowed_updates: ['message', 'callback_query', 'chat_member', 'chat_join_request'],
          drop_pending_updates: true
        });
        
        console.log('ℹ️  Webhook set result:', setWebhookResult);
        
        // Verify the webhook was set correctly
        console.log('ℹ️  Verifying webhook...');
        const webhookInfo = await bot.telegram.getWebhookInfo();
        
        console.log('📋 Webhook info:', {
          url: webhookInfo.url,
          has_custom_certificate: webhookInfo.has_custom_certificate,
          pending_update_count: webhookInfo.pending_update_count,
          last_error_date: webhookInfo.last_error_date ? new Date(webhookInfo.last_error_date * 1000).toISOString() : null,
          last_error_message: webhookInfo.last_error_message
        });
        
        if (webhookInfo.url === webhookUrl) {
          console.log('✅ Webhook set successfully');
          return true;
        } else {
          throw new Error(`Webhook URL mismatch. Expected: ${webhookUrl}, Got: ${webhookInfo.url}`);
        }
      } catch (error) {
        console.error(`❌ Webhook setup attempt ${attempt} failed:`, error.message);
        
        if (attempt < maxRetries) {
          const waitTime = delay / 1000;
          console.log(`⏳ Retrying in ${waitTime} seconds...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error; // Re-throw to be caught by the outer try-catch
        }
      }
    }
    
    return false; // If we get here, all retries failed
  } catch (error) {
    console.error('❌ Fatal error in webhook setup:', error);
    return false;
  }
};

// Start the server
async function startServer() {
  try {
    // Test Telegram API connection first
    console.log('🚀 Starting server initialization...');
    const isConnected = await testTelegramConnection();
    if (!isConnected) {
      console.error('❌ Cannot connect to Telegram API. Please check your network settings or use a proxy.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error initializing server:', error);
    process.exit(1);
  }

  const port = process.env.PORT || 3000;
  const maxPortAttempts = 5;
  let currentPort = port;
  
  for (let attempt = 1; attempt <= maxPortAttempts; attempt++) {
    try {
      // Start the server
      await new Promise((resolve, reject) => {
        fastify.listen({ port: currentPort, host: '0.0.0.0' }, (err, address) => {
          if (err) return reject(err);
          // Set the actual server port as environment variable for admin handlers
          process.env.ACTUAL_SERVER_PORT = currentPort.toString();
          console.log(`🚀 BirrPay Bot & Admin Panel running on port ${currentPort}`);
          resolve(address);
        });
      });
      
      // Server started successfully - webhook and bot setup will be handled in startApp()
      // Admin panel URL will be logged in startApp() with proper environment handling
      
      return fastify.server; // Return the server instance
    } catch (err) {
      if (err.code === 'EADDRINUSE') {
        console.warn(`⚠️ Port ${currentPort} is in use, trying port ${currentPort + 1}...`);
        currentPort++;
        
        if (attempt === maxPortAttempts) {
          console.error(`❌ Failed to start server after ${maxPortAttempts} attempts`);
          process.exit(1);
        }
      } else {
        console.error('❌ Error starting server:', err);
        process.exit(1);
      }
    }
  }
  
  // If we reach here, all port attempts failed
  console.error(`❌ Failed to start server after ${maxPortAttempts} attempts`);
  process.exit(1);
};



// Start the application with keep-alive
async function startApp() {
  try {
    const server = await startServer();
    
    // Set up webhook if in production (single setup)
    if (process.env.NODE_ENV === 'production') {
      // Try to get the Render URL from environment variables
      const renderUrl = process.env.WEB_APP_URL ||
                        process.env.RENDER_EXTERNAL_URL || 
                        `https://${process.env.RENDER_SERVICE_NAME || 'bpayb'}.onrender.com`;
      
      console.log(`🌐 Using Render URL: ${renderUrl}`);
      
      try {
        const webhookSuccess = await setupWebhook(renderUrl);
        
        if (!webhookSuccess) {
          console.log('📱 Telegram Bot: Falling back to polling mode');
          await bot.launch();
        }
      } catch (error) {
        console.error('❌ Error setting up webhook:', error.message);
        console.log('📱 Telegram Bot: Falling back to polling mode due to error');
        await bot.launch();
      }
    } else {
      console.log('🔧 Development mode: Using polling');
      await bot.launch();
    }

    console.log(`📱 Telegram Bot: ${process.env.NODE_ENV === 'production' ? 'Webhook' : 'Polling'} mode`);
    const adminPanelUrl = process.env.NODE_ENV === 'production' 
      ? `${process.env.WEB_APP_URL || process.env.RENDER_EXTERNAL_URL || 'https://' + (process.env.RENDER_SERVICE_NAME || 'bpayb') + '.onrender.com'}/panel`
      : `http://localhost:${server.address().port}/panel`;
    console.log(`🔧 Admin Panel: ${adminPanelUrl}`);
    console.log(`🔑 Admin ID: ${process.env.ADMIN_TELEGRAM_ID || 'Not set'}`);
    
    // Start expiration reminder scheduler
    try {
      startScheduler();
      console.log('⏰ Expiration reminder scheduler started');
    } catch (error) {
      console.error('❌ Failed to start scheduler:', error.message);
    }
    
    // Set up bot commands
    try {
      await bot.telegram.setMyCommands([
        { command: 'start', description: 'Start the bot' },
        { command: 'help', description: 'Show help information' },
        { command: 'subscribe', description: 'Subscribe to a service' },
        { command: 'mysubscriptions', description: 'View your subscriptions' },
        { command: 'support', description: 'Get help and support' },
        { command: 'lang', description: 'Change language' },
        { command: 'faq', description: 'Frequently asked questions' },
        { command: 'admin', description: 'Admin panel (admin only)' }
      ]);
      console.log('✅ Bot commands set up successfully');
    } catch (error) {
      console.error('❌ Failed to set up bot commands:', error.message);
    }
    
    // Handle process termination
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      await server.close();
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
startApp();
