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

// Create simple HTTP server with admin panel support
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Basic health check endpoint
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Admin panel endpoint
  if (parsedUrl.pathname === '/panel') {
    try {
      const panelPath = path.join(process.cwd(), 'panel');
      const adminHtmlPath = path.join(panelPath, 'admin-modern.html');
      
      // Check if admin panel file exists
      if (fs.existsSync(adminHtmlPath)) {
        const html = fs.readFileSync(adminHtmlPath, 'utf8');
        res.writeHead(200, { 
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        res.end(html);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Admin panel not found');
      }
    } catch (error) {
      console.error('Error serving admin panel:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
    return;
  }
  
  // API endpoints for admin panel
  if (parsedUrl.pathname.startsWith('/api/')) {
    // Handle API requests
    handleApiRequest(req, res, parsedUrl);
    return;
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('BirrPay Bot is running');
});

// Handle API requests for admin panel
async function handleApiRequest(req, res, parsedUrl) {
  const pathname = parsedUrl.pathname;
  
  // Set CORS headers for admin panel
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  try {
    // Admin stats endpoint
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      const stats = await getAdminStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
      return;
    }
    
    // Admin subscriptions endpoint
    if (pathname === '/api/admin/subscriptions' && req.method === 'GET') {
      const subscriptions = await getAdminSubscriptions();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(subscriptions));
      return;
    }
    
    // Admin users endpoint
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      const users = await getAdminUsers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(users));
      return;
    }
    
    // Admin payments endpoint
    if (pathname === '/api/admin/payments' && req.method === 'GET') {
      const payments = await getAdminPayments();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payments));
      return;
    }
    
    // Default 404 for unknown API endpoints
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'API endpoint not found' }));
    
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}

// Admin API functions
async function getAdminStats() {
  try {
    // Get basic stats from Firestore
    const usersSnapshot = await firestore.collection('users').get();
    const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
    const paymentsSnapshot = await firestore.collection('pendingPayments').get();
    
    const activeSubscriptions = subscriptionsSnapshot.docs.filter(doc => 
      doc.data().status === 'active'
    ).length;
    
    const totalRevenue = subscriptionsSnapshot.docs.reduce((sum, doc) => {
      const data = doc.data();
      return sum + (parseFloat(data.amount) || 0);
    }, 0);
    
    return {
      totalUsers: usersSnapshot.size,
      totalSubscriptions: subscriptionsSnapshot.size,
      activeSubscriptions,
      totalPayments: paymentsSnapshot.size,
      totalRevenue: totalRevenue.toFixed(2)
    };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      totalUsers: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      totalPayments: 0,
      totalRevenue: '0.00'
    };
  }
}

async function getAdminSubscriptions() {
  try {
    const snapshot = await firestore.collection('subscriptions').orderBy('createdAt', 'desc').limit(50).get();
    const subscriptions = [];
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      subscriptions.push({
        id: doc.id,
        userId: data.userId,
        serviceName: data.serviceName || data.service || 'Unknown',
        duration: data.duration || data.durationName || 'Unknown',
        amount: data.amount || 0,
        status: data.status || 'unknown',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        endDate: data.endDate?.toDate?.()?.toISOString() || null
      });
    }
    
    return subscriptions;
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    return [];
  }
}

async function getAdminUsers() {
  try {
    const snapshot = await firestore.collection('users').orderBy('createdAt', 'desc').limit(50).get();
    const users = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      users.push({
        id: doc.id,
        firstName: data.firstName || '',
        lastName: data.lastName || '',
        username: data.username || '',
        phone: data.phone || '',
        language: data.language || 'en',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        phoneVerified: data.phoneVerified || false
      });
    });
    
    return users;
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
}

async function getAdminPayments() {
  try {
    const snapshot = await firestore.collection('pendingPayments').orderBy('createdAt', 'desc').limit(50).get();
    const payments = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      payments.push({
        id: doc.id,
        userId: data.userId,
        amount: data.amount || 0,
        service: data.service || 'Unknown',
        duration: data.duration || 'Unknown',
        status: data.status || 'pending',
        paymentReference: data.paymentReference || '',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return payments;
  } catch (error) {
    console.error('Error getting payments:', error);
    return [];
  }
}

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

// All health check and API routes are now handled by the simple HTTP server above
// No additional Fastify routes needed

// All API routes are now handled by the simple HTTP server above
// No additional Fastify routes needed

// All API endpoints are now handled by the simple HTTP server above

// All remaining API endpoints are now handled by the simple HTTP server above

// Clean end of file - all Fastify routes removed to prevent deployment errors

// Validate admin credentials

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
      // Start the HTTP server
      await new Promise((resolve, reject) => {
        server.listen(currentPort, '0.0.0.0', (err) => {
          if (err) return reject(err);
          // Set the actual server port as environment variable for admin handlers
          process.env.ACTUAL_SERVER_PORT = currentPort.toString();
          console.log(`🚀 BirrPay Bot & Admin Panel running on port ${currentPort}`);
          console.log(`🔧 Admin Panel: http://localhost:${currentPort}/panel`);
          resolve(server);
        });
      });
      
      // Server started successfully - webhook and bot setup will be handled in startApp()
      // Admin panel URL will be logged in startApp() with proper environment handling
      
      return server; // Return the server instance
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
    
    // Handle process termination gracefully but keep service alive
    const shutdown = async () => {
      console.log('Received shutdown signal, cleaning up...');
      try {
        await bot.stop();
        console.log('Bot stopped gracefully');
      } catch (error) {
        console.error('Error stopping bot:', error);
      }
    };
    
    // Only handle SIGINT (Ctrl+C) for local development
    // Don't handle SIGTERM to prevent Render from shutting down the service
    process.on('SIGINT', shutdown);
    
    // Keep the process alive with a simple interval
    console.log('🎉 BirrPay Bot & Admin Panel are running and ready to receive requests!');
    
    // Keep-alive mechanism to prevent the service from sleeping
    setInterval(() => {
      console.log('🔄 Keep-alive ping:', new Date().toISOString());
    }, 5 * 60 * 1000); // Every 5 minutes
  } catch (error) {
    console.error('❌ Failed to start application:', error);
    process.exit(1);
  }
}

// Start the application
startApp();
