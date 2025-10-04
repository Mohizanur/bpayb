import { getPaymentById, updatePaymentStatus, createSupportTicket, getAdmins, updatePayment } from './database.js';
import { bot } from '../bot.js';
import { formatCurrency } from './payment.js';
import { firestore } from './firestore.js';

/**
 * Verify a payment and activate the subscription
 * @param {string} paymentId - The payment ID to verify
 * @param {string} adminId - The admin ID who verified the payment
 * @param {string} [notes=''] - Optional notes about the verification
 * @returns {Promise<Object>} Result of the operation
 */
export async function verifyPayment(paymentId, adminId, notes = '') {
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

    // Notify user about successful verification
    try {
      await bot.telegram.sendMessage(
        payment.userId,
        `✅ *Payment Verified!*\n\n` +
        `Your payment of *${formatCurrency(payment.amount)}* has been verified.\n` +
        `Reference: \`${payment.paymentReference}\`\n` +
        `Service: ${payment.serviceName || 'N/A'}\n` +
        `Thank you for your purchase!`,
        { parse_mode: 'Markdown' }
      );
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

    // Notify user about rejection
    try {
      await bot.telegram.sendMessage(
        payment.userId,
        `❌ *Payment Rejected*\n\n` +
        `Your payment of *${formatCurrency(payment.amount)}* was rejected.\n` +
        `Reference: \`${payment.paymentReference}\`\n` +
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
export async function notifyAdminsAboutPayment(payment, screenshotUrl, fileId) {
  try {
    const admins = await getAdmins();
    if (!admins.length) {
      console.warn('No admins found to notify');
      return false;
    }

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
    
    const message = `🆕 *Payment Verification Required*\n\n` +
      `💰 *Amount:* ${formattedAmount}\n` +
      `👤 *User:* ${payment.userName || `ID: ${payment.userId}`}\n` +
      `🛒 *Service:* ${payment.serviceName || 'N/A'}\n` +
      `📅 *Date:* ${new Date(payment.createdAt || Date.now()).toLocaleString()}\n\n` +
      `*Payment ID:* \`${payment.id}\``;

    // Send to all admins (filter out admins without valid chat IDs)
    const validAdmins = admins.filter(admin => admin.id && admin.id !== 'undefined');
    
    if (validAdmins.length === 0) {
      console.warn('No admins with valid chat IDs found');
      return false;
    }
    
    const sendPromises = validAdmins.map(admin => {
      // If we have a fileId, forward the image with payment details
      if (fileId) {
        return bot.telegram.sendPhoto(
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
      } else {
        // Fallback to text message if no fileId
        return bot.telegram.sendMessage(
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
      }
    });

    await Promise.all(sendPromises);
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
export async function handlePaymentProofUpload({ paymentId, screenshotUrl, fileId, userId, userInfo }) {
  try {
    // First, try to find the payment in pendingPayments collection
    let payment = null;
    let paymentCollection = 'pendingPayments';
    
    try {
      const pendingPaymentDoc = await firestore.collection('pendingPayments').doc(paymentId).get();
      if (pendingPaymentDoc.exists) {
        payment = { id: pendingPaymentDoc.id, ...pendingPaymentDoc.data() };
        paymentCollection = 'pendingPayments';
      }
    } catch (error) {
      console.log('Payment not found in pendingPayments, checking payments collection');
    }
    
    // If not found in pendingPayments, try payments collection
    if (!payment) {
      try {
        const paymentDoc = await firestore.collection('payments').doc(paymentId).get();
        if (paymentDoc.exists) {
          payment = { id: paymentDoc.id, ...paymentDoc.data() };
          paymentCollection = 'payments';
        }
      } catch (error) {
        console.log('Payment not found in payments collection either');
      }
    }
    
    // If payment still not found, create a new one
    if (!payment) {
      console.log('Creating new payment document for paymentId:', paymentId);
      const newPaymentData = {
        userId,
        screenshotUrl,
        status: 'pending_verification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...userInfo
      };
      
      await firestore.collection('payments').doc(paymentId).set(newPaymentData);
      payment = { id: paymentId, ...newPaymentData };
      paymentCollection = 'payments';
    } else {
      // Update existing payment with screenshot URL
      const paymentUpdate = {
        screenshotUrl,
        status: 'pending_verification',
        updatedAt: new Date().toISOString()
      };

      await firestore.collection(paymentCollection).doc(paymentId).update(paymentUpdate);
      payment = { ...payment, ...paymentUpdate };
    }
    
    // Notify admins about the new payment proof
    await notifyAdminsAboutPayment(payment, screenshotUrl, fileId);

    return {
      success: true,
      paymentId,
      screenshotUrl,
      message: 'Payment proof uploaded successfully. Waiting for admin verification.'
    };
  } catch (error) {
    console.error('Error handling payment proof upload:', error);
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
