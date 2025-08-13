// This script completely suppresses the debug module in production
// by intercepting ALL require calls at the Node.js level
// Using CommonJS syntax for maximum compatibility

'use strict';

// Create a comprehensive noop debug function
function createNoopDebug(namespace) {
  const noop = function() { return noop; };
  noop.log = function() {};
  noop.enable = function() {};
  noop.disable = function() {};
  noop.enabled = false;
  noop.namespace = namespace || '';
  noop.extend = function(ns) { return createNoopDebug(ns); };
  noop.destroy = function() {};
  noop.color = 0;
  noop.diff = 0;
  noop.inspectOpts = {};
  
  // Make it callable as a function (critical for avvio)
  noop.apply = function() { return noop; };
  noop.call = function() { return noop; };
  noop.bind = function() { return noop; };
  
  return noop;
}

// Always suppress debug in production (Render sets NODE_ENV=production)
const shouldSuppress = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

if (shouldSuppress) {
  // Intercept at the Module level - but be more careful
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    // Only intercept exact debug module matches, not relative paths
    if (id === 'debug' || 
        (id.startsWith('debug/') && !id.startsWith('./')) || 
        (id.endsWith('/debug') && !id.startsWith('./'))) {
      
      // Create a debug function that works with avvio and other packages
      const debugFunc = createNoopDebug();
      
      // Make it a proper function constructor for packages like avvio
      const mainDebug = function(namespace) {
        return createNoopDebug(namespace);
      };
      
      // Copy all properties from our noop debug
      Object.keys(debugFunc).forEach(key => {
        mainDebug[key] = debugFunc[key];
      });
      
      // Add static methods that debug module should have
      mainDebug.enabled = function() { return false; };
      mainDebug.coerce = function(val) { return val; };
      mainDebug.disable = function() {};
      mainDebug.enable = function() {};
      mainDebug.humanize = function() { return '0ms'; };
      mainDebug.destroy = function() {};
      
      return mainDebug;
    }
    
    // For any other module, use original require - don't catch errors for non-debug modules
    return originalRequire.apply(this, arguments);
  };
  
  // Also intercept global require if it exists, but be more conservative
  if (typeof global !== 'undefined' && global.require) {
    const originalGlobalRequire = global.require;
    global.require = function(id) {
      if (id === 'debug' || (id.startsWith('debug/') && !id.startsWith('./'))) {
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
