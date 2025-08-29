import fs from 'fs';
import path from 'path';
import { performanceMonitor } from './performanceMonitor.js';

let firestore = null;
let isFirebaseConnected = false;

// Firebase connection with enhanced error handling
async function initializeFirebase() {
  try {
    // Dynamically import firebase-admin only when needed
    let initializeApp;
    let cert;
    let getFirestore;

    try {
      const adminApp = await import('firebase-admin/app');
      const adminFirestore = await import('firebase-admin/firestore');
      initializeApp = adminApp.initializeApp;
      cert = adminApp.cert;
      getFirestore = adminFirestore.getFirestore;
    } catch (importError) {
      console.warn("⚠️ firebase-admin modules not available:", importError.message);
      console.warn("➡️ Falling back to in-memory Firestore mock");
      return createMockFirestore();
    }

    // Try to load Firebase config from environment variables
    let firebaseConfig;
    
    // First try FIREBASE_CONFIG (single JSON string)
    if (process.env.FIREBASE_CONFIG) {
      console.log("Loading Firebase config from FIREBASE_CONFIG environment variable...");
      try {
        firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
      } catch (parseError) {
        console.error("❌ Invalid FIREBASE_CONFIG JSON:", parseError.message);
        console.warn("➡️ Trying individual Firebase environment variables...");
      }
    }
    
    // If FIREBASE_CONFIG failed or doesn't exist, try individual variables
    if (!firebaseConfig && process.env.FIREBASE_PROJECT_ID) {
      console.log("Loading Firebase config from individual environment variables...");
      firebaseConfig = {
        type: "service_account",
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
        token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL
      };
    }
    
    // If still no config, try config file
    if (!firebaseConfig) {
      console.log("Loading Firebase config from file...");
      const configPath = path.resolve(process.cwd(), 'firebaseConfig.json');
      
      if (fs.existsSync(configPath)) {
        try {
          const configFile = fs.readFileSync(configPath, 'utf8');
          firebaseConfig = JSON.parse(configFile);
        } catch (fileError) {
          console.error("❌ Failed reading firebaseConfig.json:", fileError.message);
          if (process.env.NODE_ENV === 'production') {
            process.exit(1);
          }
          console.warn("➡️ Falling back to in-memory Firestore mock (development)");
          return createMockFirestore();
        }
      } else {
        console.error('❌ Firebase configuration not found. Set FIREBASE_CONFIG or individual Firebase environment variables or provide firebaseConfig.json');
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
        console.warn("➡️ Falling back to in-memory Firestore mock (development)");
        return createMockFirestore();
      }
    }

    // Validate required Firebase configuration fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!firebaseConfig[field]) {
        console.error(`❌ Missing required Firebase configuration field: ${field}`);
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
        console.warn("➡️ Falling back to in-memory Firestore mock (development)");
        return createMockFirestore();
      }
    }

    // Initialize Firebase Admin SDK
    const app = initializeApp({
      credential: cert(firebaseConfig),
      databaseURL: `https://${firebaseConfig.project_id}-default-rtdb.firebaseio.com/`
    });

    const db = getFirestore(app);
    isFirebaseConnected = true;
    
    console.log("✅ Firebase initialized successfully");
    console.log(`📊 Connected to project: ${firebaseConfig.project_id}`);
    
    // Test the connection (non-fatal)
    const ok = await testFirebaseConnection(db);
    if (!ok) {
      console.warn("⚠️ Proceeding with real Firestore despite test failure");
    }
    
    return db;
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error.message);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    console.warn("➡️ Falling back to in-memory Firestore mock (development)");
    return createMockFirestore();
  }
}

