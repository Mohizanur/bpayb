import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testFirebaseConnection() {
  try {
    // Read the service account file
    const serviceAccount = JSON.parse(
      await readFile(join(__dirname, 'serviceAccountKey.json'), 'utf8')
    );

    console.log('ℹ️  Service Account Project ID:', serviceAccount.project_id);
    
    // Initialize Firebase Admin
    console.log('ℹ️  Initializing Firebase Admin...');
    const app = initializeApp({
      credential: cert(serviceAccount),
      databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
    });
    
    console.log('✅ Firebase Admin initialized successfully');
    
    // Test Authentication
    const auth = getAuth(app);
    console.log('ℹ️  Testing Auth service...');
    
    // List users (first 10) to test auth
    const listUsersResult = await auth.listUsers(1);
    console.log('✅ Auth service is working');
    console.log('ℹ️  Current users in project:', listUsersResult.users.length);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Error testing Firebase connection:');
    console.error(error);
    
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    if (error.errorInfo) {
      console.error('Error details:', error.errorInfo);
    }
    
    return { success: false, error };
  }
}

// Run the test
testFirebaseConnection()
  .then(({ success }) => {
    console.log(success ? '✅ All tests passed!' : '❌ Some tests failed');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
