// Complete BirrPay Bot with EVERY SINGLE admin feature from original admin.js
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { firestore } from './src/utils/firestore.js';
import { setupStartHandler } from './src/handlers/start.js';
import { loadI18n } from './src/utils/i18n.js';
import { loadServices } from './src/utils/loadServices.js';
import adminHandler from './src/handlers/admin.js';

dotenv.config();

console.log('🚀 BirrPay Bot - COMPLETE Enhanced Version');

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

    // Add debug middleware to see all commands
    bot.use(async (ctx, next) => {
      if (ctx.message && ctx.message.text) {
        console.log(`📥 Command: "${ctx.message.text}" from user ${ctx.from.id}`);
      }
      return next();
    });

    // Register handlers
    console.log("Registering handlers...");
    setupStartHandler(bot);

    // ============ COMPLETE ADMIN IMPLEMENTATION FROM ORIGINAL ADMIN.JS ============
    // Import and register ALL the original admin handlers exactly as they are
    console.log("✅ Registering COMPLETE admin handler from original admin.js");
    adminHandler(bot);

    // Set commands menu
    async function setupMenu() {
      try {
        await bot.telegram.setMyCommands([
          { command: 'start', description: '🏠 Main menu and services' },
          { command: 'admin', description: '🔑 Admin panel (admin only)' }
        ]);
        console.log("✅ Commands menu set");
      } catch (error) {
        console.error("❌ Error setting commands menu:", error);
      }
    }

    // Start the bot
    async function startBot() {
      console.log("🚀 Starting bot...");
      await setupMenu(); // Set commands menu on startup
      await bot.launch();
      console.log("✅ Bot started - ALL admin features loading...");
    }

    startBot();

  } catch (error) {
    console.error("❌ Failed to initialize:", error);
    process.exit(1);
  }
})();
