// @ts-check
'use strict';

// Enable ES modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Load environment variables
import "dotenv/config";
import { bot } from "./bot.js";
import { loadI18n, getUserLang, setUserLang, getErrorMessage, getTranslatedMessage, setLanguageCache } from "./utils/i18n.js";
import { debug } from "./utils/debug.js";
import { loadServices } from "./utils/loadServices.js";
import { startScheduler } from "./utils/scheduler.js";
import { handleRenewalCallback, triggerExpirationCheck } from "./utils/expirationReminder.js";
// Import firestore conditionally for development
let firestore = null;
try {
  const firestoreModule = await import("./utils/firestore.js");
  firestore = firestoreModule.firestore;
} catch (error) {
  if (process.env.NODE_ENV === 'production') {
    console.error("❌ Firebase module load failed in production:", error.message);
    process.exit(1);
  } else {
    console.warn("⚠️ Firebase not available, running in development mode:", error.message);
    // Create mock firestore for development only
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
import { smartPhoneVerificationMiddleware } from './middleware/smartVerification.js';
import { setupPhoneVerificationHandlers } from './handlers/phoneVerification.js';

console.log("Starting bot initialization...");
console.log("Bot token:", process.env.TELEGRAM_BOT_TOKEN ? "Set" : "Not set");
console.log("Bot token length:", process.env.TELEGRAM_BOT_TOKEN?.length || 0);
console.log("Bot token starts with:", process.env.TELEGRAM_BOT_TOKEN?.substring(0, 10) || "N/A");

// Create simple HTTP server for bot webhooks only
const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url, true);
  
  // Basic health check endpoint
  if (parsedUrl.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Telegram webhook endpoint - CRITICAL for bot to receive messages
  if (parsedUrl.pathname === '/telegram') {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Bot token not configured' }));
      return;
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const update = JSON.parse(body);
          debug.trace('Received Telegram update:', update.update_id);
          
          // Process the update through the bot
          await bot.handleUpdate(update);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        } catch (error) {
          console.error('❌ Error processing webhook:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: error.message }));
        }
      });
      return;
    } else {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }
  }
  
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

