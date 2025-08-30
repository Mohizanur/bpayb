#!/usr/bin/env node

// Performance Startup Script for BirrPay Bot
// Sets all environment variables for maximum performance

// Set performance environment variables
process.env.LOG_LEVEL = 'none';
process.env.ENABLE_CONSOLE_LOGS = 'false';
process.env.ENABLE_FIRESTORE_LOGS = 'false';
process.env.ENABLE_PERFORMANCE_LOGS = 'false';
process.env.ENABLE_DEBUG_LOGS = 'false';
process.env.PERFORMANCE_MODE = 'true';

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

// Import and start the bot
import('./complete-admin-bot.js').catch(error => {
  // Only log critical errors in performance mode
  if (process.env.PERFORMANCE_MODE !== 'true') {
    console.error('Failed to start bot:', error);
  }
  process.exit(1);
});
