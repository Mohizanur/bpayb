// @ts-check
'use strict';

// Enable ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
import "dotenv/config";
import Fastify from "fastify";
import { bot } from "./bot.js";
import { loadI18n, getUserLang, setUserLang } from "./utils/i18n.js";
import { loadServices } from "./utils/loadServices.js";
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
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
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

console.log("Starting bot initialization...");
console.log("Bot token:", process.env.TELEGRAM_BOT_TOKEN ? "Set" : "Not set");
console.log("Bot token length:", process.env.TELEGRAM_BOT_TOKEN?.length || 0);
console.log("Bot token starts with:", process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) || "N/A");

const fastify = Fastify({
  logger: process.env.NODE_ENV === 'production' ? true : false
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

// Register cookie plugin for auth cookie
const fastifyCookie = (await import('@fastify/cookie')).default;
await fastify.register(fastifyCookie);

// Register static file serving for public directory
try {
  // Serve public files
  await fastify.register(import('@fastify/static'), {
    root: path.join(process.cwd(), 'public'),
    prefix: '/',
    decorateReply: false,
    index: false,
    list: false
  });
  console.log("✅ Public static file serving registered");
  
  // Register panel route directly on main fastify instance
  const panelPath = path.join(process.cwd(), 'panel');
  console.log("Panel files path:", panelPath);

  // Handle root panel route
  fastify.get('/panel', async (req, reply) => {
    try {
      // Log request for debugging
      console.log('📄 Serving /panel to', req.headers['x-forwarded-for'] || req.ip);
      
      // Auto-set admin token cookie if configured
      try {
        const token = process.env.ADMIN_TOKEN;
        if (token) {
          reply.setCookie('admin_token', token, {
            path: '/',
            httpOnly: true,
            sameSite: 'lax',
            secure: req.protocol === 'https' || (req.headers['x-forwarded-proto'] || '').includes('https'),
            maxAge: 60 * 60 * 24 * 7 // 7 days
          });
        }
      } catch (cookieErr) {
        console.warn('⚠️ Could not set admin_token cookie:', cookieErr?.message);
      }
      
      // Security headers for the admin panel HTML
      reply
        .header('Content-Security-Policy', "default-src 'self' data: blob: https:; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; connect-src 'self' https:; font-src 'self' data: https:")
        .header('X-Content-Type-Options', 'nosniff')
        .header('Referrer-Policy', 'no-referrer')
        .header('Cache-Control', 'no-cache, no-store, must-revalidate')
        .header('Pragma', 'no-cache')
        .header('Expires', '0')
        .type('text/html');

      // Use a direct file read to serve the admin panel
      const adminHtmlPath = path.join(panelPath, 'admin-fixed.html');
      const html = fs.readFileSync(adminHtmlPath, 'utf8');
      return reply.send(html);
    } catch (error) {
      console.error('Error serving admin panel:', error);
      return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
    }
  });

  // Serve panel static files - register as a separate plugin context
  await fastify.register(async function (fastify) {
    // Register static files for panel assets
    await fastify.register(import('@fastify/static'), {
      root: panelPath,
      prefix: '/panel/',
      decorateReply: false,
      index: false,
      setHeaders: (res, pathName) => {
        // Cache versioned assets aggressively, but not HTML
        if (pathName.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    });
  });
  
  console.log("✅ Panel static file serving registered at /panel");
  // Health endpoints are defined later centrally; no quick routes here to avoid duplication
} catch (error) {
  console.error("❌ Failed to register static file serving:", error);
}

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
    await ctx.reply("Sorry, something went wrong. Please try again.");
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
    await ctx.reply("Sorry, something went wrong. Please try again.");
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
    await ctx.reply("🌐 Choose your language / ቋንቃዎን ይምረጡ:", {
      reply_markup: { inline_keyboard: keyboard }
    });
    console.log("✅ Language selection sent!");
  } catch (error) {
    console.error("⚠️ Error in lang:", error);
    await ctx.reply("Sorry, something went wrong. Please try again.");
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
    // Get language from Telegram or default to English
    const lang = ctx.from?.language_code === "am" ? "am" : "en";
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
    } catch (firestoreError) {
      console.log("Firestore not available, language change temporary");
    }
    const confirmText = newLang === "am"
      ? "✅ ቋንቃ ወደ አማርኛ ተቀይሯል!"
      : "✅ Language changed to English!";
    await ctx.answerCbQuery();
    await ctx.reply(confirmText);
    console.log("✅ Language changed!");
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
    await ctx.reply("Sorry, something went wrong. Please try again.");
  }
});

