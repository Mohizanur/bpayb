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

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN, {
  handlerTimeout: 9000,
});
const fastify = Fastify();

const i18n = await loadI18n();
const services = await loadServices();

bot.use(async (ctx, next) => {
  ctx.i18n = i18n;
  ctx.services = services;
  ctx.userLang = await getUserLang(ctx);
  return next();
});

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

fastify.post("/telegram", async (req, reply) => {
  await bot.handleUpdate(req.body);
  reply.send({ ok: true });
});

fastify.listen({ port: 3000, host: "0.0.0.0" }, (err) => {
  if (err) process.exit(1);
  console.log("Bot server running");
});
