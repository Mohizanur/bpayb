#!/usr/bin/env node

// Simple production startup - no debug suppression interference
// Directly start the application without any module interception
// Using ES modules syntax since package.json has "type": "module"

// Set production environment
process.env.NODE_ENV = 'production';
process.env.DEBUG = '';

console.log('🚀 Starting BirrPay in production mode...');
console.log('🔧 Environment:', process.env.NODE_ENV);
console.log('📍 Port:', process.env.PORT || '8080');

// Start the main application using ES module import
import('./src/index.js').catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});