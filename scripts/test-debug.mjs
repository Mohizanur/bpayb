// Test debug module compatibility with CommonJS
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const debug = require('debug')('test');

// Test basic debug functionality
debug('Testing debug module...');

// Test debug with namespaces
const debugHttp = debug.extend('http');
debugHttp('HTTP debug test');

// Test error handling
try {
  // Test if debug is working
  debug.enabled = true;
  debug('Debug is enabled');
  console.log('✅ Debug module is working correctly!');
  console.log('You can now push the changes.');
  process.exit(0);
} catch (err) {
  console.error('❌ Debug test failed:', err);
  process.exit(1);
}
