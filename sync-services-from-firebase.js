/**
 * Sync Services from Firebase to Local services.json
 * Run this script AFTER quota resets to sync all 37+ services from database
 */

import { firestore } from './src/utils/firestore.js';
import fs from 'fs';
import path from 'path';

async function syncServicesFromFirebase() {
  try {
    console.log('🔄 Syncing services from Firebase to local services.json...');
    
    // Fetch all services from Firestore
    const servicesSnapshot = await firestore.collection('services').get();
    
    if (servicesSnapshot.empty) {
      console.log('❌ No services found in Firestore');
      return;
    }
    
    const services = [];
    servicesSnapshot.forEach(doc => {
      const serviceData = doc.data();
      services.push({
        serviceID: doc.id,
        name: serviceData.name || doc.id,
        plans: serviceData.plans || [],
        logoUrl: serviceData.logoUrl || `/public/logos/${doc.id}.svg`,
        approvalRequiredFlag: serviceData.approvalRequiredFlag !== false, // Default to true
        description: serviceData.description || ''
      });
    });
    
    // Sort services alphabetically by name
    services.sort((a, b) => a.name.localeCompare(b.name));
    
    // Write to services.json
    const servicesPath = path.join(process.cwd(), 'src', 'services.json');
    fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2));
    
    console.log(`✅ Successfully synced ${services.length} services to services.json`);
    console.log('\nServices synced:');
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name} (${service.plans?.length || 0} plans)`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error syncing services:', error);
    if (error.message.includes('RESOURCE_EXHAUSTED') || error.message.includes('Quota exceeded')) {
      console.log('\n⚠️ QUOTA EXCEEDED! Wait for quota reset at midnight UTC, then run this script again.');
    }
    process.exit(1);
  }
}

syncServicesFromFirebase();

