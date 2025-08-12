// No-operation debug module replacement
// This completely replaces the debug module with a noop function

'use strict';

function createDebug() {
  const debug = function() { return debug; };
  
  // Add all properties and methods that debug module has
  debug.enabled = false;
  debug.namespace = '';
  debug.useColors = false;
  debug.color = 0;
  debug.diff = 0;
  debug.log = function() {};
  debug.extend = function() { return debug; };
  debug.destroy = function() {};
  debug.enable = function() {};
  debug.disable = function() {};
  debug.coerce = function(val) { return val; };
  debug.inspectOpts = {};
  
  return debug;
}

// Create the main debug function
const debug = createDebug();

// Add static methods
debug.coerce = function(val) { return val; };
debug.disable = function() {};
debug.enable = function() {};
debug.enabled = function() { return false; };
debug.humanize = function() { return '0ms'; };
debug.destroy = function() {};

// Export for both CommonJS and ES modules
module.exports = debug;
module.exports.default = debug;

// Also create named exports that some modules might expect
module.exports.debug = debug;
module.exports.createDebug = createDebug;
