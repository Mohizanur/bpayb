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

export const getAllUsers = async () => {
  try {
    const snapshot = await firestore.collection('users').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      joinDate: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : 'N/A'
    }));
  } catch (error) {
    console.error('Error getting all users:', error);
    return [];
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

export const getAllSubscriptions = async () => {
  try {
    const snapshot = await firestore.collection('subscriptions').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      startDate: doc.data().startDate ? new Date(doc.data().startDate.toDate()).toLocaleDateString() : 'N/A',
      endDate: doc.data().endDate ? new Date(doc.data().endDate.toDate()).toLocaleDateString() : 'N/A'
    }));
  } catch (error) {
    console.error('Error getting all subscriptions:', error);
    return [];
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
    const snapshot = await firestore
      .collection('subscriptions')
      .where('userId', '==', String(userId))
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data());
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

export const getPayment = async (paymentId) => {
  try {
    const paymentDoc = await firestore.collection('payments').doc(paymentId).get();
    return paymentDoc.exists ? paymentDoc.data() : null;
  } catch (error) {
    console.error('Error getting payment:', error);
    return null;
  }
};

export const getAllPayments = async () => {
  try {
    const snapshot = await firestore.collection('payments').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      date: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : 'N/A'
    }));
  } catch (error) {
    console.error('Error getting all payments:', error);
    return [];
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

// Screenshot Management
export const uploadScreenshot = async (subscriptionId, screenshotData) => {
  try {
    const screenshotRef = firestore.collection('screenshots').doc();
    const screenshot = {
      id: screenshotRef.id,
      subscriptionId,
      url: screenshotData.url,
      createdAt: new Date(),
      ...screenshotData
    };
    
    await screenshotRef.set(screenshot);
    
    // Update subscription with screenshot info
    await updateSubscription(subscriptionId, {
      screenshotUploaded: true,
      screenshotUrl: screenshotData.url
    });
    
    return { success: true, screenshotId: screenshotRef.id };
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
    const supportSnapshot = await firestore.collection('support').get();
    
    const stats = {
      totalUsers: usersSnapshot.size,
      totalSubscriptions: subscriptionsSnapshot.size,
      totalPayments: paymentsSnapshot.size,
      pendingSubscriptions: 0,
      activeSubscriptions: 0,
      cancelledSubscriptions: 0,
      pendingPayments: 0,
      completedPayments: 0,
      failedPayments: 0,
      pendingSupport: 0,
      paidUsers: 0
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
    
    // Count payment statuses and calculate revenue
    let totalRevenue = 0;
    paymentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      switch (data.status) {
        case 'pending':
          stats.pendingPayments++;
          break;
        case 'completed':
          stats.completedPayments++;
          totalRevenue += data.amount || 0;
          break;
        case 'failed':
          stats.failedPayments++;
          break;
      }
    });
    
    // Count support tickets
    supportSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.status === 'open') {
        stats.pendingSupport++;
      }
    });
    
    // Count paid users
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.isPaid) {
        stats.paidUsers++;
      }
    });
    
    stats.totalPayments = totalRevenue;
    
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
      status: 'cancelled',
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting subscription:', error);
    return { success: false, error: error.message };
  }
};

export const createSupportMessage = async (messageData) => {
  try {
    const supportRef = firestore.collection('support').doc();
    const message = {
      id: supportRef.id,
      status: 'open',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...messageData
    };
    
    await supportRef.set(message);
    return { success: true, messageId: supportRef.id };
  } catch (error) {
    console.error('Error creating support message:', error);
    return { success: false, error: error.message };
  }
};

export const getSupportMessages = async (status = 'open', userId = null) => {
  try {
    let query = firestore.collection('support');
    
    if (status !== 'all') {
      query = query.where('status', '==', status);
    }
    
    if (userId) {
      query = query.where('userId', '==', String(userId));
    }
    
    const snapshot = await query.orderBy('createdAt', 'desc').get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      created: doc.data().createdAt ? new Date(doc.data().createdAt.toDate()).toLocaleDateString() : 'N/A'
    }));
  } catch (error) {
    console.error('Error getting support messages:', error);
    return [];
  }
};