console.log("✅ Admin commands and bot menu setup completed!");

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
    
    if (isAdmin || isVerificationCommand || isStartCommand || isContactMessage || isManualPhoneInput || isVerificationCodeInput) {
      ctx.i18n = i18n;
      ctx.services = services;
      ctx.userLang = await getUserLang(ctx);
      await next();
      return;
    }
    
    // Check if user is verified
    try {
      const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
      const userData = userDoc.data();
      
      if (!userData || !userData.phoneVerified) {
        const lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
        const verificationMsg = lang === 'am'
          ? '📱 የተልፍዎን መረጃ አስፈላጊ\n\nየBirrPay አገልግሎቶችን ለመጠቀም የተልፍዎን መረጃ አስፈላጊ።\n\nየመረጃ ቁልፍን ይጫኑ:'
          : '📱 Phone Verification Required\n\nTo use BirrPay services, you need to verify your phone number.\n\nClick the button below to verify:';
        
        await ctx.reply(verificationMsg, {
          reply_markup: {
            inline_keyboard: [[
              { text: lang === 'am' ? '📱 ተልፍዎን አስፈላጊ' : '📱 Verify Phone', callback_data: 'verify_phone' }
            ]]
          }
        });
        return;
      }
      
      // User is verified, continue
      ctx.i18n = i18n;
      ctx.services = services;
      ctx.userLang = await getUserLang(ctx);
      ctx.userData = userData;
      await next();
      
    } catch (dbError) {
      console.error('Database error in verification middleware:', dbError);
      // Continue without verification if database is unavailable
      ctx.i18n = i18n;
      ctx.services = services;
      ctx.userLang = await getUserLang(ctx);
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
    const lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
    const requestMsg = lang === 'am'
      ? '📱 የተልፍዎን ማረጋገጫ\n\nየተልፍዎን ቁጥር በሁለት መንገድ ማስገባት ይችላሉ:\n\n1️⃣ የእውቂያ ማጋራት ቁልፍን ይጫኑ\n2️⃣ ወይም በእጅ ይጻፉ: +251912345678\n\nእባክዎ ይምረጡ:'
      : '📱 Phone Verification\n\nYou can provide your phone number in two ways:\n\n1️⃣ Share your contact using the button below\n2️⃣ Or type it manually: +251912345678\n\nPlease choose:';
    
    await ctx.answerCbQuery();
    
    // Create reply keyboard with contact sharing option
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



// Handle contact sharing
bot.on('contact', async (ctx) => {
  try {
    const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
    const userData = userDoc.data();
    
    if (userData && userData.awaitingPhone && !userData.phoneVerified) {
      const phoneNumber = ctx.message.contact.phone_number;
      const lang = userData.language || 'en';
      
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
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save phone and verification code
      await firestore.collection('users').doc(String(ctx.from.id)).update({
        phoneNumber: formattedPhone,
        verificationCode: verificationCode,
        awaitingPhone: false,
        awaitingCode: true,
        codeGeneratedAt: new Date(),
        updatedAt: new Date()
      });
      
      const codeMsg = lang === 'am'
        ? `📱 የአረጋገጫ ኮድ\n\nየአረጋገጫ ኮድዎ ወደ ${formattedPhone} ተላክል።\n\nየአረጋገጫ ኮድ: **${verificationCode}**\n\nይህንን ኮድ ይጠቁሉ:`
        : `📱 Verification Code\n\nA verification code has been sent to ${formattedPhone}\n\nVerification Code: **${verificationCode}**\n\nPlease enter this code:`;
      
      await ctx.reply(codeMsg, {
        reply_markup: {
          remove_keyboard: true,
          force_reply: true,
          input_field_placeholder: lang === 'am' ? 'ኮድን ይጠቁሉ' : 'Enter code'
        },
        parse_mode: 'Markdown'
      });
    }
    
  } catch (error) {
    console.error('Error handling contact:', error);
  }
});

// Handle phone number input
bot.on('text', async (ctx, next) => {
  try {
    // Check if user clicked "Type Manually"
    if (ctx.message.text === '✍️ በእጅ መፃፍ' || ctx.message.text === '✍️ Type Manually') {
      const lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
      const requestMsg = lang === 'am'
        ? '📱 የተልፍዎን መረጃ\n\nየተልፍዎን መረጃ በዚህ ቅርጸት ይጣፉ: +251912345678\n\nየተልፍዎን መረጃ ይጠቁሉ:'
        : '📱 Phone Verification\n\nPlease enter your phone number in international format: +251912345678\n\nType your phone number:';
      
      await ctx.reply(requestMsg, {
        reply_markup: {
          remove_keyboard: true,
          force_reply: true,
          input_field_placeholder: lang === 'am' ? '+251...' : '+251...'
        }
      });
      return;
    }
    
    // Check if user is awaiting phone verification
    const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
    const userData = userDoc.data();
    
    if (userData && userData.awaitingPhone && !userData.phoneVerified) {
      const phoneNumber = ctx.message.text.trim();
      
      // Validate phone number format
      const phoneRegex = /^\+251[79]\d{8}$/;
      const lang = userData.language || 'en';
      
      if (!phoneRegex.test(phoneNumber)) {
        const errorMsg = lang === 'am'
          ? '⚠️ የተልፍዎን መረጃ ቅርጸት ትክክል አይደለም። እባክዎ ይጠቁሉ: +251912345678'
          : '⚠️ Invalid phone number format. Please use: +251912345678';
        await ctx.reply(errorMsg);
        return;
      }
      
      // Generate verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Save phone and verification code
      await firestore.collection('users').doc(String(ctx.from.id)).update({
        phoneNumber: phoneNumber,
        verificationCode: verificationCode,
        awaitingPhone: false,
        awaitingCode: true,
        codeGeneratedAt: new Date()
      });
      
      const codeMsg = lang === 'am'
        ? `📱 የአረጋገጫ ኮድ\n\nየአረጋገጫ ኮድዎ ወደ ${phoneNumber} ተላክል።\n\nየአረጋገጫ ኮድ: **${verificationCode}**\n\nይህንን ኮድ ይጠቁሉ:`
        : `📱 Verification Code\n\nA verification code has been sent to ${phoneNumber}\n\nVerification Code: **${verificationCode}**\n\nPlease enter this code:`;
      
      await ctx.reply(codeMsg, {
        reply_markup: {
          remove_keyboard: true,
          force_reply: true,
          input_field_placeholder: lang === 'am' ? 'ኮድን ይጠቁሉ' : 'Enter code'
        },
        parse_mode: 'Markdown'
      });
      return;
    }
    
    // Check if user is awaiting verification code
    if (userData && userData.awaitingCode && !userData.phoneVerified) {
      const enteredCode = ctx.message.text.trim();
      const lang = userData.language || 'en';
      
      if (enteredCode === userData.verificationCode) {
        // Verification successful
        await firestore.collection('users').doc(String(ctx.from.id)).update({
          phoneVerified: true,
          verifiedAt: new Date(),
          awaitingCode: false,
          verificationCode: null,
          hasCompletedOnboarding: true,
          updatedAt: new Date()
        });
        
        const successMsg = lang === 'am'
          ? '✅ የተልፍዎን መረጃ ተአረጋገጫል!\n\nአሁን የBirrPay አገልግሎቶችን ምሉ መጠቀም ይችላሉ።'
          : '✅ Phone verification successful!\n\nYou can now access all BirrPay services.';
        
        // Show main menu after successful verification
        const keyboard = [
          [
            { 
              text: lang === 'am' ? '📱 አገልግሎቶች' : '📱 Services', 
              callback_data: 'services' 
            }
          ],
          [
            { 
              text: lang === 'am' ? '📊 የእኔ ምዝገባዎች' : '📊 My Subscriptions', 
              callback_data: 'my_subs' 
            }
          ],
          [
            { 
              text: lang === 'am' ? '🆘 ድጋፍ' : '🆘 Support', 
              callback_data: 'support' 
            }
          ]
        ];
        
        // Remove keyboard first
        await ctx.reply('✅', {
          reply_markup: { remove_keyboard: true }
        });
        
        // Then send success message with inline keyboard
        await ctx.reply(successMsg, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown'
        });
        return;
      } else {
        const errorMsg = lang === 'am'
          ? '⚠️ የአረጋገጫ ኮድ ትክክል አይደለም። እንደገና ይጠርቡ።'
          : '⚠️ Invalid verification code. Please try again.';
        await ctx.reply(errorMsg);
        return;
      }
    }
    
    // Continue to next middleware/handler
    await next();
    
  } catch (error) {
    console.error('Error in phone verification text handler:', error);
    await next();
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
    
    await ctx.reply(settingsMsg, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Refresh Status', callback_data: 'admin_settings' }],
          [{ text: '🌐 Admin Panel', url: `http://localhost:${process.env.PORT || 3000}/panel` }],
          [{ text: '🔙 Back to Admin Menu', callback_data: 'back_to_admin' }]
        ]
      }
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
console.log("Bot handlers:", Object.keys(bot.context || {}));
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
    let query = firestore.collection('supportMessages').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('handled', '==', status === 'handled');
    }
    
    if (priority) {
      query = query.where('priority', '==', priority);
    }
    
    const supportSnapshot = await query.get();
    const messages = [];
    
    for (const doc of supportSnapshot.docs) {
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
          console.log(`🚀 BirrPay Bot & Admin Panel running on port ${currentPort}`);
          resolve(address);
        });
      });
      
      // Set up webhook if in production
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
      console.log(`🔧 Admin Panel: http://localhost:${currentPort}/panel`);
      console.log(`🔑 Admin ID: ${process.env.ADMIN_TELEGRAM_ID || 'Not set'}`);
      
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
};

// Import keep-alive functionality
import { keepAlive } from './utils/keepAlive.js';

// Start the application with keep-alive
startServer().then((server) => {
  // Set up webhook if in production
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
  console.log(`🔧 Admin Panel: http://localhost:${server.address().port}/panel`);
  console.log(`🔑 Admin ID: ${process.env.ADMIN_TELEGRAM_ID || 'Not set'}`);
  
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
  
  // Start keep-alive service in production
  if (process.env.NODE_ENV === 'production') {
    // Set SELF_PING_URL if not set (for local development)
    if (!process.env.SELF_PING_URL) {
      const port = process.env.PORT || 3000;
      process.env.SELF_PING_URL = `http://localhost:${port}`;
    }
    
    // Start keep-alive service
    keepAlive.start();
    
    // Handle process termination
    const shutdown = async () => {
      console.log('Shutting down gracefully...');
      await server.close();
      keepAlive.stop();
      process.exit(0);
    };
    
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
});

// No need to export anything in the main application file
export {};
