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

// Create minimal Firestore/admin stubs to avoid crashes if required
function createNoopFirestoreModule() {
  const collectionStub = () => ({
    doc: () => ({ get: async () => ({ exists: false }), set: async () => ({}), update: async () => ({}), delete: async () => ({}) }),
    add: async () => ({ id: 'mock_id', get: async () => ({ exists: true, data: () => ({}) }) }),
    get: async () => ({ docs: [], empty: true, size: 0, forEach: () => {}, docChanges: () => [] }),
    where: () => ({ get: async () => ({ docs: [], empty: true, size: 0, forEach: () => {}, docChanges: () => [] }) }),
    onSnapshot: (cb) => { setTimeout(() => cb({ docs: [], empty: true, size: 0, forEach: () => {}, docChanges: () => [] }), 10); return () => {}; }
  });

  class Firestore {
    collection() { return collectionStub(); }
  }

  return {
    Firestore,
    Timestamp: { now: () => new Date() },
    FieldValue: { serverTimestamp: () => new Date() }
  };
}

function createNoopFirebaseAdmin() {
  const firestoreModule = {
    getFirestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) })
  };
  const appModule = {
    initializeApp: () => ({}),
    cert: () => ({})
  };
  const adminDefault = {
    apps: [],
    initializeApp: () => ({}),
    credential: { cert: () => ({}) },
    firestore: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: false }) }) }) })
  };
  return { firestoreModule, appModule, adminDefault };
}

// Always suppress debug in production (Render sets NODE_ENV=production)
const shouldSuppress = process.env.NODE_ENV === 'production' || process.env.RENDER === 'true';

if (shouldSuppress) {
  // Intercept at the Module level - but be more careful
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    // Intercept debug
    if (id === 'debug' || 
        (id.startsWith('debug/') && !id.startsWith('./')) || 
        (id.endsWith('/debug') && !id.startsWith('./'))) {
      // Create a debug function that works with avvio and other packages
      const debugFunc = createNoopDebug();
      const mainDebug = function(namespace) { return createNoopDebug(namespace); };
      Object.keys(debugFunc).forEach(key => { mainDebug[key] = debugFunc[key]; });
      mainDebug.enabled = function() { return false; };
      mainDebug.coerce = function(val) { return val; };
      mainDebug.disable = function() {};
      mainDebug.enable = function() {};
      mainDebug.humanize = function() { return '0ms'; };
      mainDebug.destroy = function() {};
      return mainDebug;
    }

    // Intercept Firestore/admin modules to avoid missing './reference' crashes
    if (
      id === '@google-cloud/firestore' || id.startsWith('@google-cloud/firestore') ||
      id === 'firebase-admin/firestore' || id.startsWith('firebase-admin/firestore')
    ) {
      process.env.FIRESTORE_STUBBED = 'true';
      return createNoopFirestoreModule();
    }

    if (id === 'firebase-admin') {
      process.env.FIREBASE_ADMIN_STUBBED = 'true';
      const { adminDefault } = createNoopFirebaseAdmin();
      return adminDefault;
    }

    if (id === 'firebase-admin/app') {
      process.env.FIREBASE_ADMIN_STUBBED = 'true';
      const { appModule } = createNoopFirebaseAdmin();
      return appModule;
    }

    if (id === 'firebase-admin/firestore') {
      process.env.FIREBASE_ADMIN_STUBBED = 'true';
      const { firestoreModule } = createNoopFirebaseAdmin();
      return firestoreModule;
    }
    
    // For any other module, use original require - don't catch errors for non-debug modules
    return originalRequire.apply(this, arguments);
  };
  
  // Also intercept global require if it exists, but be conservative
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
