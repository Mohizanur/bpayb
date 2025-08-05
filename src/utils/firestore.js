import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

let firestore = null;

try {
  const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);

  initializeApp({
    credential: cert(firebaseConfig),
  });

  firestore = getFirestore();
  console.log("Firestore initialized successfully");
} catch (error) {
  console.error("Error initializing Firestore:", error);
  // Create a mock firestore object that won't crash the app
  firestore = {
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: false, data: () => null }),
        set: async () => {},
        update: async () => {},
      }),
      add: async () => {},
      where: () => ({
        get: async () => ({ empty: true, forEach: () => {} }),
      }),
      onSnapshot: () => {}, // Add this for the listener
    }),
  };
}

export { firestore };
