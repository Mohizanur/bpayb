import { getServices } from '../src/utils/database.js';
import fs from 'fs';

async function checkServices() {
  try {
    console.log('🔍 Checking services in the database...');
    const services = await getServices();
    
    if (!services || services.length === 0) {
      console.log('❌ No services found in the database. Populating from services.json...');
      await populateServices();
    } else {
      console.log('✅ Services found in the database:');
      console.log(services.map(s => `${s.name} (${s.serviceID}) - ${s.price} ETB`).join('\n'));
    }
  } catch (error) {
    console.error('Error checking services:', error);
  }
}

async function populateServices() {
  try {
    const services = JSON.parse(fs.readFileSync('./src/services.json', 'utf-8'));
    const { createService } = await import('../src/utils/database.js');
    
    for (const service of services) {
      console.log(`Adding service: ${service.name} (${service.serviceID})`);
      const result = await createService(service);
      if (!result.success) {
        console.error(`Failed to add service ${service.name}:`, result.error);
      }
    }
    
    console.log('✅ Successfully populated services in the database');
  } catch (error) {
    console.error('Error populating services:', error);
  }
}

// Run the check
checkServices().then(() => process.exit(0));
