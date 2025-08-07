import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  await readFile(join(__dirname, 'serviceAccountKey.json'), 'utf8')
);

const app = initializeApp({
  credential: cert(serviceAccount),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = getFirestore(app);

// Sample data
const services = [
  {
    id: 'netflix',
    name: 'Netflix',
    description: 'Stream movies and TV shows',
    price: 350,
    currency: 'ETB',
    billingCycle: 'monthly',
    status: 'active',
    features: ['HD available', 'Watch on any device', 'Cancel anytime'],
    icon: '🎬',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'amazon-prime',
    name: 'Amazon Prime',
    description: 'Amazon Prime Video subscription',
    price: 300,
    currency: 'ETB',
    billingCycle: 'monthly',
    status: 'active',
    features: ['4K Ultra HD', 'Watch offline', 'Exclusive content'],
    icon: '📦',
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

const plans = [
  {
    id: 'weekly',
    name: 'Weekly Plan',
    duration: 7, // days
    price: 50,
    currency: 'ETB',
    discount: 0,
    status: 'active',
    features: ['7-day access', 'Basic support'],
    isPopular: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'monthly',
    name: 'Monthly Plan',
    duration: 30,
    price: 180,
    currency: 'ETB',
    discount: 10, // 10% discount
    status: 'active',
    features: ['30-day access', 'Priority support', 'Save 10%'],
    isPopular: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'yearly',
    name: 'Yearly Plan',
    duration: 365,
    price: 600,
    currency: 'ETB',
    discount: 15, // 15% discount
    status: 'active',
    features: ['1-year access', '24/7 support', 'Save 15%'],
    isPopular: false,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

async function initializeFirestore() {
  try {
    console.log('🚀 Initializing Firestore database...');
    
    // Batch write for atomic operations
    const batch = db.batch();
    
    // Add services
    services.forEach(service => {
      const serviceRef = db.collection('services').doc(service.id);
      batch.set(serviceRef, service, { merge: true });
    });
    
    // Add plans
    plans.forEach(plan => {
      const planRef = db.collection('plans').doc(plan.id);
      batch.set(planRef, plan, { merge: true });
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log('✅ Database initialized successfully!');
    console.log(`📊 Added ${services.length} services and ${plans.length} plans`);
    
    // Create indexes (if needed)
    await createIndexes();
    
  } catch (error) {
    console.error('❌ Error initializing Firestore:');
    console.error(error);
    process.exit(1);
  }
}

async function createIndexes() {
  // In Firestore, indexes are created automatically or via firebase.json
  // This is a placeholder for any index creation logic
  console.log('🔍 Setting up indexes...');
  // Add any composite index creation logic here if needed
  console.log('✅ Indexes set up successfully');
}

// Run the initialization
initializeFirestore()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
