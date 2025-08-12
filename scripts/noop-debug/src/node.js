// Node.js specific debug implementation (noop version)
'use strict';

const common = require('./common');

// Create noop debug function
const debug = common(process.env);

// Add Node.js specific properties
debug.init = function() {};
debug.log = function() {};
debug.formatArgs = function() {};
debug.save = function() {};
debug.load = function() { return ''; };
debug.useColors = function() { return false; };
debug.colors = [];
debug.inspectOpts = {};

module.exports = debug;
