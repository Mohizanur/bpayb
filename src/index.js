import "dotenv/config";
import { Telegraf } from "telegraf";
import Fastify from "fastify";
import { loadI18n, getUserLang, setUserLang } from "./utils/i18n.js";
import { loadServices } from "./utils/loadServices.js";
import { firestore } from "./utils/firestore.js";
import path from "path";
import { fileURLToPath } from "url";
import fastifyStatic from "@fastify/static";
import startHandler from "./handlers/start.js";
import subscribeHandler from "./handlers/subscribe.js";
import supportHandler from "./handlers/support.js";
import langHandler from "./handlers/lang.js";
import faqHandler from "./handlers/faq.js";
import mySubscriptionsHandler from "./handlers/mySubscriptions.js";
import cancelSubscriptionHandler from "./handlers/cancelSubscription.js";
import firestoreListener from "./handlers/firestoreListener.js";
import adminHandler from "./handlers/admin.js";
import helpHandler from "./handlers/help.js";

console.log("Starting bot initialization...");
console.log("Bot token:", process.env.TELEGRAM_BOT_TOKEN ? "Set" : "Not set");
console.log("Bot token length:", process.env.TELEGRAM_BOT_TOKEN?.length || 0);
console.log("Bot token starts with:", process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) || "N/A");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  handlerTimeout: 9000,
});

const fastify = Fastify();

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

// CRITICAL FIX: Register ALL handlers BEFORE middleware
console.log("🚀 REGISTERING ALL HANDLERS FIRST...");

// Direct command handlers
bot.command("help", async (ctx) => {
  try {
    console.log("🚀 HELP COMMAND TRIGGERED!");
    const lang = ctx.userLang || "en";
    const helpText = lang === "am" 
      ? "🔧 BirrPay የብር የደግፍ መረጃ\n\nየተጣታት ትዕዛዞች:\n• /start - ዋና ምንዩ\n• /help - የእርዳታ ምንዩ\n• /faq - በተደጋጋሚ የሚጣዩ ጥያቄዎች\n• /lang - የቋንቃ መረጥ\n• /mysubs - የእርስዎ መዋቅሮች\n• /support - የተጠቃሚ ድጋፍ"
      : "🔧 BirrPay Help & Support\n\nAvailable Commands:\n• /start - Main menu and services\n• /help - Show this help message\n• /faq - Frequently asked questions\n• /lang - Change language settings\n• /mysubs - View your subscriptions\n• /support - Contact customer support";
    await ctx.reply(helpText);
    console.log("✅ Help response sent!");
  } catch (error) {
    console.error("⚠️ Error in help:", error);
    await ctx.reply("Sorry, something went wrong. Please try again.");
  }
});

