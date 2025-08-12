// Pre-require debug suppression - loads before ANY other modules
// This must be the very first thing that runs to catch all debug calls

'use strict';

// Immediately set environment variables to disable debug
process.env.DEBUG = '';
process.env.DEBUG_COLORS = 'false';
process.env.DEBUG_DEPTH = '0';
process.env.DEBUG_SHOW_HIDDEN = 'false';

// Create the most comprehensive noop debug function possible
function createUltimateNoopDebug(namespace) {
  const noop = function(...args) { 
    // Always return self to allow chaining
    return noop; 
  };
  
  // Add ALL possible debug properties and methods
  noop.enabled = false;
  noop.namespace = namespace || '';
  noop.useColors = false;
  noop.color = 0;
  noop.diff = 0;
  noop.log = noop;
  noop.extend = function(ns) { return createUltimateNoopDebug(ns); };
  noop.destroy = noop;
  noop.enable = noop;
  noop.disable = noop;
  noop.coerce = function(val) { return val; };
  noop.inspectOpts = {};
  noop.formatArgs = noop;
  noop.save = noop;
  noop.load = function() { return ''; };
  noop.colors = [];
  noop.init = noop;
  noop.selectColor = noop;
  noop.humanize = function() { return '0ms'; };
  
  // Make it work as both function and constructor
  noop.apply = noop;
  noop.call = noop;
  noop.bind = function() { return noop; };
  noop.constructor = noop;
  
  return noop;
}

// Create main debug function that works as constructor
const mainDebug = function(namespace) {
  return createUltimateNoopDebug(namespace);
};

// Copy all noop properties to main function
const noopInstance = createUltimateNoopDebug();
Object.keys(noopInstance).forEach(key => {
  if (typeof noopInstance[key] === 'function') {
    mainDebug[key] = noopInstance[key];
  } else {
    mainDebug[key] = noopInstance[key];
  }
});

// Add static methods
mainDebug.enabled = function() { return false; };
mainDebug.coerce = function(val) { return val; };
mainDebug.disable = function() {};
mainDebug.enable = function() {};
mainDebug.humanize = function() { return '0ms'; };
mainDebug.destroy = function() {};

// CRITICAL: Intercept require at the earliest possible moment
const Module = require('module');
const originalRequire = Module.prototype.require;

Module.prototype.require = function(id) {
  // Intercept ALL debug-related requires
  if (id === 'debug' || 
      id.startsWith('debug/') || 
      id.endsWith('/debug') ||
      id.includes('debug') ||
      id === './debug' ||
      id === '../debug') {
    return mainDebug;
  }
  
  // For all other modules, try original require with debug fallback
  try {
    return originalRequire.apply(this, arguments);
  } catch (error) {
    // If ANY module fails and mentions debug, return our noop
    if (error.code === 'MODULE_NOT_FOUND' && 
        (id.includes('debug') || error.message.includes('debug'))) {
      return mainDebug;
    }
    throw error;
  }
};

// Also override global require if it exists
if (typeof global !== 'undefined') {
  global.debug = mainDebug;
  if (global.require) {
    const originalGlobalRequire = global.require;
    global.require = function(id) {
      if (id.includes('debug')) {
        return mainDebug;
      }
      return originalGlobalRequire.apply(this, arguments);
    };
  }
}

// Override process.binding for debug-related bindings
const originalBinding = process.binding;
if (originalBinding) {
  process.binding = function(name) {
    if (name.includes('debug')) {
      return {};
    }
    return originalBinding.apply(this, arguments);
  };
}

console.log('🔇 Pre-require debug suppression active - ALL debug calls intercepted');
