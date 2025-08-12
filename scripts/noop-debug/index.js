// No-operation debug module replacement
// This completely replaces the debug module with a noop function
// Specifically designed to work with avvio and other Fastify dependencies

'use strict';

function createDebug(namespace) {
  const debug = function() { return debug; };
  
  // Add all properties and methods that debug module has
  debug.enabled = false;
  debug.namespace = namespace || '';
  debug.useColors = false;
  debug.color = 0;
  debug.diff = 0;
  debug.log = function() {};
  debug.extend = function(ns) { return createDebug(ns); };
  debug.destroy = function() {};
  debug.enable = function() {};
  debug.disable = function() {};
  debug.coerce = function(val) { return val; };
  debug.inspectOpts = {};
  
  return debug;
}

// Create the main debug function that works as a constructor
const mainDebug = function(namespace) {
  return createDebug(namespace);
};

// Add all static methods that debug module should have
mainDebug.coerce = function(val) { return val; };
mainDebug.disable = function() {};
mainDebug.enable = function() {};
mainDebug.enabled = function() { return false; };
mainDebug.humanize = function() { return '0ms'; };
mainDebug.destroy = function() {};
mainDebug.log = function() {};
mainDebug.extend = function(ns) { return createDebug(ns); };
mainDebug.namespace = '';
mainDebug.useColors = false;
mainDebug.color = 0;
mainDebug.diff = 0;
mainDebug.inspectOpts = {};

// Export for both CommonJS and ES modules
module.exports = mainDebug;
module.exports.default = mainDebug;

// Also create named exports that some modules might expect
module.exports.debug = mainDebug;
module.exports.createDebug = createDebug;
