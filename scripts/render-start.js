#!/usr/bin/env node

// Render-specific startup script that handles dependencies properly
// This script sets up the environment without interfering with Firebase modules

'use strict';

// Set production environment
process.env.NODE_ENV = 'production';

// Suppress debug output in a safer way
process.env.DEBUG = '';
process.env.DEBUG_COLORS = 'false';

// Only suppress debug logs, don't interfere with module resolution
const originalConsoleLog = console.log;
const originalConsoleDebug = console.debug;

// Replace debug console methods with noops
console.debug = function() {};
console.log = function(...args) {
  // Filter out debug-related logs but allow important startup messages
  const message = args.join(' ');
  if (message.includes('debug') && !message.includes('🔇') && !message.includes('✅') && !message.includes('🚀')) {
    return; // Skip debug logs
  }
  originalConsoleLog.apply(this, args);
};

console.log('🔇 Debug output suppressed for production (safe mode)');

// Start the main application
require('../src/index.js');