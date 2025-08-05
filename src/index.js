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

// Register all handlers FIRST before middleware
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

const fastify = Fastify();

// Get current directory for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load i18n and services with error handling
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

// Now add middleware AFTER handlers
bot.use(async (ctx, next) => {
  try {
    console.log("🔄 MIDDLEWARE: Processing message:", ctx.message?.text || "callback query");
    console.log("🔄 MIDDLEWARE: Message type:", ctx.message ? "message" : "callback_query");
    console.log("🔄 MIDDLEWARE: Is command:", ctx.message?.text?.startsWith("/"));
    console.log("🔄 MIDDLEWARE: Setting context properties...");
    ctx.i18n = i18n;
    ctx.services = services;
    ctx.userLang = await getUserLang(ctx);
    console.log("🔄 MIDDLEWARE: User language set to:", ctx.userLang);
    console.log("🔄 MIDDLEWARE: Calling next()...");
    await next();
    console.log("🔄 MIDDLEWARE: next() completed");
  } catch (error) {
    console.error("⚠️ MIDDLEWARE ERROR:", error);
    // Fallback to English if there's an error
    ctx.userLang = "en";
    ctx.i18n = i18n;
    ctx.services = services;
    console.log("🔄 MIDDLEWARE: Fallback applied, calling next()...");
    await next();
  }
});

bot.use(async (ctx, next) => {
  try {
    console.log("🔄 MIDDLEWARE: Processing message:", ctx.message?.text || "callback query");
    console.log("🔄 MIDDLEWARE: Message type:", ctx.message ? "message" : "callback_query");
    console.log("🔄 MIDDLEWARE: Is command:", ctx.message?.text?.startsWith("/"));
    console.log("🔄 MIDDLEWARE: Setting context properties...");
    ctx.i18n = i18n;
    ctx.services = services;
    ctx.userLang = await getUserLang(ctx);
    console.log("🔄 MIDDLEWARE: User language set to:", ctx.userLang);
    console.log("🔄 MIDDLEWARE: Calling next()...");
    await next();
    console.log("🔄 MIDDLEWARE: next() completed");
  } catch (error) {
    console.error("⚠️ MIDDLEWARE ERROR:", error);
    // Fallback to English if there's an error
    ctx.userLang = "en";
    ctx.i18n = i18n;
    ctx.services = services;
    console.log("🔄 MIDDLEWARE: Fallback applied, calling next()...");
    await next();
  }
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
