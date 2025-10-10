import { firestore, isFirebaseConnected } from './firestore.js';
import fs from 'fs/promises';
import path from 'path';

// AGGRESSIVE CACHING: Services almost NEVER change, so cache them indefinitely
// Only refresh when admin explicitly adds/updates service or on manual refresh
let servicesCache = null;
let cacheTimestamp = null;
const CACHE_TTL = 1000 * 60 * 60 * 24 * 30; // 30 days cache (essentially permanent until cleared)

// Fallback to local services if Firebase is not available
async function loadLocalServices() {
  try {
    const filePath = new URL('../services.json', import.meta.url);
    const data = await fs.readFile(filePath, 'utf8');
    const services = JSON.parse(data);
    console.log(`✅ Loaded ${services.length} services from local file`);
    return services;
  } catch (error) {
    console.error('Error loading local services:', error);
    return [];
  }
}

export async function loadServices(forceRefresh = false) {
  // Check cache first (SMART QUOTA OPTIMIZATION)
  if (!forceRefresh && servicesCache && cacheTimestamp) {
    const cacheAge = Date.now() - cacheTimestamp;
    if (cacheAge < CACHE_TTL) {
      console.log(`📦 Using cached services (age: ${Math.round(cacheAge / 1000)}s)`);
      return servicesCache;
    }
  }
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
    
    // Cache the results (AGGRESSIVE QUOTA OPTIMIZATION - cache indefinitely)
    servicesCache = services;
    cacheTimestamp = Date.now();
    
    console.log(`✅ Loaded ${services.length} services from Firestore (cached until manual refresh)`);
    return services;
  } catch (error) {
    console.error("Error loading services from Firestore:", error);
    // Fall back to local services
    const localServices = await loadLocalServices();
    // Cache local services too
    servicesCache = localServices;
    cacheTimestamp = Date.now();
    return localServices;
  }
}

// Clear cache when services are updated (call this from admin panel when services change)
export function clearServicesCache() {
  servicesCache = null;
  cacheTimestamp = null;
  console.log('🔄 Services cache cleared');
}

// Preload services on module import for instant availability (SPEED OPTIMIZATION)
// This happens once at bot startup, then cached forever until admin updates
let preloadPromise = null;
export function preloadServices() {
  if (!preloadPromise) {
    preloadPromise = loadServices().then(services => {
      console.log('⚡ Services preloaded and ready (instant access)');
      return services;
    }).catch(err => {
      console.error('Error preloading services:', err);
      preloadPromise = null; // Reset on error to allow retry
    });
  }
  return preloadPromise;
}

// Auto-preload on module import (non-blocking)
preloadServices();
