import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
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
const timestamp = FieldValue.serverTimestamp();

// Helper function to get current timestamp
function getTimestamp() {
  return new Date().toISOString();
}

// Process items to ensure all timestamps are valid
function processItems(items) {
  return items.map(item => {
    const processed = { ...item };
    // Convert Firestore timestamps to ISO strings for serialization
    Object.keys(processed).forEach(key => {
      if (processed[key] === timestamp) {
        processed[key] = getTimestamp();
      } else if (processed[key] && typeof processed[key] === 'object') {
        // Process nested objects
        processed[key] = processItems([processed[key]])[0];
      }
    });
    return processed;
  });
}

// Sample data
const collections = {
  // Services (already created)
  services: [
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
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
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
      createdAt: getTimestamp(),
      updatedAt: getTimestamp()
    }
  ],

  // Subscription Plans
  plans: [
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
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: 'monthly',
      name: 'Monthly Plan',
      duration: 30,
      price: 180,
      currency: 'ETB',
      discount: 10,
      status: 'active',
      features: ['30-day access', 'Priority support', 'Save 10%'],
      isPopular: true,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: 'yearly',
      name: 'Yearly Plan',
      duration: 365,
      price: 600,
      currency: 'ETB',
      discount: 15,
      status: 'active',
      features: ['1-year access', '24/7 support', 'Save 15%'],
      isPopular: false,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ],

  // Users (sample admin user)
  users: [
    {
      id: '5186537254',
      telegramId: '5186537254',
      username: 'admin_user',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@birrpay.com',
      phone: '+251900000000',
      isAdmin: true,
      status: 'active',
      language: 'en',
      createdAt: timestamp,
      updatedAt: timestamp,
      lastLogin: timestamp
    }
  ],

  // User Subscriptions
  subscriptions: [
    {
      id: 'sub_netflix_monthly_001',
      userId: '5186537254',
      serviceId: 'netflix',
      planId: 'monthly',
      status: 'active',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paymentStatus: 'paid',
      paymentMethod: 'telebirr',
      amount: 180,
      currency: 'ETB',
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ],

  // Transactions
  transactions: [
    {
      id: 'txn_001',
      userId: '5186537254',
      type: 'subscription',
      amount: 180,
      currency: 'ETB',
      status: 'completed',
      paymentMethod: 'telebirr',
      reference: 'TXN' + Date.now(),
      description: 'Monthly Netflix subscription',
      metadata: {
        subscriptionId: 'sub_netflix_monthly_001',
        serviceId: 'netflix',
        planId: 'monthly'
      },
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ],

  // Support Tickets
  supportTickets: [
    {
      id: 'tkt_001',
      userId: '5186537254',
      subject: 'Account Access Issue',
      description: 'Having trouble logging into my account',
      status: 'open',
      priority: 'high',
      category: 'account',
      assignedTo: 'support_team',
      messages: [
        {
          userId: '5186537254',
          content: 'I cannot log into my account. Getting an error message.',
          timestamp: timestamp
        }
      ],
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ],

  // System Settings
  settings: [
    {
      id: 'general',
      siteName: 'BirrPay',
      currency: 'ETB',
      currencySymbol: 'Br',
      supportEmail: 'support@birrpay.com',
      supportPhone: '+251900000000',
      telegramBotUsername: 'BirrPayBot',
      maintenanceMode: false,
      updatedAt: timestamp
    }
  ]
};

async function initializeDatabase() {
  const BATCH_SIZE = 10; // Process 10 documents per batch
  let successCount = 0;
  let errorCount = 0;

  try {
    console.log('🚀 Starting database initialization...');
    
    // Process each collection
    for (const [collectionName, items] of Object.entries(collections)) {
      console.log(`\n📝 Processing collection: ${collectionName}`);
      const collectionRef = db.collection(collectionName);
      
      // Process items to ensure they're properly formatted
      const processedItems = processItems(items);
      
      // Process items in batches
      for (let i = 0; i < processedItems.length; i += BATCH_SIZE) {
        const batch = db.batch();
        const batchItems = processedItems.slice(i, i + BATCH_SIZE);
        
        // Add batch operations
        batchItems.forEach(item => {
          const docRef = collectionRef.doc(item.id);
          batch.set(docRef, item, { merge: true });
        });
        
        try {
          // Commit the batch
          await batch.commit();
          
          // Log success for each item in batch
          batchItems.forEach(item => {
            console.log(`  ✅ Added/Updated: ${collectionName}/${item.id}`);
            successCount++;
          });
          
          // Add small delay between batches to avoid rate limiting
          if (i + BATCH_SIZE < items.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
        } catch (batchError) {
          console.error(`  ❌ Error processing batch (${i} to ${i + batchItems.length - 1}):`, batchError.message);
          errorCount += batchItems.length;
          
          // Try processing items individually if batch fails
          for (const item of batchItems) {
            try {
              const docRef = collectionRef.doc(item.id);
              await docRef.set(item, { merge: true });
              console.log(`  ✅ Added/Updated: ${collectionName}/${item.id}`);
              successCount++;
              errorCount--;
            } catch (singleError) {
              console.error(`  ❌ Failed to update ${collectionName}/${item.id}:`, singleError.message);
            }
          }
        }
      }
    }
    
    console.log('\n🎉 Database initialization summary:');
    console.log(`✅ Successfully processed: ${successCount} documents`);
    if (errorCount > 0) {
      console.log(`❌ Failed to process: ${errorCount} documents`);
    }
    
    if (errorCount === 0) {
      console.log('\n✨ All collections were initialized successfully!');
    } else {
      console.log('\n⚠️  Some documents failed to initialize. Check the logs above for details.');
    }
    
  } catch (error) {
    console.error('\n❌ Fatal error during database initialization:');
    console.error(error);
    process.exit(1);
  }
}

// Run the initialization
initializeDatabase()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ Initialization failed:', error);
    process.exit(1);
  });
