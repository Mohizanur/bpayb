// This script completely suppresses the debug module in production
// by intercepting ALL require calls at the Node.js level
// Using CommonJS syntax for maximum compatibility

'use strict';

// Create a comprehensive noop debug function
function createNoopDebug() {
  const noop = function() { return noop; };
  noop.log = function() {};
  noop.enable = function() {};
  noop.disable = function() {};
  noop.enabled = false;
  noop.namespace = '';
  noop.extend = function() { return noop; };
  noop.destroy = function() {};
  noop.color = 0;
  noop.diff = 0;
  noop.inspectOpts = {};
  return noop;
}

// Always suppress debug in production (Render sets NODE_ENV=production)
const shouldSuppress = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

if (shouldSuppress) {
  // Intercept at the Module level - most comprehensive approach
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    // Intercept debug module and all its variants
    if (id === 'debug' || 
        id.startsWith('debug/') || 
        id.endsWith('/debug') ||
        id.includes('debug/src') ||
        id.includes('/debug/')) {
      return createNoopDebug();
    }
    
    // For any other module, use original require
    try {
      return originalRequire.apply(this, arguments);
    } catch (error) {
      // If module fails to load and it's debug-related, return noop
      if (error.code === 'MODULE_NOT_FOUND' && 
          (id.includes('debug') || error.message.includes('debug'))) {
        return createNoopDebug();
      }
      throw error;
    }
  };
  
  // Also intercept global require if it exists
  if (typeof global !== 'undefined' && global.require) {
    const originalGlobalRequire = global.require;
    global.require = function(id) {
      if (id === 'debug' || id.startsWith('debug/')) {
        return createNoopDebug();
      }
      return originalGlobalRequire.apply(this, arguments);
    };
  }
  
  // Set all debug-related environment variables
  process.env.DEBUG = '';
  process.env.DEBUG_COLORS = 'false';
  process.env.DEBUG_DEPTH = '0';
  process.env.DEBUG_SHOW_HIDDEN = 'false';
  
  console.log('🔇 Debug module is completely suppressed in production');
} else {
  console.log('🔍 Debug module suppression skipped (not in production)');
}