bot.command("faq", async (ctx) => {
  try {
    console.log("🚀 FAQ COMMAND TRIGGERED!");
    const lang = ctx.userLang || "en";
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
    const lang = ctx.userLang || "en";
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

// NOW add middleware AFTER handlers
console.log("🔄 Registering middleware...");
bot.use(async (ctx, next) => {
  try {
    console.log("🔄 MIDDLEWARE: Processing message:", ctx.message?.text || "callback query");
    ctx.i18n = i18n;
    ctx.services = services;
    ctx.userLang = await getUserLang(ctx);
    console.log("🔄 MIDDLEWARE: User language set to:", ctx.userLang);
    await next();
    console.log("🔄 MIDDLEWARE: next() completed");
  } catch (error) {
    console.error("⚠️ MIDDLEWARE ERROR:", error);
    ctx.userLang = "en";
    ctx.i18n = i18n;
    ctx.services = services;
    await next();
  }
});
console.log("🔄 Middleware registered successfully!");

// Register remaining handlers that aren't duplicated above
console.log("Registering remaining handlers...");
console.log("Registering start handler...");
startHandler(bot);
console.log("Registering subscribe handler...");
subscribeHandler(bot);
console.log("Registering mySubscriptions handler...");
mySubscriptionsHandler(bot);
console.log("Registering cancelSubscription handler...");
cancelSubscriptionHandler(bot);
console.log("Registering firestoreListener...");
firestoreListener(bot);
console.log("Registering admin handler...");
adminHandler(bot);
console.log("All remaining handlers registered successfully!");

// Test command for debugging
bot.command("direct_test", async (ctx) => {
  console.log("📝 DIRECT TEST COMMAND TRIGGERED!");
  console.log("User ID:", ctx.from?.id);
  console.log("User language:", ctx.userLang);
  console.log("i18n available:", !!ctx.i18n);
  await ctx.reply("✅ Direct test command working! This proves handlers can be triggered.");
});

// Test commands for debugging
bot.command("test", async (ctx) => {
  console.log("Test command triggered!");
  console.log("Context has i18n:", !!ctx.i18n);
  console.log("Context has userLang:", ctx.userLang);
  console.log("Context has services:", !!ctx.services);
  await ctx.reply("🎉 Bot is working perfectly!");
});

// Debug help command
bot.command("debug_help", async (ctx) => {
  try {
    console.log("Debug help command triggered!");
    console.log("User language:", ctx.userLang);
    console.log("i18n available:", !!ctx.i18n);
    
    const helpText = "🔧 Debug Help\n\nBot is working! Available commands:\n• /start - Main menu\n• /help - Help information\n• /faq - FAQ\n• /lang - Language settings";
    
    await ctx.reply(helpText);
    console.log("Debug help sent successfully!");
  } catch (error) {
    console.error("Error in debug help:", error);
    await ctx.reply("Error in debug help: " + error.message);
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

console.log("Registering handlers...");
console.log("Registering start handler...");
startHandler(bot);
console.log("Registering subscribe handler...");
subscribeHandler(bot);
console.log("Registering support handler...");
supportHandler(bot);
console.log("Registering lang handler...");
langHandler(bot);
console.log("Registering faq handler...");
faqHandler(bot);
console.log("Registering mySubscriptions handler...");
mySubscriptionsHandler(bot);
console.log("Registering cancelSubscription handler...");
cancelSubscriptionHandler(bot);
console.log("Registering firestoreListener...");
firestoreListener(bot);
console.log("Registering admin handler...");
adminHandler(bot);
console.log("Registering help handler...");
helpHandler(bot);

console.log("All handlers registered successfully!");

// Debug: List all registered commands
console.log("Bot handlers:", Object.keys(bot.context || {}));
console.log("Bot middleware:", bot.middleware?.length || 0);

// Commands are now handled by their respective handlers



// Add a simple text handler for non-command messages (AFTER all command handlers)
bot.on("text", async (ctx) => {
  try {
    // Skip if it's a command (starts with /)
    if (ctx.message.text.startsWith("/")) {
      console.log("Command not handled:", ctx.message.text);
      return;
    }
    
    console.log("Text handler triggered for:", ctx.message?.text);
    const lang = ctx.userLang || "en";
    const helpText =
      lang === "en"
        ? "I don't understand that message. Use /help to see available commands."
        : "ያ መልእክት አልገባኝም። የሚገኙ ትዕዛዞችን ለማየት /help ይጠቀሙ።";
    await ctx.reply(helpText);
  } catch (error) {
    console.error("Error in text handler:", error);
  }
});

// Serve static files
fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/public/',
});

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

// Admin panel authentication middleware
const requireAdmin = (req, reply, done) => {
  const adminId = req.query.admin || req.body.admin;
  if (adminId !== process.env.ADMIN_TELEGRAM_ID) {
    reply.status(403).send({ error: "Forbidden: Invalid admin credentials" });
    return;
  }
  done();
};

// Serve admin panel HTML
fastify.get('/panel', async (req, reply) => {
  return reply.sendFile('admin.html', path.join(__dirname, '../panel/'));
});

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

fastify.get('/api/services', { preHandler: requireAdmin }, async (req, reply) => {
  try {
    const services = await loadServices();
    return services;
  } catch (error) {
    reply.status(500).send({ error: error.message });
  }
});

// Telegram webhook endpoint
fastify.post("/telegram", async (req, reply) => {
  try {
    console.log("Received webhook update");
    console.log("Update body:", JSON.stringify(req.body, null, 2));
    await bot.handleUpdate(req.body);
    reply.send({ ok: true });
  } catch (error) {
    console.error("Error handling webhook update:", error);
    reply.status(500).send({ ok: false, error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error("Error starting server:", err);
    process.exit(1);
  }
  console.log(`🚀 BirrPay Bot & Admin Panel running on port ${PORT}`);
  console.log(`📱 Telegram Bot: Webhook ready at /telegram`);
  console.log(`🔧 Admin Panel: http://localhost:${PORT}/panel`);
  console.log(`🔑 Admin ID: ${process.env.ADMIN_TELEGRAM_ID}`);
});
