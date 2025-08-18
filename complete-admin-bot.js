// Complete BirrPay Bot with EVERY SINGLE admin feature from original admin.js
import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { extname, join } from 'path';
import { firestore } from './src/utils/firestore.js';
import { setupStartHandler } from './src/handlers/start.js';
import { loadI18n } from './src/utils/i18n.js';
import { loadServices } from './src/utils/loadServices.js';
import adminHandler from './src/handlers/admin.js';

dotenv.config();

console.log('🚀 BirrPay Bot - COMPLETE Enhanced Version');

// MIME types for static files
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// Create HTTP server for health checks and admin panel
const server = createServer((req, res) => {
  const url = req.url;
  
  // Health check endpoint
  if (url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
    return;
  }
  
  // Admin panel route
  if (url === '/panel' || url === '/panel/') {
    try {
      const adminHtml = readFileSync('./panel/admin-fixed.html', 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(adminHtml);
      return;
    } catch (error) {
      console.error('Error reading admin panel:', error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Admin panel not available');
      return;
    }
  }
  
  // Serve static files from panel directory
  if (url.startsWith('/panel/')) {
    const filePath = url.substring(7); // Remove '/panel/' prefix
    const fullPath = join('./panel', filePath);
    
    if (existsSync(fullPath)) {
      try {
        const content = readFileSync(fullPath);
        const ext = extname(fullPath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
        return;
      } catch (error) {
        console.error('Error serving static file:', error);
      }
    }
  }
  
  // Default response
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>BirrPay Bot</title>
        <style>
            body { font-family: Arial, sans-serif; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #e2e8f0; margin: 0; padding: 40px; text-align: center; }
            .container { max-width: 600px; margin: 0 auto; }
            h1 { color: #3b82f6; margin-bottom: 20px; }
            .btn { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; margin: 10px; transition: all 0.3s ease; }
            .btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3); }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🚀 BirrPay Bot</h1>
            <p>The bot is running successfully!</p>
            <a href="/panel" class="btn">🌐 Open Admin Panel</a>
            <p style="margin-top: 30px; color: #94a3b8;">
                Use <code>/admin</code> command in Telegram for admin access
            </p>
        </div>
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 HTTP Server listening on port ${PORT}`);
  console.log(`🔧 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Admin Panel: http://localhost:${PORT}/panel`);
});

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
      console.log("🌐 Web Admin Panel: https://bpayb.onrender.com/panel");
    }

    startBot();

  } catch (error) {
    console.error("❌ Failed to initialize:", error);
    process.exit(1);
  }
})();
