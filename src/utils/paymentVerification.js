import { getPaymentById, updatePaymentStatus, createSupportTicket, getAdmins, updatePayment } from './database.js';
import { getAllAdmins } from '../middleware/smartVerification.js';
import { bot } from '../bot.js';
import { formatCurrency } from './payment.js';
import { firestore } from './firestore.js';

// Helper function to calculate end date based on duration
function calculateEndDate(startDate, duration) {
  // Handle special cases (connects don't have expiry)
  if (duration && duration.includes('connect')) {
    // Connects are immediate delivery, no expiry date
    // Set expiry far in the future (10 years) to indicate "permanent"
    const date = new Date(startDate);
    date.setFullYear(date.getFullYear() + 10);
    return date.toISOString();
  }
  
  const date = new Date(startDate);
  const [value, unit] = duration.split('_');
  const months = unit === 'month' || unit === 'months' ? parseInt(value) : 1;
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

/**
 * Verify a payment and activate the subscription
 * @param {string} paymentId - The payment ID to verify
 * @param {string} adminId - The admin ID who verified the payment
 * @param {string} [notes=''] - Optional notes about the verification
 * @returns {Promise<Object>} Result of the operation
 */
export async function verifyPayment(paymentId, adminId, notes = '', botInstance = null) {
  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status to completed
    const result = await updatePaymentStatus(paymentId, {
      status: 'completed',
      verifiedAt: new Date().toISOString(),
      verifiedBy: adminId,
      notes,
      updatedAt: new Date().toISOString()
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update payment status');
    }

    // Create or update subscription
    console.log('🔍 Payment data for subscription creation:', {
      paymentId,
      subscriptionId: payment.subscriptionId,
      userId: payment.userId,
      serviceId: payment.serviceId,
      serviceName: payment.serviceName,
      duration: payment.duration,
      amount: payment.amount,
      price: payment.price
    });

    if (payment.subscriptionId) {
      // Update existing subscription to active
      console.log('🔍 Updating existing subscription:', payment.subscriptionId);
      
      // Determine if this is a custom plan
      const isCustomPlan = payment.serviceId === 'custom_plan' || payment.customPlanDetails || payment.customPlanRequestId;
      
      const updateData = {
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: calculateEndDate(new Date(), payment.duration || '1_month'),
        updatedAt: new Date().toISOString()
      };
      
      // Add custom plan details if this is a custom plan
      if (isCustomPlan) {
        updateData.isCustomPlan = true;
        if (payment.customPlanDetails) updateData.customPlanDetails = payment.customPlanDetails;
        if (payment.customPlanRequestId) updateData.customPlanRequestId = payment.customPlanRequestId;
        updateData.serviceName = `Custom Plan: ${payment.customPlanDetails || 'Custom Service'}`;
      }
      // Don't set isCustomPlan if it's false/undefined - Firestore doesn't allow undefined
      
      await firestore.collection('subscriptions').doc(payment.subscriptionId).update(updateData);
      console.log('✅ Subscription updated to active');
      
      // ULTRA-CACHE: Clear user's subscription cache
      const { clearUserSubscriptionCache } = await import('./ultraCache.js');
      clearUserSubscriptionCache(payment.userId);
    } else {
      // Create new subscription if it doesn't exist
      console.log('🔍 Creating new subscription for payment:', paymentId);
      const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Determine if this is a custom plan
      const isCustomPlan = payment.serviceId === 'custom_plan' || payment.customPlanDetails || payment.customPlanRequestId;
      
      const subscriptionData = {
        id: subscriptionId,
        userId: payment.userId,
        serviceId: payment.serviceId,
        serviceName: isCustomPlan ? `Custom Plan: ${payment.customPlanDetails || 'Custom Service'}` : payment.serviceName,
        status: 'active',
        startDate: new Date().toISOString(),
        endDate: calculateEndDate(new Date(), payment.duration || '1_month'),
        amount: payment.amount || payment.price,
        duration: payment.duration || '1_month',
        paymentId: paymentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        // Custom plan specific fields - only include if it's a custom plan
        ...(isCustomPlan ? {
          isCustomPlan: true,
          ...(payment.customPlanDetails && { customPlanDetails: payment.customPlanDetails }),
          ...(payment.customPlanRequestId && { customPlanRequestId: payment.customPlanRequestId })
        } : {})
      };

      await firestore.collection('subscriptions').doc(subscriptionId).set(subscriptionData);
      console.log('✅ New subscription created:', subscriptionId);
      
      // ULTRA-CACHE: Clear user's subscription cache
      const { clearUserSubscriptionCache } = await import('./ultraCache.js');
      clearUserSubscriptionCache(payment.userId);
      
      // Update payment with subscription ID (try both collections)
      try {
        await firestore.collection('payments').doc(paymentId).update({
          subscriptionId: subscriptionId,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Payment updated with subscription ID in payments collection');
      } catch (error) {
        console.log('🔍 Payment not in payments collection, trying pendingPayments...');
        await firestore.collection('pendingPayments').doc(paymentId).update({
          subscriptionId: subscriptionId,
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Payment updated with subscription ID in pendingPayments collection');
      }
    }

    // Notify user about successful verification
    try {
      // Use provided bot instance or fallback to imported bot
      const telegramBot = botInstance || bot;
      
      if (!telegramBot || !telegramBot.telegram) {
        console.error('❌ Bot instance not available for notifying user about payment verification');
        // Continue even if notification fails
      } else {
        // Handle different amount formats
        let amountText = payment.amount || payment.price || 'N/A';
        if (typeof amountText === 'string' && amountText.includes('ETB')) {
          // Already formatted
          amountText = amountText;
        } else if (typeof amountText === 'number') {
          amountText = `ETB ${amountText.toLocaleString()}`;
        }
        
        // Handle payment reference
        const reference = payment.paymentReference || payment.id || 'N/A';
        
        await telegramBot.telegram.sendMessage(
          payment.userId,
          `✅ *Payment Verified!*\n\n` +
          `Your payment of *${amountText}* has been verified.\n` +
          `Reference: \`${reference}\`\n` +
          `Service: ${payment.serviceName || 'N/A'}\n` +
          `Thank you for your purchase!`,
          { parse_mode: 'Markdown' }
        );
      }
    } catch (error) {
      console.error('Error notifying user about payment verification:', error);
      // Continue even if notification fails
    }

    return { success: true, payment: { ...payment, status: 'completed' } };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reject a payment
 * @param {string} paymentId - The payment ID to reject
 * @param {string} adminId - The admin ID who rejected the payment
 * @param {string} reason - Reason for rejection
 * @returns {Promise<Object>} Result of the operation
 */
export async function rejectPayment(paymentId, adminId, reason) {
  try {
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update payment status to rejected
    const result = await updatePaymentStatus(paymentId, {
      status: 'rejected',
      rejectedAt: new Date().toISOString(),
      rejectedBy: adminId,
      rejectionReason: reason,
      updatedAt: new Date().toISOString()
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to update payment status');
    }

    // Update subscription status to rejected if it exists
    if (payment.subscriptionId) {
      await firestore.collection('subscriptions').doc(payment.subscriptionId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: adminId,
        rejectionReason: reason,
        updatedAt: new Date().toISOString()
      });
      
      // ULTRA-CACHE: Clear user's subscription cache
      const { clearUserSubscriptionCache } = await import('./ultraCache.js');
      clearUserSubscriptionCache(payment.userId);
    }

    // Notify user about rejection
    try {
      // Handle different amount formats
      let amountText = payment.amount || payment.price || 'N/A';
      if (typeof amountText === 'string' && amountText.includes('ETB')) {
        // Already formatted
        amountText = amountText;
      } else if (typeof amountText === 'number') {
        amountText = `ETB ${amountText.toLocaleString()}`;
      }
      
      // Handle payment reference
      const reference = payment.paymentReference || payment.id || 'N/A';
      
      await bot.telegram.sendMessage(
        payment.userId,
        `❌ *Payment Rejected*\n\n` +
        `Your payment of *${amountText}* was rejected.\n` +
        `Reference: \`${reference}\`\n` +
        `Reason: ${reason || 'No reason provided'}\n\n` +
        `Please contact support if you believe this is a mistake.`,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error notifying user about payment rejection:', error);
      // Continue even if notification fails
    }

    return { success: true, payment: { ...payment, status: 'rejected' } };
  } catch (error) {
    console.error('Error rejecting payment:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Notify admins about a new payment that needs verification
 * @param {Object} payment - The payment details
 * @param {string} [screenshotUrl] - Optional URL to the payment proof screenshot
 * @returns {Promise<boolean>} Whether the notification was sent successfully
 */
export async function notifyAdminsAboutPayment(payment, screenshotUrl, fileId, botInstance = null) {
  try {
    // QUOTA-OPTIMIZED: Use getAllAdmins which uses ULTRA-CACHE (ZERO quota if cached! Admins rarely change for days/months)
    const admins = await getAllAdmins();
    
    if (!admins || !admins.length) {
      console.warn('No admins found to notify');
      return false;
    }
    
    console.log(`📤 Notifying ${admins.length} admin(s) about payment proof (ZERO quota - using cached admins!)`);

    // Format amount properly
    const amount = payment.amount || payment.price || 'N/A';
    const formattedAmount = typeof amount === 'number' ? `${amount.toLocaleString()} ETB` : amount;

    // Create a support ticket for tracking
    const ticket = await createSupportTicket({
      userId: payment.userId,
      type: 'payment_verification',
      subject: `Payment Verification Required - ${payment.paymentReference || payment.id}`,
      message: `New payment requires verification.\n` +
               `Amount: ${formattedAmount}\n` +
               `Service: ${payment.serviceName || 'N/A'}\n` +
               `Payment Method: ${payment.paymentMethod || 'Manual'}\n` +
               `Reference: ${payment.paymentReference || payment.id}`,
      metadata: {
        paymentId: payment.id,
        screenshotUrl,
        serviceId: payment.serviceId,
        amount: payment.amount || payment.price
      },
      priority: 'high'
    });
    
    // Build user details section
    let userDetailsSection = '';
    if (payment.userName || payment.userEmail || payment.userPhone) {
      userDetailsSection = `👤 *User Details:*\n`;
      if (payment.userName) userDetailsSection += `├─ Name: ${payment.userName}\n`;
      if (payment.userEmail) userDetailsSection += `├─ Email: ${payment.userEmail}\n`;
      if (payment.userPhone) userDetailsSection += `├─ Phone: ${payment.userPhone}\n`;
      userDetailsSection += `└─ Telegram ID: ${payment.userId}\n\n`;
    } else {
      userDetailsSection = `👤 *User:* ${payment.userName || `ID: ${payment.userId}`}\n`;
    }

    const message = `🆕 *Payment Verification Required*\n\n` +
      userDetailsSection +
      `💰 *Amount:* ${formattedAmount}\n` +
      `🛒 *Service:* ${payment.serviceName || 'N/A'}\n` +
      `📅 *Date:* ${new Date(payment.createdAt || Date.now()).toLocaleString()}\n\n` +
      `*Payment ID:* \`${payment.id}\``;

    // Send to all admins (filter out admins without valid chat IDs)
    // Filter out placeholder IDs and ensure ID is a valid number
    const validAdmins = admins.filter(admin => {
      const adminId = admin.id || admin.telegramId || admin.userId;
      return adminId && 
             adminId !== 'undefined' && 
             adminId !== 'your_admin_id_here' &&
             typeof adminId === 'number' || (typeof adminId === 'string' && /^\d+$/.test(adminId));
    }).map(admin => ({
      ...admin,
      id: admin.id || admin.telegramId || admin.userId
    }));
    
    if (validAdmins.length === 0) {
      console.warn('No admins with valid chat IDs found');
      console.warn('Admin list:', admins.map(a => ({ id: a.id || a.telegramId || a.userId, name: a.name || a.username })));
      return false;
    }
    
    console.log(`📤 Sending notifications to ${validAdmins.length} valid admin(s)`);
    
    // Use provided bot instance or fallback to imported bot
    const telegramBot = botInstance || bot;
    
    if (!telegramBot || !telegramBot.telegram) {
      console.error('❌ Bot instance not available for sending admin notifications');
      return false;
    }
    
    const sendPromises = validAdmins.map(async (admin) => {
      try {
        // If we have a fileId, forward the image with payment details
        if (fileId) {
          // Add timeout and retry logic for photo sending
          const maxRetries = 2;
          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
              await telegramBot.telegram.sendPhoto(
                admin.id,
                fileId, // Use file_id instead of URL
                {
                  caption: message,
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [
                        { 
                          text: '✅ Approve Payment', 
                          callback_data: `verify_payment:${payment.id}` 
                        },
                        { 
                          text: '❌ Reject Payment', 
                          callback_data: `reject_payment:${payment.id}` 
                        }
                      ],
                      [
                        { 
                          text: '👤 View User Profile', 
                          callback_data: `view_user:${payment.userId}` 
                        }
                      ]
                    ]
                  }
                }
              );
              console.log(`✅ Admin notification sent to ${admin.id}`);
              return; // Success, exit retry loop
            } catch (error) {
              if (attempt === maxRetries) throw error;
              console.log(`⚠️ Retry ${attempt}/${maxRetries} for admin ${admin.id}:`, error.message);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Wait before retry
            }
          }
        } else {
          // Fallback to text message if no fileId
          await telegramBot.telegram.sendMessage(
            admin.id,
            message,
            {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [
                    { 
                      text: '✅ Approve Payment', 
                      callback_data: `verify_payment:${payment.id}` 
                    },
                    { 
                      text: '❌ Reject Payment', 
                      callback_data: `reject_payment:${payment.id}` 
                    }
                  ]
                ]
              }
            }
          );
          console.log(`✅ Admin notification sent to ${admin.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to notify admin ${admin.id}:`, error.message);
        // Continue with other admins even if one fails
      }
    });

    await Promise.allSettled(sendPromises); // Use allSettled instead of all to continue even if some fail
    console.log('✅ Admin notification process completed');
    return true;
  } catch (error) {
    console.error('Error notifying admins about payment:', error);
    return false;
  }
}

/**
 * Handle payment proof screenshot upload
 * @param {number} userId - Telegram user ID
 * @param {string} fileId - Telegram file ID of the screenshot
 * @param {Object} paymentData - Payment data from session
 * @returns {Promise<Object>} Result of the operation
 */
/**
 * Handle payment proof upload from user
 * @param {Object} params - Payment proof parameters
 * @param {string} params.paymentId - The payment ID
 * @param {string} params.screenshotUrl - URL of the uploaded screenshot
 * @param {string} params.userId - Telegram user ID
 * @param {Object} params.userInfo - User information
 * @returns {Promise<Object>} Result of the operation
 */
export async function handlePaymentProofUpload({ paymentId, screenshotUrl, fileId, userId, userInfo, payment: providedPayment, botInstance = null }) {
  try {
    console.log('🔍 Handling payment proof upload for paymentId:', paymentId);
    
    let payment = providedPayment || null; // Use provided payment if available (includes user details)
    let paymentCollection = 'pendingPayments';
    
    // QUOTA-OPTIMIZED: Use cached methods first (no DB reads if cached!)
    const { smartGet } = await import('./optimizedDatabase.js');
    
    // First, try to get from pendingPayments using cached smartGet (ZERO quota if cached!)
    try {
      const cachedPendingPayment = await smartGet('pendingPayments', paymentId, false);
      if (cachedPendingPayment) {
        payment = { id: paymentId, ...cachedPendingPayment };
        paymentCollection = 'pendingPayments';
        console.log('✅ Found payment in pendingPayments cache (ZERO quota used!)');
      }
    } catch (error) {
      console.error('Error checking pendingPayments cache:', error);
    }
    
    // If not found, try payments collection using cached smartGet (ZERO quota if cached!)
    if (!payment) {
      try {
        const cachedPayment = await smartGet('payments', paymentId, false);
        if (cachedPayment) {
          payment = { id: paymentId, ...cachedPayment };
          paymentCollection = 'payments';
          console.log('✅ Found payment in payments cache (ZERO quota used!)');
        }
      } catch (error) {
        console.error('Error checking payments cache:', error);
      }
    }
    
    // If payment still not found, check global admin cache (ZERO quota - already loaded!)
    if (!payment && global.adminDataCache) {
      try {
        payment = global.adminDataCache.payments?.find(p => p.id === paymentId);
        if (payment) {
          paymentCollection = 'payments';
          console.log('✅ Found payment in global admin cache (ZERO quota used!)');
        }
      } catch (error) {
        console.error('Error checking global cache:', error);
      }
    }
    
    // LAST RESORT: Only query Firestore if not in any cache (1 quota read)
    // This should rarely happen since payments are just created
    if (!payment) {
      console.log('⚠️ Payment not in cache, performing single Firestore read (1 quota)...');
      try {
        // Try pendingPayments first (where payments are created)
        const pendingPaymentDoc = await firestore.collection('pendingPayments').doc(paymentId).get();
        if (pendingPaymentDoc.exists) {
          payment = { id: pendingPaymentDoc.id, ...pendingPaymentDoc.data() };
          paymentCollection = 'pendingPayments';
          console.log('✅ Found payment in pendingPayments (1 quota read)');
        } else {
          // Try payments collection as fallback
          const paymentDoc = await firestore.collection('payments').doc(paymentId).get();
          if (paymentDoc.exists) {
            payment = { id: paymentDoc.id, ...paymentDoc.data() };
            paymentCollection = 'payments';
            console.log('✅ Found payment in payments (1 quota read)');
          }
        }
      } catch (error) {
        console.error('Error in last-resort Firestore query:', error);
      }
    }
    
    // If payment still not found, create a new one (fallback)
    if (!payment) {
      console.log('⚠️ Payment not found, creating new payment document for paymentId:', paymentId);
      const newPaymentData = {
        userId,
        screenshotUrl,
        status: 'pending_verification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...userInfo
      };
      
      await firestore.collection('pendingPayments').doc(paymentId).set(newPaymentData);
      payment = { id: paymentId, ...newPaymentData };
      paymentCollection = 'pendingPayments';
    } else {
      // Update existing payment with screenshot URL
      console.log('📝 Updating existing payment with screenshot URL');
      const paymentUpdate = {
        screenshotUrl,
        status: 'pending_verification',
        updatedAt: new Date().toISOString()
      };

      await firestore.collection(paymentCollection).doc(paymentId).update(paymentUpdate);
      payment = { ...payment, ...paymentUpdate };
    }
    
    console.log('📤 Notifying admins about payment proof...');
    // Notify admins about the new payment proof
    const notifyResult = await notifyAdminsAboutPayment(payment, screenshotUrl, fileId, botInstance);
    
    if (!notifyResult) {
      console.warn('⚠️ Admin notification returned false, but continuing...');
    }

    console.log('✅ Payment proof upload handled successfully');
    return {
      success: true,
      paymentId,
      screenshotUrl,
      message: 'Payment proof uploaded successfully. Waiting for admin verification.'
    };
  } catch (error) {
    console.error('❌ Error handling payment proof upload:', error);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Failed to process payment proof',
      paymentId
    };
  }
}

/**
 * Handle payment screenshot upload (legacy)
 * @param {string} userId - Telegram user ID
 * @param {string} fileId - Telegram file ID of the screenshot
 * @param {Object} paymentData - Payment data from session
 * @returns {Promise<Object>} Result of the operation
 */
export async function handlePaymentScreenshot(userId, fileId, paymentData) {
  try {
    // Get the file URL from Telegram
    const fileLink = await bot.telegram.getFileLink(fileId);
    
    // Create a payment record
    const payment = await createPayment({
      userId,
      userName: paymentData.userName,
      serviceId: paymentData.serviceId,
      serviceName: paymentData.serviceName,
      amount: paymentData.amount,
      currency: 'ETB',
      paymentMethod: paymentData.paymentMethod || 'manual',
      status: 'pending_verification',
      screenshotUrl: fileLink.toString(),
      metadata: {
        duration: paymentData.duration,
        originalFileId: fileId
      }
    });

    if (!payment.success) {
      throw new Error(payment.error || 'Failed to create payment record');
    }

    // Notify admins
    await notifyAdminsAboutPayment({
      id: payment.id,
      ...paymentData,
      paymentReference: payment.paymentReference
    }, fileLink.toString());

    return { 
      success: true, 
      paymentId: payment.id,
      paymentReference: payment.paymentReference,
      screenshotUrl: fileLink.toString()
    };
  } catch (error) {
    console.error('Error processing payment screenshot:', error);
    return { 
      success: false, 
      error: error.message || 'Failed to process payment screenshot' 
    };
  }
}
