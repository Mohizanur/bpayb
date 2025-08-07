import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load service account key
const serviceAccountPath = resolve(process.cwd(), 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

// Initialize Firebase Admin
const app = initializeApp({
  credential: cert(serviceAccount)
});

const db = getFirestore(app);

async function listUsers() {
  try {
    console.log('Fetching users from Firestore...');
    const snapshot = await db.collection('users').limit(10).get();
    
    if (snapshot.empty) {
      console.log('No users found in the database.');
      return;
    }

    console.log('Users in the database:');
    snapshot.forEach(doc => {
      console.log(`- ${doc.id}:`, JSON.stringify(doc.data(), null, 2));
    });
  } catch (error) {
    console.error('Error fetching users:', error);
  } finally {
    process.exit(0);
  }
}

listUsers();
