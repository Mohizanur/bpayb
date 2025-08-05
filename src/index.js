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
startHandler(bot);
subscribeHandler(bot);
supportHandler(bot);
langHandler(bot);
faqHandler(bot);
mySubscriptionsHandler(bot);
cancelSubscriptionHandler(bot);
firestoreListener(bot);
adminHandler(bot);
helpHandler(bot);

// Add a catch-all handler for unhandled messages
bot.on("message", async (ctx) => {
  try {
    console.log("Catch-all handler triggered for:", ctx.message?.text);
    const lang = ctx.userLang || "en";
    const helpText =
      lang === "en"
        ? "I don't understand that command. Use /help to see available commands."
        : "ያ ትዕዛዝ አልገባኝም። የሚገኙ ትዕዛዞችን ለማየት /help ይጠቀሙ።";
    await ctx.reply(helpText);
  } catch (error) {
    console.error("Error in catch-all handler:", error);
  }
});

fastify.post("/telegram", async (req, reply) => {
  try {
    console.log("Received webhook update");
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
