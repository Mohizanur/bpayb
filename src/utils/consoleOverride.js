// Console Override for Maximum Performance
// Completely silences all console output when PERFORMANCE_MODE=true

let originalConsole = null;
let isOverridden = false;

export const overrideConsole = () => {
  if (process.env.PERFORMANCE_MODE === 'true' && !isOverridden) {
    // Store original console methods
    originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
      debug: console.debug,
      trace: console.trace,
      dir: console.dir,
      dirxml: console.dirxml,
      group: console.group,
      groupCollapsed: console.groupCollapsed,
      groupEnd: console.groupEnd,
      time: console.time,
      timeEnd: console.timeEnd,
      timeLog: console.timeLog,
      profile: console.profile,
      profileEnd: console.profileEnd,
      count: console.count,
      countReset: console.countReset,
      clear: console.clear,
      table: console.table,
      assert: console.assert
    };

    // Override all console methods with no-op functions
    const noop = () => {};
    
    console.log = noop;
    console.error = noop;
    console.warn = noop;
    console.info = noop;
    console.debug = noop;
    console.trace = noop;
    console.dir = noop;
    console.dirxml = noop;
    console.group = noop;
    console.groupCollapsed = noop;
    console.groupEnd = noop;
    console.time = noop;
    console.timeEnd = noop;
    console.timeLog = noop;
    console.profile = noop;
    console.profileEnd = noop;
    console.count = noop;
    console.countReset = noop;
    console.clear = noop;
    console.table = noop;
    console.assert = noop;

    isOverridden = true;
    
    // Log once that console is overridden (this will be the last log)
    if (originalConsole) {
      originalConsole.log('🚀 PERFORMANCE MODE: All console output disabled for maximum speed');
    }
  }
};

export const restoreConsole = () => {
  if (originalConsole && isOverridden) {
    // Restore original console methods
    Object.keys(originalConsole).forEach(key => {
      console[key] = originalConsole[key];
    });
    
    isOverridden = false;
    console.log('✅ Console output restored');
  }
};

export const isConsoleOverridden = () => {
  return isOverridden;
};

// Auto-override on import if performance mode is enabled
overrideConsole();
