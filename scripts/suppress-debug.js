// This module suppresses the debug module in production
if (process.env.NODE_ENV === 'production') {
  // Replace the debug module with a no-op function
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function (id) {
    if (id === 'debug' || id.startsWith('debug/')) {
      // Return a no-op debug function
      const noop = () => {};
      noop.enabled = false;
      noop.log = () => {};
      return noop;
    }
    return originalRequire.apply(this, arguments);
  };
  
  console.log('🔇 Debug module is suppressed in production');
}
