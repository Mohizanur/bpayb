import { firestoreManager } from './firestore.js';

// User Management Functions
export async function createUser(userId, userData) {
  try {
    const result = await firestoreManager.setDocument('users', userId, {
      ...userData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      isPaid: false,
      subscriptions: [],
      totalSpent: 0
    });
    
    return result;
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

export async function getUser(userId) {
  try {
    const result = await firestoreManager.getDocument('users', userId);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

export async function updateUser(userId, updates) {
  try {
    const result = await firestoreManager.updateDocument('users', userId, updates);
    return result;
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
}

export async function getAllUsers() {
  try {
    const result = await firestoreManager.getAllDocuments('users');
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
  }
}

// Subscription Management Functions
export async function createSubscription(subscriptionData) {
  try {
    const result = await firestoreManager.createDocument('subscriptions', {
      ...subscriptionData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message };
  }
}

export async function getSubscription(subscriptionId) {
  try {
    const result = await firestoreManager.getDocument('subscriptions', subscriptionId);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
}

export async function getUserSubscriptions(userId) {
  try {
    const result = await firestoreManager.queryDocuments('subscriptions', {
      userId: userId
    });
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    return [];
  }
}

export async function getAllSubscriptions() {
  try {
    const result = await firestoreManager.getAllDocuments('subscriptions');
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting all subscriptions:', error);
    return [];
  }
}

export async function updateSubscription(subscriptionId, updates) {
  try {
    const result = await firestoreManager.updateDocument('subscriptions', subscriptionId, updates);
    return result;
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
}

export async function getPendingSubscriptions() {
  try {
    const result = await firestoreManager.queryDocuments('subscriptions', {
      status: 'pending'
    });
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting pending subscriptions:', error);
    return [];
  }
}

export async function approveSubscription(subscriptionId) {
  try {
    const result = await firestoreManager.updateDocument('subscriptions', subscriptionId, {
      status: 'active',
      approvedAt: new Date(),
      startDate: new Date()
    });
    return result;
  } catch (error) {
    console.error('Error approving subscription:', error);
    return { success: false, error: error.message };
  }
}

export async function rejectSubscription(subscriptionId, reason = '') {
  try {
    const result = await firestoreManager.updateDocument('subscriptions', subscriptionId, {
      status: 'rejected',
      rejectedAt: new Date(),
      rejectionReason: reason
    });
    return result;
  } catch (error) {
    console.error('Error rejecting subscription:', error);
    return { success: false, error: error.message };
  }
}

// Payment Management Functions
export async function createPayment(paymentData) {
  try {
    const result = await firestoreManager.createDocument('payments', {
      ...paymentData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
}

export async function getPayment(paymentId) {
  try {
    const result = await firestoreManager.getDocument('payments', paymentId);
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Error getting payment:', error);
    return null;
  }
}

export async function getAllPayments() {
  try {
    const result = await firestoreManager.getAllDocuments('payments');
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting all payments:', error);
    return [];
  }
}

export async function updatePaymentStatus(paymentId, status, additionalData = {}) {
  try {
    const result = await firestoreManager.updateDocument('payments', paymentId, {
      status,
      ...additionalData,
      updatedAt: new Date()
    });
    return result;
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
}

// Support Management Functions
export async function createSupportMessage(messageData) {
  try {
    const result = await firestoreManager.createDocument('support_tickets', {
      ...messageData,
      status: 'open',
      priority: messageData.priority || 'normal',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error creating support message:', error);
    return { success: false, error: error.message };
  }
}

export async function getSupportMessages() {
  try {
    const result = await firestoreManager.getAllDocuments('support_tickets');
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting support messages:', error);
    return [];
  }
}

export async function updateSupportTicket(ticketId, updates) {
  try {
    const result = await firestoreManager.updateDocument('support_tickets', ticketId, updates);
    return result;
  } catch (error) {
    console.error('Error updating support ticket:', error);
    return { success: false, error: error.message };
  }
}

// Screenshot Management Functions
export async function uploadScreenshot(screenshotData) {
  try {
    const result = await firestoreManager.createDocument('screenshots', {
      ...screenshotData,
      status: 'pending_verification',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return { success: false, error: error.message };
  }
}

// Analytics and Admin Functions
export async function getAdminStats() {
  try {
    const [users, subscriptions, payments, supportTickets] = await Promise.all([
      firestoreManager.getAllDocuments('users'),
      firestoreManager.getAllDocuments('subscriptions'),
      firestoreManager.getAllDocuments('payments'),
      firestoreManager.getAllDocuments('support_tickets')
    ]);

    const userData = users.success ? users.data : [];
    const subscriptionData = subscriptions.success ? subscriptions.data : [];
    const paymentData = payments.success ? payments.data : [];
    const supportData = supportTickets.success ? supportTickets.data : [];

    const stats = {
      totalUsers: userData.length,
      activeUsers: userData.filter(u => u.status === 'active').length,
      paidUsers: userData.filter(u => u.isPaid).length,
      totalSubscriptions: subscriptionData.length,
      activeSubscriptions: subscriptionData.filter(s => s.status === 'active').length,
      pendingSubscriptions: subscriptionData.filter(s => s.status === 'pending').length,
      totalPayments: paymentData.length,
      completedPayments: paymentData.filter(p => p.status === 'completed').length,
      totalRevenue: paymentData
        .filter(p => p.status === 'completed')
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      pendingSupport: supportData.filter(t => t.status === 'open').length,
      totalSupportTickets: supportData.length,
      conversionRate: userData.length > 0 ? 
        ((userData.filter(u => u.isPaid).length / userData.length) * 100).toFixed(2) : 0,
      avgRevenuePerUser: userData.filter(u => u.isPaid).length > 0 ?
        (paymentData.filter(p => p.status === 'completed')
          .reduce((sum, p) => sum + (p.amount || 0), 0) / 
         userData.filter(u => u.isPaid).length).toFixed(2) : 0
    };

    return stats;
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return {
      totalUsers: 0,
      activeUsers: 0,
      paidUsers: 0,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      pendingSubscriptions: 0,
      totalPayments: 0,
      completedPayments: 0,
      totalRevenue: 0,
      pendingSupport: 0,
      totalSupportTickets: 0,
      conversionRate: 0,
      avgRevenuePerUser: 0
    };
  }
}

// Real-time listeners
export function setupUsersListener(callback) {
  return firestoreManager.setupListener('users', callback);
}

export function setupSubscriptionsListener(callback) {
  return firestoreManager.setupListener('subscriptions', callback);
}

export function setupPaymentsListener(callback) {
  return firestoreManager.setupListener('payments', callback);
}

export function setupSupportListener(callback) {
  return firestoreManager.setupListener('support_tickets', callback);
}

// Services Management
export async function getServices() {
  try {
    const result = await firestoreManager.getAllDocuments('services');
    return result.success ? result.data : [];
  } catch (error) {
    console.error('Error getting services:', error);
    return [];
  }
}

export async function createService(serviceData) {
  try {
    const result = await firestoreManager.createDocument('services', {
      ...serviceData,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    return result;
  } catch (error) {
    console.error('Error creating service:', error);
    return { success: false, error: error.message };
  }
}

export async function updateService(serviceId, updates) {
  try {
    const result = await firestoreManager.updateDocument('services', serviceId, updates);
    return result;
  } catch (error) {
    console.error('Error updating service:', error);
    return { success: false, error: error.message };
  }
}

// Data migration and backup functions
export async function migrateServicesData() {
  try {
    // Check if services already exist
    const existingServices = await firestoreManager.getAllDocuments('services');
    
    if (existingServices.success && existingServices.data.length > 0) {
      console.log('Services already exist in Firebase, skipping migration');
      return { success: true, message: 'Services already exist' };
    }

    // Import services from JSON file
    const servicesData = [
      {
        serviceID: "netflix",
        name: "Netflix",
        price: 350,
        billingCycle: "Monthly",
        logoUrl: "/logos/netflix.svg",
        approvalRequiredFlag: true,
        description: "Stream movies, TV shows and more",
        category: "streaming",
        features: ["HD Streaming", "Multiple Devices", "Download for Offline"]
      },
      {
        serviceID: "prime",
        name: "Amazon Prime",
        price: 300,
        billingCycle: "Monthly",
        logoUrl: "/logos/prime.svg",
        approvalRequiredFlag: true,
        description: "Prime Video, Music and Shopping benefits",
        category: "streaming",
        features: ["Prime Video", "Free Shipping", "Prime Music"]
      },
      {
        serviceID: "spotify",
        name: "Spotify Premium",
        price: 250,
        billingCycle: "Monthly",
        logoUrl: "/logos/spotify.svg",
        approvalRequiredFlag: true,
        description: "Music streaming without ads",
        category: "music",
        features: ["Ad-free Music", "Offline Downloads", "High Quality Audio"]
      },
      {
        serviceID: "disney",
        name: "Disney+",
        price: 280,
        billingCycle: "Monthly",
        logoUrl: "/logos/disney.svg",
        approvalRequiredFlag: true,
        description: "Disney, Marvel, Star Wars content",
        category: "streaming",
        features: ["Disney Content", "Marvel Movies", "Star Wars Series"]
      },
      {
        serviceID: "hulu",
        name: "Hulu",
        price: 320,
        billingCycle: "Monthly",
        logoUrl: "/logos/hulu.svg",
        approvalRequiredFlag: true,
        description: "TV shows and movies streaming",
        category: "streaming",
        features: ["Current TV Shows", "Original Content", "Live TV Option"]
      },
      {
        serviceID: "youtube",
        name: "YouTube Premium",
        price: 200,
        billingCycle: "Monthly",
        logoUrl: "/logos/youtube.svg",
        approvalRequiredFlag: true,
        description: "Ad-free YouTube with offline downloads",
        category: "video",
        features: ["Ad-free Videos", "Background Play", "YouTube Music"]
      },
      {
        serviceID: "apple",
        name: "Apple TV+",
        price: 180,
        billingCycle: "Monthly",
        logoUrl: "/logos/apple.svg",
        approvalRequiredFlag: true,
        description: "Original shows and movies",
        category: "streaming",
        features: ["Original Content", "4K HDR", "Dolby Atmos"]
      },
      {
        serviceID: "hbo",
        name: "HBO Max",
        price: 400,
        billingCycle: "Monthly",
        logoUrl: "/logos/hbo.svg",
        approvalRequiredFlag: true,
        description: "Premium movies and series",
        category: "streaming",
        features: ["HBO Originals", "Warner Bros Movies", "DC Content"]
      },
      {
        serviceID: "paramount",
        name: "Paramount+",
        price: 220,
        billingCycle: "Monthly",
        logoUrl: "/logos/paramount.svg",
        approvalRequiredFlag: true,
        description: "CBS, Paramount movies and shows",
        category: "streaming",
        features: ["CBS Shows", "Paramount Movies", "Live Sports"]
      },
      {
        serviceID: "peacock",
        name: "Peacock Premium",
        price: 190,
        billingCycle: "Monthly",
        logoUrl: "/logos/peacock.svg",
        approvalRequiredFlag: true,
        description: "NBC content and originals",
        category: "streaming",
        features: ["NBC Shows", "Live Sports", "Original Series"]
      }
    ];

    // Migrate each service
    const results = await Promise.all(
      servicesData.map(service => 
        firestoreManager.setDocument('services', service.serviceID, service)
      )
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`✅ Migrated ${successCount}/${servicesData.length} services to Firebase`);

    return { success: true, migrated: successCount, total: servicesData.length };
  } catch (error) {
    console.error('Error migrating services data:', error);
    return { success: false, error: error.message };
  }
}

// Initialize services migration on startup
migrateServicesData().catch(console.error);