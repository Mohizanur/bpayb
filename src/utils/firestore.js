import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let firestore = null;
let isFirebaseConnected = false;

// Enhanced local storage data manager
class LocalDataManager {
  constructor() {
    this.dbName = 'birrpay_db';
    this.initializeData();
  }

  initializeData() {
    // Initialize collections if they don't exist
    const collections = ['users', 'subscriptions', 'payments', 'support_tickets', 'services', 'analytics'];
    collections.forEach(collection => {
      if (!localStorage.getItem(`${this.dbName}_${collection}`)) {
        localStorage.setItem(`${this.dbName}_${collection}`, JSON.stringify([]));
      }
    });

    // Initialize sample services data
    const services = JSON.parse(localStorage.getItem(`${this.dbName}_services`) || '[]');
    if (services.length === 0) {
      const sampleServices = [
        { 
          id: 'netflix', 
          name: 'Netflix', 
          price: 350, 
          description: 'Stream movies, TV shows and more',
          logo: 'logos/netflix.png',
          category: 'streaming',
          status: 'active',
          features: ['HD Streaming', 'Multiple Devices', 'Download for Offline']
        },
        { 
          id: 'prime', 
          name: 'Amazon Prime', 
          price: 300, 
          description: 'Prime Video, Music and Shopping benefits',
          logo: 'logos/prime.png',
          category: 'streaming',
          status: 'active',
          features: ['Prime Video', 'Free Shipping', 'Prime Music']
        },
        { 
          id: 'spotify', 
          name: 'Spotify Premium', 
          price: 250, 
          description: 'Music streaming without ads',
          logo: 'logos/spotify.png',
          category: 'music',
          status: 'active',
          features: ['Ad-free Music', 'Offline Downloads', 'High Quality Audio']
        }
      ];
      localStorage.setItem(`${this.dbName}_services`, JSON.stringify(sampleServices));
    }
  }

  getData(collection) {
    try {
      return JSON.parse(localStorage.getItem(`${this.dbName}_${collection}`) || '[]');
    } catch (error) {
      console.error(`Error reading ${collection}:`, error);
      return [];
    }
  }

