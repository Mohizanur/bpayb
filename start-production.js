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

// Preload debug suppression to avoid "./common" resolution errors from debug module
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
try {
	require('./scripts/suppress-debug.cjs');
	console.log('🔇 Debug suppression preloaded');
} catch (e) {
	console.warn('⚠️ Failed to preload debug suppression:', e?.message || e);
}

// Start the main application using ES module import
import('./src/index.js').catch(error => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});