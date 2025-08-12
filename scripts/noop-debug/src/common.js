// Common utilities for debug module (noop version)
'use strict';

module.exports = function setup(env) {
  return function createDebug(namespace) {
    const debug = function() { return debug; };
    debug.enabled = false;
    debug.namespace = namespace || '';
    debug.useColors = false;
    debug.color = 0;
    debug.diff = 0;
    debug.log = function() {};
    debug.extend = function() { return debug; };
    debug.destroy = function() {};
    return debug;
  };
};

// Export commonly used functions
module.exports.coerce = function(val) { return val; };
module.exports.disable = function() {};
module.exports.enable = function() {};
module.exports.enabled = function() { return false; };
module.exports.humanize = function() { return '0ms'; };
module.exports.destroy = function() {};
