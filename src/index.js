import "dotenv/config";
import { Telegraf } from "telegraf";
import Fastify from "fastify";
import { loadI18n, getUserLang } from "./utils/i18n.js";
import { loadServices } from "./utils/loadServices.js";
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

bot.use(async (ctx, next) => {
  try {
    console.log("Processing message:", ctx.message?.text || "callback query");
    console.log("Message type:", ctx.message ? "message" : "callback_query");
    console.log("Is command:", ctx.message?.text?.startsWith("/"));
    ctx.i18n = i18n;
    ctx.services = services;
    ctx.userLang = await getUserLang(ctx);
    console.log("User language set to:", ctx.userLang);
    return next();
  } catch (error) {
    console.error("Error in middleware:", error);
    // Fallback to English if there's an error
    ctx.userLang = "en";
    return next();
  }
});

// Add a simple test command BEFORE other handlers
bot.command("test", async (ctx) => {
  console.log("Test command triggered!");
  await ctx.reply("Test command works! 🎉");
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

fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
  if (err) process.exit(1);
  console.log("Bot server running on port 3000");
});
