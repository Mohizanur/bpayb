import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from 'fs';
import path from 'path';

let firestore = null;
let isFirebaseConnected = false;

// Firebase connection with enhanced error handling
async function initializeFirebase() {
  try {
    // Try to load Firebase config from environment variable first
    let firebaseConfig;
    
    if (process.env.FIREBASE_CONFIG) {
      console.log("Loading Firebase config from environment variable...");
      firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    } else {
      // Fallback to config file
      console.log("Loading Firebase config from file...");
      const configPath = path.resolve(process.cwd(), 'firebaseConfig.json');
      
      if (fs.existsSync(configPath)) {
        const configFile = fs.readFileSync(configPath, 'utf8');
        firebaseConfig = JSON.parse(configFile);
      } else {
        throw new Error('Firebase configuration not found. Please set FIREBASE_CONFIG environment variable or provide firebaseConfig.json');
      }
    }

    // Validate required Firebase configuration fields
    const requiredFields = ['project_id', 'private_key', 'client_email'];
    for (const field of requiredFields) {
      if (!firebaseConfig[field]) {
        throw new Error(`Missing required Firebase configuration field: ${field}`);
      }
    }

    // Initialize Firebase Admin SDK
    const app = initializeApp({
      credential: cert(firebaseConfig),
      databaseURL: `https://${firebaseConfig.project_id}-default-rtdb.firebaseio.com/`
    });

    firestore = getFirestore(app);
    isFirebaseConnected = true;
    
    console.log("✅ Firebase initialized successfully");
    console.log(`📊 Connected to project: ${firebaseConfig.project_id}`);
    
    // Test the connection
    await testFirebaseConnection();
    
    return firestore;
  } catch (error) {
    console.error("❌ Error initializing Firebase:", error.message);
    
    // For testing environment, use mock instead of failing
    if (process.env.NODE_ENV === 'test') {
      console.log("🧪 Using mock Firestore for testing");
      return createMockFirestore();
    }
    
    throw error;
  }
}

// Create mock Firestore for testing
function createMockFirestore() {
  const mockData = new Map();
  
  return {
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
          forEach: (callback) => docs.forEach(callback)
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
            forEach: (callback) => docs.forEach(callback)
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
          callback({
            docs,
            empty: docs.length === 0,
            size: docs.length,
            forEach: (callback) => docs.forEach(callback)
          });
        }, 100);
        return unsubscribe;
      }
    })
  };
}

// Test Firebase connection
async function testFirebaseConnection() {
  try {
    const testDoc = firestore.collection('_health_check').doc('test');
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
    } else {
      throw new Error("Failed to write/read test document");
    }
  } catch (error) {
    console.error("❌ Firebase connection test failed:", error.message);
    throw error;
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
  firestore = await initializeFirebase();
  firestoreManager = new FirestoreManager(firestore);
  console.log("✅ Firebase integration completed successfully");
} catch (error) {
  if (process.env.NODE_ENV === 'test') {
    console.log("🧪 Using mock Firestore for testing environment");
    firestore = createMockFirestore();
    firestoreManager = new FirestoreManager(firestore);
    isFirebaseConnected = false;
  } else {
    console.error("💥 CRITICAL ERROR: Firebase initialization failed");
    console.error("This is a production system that requires Firebase connection");
    console.error("Error details:", error.message);
    
    // In production, try to continue with degraded functionality
    if (process.env.NODE_ENV === 'production') {
      console.log("⚠️  Running in degraded mode without Firebase");
      firestore = createMockFirestore();
      firestoreManager = new FirestoreManager(firestore);
      isFirebaseConnected = false;
    } else {
      process.exit(1); // Exit the application if Firebase fails in development
    }
  }
}

export { firestore, firestoreManager, isFirebaseConnected };
