import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

try {
  console.log('Testing Firebase Admin initialization...');
  
  // Get Firebase config from environment variables
  const firebaseConfig = process.env.FIREBASE_CONFIG;
  if (!firebaseConfig) {
    throw new Error('FIREBASE_CONFIG environment variable is not set');
  }
  
  // Initialize Firebase Admin
  const serviceAccount = JSON.parse(firebaseConfig);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  console.log('✅ Firebase Admin initialized successfully');
  
  // Test Firestore connection
  const db = admin.firestore();
  console.log('✅ Firestore instance created');
  
  // Test a simple Firestore operation
  const testDoc = db.collection('_test').doc('connection-test');
  await testDoc.set({ timestamp: new Date().toISOString() });
  console.log('✅ Successfully wrote to Firestore');
  
  // Clean up
  await testDoc.delete();
  console.log('✅ Test document cleaned up');
  
  process.exit(0);
} catch (error) {
  console.error('❌ Firebase test failed:', error);
  process.exit(1);
}
