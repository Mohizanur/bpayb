import { firestore, isFirebaseConnected } from './firestore.js';
import { supabase as supabaseClient } from './supabaseClient.js';
import fs from 'fs/promises';
import path from 'path';

// Fallback to local services if Firebase/Supabase is not available
async function loadLocalServices() {
  try {
    const filePath = new URL('../services.json', import.meta.url);
    const data = await fs.readFile(filePath, 'utf8');
    const services = JSON.parse(data);
    console.log(`Loaded ${services.length} services from local file`);
    return services;
  } catch (error) {
    console.error('Error loading local services:', error);
    return [];
  }
}

export async function loadServices() {
  try {
    // Try Supabase first if configured
    if (supabaseClient) {
      const { data, error } = await supabaseClient.from('services').select('*');
      if (!error && Array.isArray(data) && data.length > 0) {
        console.log(`Loaded ${data.length} services from Supabase`);
        return data.map(serviceData => ({
          id: serviceData.id,
          serviceID: serviceData.id,
          ...serviceData,
          price: serviceData.price || (serviceData.plans && serviceData.plans[0] ? serviceData.plans[0].price : 0),
          billingCycle: serviceData.billingCycle || (serviceData.plans && serviceData.plans[0] ? serviceData.plans[0].billingCycle : 'Monthly')
        }));
      }
    }

    // If Firebase is not connected, use local services
    if (!isFirebaseConnected) {
      console.log('Firestore not connected, using local services');
      return await loadLocalServices();
    }
    
    if (!firestore) {
      console.error('Firestore instance not available');
      return await loadLocalServices();
    }
    
    const snapshot = await firestore.collection('services').get();
    if (snapshot.empty) {
      console.log('No services found in Firestore, falling back to local services');
      return await loadLocalServices();
    }
    
    const services = [];
    snapshot.forEach(doc => {
      const serviceData = doc.data();
      services.push({
        id: doc.id,
        serviceID: doc.id, // Ensure serviceID is set for backward compatibility
        ...serviceData,
        // Ensure backward compatibility with old service structure
        price: serviceData.price || (serviceData.plans && serviceData.plans[0] ? serviceData.plans[0].price : 0),
        billingCycle: serviceData.billingCycle || (serviceData.plans && serviceData.plans[0] ? serviceData.plans[0].billingCycle : 'Monthly')
      });
    });
    
    console.log(`Loaded ${services.length} services from Firestore`);
    return services;
  } catch (error) {
    console.error("Error loading services from Firestore:", error);
    // Fall back to local services
    return await loadLocalServices();
  }
}