  setData(collection, data) {
    try {
      localStorage.setItem(`${this.dbName}_${collection}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error(`Error writing ${collection}:`, error);
      return false;
    }
  }

  addDocument(collection, document) {
    const data = this.getData(collection);
    const newDoc = {
      id: document.id || `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...document,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newDoc);
    this.setData(collection, data);
    return newDoc;
  }

  updateDocument(collection, id, updates) {
    const data = this.getData(collection);
    const index = data.findIndex(doc => doc.id === id);
    if (index !== -1) {
      data[index] = {
        ...data[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.setData(collection, data);
      return data[index];
    }
    return null;
  }

  getDocument(collection, id) {
    const data = this.getData(collection);
    return data.find(doc => doc.id === id) || null;
  }

  deleteDocument(collection, id) {
    const data = this.getData(collection);
    const filteredData = data.filter(doc => doc.id !== id);
    this.setData(collection, filteredData);
    return filteredData.length < data.length;
  }

  queryDocuments(collection, conditions = {}) {
    const data = this.getData(collection);
    return data.filter(doc => {
      return Object.keys(conditions).every(key => {
        if (typeof conditions[key] === 'object' && conditions[key].operator) {
          const { operator, value } = conditions[key];
          switch (operator) {
            case '==': return doc[key] === value;
            case '!=': return doc[key] !== value;
            case '>': return doc[key] > value;
            case '<': return doc[key] < value;
            case '>=': return doc[key] >= value;
            case '<=': return doc[key] <= value;
            case 'array-contains': return Array.isArray(doc[key]) && doc[key].includes(value);
            default: return doc[key] === value;
          }
        }
        return doc[key] === conditions[key];
      });
    });
  }

  getStats() {
    const users = this.getData('users');
    const subscriptions = this.getData('subscriptions');
    const payments = this.getData('payments');
    const tickets = this.getData('support_tickets');

    return {
      totalUsers: users.length,
      activeSubscriptions: subscriptions.filter(s => s.status === 'active').length,
      totalRevenue: payments.reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingTickets: tickets.filter(t => t.status === 'open').length,
      paidUsers: users.filter(u => u.isPaid).length
    };
  }
}

// Enhanced mock firestore for better functionality
const createMockFirestore = () => {
  const dataManager = new LocalDataManager();

  return {
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          const doc = dataManager.getDocument(name, id);
          return { 
            exists: !!doc, 
            data: () => doc,
            id: id || 'mock-id'
          };
        },
        set: async (data) => {
          console.log(`Mock Firestore: Setting data in ${name}/${id}:`, data);
          const result = dataManager.updateDocument(name, id, data) || dataManager.addDocument(name, { id, ...data });
          return { id: result.id };
        },
        update: async (data) => {
          console.log(`Mock Firestore: Updating data in ${name}/${id}:`, data);
          const result = dataManager.updateDocument(name, id, data);
          return { id: result?.id || id };
        },
        delete: async () => {
          console.log(`Mock Firestore: Deleting document ${name}/${id}`);
          return dataManager.deleteDocument(name, id);
        }
      }),
      add: async (data) => {
        console.log(`Mock Firestore: Adding data to ${name}:`, data);
        const result = dataManager.addDocument(name, data);
        return { id: result.id };
      },
      where: (field, op, value) => ({
        get: async () => {
          const docs = dataManager.queryDocuments(name, { [field]: { operator: op, value } });
          return { 
            empty: docs.length === 0, 
            size: docs.length,
            docs: docs.map(doc => ({
              id: doc.id,
              data: () => doc,
              exists: true
            })),
            forEach: (callback) => docs.forEach((doc, index) => {
              callback({
                id: doc.id,
                data: () => doc,
                exists: true
              }, index);
            })
          };
        },
        limit: (num) => ({
          get: async () => {
            const docs = dataManager.queryDocuments(name, { [field]: { operator: op, value } }).slice(0, num);
            return { 
              empty: docs.length === 0, 
              size: docs.length,
              docs: docs.map(doc => ({
                id: doc.id,
                data: () => doc,
                exists: true
              })),
              forEach: (callback) => docs.forEach((doc, index) => {
                callback({
                  id: doc.id,
                  data: () => doc,
                  exists: true
                }, index);
              })
            };
          }
        })
      }),
      onSnapshot: (callback) => {
        console.log(`Mock Firestore: Setting up listener for ${name}`);
        
        // Simulate real-time updates by periodically checking for changes
        const intervalId = setInterval(() => {
          const docs = dataManager.getData(name);
          const snapshot = {
            empty: docs.length === 0,
            size: docs.length,
            docs: docs.map(doc => ({
              id: doc.id,
              data: () => doc,
              exists: true
            })),
            forEach: (callback) => docs.forEach((doc, index) => {
              callback({
                id: doc.id,
                data: () => doc,
                exists: true
              }, index);
            })
          };
          callback(snapshot);
        }, 30000); // Check every 30 seconds
        
        // Return unsubscribe function
        return () => {
          clearInterval(intervalId);
          console.log(`Mock Firestore: Unsubscribed from ${name}`);
        };
      },
      get: async () => {
        const docs = dataManager.getData(name);
        return { 
          empty: docs.length === 0, 
          size: docs.length,
          docs: docs.map(doc => ({
            id: doc.id,
            data: () => doc,
            exists: true
          })),
          forEach: (callback) => docs.forEach((doc, index) => {
            callback({
              id: doc.id,
              data: () => doc,
              exists: true
            }, index);
          })
        };
      }
    }),
    
    // Add utility methods for stats and management
    getStats: () => dataManager.getStats(),
    clearCollection: (name) => dataManager.setData(name, []),
    exportData: () => {
      const data = {};
      ['users', 'subscriptions', 'payments', 'support_tickets', 'services', 'analytics'].forEach(collection => {
        data[collection] = dataManager.getData(collection);
      });
      return data;
    },
    importData: (data) => {
      Object.keys(data).forEach(collection => {
        dataManager.setData(collection, data[collection]);
      });
    }
  };
};

try {
  if (!process.env.FIREBASE_CONFIG) {
    throw new Error('FIREBASE_CONFIG environment variable not set');
  }

  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
  
  if (!firebaseConfig.project_id || !firebaseConfig.private_key || !firebaseConfig.client_email) {
    throw new Error('Invalid Firebase configuration - missing required fields');
  }

  initializeApp({
    credential: cert(firebaseConfig),
  });

  firestore = getFirestore();
  isFirebaseConnected = true;
  console.log("✅ Firestore initialized successfully");
} catch (error) {
  console.error("❌ Error initializing Firestore:", error.message);
  console.log("🔄 Using enhanced mock Firestore with local storage persistence");
  firestore = createMockFirestore();
  isFirebaseConnected = false;
}

export { firestore, isFirebaseConnected };
