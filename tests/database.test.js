import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  createUser,
  getUser,
  updateUser,
  getAllUsers,
  createSubscription,
  getSubscription,
  getUserSubscriptions,
  updateSubscription,
  createPayment,
  getPayment,
  updatePaymentStatus,
  createSupportMessage,
  getSupportMessages,
  getAdminStats
} from '../src/utils/database.js';

describe('Database Functions', () => {
  const testUserId = 'test-user-123';
  const testUserData = {
    name: 'Test User',
    email: 'test@example.com',
    phone: '+251912345678',
    language: 'en'
  };

  describe('User Management', () => {
    it('should create a new user', async () => {
      const result = await createUser(testUserId, testUserData);
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.id, testUserId);
    });

    it('should get a user by ID', async () => {
      const user = await getUser(testUserId);
      assert.strictEqual(user.name, testUserData.name);
      assert.strictEqual(user.email, testUserData.email);
      assert.strictEqual(user.status, 'active');
    });

    it('should update user information', async () => {
      const updates = { isPaid: true, totalSpent: 350 };
      const result = await updateUser(testUserId, updates);
      assert.strictEqual(result.success, true);

      const updatedUser = await getUser(testUserId);
      assert.strictEqual(updatedUser.isPaid, true);
      assert.strictEqual(updatedUser.totalSpent, 350);
    });

    it('should get all users', async () => {
      const users = await getAllUsers();
      assert.strictEqual(Array.isArray(users), true);
      assert.strictEqual(users.length >= 1, true);
      
      const testUser = users.find(u => u.id === testUserId);
      assert.strictEqual(testUser !== undefined, true);
    });
  });

  describe('Subscription Management', () => {
    let subscriptionId;

    it('should create a new subscription', async () => {
      const subscriptionData = {
        userId: testUserId,
        serviceId: 'netflix',
        serviceName: 'Netflix',
        price: 350,
        duration: 1,
        billingCycle: 'monthly'
      };

      const result = await createSubscription(subscriptionData);
      assert.strictEqual(result.success, true);
      assert.strictEqual(typeof result.id, 'string');
      subscriptionId = result.id;
    });

    it('should get a subscription by ID', async () => {
      const subscription = await getSubscription(subscriptionId);
      assert.strictEqual(subscription.userId, testUserId);
      assert.strictEqual(subscription.serviceId, 'netflix');
      assert.strictEqual(subscription.status, 'pending');
    });

    it('should get user subscriptions', async () => {
      const subscriptions = await getUserSubscriptions(testUserId);
      assert.strictEqual(Array.isArray(subscriptions), true);
      assert.strictEqual(subscriptions.length >= 1, true);
      
      const testSubscription = subscriptions.find(s => s.id === subscriptionId);
      assert.strictEqual(testSubscription !== undefined, true);
    });

    it('should update subscription status', async () => {
      const result = await updateSubscription(subscriptionId, { 
        status: 'active',
        startDate: new Date()
      });
      assert.strictEqual(result.success, true);

      const updatedSubscription = await getSubscription(subscriptionId);
      assert.strictEqual(updatedSubscription.status, 'active');
    });
  });

  describe('Payment Management', () => {
    let paymentId;

    it('should create a new payment', async () => {
      const paymentData = {
        userId: testUserId,
        amount: 350,
        method: 'bank_transfer',
        reference: 'TEST123456',
        subscriptionId: 'test-sub-id'
      };

      const result = await createPayment(paymentData);
      assert.strictEqual(result.success, true);
      assert.strictEqual(typeof result.id, 'string');
      paymentId = result.id;
    });

    it('should get a payment by ID', async () => {
      const payment = await getPayment(paymentId);
      assert.strictEqual(payment.userId, testUserId);
      assert.strictEqual(payment.amount, 350);
      assert.strictEqual(payment.status, 'pending');
    });

    it('should update payment status', async () => {
      const result = await updatePaymentStatus(paymentId, 'completed', {
        transactionId: 'TXN123456',
        completedAt: new Date()
      });
      assert.strictEqual(result.success, true);

      const updatedPayment = await getPayment(paymentId);
      assert.strictEqual(updatedPayment.status, 'completed');
      assert.strictEqual(updatedPayment.transactionId, 'TXN123456');
    });
  });

  describe('Support Management', () => {
    let supportTicketId;

    it('should create a support message', async () => {
      const messageData = {
        userId: testUserId,
        type: 'technical',
        priority: 'normal',
        subject: 'Test Support Ticket',
        message: 'This is a test support message'
      };

      const result = await createSupportMessage(messageData);
      assert.strictEqual(result.success, true);
      assert.strictEqual(typeof result.id, 'string');
      supportTicketId = result.id;
    });

    it('should get support messages', async () => {
      const messages = await getSupportMessages();
      assert.strictEqual(Array.isArray(messages), true);
      assert.strictEqual(messages.length >= 1, true);
      
      const testMessage = messages.find(m => m.id === supportTicketId);
      assert.strictEqual(testMessage !== undefined, true);
      assert.strictEqual(testMessage.status, 'open');
    });
  });

  describe('Admin Statistics', () => {
    it('should get admin stats', async () => {
      const stats = await getAdminStats();
      
      assert.strictEqual(typeof stats, 'object');
      assert.strictEqual(typeof stats.totalUsers, 'number');
      assert.strictEqual(typeof stats.totalSubscriptions, 'number');
      assert.strictEqual(typeof stats.totalPayments, 'number');
      assert.strictEqual(typeof stats.totalRevenue, 'number');
      
      // Should have at least our test data
      assert.strictEqual(stats.totalUsers >= 1, true);
      assert.strictEqual(stats.totalSubscriptions >= 1, true);
      assert.strictEqual(stats.totalPayments >= 1, true);
    });
  });
});