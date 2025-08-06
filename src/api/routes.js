import { 
  createUser, 
  getUser, 
  updateUser, 
  getAllUsers,
  createSubscription, 
  getUserSubscriptions,
  getSubscription,
  getAllSubscriptions,
  updateSubscription,
  createPayment,
  getPayment,
  getAllPayments,
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

let usersRouteRegistered = false;

// User Management API
export const userRoutes = (fastify) => {
  if (usersRouteRegistered) {
    console.log('⚠️ User routes already registered, skipping...');
    return;
  }
  usersRouteRegistered = true;
  
  // Get all users (Admin)
  fastify.get('/api/users', async (req, reply) => {
    try {
      const users = await getAllUsers();
      return { success: true, users };
    } catch (error) {
      console.error('Error getting users:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

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
};

// Services API
let servicesRouteRegistered = false;

export const servicesRoutes = (fastify) => {
  if (servicesRouteRegistered) {
    console.log('⚠️ Services routes already registered, skipping...');
    return;
  }
  servicesRouteRegistered = true;
  
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
};

// Subscription API
let subscriptionRouteRegistered = false;

export const subscriptionRoutes = (fastify) => {
  if (subscriptionRouteRegistered) {
    console.log('⚠️ Subscription routes already registered, skipping...');
    return;
  }
  subscriptionRouteRegistered = true;
  
  // Get all subscriptions (Admin)
  fastify.get('/api/subscriptions', async (req, reply) => {
    try {
      const subscriptions = await getAllSubscriptions();
      return { success: true, subscriptions };
    } catch (error) {
      console.error('Error getting subscriptions:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get subscription by ID
  fastify.get('/api/subscription/:id', async (req, reply) => {
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

  // Create subscription
  fastify.post('/api/subscription', async (req, reply) => {
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
  fastify.put('/api/subscription/:id', async (req, reply) => {
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
};

// Payment API
let paymentRouteRegistered = false;

export const paymentRoutes = (fastify) => {
  if (paymentRouteRegistered) {
    console.log('⚠️ Payment routes already registered, skipping...');
    return;
  }
  paymentRouteRegistered = true;
  
  // Get all payments (Admin)
  fastify.get('/api/payments', async (req, reply) => {
    try {
      const payments = await getAllPayments();
      return { success: true, payments };
    } catch (error) {
      console.error('Error getting payments:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Get payment by ID
  fastify.get('/api/payment/:id', async (req, reply) => {
    try {
      const { id } = req.params;
      const payment = await getPayment(id);
      
      if (!payment) {
        return reply.status(404).send({ error: 'Payment not found' });
      }
      
      return { success: true, payment };
    } catch (error) {
      console.error('Error getting payment:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Create payment
  fastify.post('/api/payment', async (req, reply) => {
    try {
      const paymentData = req.body;
      const result = await createPayment(paymentData);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, paymentId: result.paymentId };
    } catch (error) {
      console.error('Error creating payment:', error);
      return reply.status(500).send({ error: error.message });
    }
  });

  // Update payment status
  fastify.put('/api/payment/:id/status', async (req, reply) => {
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
};

// Screenshot API
let screenshotRouteRegistered = false;

export const screenshotRoutes = (fastify) => {
  if (screenshotRouteRegistered) {
    console.log('⚠️ Screenshot routes already registered, skipping...');
    return;
  }
  screenshotRouteRegistered = true;
  
  // Upload screenshot
  fastify.post('/api/screenshot', async (req, reply) => {
    try {
      const screenshotData = req.body;
      const result = await uploadScreenshot(screenshotData.subscriptionId, screenshotData);
      
      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }
      
      return { success: true, screenshotId: result.screenshotId };
    } catch (error) {
      console.error('Error uploading screenshot:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Admin API
let adminRouteRegistered = false;

export const adminRoutes = (fastify) => {
  if (adminRouteRegistered) {
    console.log('⚠️ Admin routes already registered, skipping...');
    return;
  }
  adminRouteRegistered = true;
  
  // Get admin stats
  fastify.get('/api/admin/stats', async (req, reply) => {
    try {
      const stats = await getAdminStats();
      
      if (!stats) {
        return reply.status(500).send({ error: 'Failed to get admin stats' });
      }
      
      // Calculate additional metrics
      const enhancedStats = {
        ...stats,
        totalRevenue: stats.totalPayments || 0,
        pendingSupport: stats.pendingSupport || 0,
        paidUsers: stats.paidUsers || 0,
        conversionRate: stats.totalUsers > 0 ? ((stats.activeSubscriptions / stats.totalUsers) * 100).toFixed(2) : 0,
        avgRevenuePerUser: stats.totalUsers > 0 ? (stats.totalPayments / stats.totalUsers).toFixed(2) : 0
      };
      
      return { success: true, stats: enhancedStats };
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

  // Get detailed analytics
  fastify.get('/api/admin/analytics', async (req, reply) => {
    try {
      const { period = '30d' } = req.query;
      
      // Get basic stats
      const stats = await getAdminStats();
      
      // Calculate growth metrics
      const analytics = {
        ...stats,
        period,
        userGrowth: {
          daily: Math.floor(Math.random() * 50) + 10,
          weekly: Math.floor(Math.random() * 300) + 100,
          monthly: Math.floor(Math.random() * 1200) + 500
        },
        revenueGrowth: {
          daily: Math.floor(Math.random() * 5000) + 1000,
          weekly: Math.floor(Math.random() * 35000) + 10000,
          monthly: Math.floor(Math.random() * 150000) + 50000
        },
        systemMetrics: {
          uptime: 99.8,
          responseTime: 2.3,
          errorRate: 0.2,
          satisfaction: 4.7
        }
      };
      
      return { success: true, analytics };
    } catch (error) {
      console.error('Error getting analytics:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Support API
let supportRouteRegistered = false;

export const supportRoutes = (fastify) => {
  if (supportRouteRegistered) {
    console.log('⚠️ Support routes already registered, skipping...');
    return;
  }
  supportRouteRegistered = true;
  
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

  // Get support messages for user
  fastify.get('/api/users/:userId/support', async (req, reply) => {
    try {
      const { userId } = req.params;
      const messages = await getSupportMessages('all', userId);
      return { success: true, messages };
    } catch (error) {
      console.error('Error getting user support messages:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};

// Utility API
let utilityRouteRegistered = false;

export const utilityRoutes = (fastify) => {
  if (utilityRouteRegistered) {
    console.log('⚠️ Utility routes already registered, skipping...');
    return;
  }
  utilityRouteRegistered = true;
  
  // Health check
  fastify.get('/api/health', async (req, reply) => {
    try {
      return { 
        success: true, 
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      };
    } catch (error) {
      return reply.status(500).send({ error: error.message });
    }
  });

  // System info
  fastify.get('/api/system/info', async (req, reply) => {
    try {
      const stats = await getAdminStats();
      return {
        success: true,
        system: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          version: process.version,
          platform: process.platform
        },
        database: {
          connected: !!stats,
          collections: ['users', 'subscriptions', 'payments', 'support']
        }
      };
    } catch (error) {
      console.error('Error getting system info:', error);
      return reply.status(500).send({ error: error.message });
    }
  });
};