// Create mock Firestore for testing
function createMockFirestore() {
  const mockData = new Map();
  
  const api = {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => ({
          exists: mockData.has(`${name}/${id}`),
          data: () => mockData.get(`${name}/${id}`) || null
        }),
        set: async (data) => {
          mockData.set(`${name}/${id}`, { id, ...data });
          return { id };
        },
        update: async (data) => {
          const existing = mockData.get(`${name}/${id}`) || {};
          mockData.set(`${name}/${id}`, { ...existing, ...data });
          return { id };
        },
        delete: async () => {
          mockData.delete(`${name}/${id}`);
          return true;
        }
      }),
      add: async (data) => {
        const id = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const docData = { id, ...data };
        mockData.set(`${name}/${id}`, docData);
        return { 
          id,
          get: async () => ({ exists: true, data: () => docData })
        };
      },
      get: async () => {
        const docs = [];
        for (const [key, value] of mockData.entries()) {
          if (key.startsWith(`${name}/`)) {
            docs.push({
              id: value.id,
              data: () => value,
              exists: true
            });
          }
        }
        return {
          docs,
          empty: docs.length === 0,
          size: docs.length,
          forEach: (callback) => docs.forEach(callback),
          docChanges: () => []
        };
      },
      where: (field, op, value) => ({
        get: async () => {
          const docs = [];
          for (const [key, docData] of mockData.entries()) {
            if (key.startsWith(`${name}/`)) {
              let matches = false;
              switch (op) {
                case '==': matches = docData[field] === value; break;
                case '!=': matches = docData[field] !== value; break;
                case '>': matches = docData[field] > value; break;
                case '<': matches = docData[field] < value; break;
                case '>=': matches = docData[field] >= value; break;
                case '<=': matches = docData[field] <= value; break;
                default: matches = docData[field] === value;
              }
              if (matches) {
                docs.push({
                  id: docData.id,
                  data: () => docData,
                  exists: true
                });
              }
            }
          }
          return {
            docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback) => docs.forEach(callback),
            docChanges: () => []
          };
        }
      }),
      onSnapshot: (callback) => {
        // Mock real-time listener
        const unsubscribe = () => console.log(`Mock: Unsubscribed from ${name}`);
        setTimeout(() => {
          const docs = [];
          for (const [key, value] of mockData.entries()) {
            if (key.startsWith(`${name}/`)) {
              docs.push({
                id: value.id,
                data: () => value,
                exists: true
              });
            }
          }
          const snapshot = {
            docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback) => docs.forEach(callback),
            docChanges: () => []
          };
          callback(snapshot);
        }, 100);
        return unsubscribe;
      }
    })
  };

  isFirebaseConnected = false;
  console.log("🧪 Using in-memory Firestore mock");
  return api;
}

// Create tracked Firestore wrapper
function createTrackedFirestore(db) {
  const trackedDb = {
    collection: (collectionName) => {
      const col = db.collection(collectionName);
      return {
        doc: (docId) => {
          const docRef = col.doc(docId);
          return {
            get: async () => {
              performanceMonitor.trackFirestoreOperation('read');
              return await docRef.get();
            },
            set: async (data, options) => {
              performanceMonitor.trackFirestoreOperation('write');
              return await docRef.set(data, options);
            },
            update: async (data) => {
              performanceMonitor.trackFirestoreOperation('write');
              return await docRef.update(data);
            },
            delete: async () => {
              performanceMonitor.trackFirestoreOperation('delete');
              return await docRef.delete();
            }
          };
        },
        get: async () => {
          performanceMonitor.trackFirestoreOperation('read');
          return await col.get();
        },
        add: async (data) => {
          performanceMonitor.trackFirestoreOperation('write');
          return await col.add(data);
        },
        where: (field, operator, value) => {
          const query = col.where(field, operator, value);
          return {
            get: async () => {
              performanceMonitor.trackFirestoreOperation('read');
              return await query.get();
            },
            limit: (limitValue) => {
              const limitedQuery = query.limit(limitValue);
              return {
                get: async () => {
                  performanceMonitor.trackFirestoreOperation('read');
                  return await limitedQuery.get();
                }
              };
            }
          };
        },
        limit: (limitValue) => {
          const limitedCol = col.limit(limitValue);
          return {
            get: async () => {
              performanceMonitor.trackFirestoreOperation('read');
              return await limitedCol.get();
            }
          };
        }
      };
    }
  };
  
  return trackedDb;
}

// Test Firebase connection
async function testFirebaseConnection(dbInstance) {
  try {
    const testDoc = dbInstance.collection('_health_check').doc('test');
    await testDoc.set({ 
      timestamp: new Date().toISOString(), 
      status: 'connected',
      environment: process.env.NODE_ENV || 'development'
    });
    
    const doc = await testDoc.get();
    if (doc.exists) {
      console.log("✅ Firebase connection test successful");
      // Clean up test document
      await testDoc.delete();
      return true;
    } else {
      console.warn("⚠️ Firebase connection test could not verify readback (doc not found)");
      return false;
    }
  } catch (error) {
    console.warn("⚠️ Firebase connection test failed:", error.message);
    // Do not throw; allow app to continue using real Firestore
    return false;
  }
}

