// This script suppresses the debug module in production
// by replacing it with a no-op function
// Using CommonJS syntax for maximum compatibility

'use strict';

// Create a noop function with debug-like interface
function createNoopDebug() {
  const noop = function() { return noop; };
  noop.log = function() {};
  noop.enable = function() {};
  noop.disable = function() {};
  noop.enabled = false;
  noop.namespace = '';
  noop.extend = function() { return noop; };
  return noop;
}

// Check if we're in production
if (process.env.NODE_ENV === 'production') {
  // Handle CommonJS require
  if (typeof module !== 'undefined' && module.require) {
    const originalRequire = module.require;
    
    module.require = function(moduleName) {
      if (moduleName === 'debug' || moduleName.startsWith('debug/')) {
        return createNoopDebug();
      }
      return originalRequire.apply(this, arguments);
    };
  }
  
  // Set DEBUG environment variable to empty to prevent debug output
  process.env.DEBUG = '';
  
  console.log('🔇 Debug module is suppressed in production');
}
