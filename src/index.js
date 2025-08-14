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
      const adminHtmlPath = path.join(panelPath, 'admin-fixed.html');
      
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
          console.log('📥 Received Telegram update:', update.update_id);
          
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
  
  // API endpoints for admin panel
  if (parsedUrl.pathname.startsWith('/api/')) {
    // Handle API requests
    handleApiRequest(req, res, parsedUrl);
    return;
  }
  
  // Serve debug HTML page
  if (parsedUrl.pathname === '/debug' || parsedUrl.pathname === '/debug-login') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Debug Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input {
            width: 100%;
            width: 100%;
        }
    </style>
</head>
<body>
  <div class="container">
    <h1>Debug Login</h1>
    <p>This page is for debugging admin login flow.</p>
  </div>
</body>
</html>`);
    return;
  }
  
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
  
  // Helper function to validate admin token
  const validateAdminToken = (req) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No Authorization header or invalid format');
      return false;
    }
    
    const token = authHeader.substring(7);
    try {
      // Proper JWT token validation
      const jwt = require('jsonwebtoken');
      const jwtSecret = process.env.JWT_SECRET || 'birrpay_default_secret_change_in_production';
      
      const decoded = jwt.verify(token, jwtSecret);
      console.log('Token decoded successfully:', { username: decoded.username, role: decoded.role });
      
      // Check if token has admin role
      if (decoded.role !== 'admin') {
        console.log('Token does not have admin role');
        return false;
      }
      
      // Token is valid and user is admin
      console.log('Token validation successful');
      return true;
    } catch (error) {
      console.log('Token validation failed:', error.message);
      return false;
    }
  };

  try {
    // Debug endpoint to check environment variables
    if (pathname === '/api/admin/debug' && req.method === 'GET') {
      console.log('Debug endpoint called');
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(JSON.stringify({ 
        success: true,
        adminUsername: process.env.ADMIN_USERNAME || 'admin',
        adminPasswordSet: !!process.env.ADMIN_PASSWORD,
        jwtSecretSet: !!process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
      }));
      return;
    }
    
    // Admin login endpoint
    if (pathname === '/api/admin/login' && req.method === 'POST') {
      console.log('Admin login attempt received');
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const { username, password } = JSON.parse(body);
          console.log('Login attempt for username:', username);
          console.log('Password length:', password ? password.length : 0);
          
          const adminUsername = process.env.ADMIN_USERNAME || 'admin';
          const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
          
          console.log('Expected username:', adminUsername);
          console.log('Expected password length:', adminPassword ? adminPassword.length : 0);
          console.log('Username match:', username === adminUsername);
          console.log('Password match:', password === adminPassword);
          console.log('Environment variables:');
          console.log('- ADMIN_USERNAME:', process.env.ADMIN_USERNAME ? 'SET' : 'NOT SET');
          console.log('- ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? 'SET' : 'NOT SET');
          
          if (username === adminUsername && password === adminPassword) {
            // Generate proper JWT token
            const jwt = require('jsonwebtoken');
            const jwtSecret = process.env.JWT_SECRET || 'birrpay_default_secret_change_in_production';
            
            const payload = {
              username,
              role: 'admin',
              iat: Math.floor(Date.now() / 1000),
              exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
            };
            
            const token = jwt.sign(payload, jwtSecret);
            console.log('Login successful, token generated');
            
            res.writeHead(200, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end(JSON.stringify({ 
              success: true, 
              token,
              message: 'Login successful',
              expiresIn: '24h'
            }));
          } else {
            console.log('Login failed: invalid credentials');
            res.writeHead(401, { 
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            });
            res.end(JSON.stringify({ 
              success: false, 
              message: 'Invalid credentials' 
            }));
          }
        } catch (error) {
          console.error('Login error:', error);
          res.writeHead(400, { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
          });
          res.end(JSON.stringify({ 
            success: false, 
            message: 'Invalid request body' 
          }));
        }
      });
      return;
    }
    
    // Admin stats endpoint
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
      console.log('Admin stats request received');
      if (!validateAdminToken(req)) {
        console.log('Admin stats: unauthorized access');
        res.writeHead(401, { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      console.log('Admin stats: authorized access, fetching stats');
      const stats = await getAdminStats();
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      });
      res.end(JSON.stringify({ success: true, stats }));
      return;
    }
    
    // Admin subscriptions endpoint
    if (pathname === '/api/admin/subscriptions' && req.method === 'GET') {
      if (!validateAdminToken(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      const subscriptions = await getAdminSubscriptions();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, subscriptions }));
      return;
    }
    
    // Admin users endpoint
    if (pathname === '/api/admin/users' && req.method === 'GET') {
      if (!validateAdminToken(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      const users = await getAdminUsers();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, users }));
      return;
    }
    
    // Admin payments endpoint
    if (pathname === '/api/admin/payments' && req.method === 'GET') {
      if (!validateAdminToken(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      const payments = await getAdminPayments();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, payments }));
      return;
    }
    
    // Admin services endpoint
    if (pathname === '/api/admin/services' && req.method === 'GET') {
      if (!validateAdminToken(req)) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
        return;
      }
      const services = await getAdminServices();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, services }));
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
const ADMIN_CACHE_TTL_MS = parseInt(process.env.ADMIN_CACHE_TTL_MS || '60000', 10);
const adminCache = {
  stats: { data: null, ts: 0 },
  subscriptions: { data: null, ts: 0 },
  users: { data: null, ts: 0 },
  payments: { data: null, ts: 0 },
  services: { data: null, ts: 0 },
};
function getCached(key) {
  const entry = adminCache[key];
  if (!entry || !entry.data) return null;
  if (Date.now() - entry.ts < ADMIN_CACHE_TTL_MS) return entry.data;
  return null;
}
function setCached(key, value) {
  adminCache[key] = { data: value, ts: Date.now() };
}

// Coalesce concurrent requests to the same admin resource to reduce Firestore hits
const inFlightRequests = new Map();
function coalesce(key, taskFn) {
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = (async () => {
    try {
      return await taskFn();
    } finally {
      inFlightRequests.delete(key);
    }
  })();
  inFlightRequests.set(key, promise);
  return promise;
}

// Quota cooldown to avoid hammering Firestore when RESOURCE_EXHAUSTED
const FIRESTORE_READS_COOLDOWN_MS = parseInt(process.env.FIRESTORE_READS_COOLDOWN_MS || '900000', 10); // 15 minutes
let lastQuotaErrorAt = 0;
function isInQuotaCooldown() {
  return Date.now() - lastQuotaErrorAt < FIRESTORE_READS_COOLDOWN_MS;
}
function markQuotaIfNeeded(error) {
  const message = String(error?.message || '');
  if (error?.code === 8 || /RESOURCE_EXHAUSTED|Quota exceeded/i.test(message)) {
    lastQuotaErrorAt = Date.now();
  }
}

async function getAdminStats() {
  return coalesce('stats', async () => {
    try {
      const cached = getCached('stats');
      if (cached) return cached;
      if (isInQuotaCooldown()) {
        return { totalUsers: 0, totalSubscriptions: 0, activeSubscriptions: 0, totalPayments: 0, totalRevenue: '0.00', quotaExceeded: true };
      }
      // Fetch basic stats from Firestore
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
      
      const result = {
        totalUsers: usersSnapshot.size,
        totalSubscriptions: subscriptionsSnapshot.size,
        activeSubscriptions,
        totalPayments: paymentsSnapshot.size,
        totalRevenue: totalRevenue.toFixed(2)
      };
      setCached('stats', result);
      return result;
    } catch (error) {
      console.error('Error getting admin stats:', error);
      markQuotaIfNeeded(error);
      const cached = getCached('stats');
      if (cached) return cached;
      return {
        totalUsers: 0,
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalPayments: 0,
        totalRevenue: '0.00',
        quotaExceeded: true
      };
    }
  });
}

async function getAdminSubscriptions() {
  return coalesce('subscriptions', async () => {
    try {
      const cached = getCached('subscriptions');
      if (cached) return cached;
      if (isInQuotaCooldown()) {
        return cached || [];
      }
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
      setCached('subscriptions', subscriptions);
      return subscriptions;
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      markQuotaIfNeeded(error);
      const cached = getCached('subscriptions');
      return cached || [];
    }
  });
}

async function getAdminUsers() {
  return coalesce('users', async () => {
    try {
      const cached = getCached('users');
      if (cached) return cached;
      if (isInQuotaCooldown()) {
        return cached || [];
      }
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
      setCached('users', users);
      return users;
    } catch (error) {
      console.error('Error getting users:', error);
      markQuotaIfNeeded(error);
      const cached = getCached('users');
      return cached || [];
    }
  });
}

async function getAdminPayments() {
  return coalesce('payments', async () => {
    try {
      const cached = getCached('payments');
      if (cached) return cached;
      if (isInQuotaCooldown()) {
        return cached || [];
      }
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
      setCached('payments', payments);
      return payments;
    } catch (error) {
      console.error('Error getting payments:', error);
      markQuotaIfNeeded(error);
      const cached = getCached('payments');
      return cached || [];
    }
  });
}

async function getAdminServices() {
  return coalesce('services', async () => {
    try {
      const cached = getCached('services');
      if (cached) return cached;
      if (isInQuotaCooldown()) {
        // Try local services fallback directly during cooldown
        try {
          const local = await loadServices();
          const fallback = (local || []).map(s => ({
            id: s.serviceID || s.id || s.name,
            name: s.name || '',
            description: s.description || '',
            status: 'active',
            plans: s.plans || [],
            createdAt: new Date().toISOString()
          }));
          setCached('services', fallback);
          return fallback;
        } catch (_) {
          return cached || [];
        }
      }
      const snapshot = await firestore.collection('services').get();
      const servicesList = [];
      
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        servicesList.push({
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          status: data.status || 'active',
          plans: data.plans || [],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      setCached('services', servicesList);
      return servicesList;
    } catch (error) {
      console.error('Error getting services:', error);
      markQuotaIfNeeded(error);
      const cached = getCached('services');
      if (cached) return cached;
      try {
        const local = await loadServices();
        const fallback = (local || []).map(s => ({
          id: s.serviceID || s.id || s.name,
          name: s.name || '',
          description: s.description || '',
          status: 'active',
          plans: s.plans || [],
          createdAt: new Date().toISOString()
        }));
        setCached('services', fallback);
        return fallback;
      } catch (e) {
        return [];
      }
    }
  });
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

// Start the HTTP server and Telegram bot (polling)
async function startApp() {
  try {
    const port = process.env.PORT || 3000;
    await new Promise((resolve, reject) => {
      server.listen(port, '0.0.0.0', (err) => {
        if (err) return reject(err);
        console.log(`🚀 Server listening on port ${port}`);
        const adminUrl = process.env.RENDER_EXTERNAL_URL
          ? `${process.env.RENDER_EXTERNAL_URL.replace(/\/$/, '')}/panel`
          : `http://localhost:${port}/panel`;
        console.log(`🔧 Admin Panel: ${adminUrl}`);
        resolve();
      });
    });

    if (process.env.TELEGRAM_BOT_TOKEN) {
      try {
        await bot.launch();
        console.log('✅ Telegram bot launched (polling)');
      } catch (e) {
        console.error('❌ Failed to start bot (polling):', e.message);
      }
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
