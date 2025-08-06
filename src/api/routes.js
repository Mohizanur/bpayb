import { 
  createUser, 
  getUser, 
  updateUser, 
  createSubscription, 
  getUserSubscriptions,
  getSubscription,
  updateSubscription,
  createPayment,
  updatePaymentStatus,
  uploadScreenshot,
  getAdminStats,
  getPendingSubscriptions,
  approveSubscription,
  rejectSubscription,
  createSupportMessage,
  getSupportMessages
} from "../utils/database.js";
import { 
  processPayment, 
  PAYMENT_METHODS, 
  calculateAmount, 
  formatCurrency 
} from "../utils/payment.js";
import { loadServices } from "../utils/loadServices.js";

// User Management API
export const userRoutes = (fastify) => {
  // Get user profile
  fastify.get('/api/user/:id', async (req, reply) => {
    try {
      const { id } = req.params;
      const user = await getUser(id);
      
      if (!user) {
        return reply.status(404).send({ error: 'User not found' });
      }
      
      // Remove sensitive data
      const { paymentHistory, ...safeUser } = user;
      return { success: true, user: safeUser };
    } catch (error) {
      console.error('Error getting user:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update user profile
  fastify.put('/api/user/:id', async (req, reply) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await updateUser(id, updates);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, message: 'User updated successfully' };
    } catch (error) {
      console.error('Error updating user:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Create new user
  fastify.post('/api/user', async (req, reply) => {
    try {
      const userData = req.body;
      const result = await createUser(userData.userId, userData);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, userId: result.userId };
    } catch (error) {
      console.error('Error creating user:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get all users (for admin panel)
  fastify.get('/api/users', async (req, reply) => {
    try {
      const snapshot = await require('../utils/firestore.js').firestore.collection('users').get();
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, users };
    } catch (error) {
      console.error('Error getting all users:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Services API
export const servicesRoutes = (fastify) => {
  // Get all services
  fastify.get('/api/services', async (req, reply) => {
    try {
      const services = await loadServices();
      return { success: true, services };
    } catch (error) {
      console.error('Error loading services:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get service details
  fastify.get('/api/services/:id', async (req, reply) => {
    try {
      const { id } = req.params;
      const services = await loadServices();
      const service = services.find(s => s.serviceID === id);
      
      if (!service) {
        return reply.status(404).send({ error: 'Service not found' });
      }
      
      return { success: true, service };
    } catch (error) {
      console.error('Error getting service:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Subscriptions API
export const subscriptionRoutes = (fastify) => {
  // Get user subscriptions
  fastify.get('/api/user/:userId/subscriptions', async (req, reply) => {
    try {
      const { userId } = req.params;
      const subscriptions = await getUserSubscriptions(userId);
      
      return { success: true, subscriptions };
    } catch (error) {
      console.error('Error getting user subscriptions:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get subscription details
  fastify.get('/api/subscriptions/:id', async (req, reply) => {
    try {
      const { id } = req.params;
      const subscription = await getSubscription(id);
      
      if (!subscription) {
        return reply.status(404).send({ error: 'Subscription not found' });
      }
      
      return { success: true, subscription };
    } catch (error) {
      console.error('Error getting subscription:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Create new subscription
  fastify.post('/api/subscriptions', async (req, reply) => {
    try {
      const subscriptionData = req.body;
      const result = await createSubscription(subscriptionData);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, subscriptionId: result.subscriptionId };
    } catch (error) {
      console.error('Error creating subscription:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update subscription
  fastify.put('/api/subscriptions/:id', async (req, reply) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const result = await updateSubscription(id, updates);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, message: 'Subscription updated successfully' };
    } catch (error) {
      console.error('Error updating subscription:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get all subscriptions (for admin panel)
  fastify.get('/api/subscriptions', async (req, reply) => {
    try {
      const snapshot = await require('../utils/firestore.js').firestore.collection('subscriptions').get();
      const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, subscriptions };
    } catch (error) {
      console.error('Error getting all subscriptions:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Payments API
export const paymentRoutes = (fastify) => {
  // Get payment methods
  fastify.get('/api/payment-methods', async (req, reply) => {
    try {
      return { success: true, paymentMethods: PAYMENT_METHODS };
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Process payment
  fastify.post('/api/payments', async (req, reply) => {
    try {
      const { subscriptionData, paymentMethod } = req.body;
      
      const result = await processPayment(subscriptionData, paymentMethod);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, payment: result };
    } catch (error) {
      console.error('Error processing payment:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update payment status
  fastify.put('/api/payments/:id/status', async (req, reply) => {
    try {
      const { id } = req.params;
      const { status, transactionId } = req.body;
      
      const result = await updatePaymentStatus(id, status, transactionId);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, message: 'Payment status updated successfully' };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get all payments (for admin panel)
  fastify.get('/api/payments', async (req, reply) => {
    try {
      const snapshot = await require('../utils/firestore.js').firestore.collection('payments').get();
      const payments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting all payments:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Screenshot Upload API
export const screenshotRoutes = (fastify) => {
  // Upload screenshot
  fastify.post('/api/subscriptions/:id/screenshot', async (req, reply) => {
    try {
      const { id } = req.params;
      const screenshotData = req.body;
      
      const result = await uploadScreenshot(id, screenshotData);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, message: 'Screenshot uploaded successfully' };
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Admin API
export const adminRoutes = (fastify) => {
  // Get admin stats
  fastify.get('/api/admin/stats', async (req, reply) => {
    try {
      const stats = await getAdminStats();
      
      if (!stats) {
        return reply.status(500).send({ error: 'Failed to get admin stats' });
      }
      
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting admin stats:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get pending subscriptions
  fastify.get('/api/admin/subscriptions/pending', async (req, reply) => {
    try {
      const subscriptions = await getPendingSubscriptions();
      return { success: true, subscriptions };
    } catch (error) {
      console.error('Error getting pending subscriptions:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Approve subscription
  fastify.post('/api/admin/subscriptions/:id/approve', async (req, reply) => {
    try {
      const { id } = req.params;
      const { adminId } = req.body;
      
      const result = await approveSubscription(id, adminId);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, message: 'Subscription approved successfully' };
    } catch (error) {
      console.error('Error approving subscription:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Reject subscription
  fastify.post('/api/admin/subscriptions/:id/reject', async (req, reply) => {
    try {
      const { id } = req.params;
      const { adminId, reason } = req.body;
      
      const result = await rejectSubscription(id, adminId, reason);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, message: 'Subscription rejected successfully' };
    } catch (error) {
      console.error('Error rejecting subscription:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get support messages
  fastify.get('/api/admin/support-messages', async (req, reply) => {
    try {
      const { status } = req.query;
      const messages = await getSupportMessages(status);
      return { success: true, messages };
    } catch (error) {
      console.error('Error getting support messages:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Support API
export const supportRoutes = (fastify) => {
  // Create support message
  fastify.post('/api/support', async (req, reply) => {
    try {
      const messageData = req.body;
      const result = await createSupportMessage(messageData);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error creating support message:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Utility API
export const utilityRoutes = (fastify) => {
  // Calculate subscription amount
  fastify.post('/api/calculate-amount', async (req, reply) => {
    try {
      const { basePrice, duration } = req.body;
      const amount = calculateAmount(basePrice, duration);
      
      return { 
        success: true, 
        amount,
        formattedAmount: formatCurrency(amount)
      };
    } catch (error) {
      console.error('Error calculating amount:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get payment instructions
  fastify.get('/api/payment-instructions/:method/:reference', async (req, reply) => {
    try {
      const { method, reference } = req.params;
      const { lang = 'en' } = req.query;
      
      const instructions = getPaymentInstructions(method, reference, lang);
      
      if (!instructions) {
        return reply.status(404).send({ error: 'Payment method not found' });
      }
      
      return { success: true, instructions };
    } catch (error) {
      console.error('Error getting payment instructions:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};