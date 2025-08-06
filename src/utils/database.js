import { firestore } from "./firestore.js";
import { v4 as uuidv4 } from 'uuid';

// User Management
export const createUser = async (userId, userData) => {
  try {
    const userRef = firestore.collection('users').doc(String(userId));
    await userRef.set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      phoneVerified: false,
      subscriptions: [],
      paymentHistory: []
    });
    return { success: true, userId };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

export const getUser = async (userId) => {
  try {
    const userDoc = await firestore.collection('users').doc(String(userId)).get();
    return userDoc.exists ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
};

export const updateUser = async (userId, updates) => {
  try {
    const userRef = firestore.collection('users').doc(String(userId));
    await userRef.update({
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
    const subscriptionId = uuidv4();
    const subscriptionRef = firestore.collection('subscriptions').doc(subscriptionId);
    
    const subscription = {
      id: subscriptionId,
      ...subscriptionData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
      paymentStatus: 'pending',
      screenshotUploaded: false,
      screenshotUrl: null
    };
    
    await subscriptionRef.set(subscription);
    
    // Add to user's subscriptions
    const userRef = firestore.collection('users').doc(String(subscriptionData.userId));
    await userRef.update({
      subscriptions: firestore.FieldValue.arrayUnion(subscriptionId),
      updatedAt: new Date()
    });
    
    return { success: true, subscriptionId };
  } catch (error) {
    console.error('Error creating subscription:', error);
    return { success: false, error: error.message };
  }
};

export const getSubscription = async (subscriptionId) => {
  try {
    const subscriptionDoc = await firestore.collection('subscriptions').doc(subscriptionId).get();
    return subscriptionDoc.exists ? subscriptionDoc.data() : null;
  } catch (error) {
    console.error('Error getting subscription:', error);
    return null;
  }
};

export const updateSubscription = async (subscriptionId, updates) => {
  try {
    const subscriptionRef = firestore.collection('subscriptions').doc(subscriptionId);
    await subscriptionRef.update({
      ...updates,
      updatedAt: new Date()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
};

export const getUserSubscriptions = async (userId) => {
  try {
    const subscriptionsSnapshot = await firestore
      .collection('subscriptions')
      .where('userId', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .get();
    
    return subscriptionsSnapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting user subscriptions:', error);
    return [];
  }
};

// Payment Management
export const createPayment = async (paymentData) => {
  try {
    const paymentId = uuidv4();
    const paymentRef = firestore.collection('payments').doc(paymentId);
    
    const payment = {
      id: paymentId,
      ...paymentData,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await paymentRef.set(payment);
    return { success: true, paymentId };
  } catch (error) {
    console.error('Error creating payment:', error);
    return { success: false, error: error.message };
  }
};

export const updatePaymentStatus = async (paymentId, status, transactionId = null) => {
  try {
    const paymentRef = firestore.collection('payments').doc(paymentId);
    const updates = {
      status,
      updatedAt: new Date()
    };
    
    if (transactionId) {
      updates.transactionId = transactionId;
    }
    
    await paymentRef.update(updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating payment status:', error);
    return { success: false, error: error.message };
  }
};

// Screenshot Upload Management
export const uploadScreenshot = async (subscriptionId, screenshotData) => {
  try {
    const subscriptionRef = firestore.collection('subscriptions').doc(subscriptionId);
    
    await subscriptionRef.update({
      screenshotUploaded: true,
      screenshotUrl: screenshotData.url,
      screenshotMetadata: {
        filename: screenshotData.filename,
        size: screenshotData.size,
        uploadedAt: new Date()
      },
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    return { success: false, error: error.message };
  }
};

// Admin Functions
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
      completedPayments: 0,
      failedPayments: 0
    };
    
    // Count subscription statuses
    subscriptionsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      switch (data.status) {
        case 'pending':
          stats.pendingSubscriptions++;
          break;
        case 'active':
          stats.activeSubscriptions++;
          break;
        case 'cancelled':
          stats.cancelledSubscriptions++;
          break;
      }
    });
    
    // Count payment statuses
    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      switch (data.status) {
        case 'pending':
          stats.pendingPayments++;
          break;
        case 'completed':
          stats.completedPayments++;
          break;
        case 'failed':
          stats.failedPayments++;
          break;
      }
    });
    
    return stats;
  } catch (error) {
    console.error('Error getting admin stats:', error);
    return null;
  }
};

export const getPendingSubscriptions = async () => {
  try {
    const snapshot = await firestore
      .collection('subscriptions')
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting pending subscriptions:', error);
    return [];
  }
};

export const approveSubscription = async (subscriptionId, adminId) => {
  try {
    const subscriptionRef = firestore.collection('subscriptions').doc(subscriptionId);
    await subscriptionRef.update({
      status: 'active',
      approvedBy: adminId,
      approvedAt: new Date(),
      updatedAt: new Date()
    });
    
    // Update payment status if exists
    const subscription = await getSubscription(subscriptionId);
    if (subscription.paymentId) {
      await updatePaymentStatus(subscription.paymentId, 'completed');
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error approving subscription:', error);
    return { success: false, error: error.message };
  }
};

export const rejectSubscription = async (subscriptionId, adminId, reason) => {
  try {
    const subscriptionRef = firestore.collection('subscriptions').doc(subscriptionId);
    await subscriptionRef.update({
      status: 'rejected',
      rejectedBy: adminId,
      rejectionReason: reason,
      rejectedAt: new Date(),
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting subscription:', error);
    return { success: false, error: error.message };
  }
};

// Support Messages
export const createSupportMessage = async (messageData) => {
  try {
    const messageId = uuidv4();
    const messageRef = firestore.collection('support_messages').doc(messageId);
    
    const message = {
      id: messageId,
      ...messageData,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await messageRef.set(message);
    return { success: true, messageId };
  } catch (error) {
    console.error('Error creating support message:', error);
    return { success: false, error: error.message };
  }
};

export const getSupportMessages = async (status = 'open') => {
  try {
    const snapshot = await firestore
      .collection('support_messages')
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting support messages:', error);
    return [];
  }
};