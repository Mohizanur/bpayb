#!/usr/bin/env node

// Simple production startup - no debug suppression interference
// Directly start the application without any module interception

'use strict';

// Set production environment
process.env.NODE_ENV = 'production';
process.env.DEBUG = '';

console.log('🚀 Starting BirrPay in production mode...');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT || '8080');

// Start the main application directly
require('./src/index.js');