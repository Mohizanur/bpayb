import { firestore } from './firestore.js';

// User Management
export const createUser = async (userId, userData) => {
  try {
    await firestore.collection('users').doc(String(userId)).set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true
    });
    return { success: true };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

export const getUser = async (userId) => {
  try {
    const doc = await firestore.collection('users').doc(String(userId)).get();
    return doc.exists ? { success: true, data: doc.data() } : { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (userId, updates) => {
  try {
    await firestore.collection('users').doc(String(userId)).update({
      ...updates,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user:', error);
    return { success: false, error: error.message };
  }
};

// Subscription Management
export const createSubscription = async (subscriptionData) => {
  try {
    const subscriptionRef = await firestore.collection('subscriptions').add({
      ...subscriptionData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, subscriptionId: subscriptionRef.id };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message };
  }
};

export const getSubscriptions = async (userId) => {
  try {
    const snapshot = await firestore.collection('subscriptions')
      .where('userId', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .get();
    
    const subscriptions = [];
    snapshot.forEach(doc => {
      subscriptions.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: subscriptions };
  } catch (error) {
    console.error('Error getting subscriptions:', error);
    return { success: false, error: error.message };
  }
};

export const updateSubscription = async (subscriptionId, updates) => {
  try {
    await firestore.collection('subscriptions').doc(subscriptionId).update({
      ...updates,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
};

// Payment Management
export const createPayment = async (paymentData) => {
  try {
    const paymentRef = await firestore.collection('payments').add({
      ...paymentData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, paymentId: paymentRef.id };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
};

export const updatePayment = async (paymentId, updates) => {
  try {
    await firestore.collection('payments').doc(paymentId).update({
      ...updates,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating payment:', error);
    return { success: false, error: error.message };
  }
};

// Screenshot Management
export const uploadScreenshot = async (subscriptionId, screenshotData) => {
  try {
    const screenshotRef = await firestore.collection('screenshots').add({
      subscriptionId,
      ...screenshotData,
      uploadedAt: new Date()
    });
    
    // Update subscription with screenshot reference
    await updateSubscription(subscriptionId, {
      screenshotId: screenshotRef.id,
      screenshotStatus: 'uploaded'
    });
    
    return { success: true, screenshotId: screenshotRef.id };
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return { success: false, error: error.message };
  }
};

export const getScreenshot = async (screenshotId) => {
  try {
    const doc = await firestore.collection('screenshots').doc(screenshotId).get();
    return doc.exists ? { success: true, data: doc.data() } : { success: false, error: 'Screenshot not found' };
  } catch (error) {
    console.error('Error getting screenshot:', error);
    return { success: false, error: error.message };
  }
};

// Admin Statistics
export const getAdminStats = async () => {
  try {
    const usersSnapshot = await firestore.collection('users').get();
    const subscriptionsSnapshot = await firestore.collection('subscriptions').get();
    const paymentsSnapshot = await firestore.collection('payments').get();
    
    const stats = {
      totalUsers: usersSnapshot.size,
      totalSubscriptions: subscriptionsSnapshot.size,
      totalPayments: paymentsSnapshot.size,
      pendingSubscriptions: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      pendingPayments: 0,
      completedPayments: 0
    };
    
    // Count subscription statuses
    subscriptionsSnapshot.forEach(doc => {
      const status = doc.data().status;
      if (status === 'pending') stats.pendingSubscriptions++;
      else if (status === 'active') stats.activeSubscriptions++;
      else if (status === 'cancelled') stats.cancelledSubscriptions++;
    });
    
    // Count payment statuses
    paymentsSnapshot.forEach(doc => {
      const status = doc.data().status;
      if (status === 'pending') stats.pendingPayments++;
      else if (status === 'completed') stats.completedPayments++;
    });
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return { success: false, error: error.message };
  }
};

// Support Messages
export const createSupportMessage = async (messageData) => {
  try {
    const messageRef = await firestore.collection('support_messages').add({
      ...messageData,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error('Error creating support message:', error);
    return { success: false, error: error.message };
  }
};

export const getSupportMessages = async (status = null) => {
  try {
    let query = firestore.collection('support_messages').orderBy('createdAt', 'desc');
    
    if (status) {
      query = query.where('status', '==', status);
    }
    
    const snapshot = await query.get();
    const messages = [];
    snapshot.forEach(doc => {
      messages.push({ id: doc.id, ...doc.data() });
    });
    
    return { success: true, data: messages };
  } catch (error) {
    console.error('Error getting support messages:', error);
    return { success: false, error: error.message };
  }
};