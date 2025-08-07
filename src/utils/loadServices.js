import { firestore, isFirebaseConnected } from './firestore.js';
import fs from 'fs/promises';
import path from 'path';

// Fallback to local services if Firebase is not available
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
      services.push({
        id: doc.id,
        serviceID: doc.id, // Ensure serviceID is set for backward compatibility
        ...doc.data()
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