// Enhanced database operations with proper error handling
class FirestoreManager {
  constructor(db) {
    this.db = db;
  }

  // Create document with auto-generated ID
  async createDocument(collection, data) {
    try {
      const result = await this.db.collection(collection).add(data);
      const documentData = {
        id: result.id,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log(`✅ Document created in ${collection}: ${result.id}`);
      return { success: true, id: result.id, data: documentData };
    } catch (error) {
      console.error(`❌ Error creating document in ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Create document with specific ID
  async setDocument(collection, id, data) {
    try {
      const docRef = this.db.collection(collection).doc(id);
      const documentData = {
        id,
        ...data,
        createdAt: data.createdAt || new Date(),
        updatedAt: new Date()
      };
      
      await docRef.set(documentData);
      console.log(`✅ Document set in ${collection}: ${id}`);
      return { success: true, id, data: documentData };
    } catch (error) {
      console.error(`❌ Error setting document in ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get document by ID
  async getDocument(collection, id) {
    try {
      const docRef = this.db.collection(collection).doc(id);
      const doc = await docRef.get();
      
      if (doc.exists) {
        return { success: true, data: doc.data() };
      } else {
        return { success: false, error: 'Document not found' };
      }
    } catch (error) {
      console.error(`❌ Error getting document from ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Update document
  async updateDocument(collection, id, updates) {
    try {
      const docRef = this.db.collection(collection).doc(id);
      const updateData = {
        ...updates,
        updatedAt: new Date()
      };
      
      await docRef.update(updateData);
      console.log(`✅ Document updated in ${collection}: ${id}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error updating document in ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Delete document
  async deleteDocument(collection, id) {
    try {
      await this.db.collection(collection).doc(id).delete();
      console.log(`✅ Document deleted from ${collection}: ${id}`);
      return { success: true };
    } catch (error) {
      console.error(`❌ Error deleting document from ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Query documents
  async queryDocuments(collection, conditions = {}) {
    try {
      let query = this.db.collection(collection);
      
      // Apply conditions
      Object.entries(conditions).forEach(([field, condition]) => {
        if (typeof condition === 'object' && condition.operator) {
          query = query.where(field, condition.operator, condition.value);
        } else {
          query = query.where(field, '==', condition);
        }
      });
      
      const snapshot = await query.get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: documents };
    } catch (error) {
      console.error(`❌ Error querying ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Get all documents in a collection
  async getAllDocuments(collection) {
    try {
      const snapshot = await this.db.collection(collection).get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      
      return { success: true, data: documents };
    } catch (error) {
      console.error(`❌ Error getting all documents from ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }

  // Set up real-time listener
  setupListener(collection, callback) {
    try {
      const unsubscribe = this.db.collection(collection).onSnapshot(
        (snapshot) => {
          const documents = [];
          snapshot.forEach(doc => {
            documents.push({ id: doc.id, ...doc.data() });
          });
          callback({ success: true, data: documents });
        },
        (error) => {
          console.error(`❌ Listener error for ${collection}:`, error);
          callback({ success: false, error: error.message });
        }
      );
      
      console.log(`✅ Real-time listener set up for ${collection}`);
      return unsubscribe;
    } catch (error) {
      console.error(`❌ Error setting up listener for ${collection}:`, error);
      return null;
    }
  }

  // Get collection statistics
  async getCollectionStats(collection) {
    try {
      const snapshot = await this.db.collection(collection).get();
      return {
        success: true,
        stats: {
          totalDocuments: snapshot.size,
          collection: collection,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error(`❌ Error getting stats for ${collection}:`, error);
      return { success: false, error: error.message };
    }
  }
}

// Initialize Firebase and create manager instance
let firestoreManager = null;

try {
  console.log("🚀 Initializing Firebase connection...");
  const db = await initializeFirebase();
  
  // Wrap with performance tracking
  const trackedDb = createTrackedFirestore(db);
  
  firestore = trackedDb;
  firestoreManager = new FirestoreManager(trackedDb);
  console.log("✅ Firebase integration completed successfully with performance tracking");
} catch (error) {
  // We should not reach here since initializeFirebase falls back to mock
  console.error("💥 Unexpected error during Firebase initialization:", error.message);
  firestore = createMockFirestore();
  firestoreManager = new FirestoreManager(firestore);
  isFirebaseConnected = false;
}

export { firestore, firestoreManager, isFirebaseConnected, initializeFirebase };
