import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let firestore = null;
let isFirebaseConnected = false;

// Enhanced mock firestore for better functionality
const createMockFirestore = () => ({
  collection: (name) => ({
    doc: (id) => ({
      get: async () => ({ 
        exists: false, 
        data: () => null,
        id: id || 'mock-id'
      }),
      set: async (data) => {
        console.log(`Mock Firestore: Setting data in ${name}/${id}:`, data);
        return { id: id || 'mock-id' };
      },
      update: async (data) => {
        console.log(`Mock Firestore: Updating data in ${name}/${id}:`, data);
        return { id: id || 'mock-id' };
      },
    }),
    add: async (data) => {
      console.log(`Mock Firestore: Adding data to ${name}:`, data);
      return { id: 'mock-' + Date.now() };
    },
    where: (field, op, value) => ({
      get: async () => ({ 
        empty: true, 
        size: 0,
        docs: [],
        forEach: () => {} 
      }),
      limit: (num) => ({
        get: async () => ({ 
          empty: true, 
          size: 0,
          docs: [],
          forEach: () => {} 
        })
      })
    }),
    onSnapshot: (callback) => {
      console.log(`Mock Firestore: Setting up listener for ${name}`);
      // Return unsubscribe function
      return () => console.log(`Mock Firestore: Unsubscribed from ${name}`);
    },
    get: async () => ({ 
      empty: true, 
      size: 0,
      docs: [],
      forEach: () => {} 
    })
  })
});

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
  console.log("🔄 Using mock Firestore - bot will work with limited functionality");
  firestore = createMockFirestore();
  isFirebaseConnected = false;
}

export { firestore, isFirebaseConnected };
