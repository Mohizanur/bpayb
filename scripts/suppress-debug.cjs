// This script suppresses the debug module in production
// by replacing it with a no-op function
// This is a workaround for the debug module's ESM compatibility issues

// Create a noop function with debug-like interface
const createNoopDebug = () => {
  const noop = () => noop;
  noop.log = () => {};
  noop.enable = () => {};
  noop.disable = () => {};
  noop.enabled = false;
  noop.namespace = '';
  noop.extend = () => noop;
  return noop;
};

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
  
  // Handle ESM imports
  if (typeof import !== 'undefined') {
    (async () => {
      try {
        const debugModule = await import('debug');
        const noop = createNoopDebug();
        
        // Override all exports
        Object.keys(debugModule).forEach(key => {
          debugModule[key] = noop;
        });
        
        // Override default export
        if (debugModule.default) {
          debugModule.default = noop;
        }
      } catch (error) {
        console.warn('Failed to suppress debug module in ESM context:', error.message);
      }
    })();
  }
  
  // Set DEBUG environment variable to empty to prevent debug output
  process.env.DEBUG = '';
  
  console.log('🔇 Debug module is suppressed in production');
}
