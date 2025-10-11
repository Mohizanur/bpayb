/**
 * Update Upwork service in Firebase with correct per-connect pricing
 */

import { firestore } from './src/utils/firestore.js';

async function updateUpworkInFirebase() {
  try {
    console.log('🔄 Updating Upwork service in Firebase...');
    
    const upworkData = {
      name: "Upwork Connects",
      plans: [
        { duration: 30, price: 1350, billingCycle: "30 Connects" },
        { duration: 50, price: 1800, billingCycle: "50 Connects" },
        { duration: 100, price: 3250, billingCycle: "100 Connects" }
      ],
      logoUrl: "/public/logos/upworkconnect(perconnect).svg",
      approvalRequiredFlag: true,
      description: "Upwork connects for freelancing",
      updatedAt: new Date()
    };
    
    await firestore.collection('services').doc('upworkconnect(perconnect)').set(upworkData, { merge: true });
    
    console.log('✅ Upwork service updated in Firebase with correct per-connect pricing');
    console.log('Plans:');
    upworkData.plans.forEach(plan => {
      console.log(`  - ${plan.billingCycle}: ${plan.price} ETB`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating Upwork service:', error);
    process.exit(1);
  }
}

updateUpworkInFirebase();