// Start the HTTP server and Telegram bot (polling)
async function startApp() {
  try {
    const port = process.env.PORT || 3000;
    await new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0', (err) => {
        if (err) return reject(err);
        console.log(`🚀 Server listening on port ${port}`);
        console.log(`🤖 Telegram Bot is ready!`);
        resolve();
      });
    });

    if (process.env.TELEGRAM_BOT_TOKEN) {
      const isProduction = process.env.NODE_ENV === 'production';
      
      if (isProduction && process.env.RENDER_EXTERNAL_URL) {
        // Production: Use webhooks
        console.log('🎯 Production mode: Setting up webhooks...');
        
        // Try to get the Render URL from environment variables
        const renderUrl = process.env.WEB_APP_URL ||
                          process.env.RENDER_EXTERNAL_URL || 
                          `https://${process.env.RENDER_SERVICE_NAME || 'bpayb'}.onrender.com`;
        
        if (!renderUrl) {
          console.error('❌ No Render URL found in environment variables');
          await bot.launch();
          console.log('✅ Telegram bot launched (polling fallback)');
          return;
        }
        
        console.log(`🌐 Using Render URL: ${renderUrl}`);
        
        try {
          const webhookSuccess = await setupWebhook(renderUrl);
          
          if (webhookSuccess) {
            console.log('✅ Telegram bot configured with webhooks');
          } else {
            console.error('❌ Failed to set up webhooks, falling back to polling');
            await bot.launch();
            console.log('✅ Telegram bot launched (polling fallback)');
          }
        } catch (error) {
          console.error('❌ Error setting up webhook:', error.message);
          console.log('📱 Telegram Bot: Falling back to polling mode due to error');
          await bot.launch();
          console.log('✅ Telegram bot launched (polling fallback)');
        }
      } else {
        // Development: Use polling
        console.log('🔧 Development mode: Using polling...');
        console.log('🔍 Bot token check:', process.env.TELEGRAM_BOT_TOKEN ? 'Present' : 'Missing');
        console.log('🔍 About to call bot.launch()...');
        
        try {
          // Add timeout to prevent hanging
          const launchPromise = bot.launch();
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Bot launch timeout after 15 seconds')), 15000)
          );
          
          await Promise.race([launchPromise, timeoutPromise]);
          console.log('✅ Telegram bot launched (polling)');
          console.log('🎯 Bot is ready to receive commands!');
        } catch (e) {
          console.error('❌ Bot launch failed or timed out:', e.message);
          
          // Force launch without timeout as final attempt
          console.log('🔄 Attempting direct launch...');
          setTimeout(async () => {
            try {
              await bot.launch();
              console.log('✅ Telegram bot launched (direct)');
            } catch (directError) {
              console.error('❌ Direct launch also failed:', directError.message);
            }
          }, 1000);
        }
      }

      // CRITICAL: Register ALL handlers AFTER bot launch
      console.log("🚀 REGISTERING ALL HANDLERS...");
      
      // Add language middleware to set ctx.userLang for all handlers
      bot.use(async (ctx, next) => {
        try {
          if (ctx.from?.id) {
            // Get user's saved language preference from database
            const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
            const userData = userDoc.data() || {};
            ctx.userLang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
          } else {
            ctx.userLang = 'en';
          }
        } catch (error) {
          console.log('Could not get user language, using default:', error.message);
          ctx.userLang = ctx.from?.language_code === 'am' ? 'am' : 'en';
        }
        return next();
      });

      // 🚀 SMART PHONE VERIFICATION MIDDLEWARE - MUST BE BEFORE OTHER HANDLERS
      bot.use(smartPhoneVerificationMiddleware);
      console.log("✅ Smart phone verification middleware registered");
      
      // 🚀 PHONE VERIFICATION CONTACT HANDLER - MUST BE BEFORE OTHER HANDLERS
      // Register contact handler as middleware to ensure it runs FIRST
      bot.use(async (ctx, next) => {
        // Only process contact messages
        if (!ctx.message || !ctx.message.contact) {
          return next();
        }
        
        console.log('📱 [MIDDLEWARE] Contact message detected, routing to phone verification handler');
        const { handleContactSharing } = await import('./handlers/phoneVerification.js');
        await handleContactSharing(ctx);
        // Don't call next() - stop propagation so no other handlers process this
        console.log('📱 [MIDDLEWARE] Contact handler completed, stopping propagation');
        return; // Explicitly return to stop propagation
      });
      console.log("✅ Phone verification contact middleware registered");
      
      try {
        // Register admin handler first so /admin works and inline buttons are available
        adminHandler(bot);
        console.log("✅ Admin handler registered");
      } catch (e) {
        console.error("❌ Failed to register admin handler:", e.message);
      }

      try {
        // Override the showMainMenu function to include admin check
        const originalShowMainMenu = (await import('./utils/navigation.js')).showMainMenu;
        const enhancedShowMainMenu = async (ctx, isNewUser = false) => {
          try {
            // Get user's saved language preference from database
            const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
            const userData = userDoc.data() || {};
            const lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
            
            // Check if user is admin
            let isAdmin = false;
            try {
              const { isAuthorizedAdmin } = await import('./handlers/admin.js');
              isAdmin = await isAuthorizedAdmin(ctx);
            } catch (error) {
              console.log('Could not check admin status:', error.message);
            }
            
            // Import and call the original function with admin status
            const { getMainMenuContent } = await import('./utils/menuContent.js');
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
            const fallbackMsg = userData.language === 'am' ? 
              '🏠 ዋና ገጽ' : 
              '🏠 Main Menu';
            try {
              await ctx.reply(fallbackMsg);
            } catch (fallbackError) {
              console.error('Failed to send fallback message:', fallbackError);
            }
          }
        };
        
        // Register all other handlers
        setupStartHandler(bot);
        console.log("✅ Start handler registered with enhanced admin check");
      } catch (e) {
        console.error("❌ Failed to register start handler:", e.message);
      }


      try {
        supportHandler(bot);
        console.log("✅ Support handler registered");
      } catch (e) {
        console.error("❌ Failed to register support handler:", e.message);
      }

      try {
        langHandler(bot);
        console.log("✅ Language handler registered");
      } catch (e) {
        console.error("❌ Failed to register language handler:", e.message);
      }

      try {
        faqHandler(bot);
        console.log("✅ FAQ handler registered");
      } catch (e) {
        console.error("❌ Failed to register FAQ handler:", e.message);
      }

      try {
        mySubscriptionsHandler(bot);
        console.log("✅ My subscriptions handler registered");
      } catch (e) {
        console.error("❌ Failed to register my subscriptions handler:", e.message);
      }

      try {
        cancelSubscriptionHandler(bot);
        console.log("✅ Cancel subscription handler registered");
      } catch (e) {
        console.error("❌ Failed to register cancel subscription handler:", e.message);
      }

      try {
        helpHandler(bot);
        console.log("✅ Help handler registered");
      } catch (e) {
        console.error("❌ Failed to register help handler:", e.message);
      }

      try {
        screenshotUploadHandler(bot);
        console.log("✅ Screenshot upload handler registered");
      } catch (e) {
        console.error("❌ Failed to register screenshot upload handler:", e.message);
      }

      try {
        registerAdminPaymentHandlers(bot);
        console.log("✅ Admin payment handlers registered");
      } catch (e) {
        console.error("❌ Failed to register admin payment handlers:", e.message);
      }

      try {
        setupPhoneVerificationHandlers(bot);
        console.log("✅ Smart phone verification handlers registered");
      } catch (e) {
        console.error("❌ Failed to register phone verification handlers:", e.message);
      }

      try {
        firestoreListener(bot);
        console.log("✅ Firestore listener registered");
      } catch (e) {
        console.error("❌ Failed to register firestore listener:", e.message);
      }

      console.log("🎯 All handlers registered successfully!");

    } else {
      console.warn('⚠️ TELEGRAM_BOT_TOKEN not set; bot not started.');
    }

    process.on('SIGINT', () => {
      try { bot.stop('SIGINT'); } catch (_) {}
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      try { bot.stop('SIGTERM'); } catch (_) {}
      process.exit(0);
    });
  } catch (err) {
    console.error('❌ Failed to start application:', err);
  }
}

startApp();


