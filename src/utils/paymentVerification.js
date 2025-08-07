import { getPaymentById, updatePaymentStatus, createSupportTicket, getAdmins, updatePayment } from './database.js';
import { bot } from '../bot.js';
import { formatCurrency } from './payment.js';

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
export async function notifyAdminsAboutPayment(payment, screenshotUrl) {
  try {
    const admins = await getAdmins();
    if (!admins.length) {
      console.warn('No admins found to notify');
      return false;
    }

    // Create a support ticket for tracking
    const ticket = await createSupportTicket({
      userId: payment.userId,
      type: 'payment_verification',
      subject: `Payment Verification Required - ${payment.paymentReference}`,
      message: `New payment requires verification.\n` +
               `Amount: ${formatCurrency(payment.amount)}\n` +
               `Service: ${payment.serviceName || 'N/A'}\n` +
               `Payment Method: ${payment.paymentMethod || 'Manual'}\n` +
               `Reference: ${payment.paymentReference}`,
      metadata: {
        paymentId: payment.id,
        screenshotUrl,
        serviceId: payment.serviceId,
        amount: payment.amount
      },
      priority: 'high'
    });

    // Prepare the message with verification buttons
    const message = `🆕 *New Payment Requires Verification*\n\n` +
      `💰 *Amount:* ${formatCurrency(payment.amount)}\n` +
      `👤 *User:* ${payment.userName || `ID: ${payment.userId}`}\n` +
      `📝 *Reference:* \`${payment.paymentReference}\`\n` +
      `🛒 *Service:* ${payment.serviceName || 'N/A'}\n` +
      `💳 *Method:* ${payment.paymentMethod || 'Manual'}\n` +
      `📅 *Date:* ${new Date(payment.createdAt).toLocaleString()}\n\n` +
      `*Ticket ID:* ${ticket.id || 'N/A'}`;

    // Send to all admins
    const sendPromises = admins.map(admin => {
      return bot.telegram.sendMessage(
        admin.userId,
        message,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { 
                  text: '✅ Verify Payment', 
                  callback_data: `verify_payment:${payment.id}` 
                },
                { 
                  text: '❌ Reject Payment', 
                  callback_data: `reject_payment:${payment.id}` 
                }
              ],
              screenshotUrl ? [
                { 
                  text: '📸 View Screenshot', 
                  url: screenshotUrl,
                  callback_data: 'view_screenshot'
                }
              ] : []
            ]
          }
        }
      );
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
export async function handlePaymentProofUpload({ paymentId, screenshotUrl, userId, userInfo }) {
  try {
    // Update payment with screenshot URL
    const paymentUpdate = {
      screenshotUrl,
      status: 'pending_verification',
      updatedAt: new Date().toISOString()
    };

    const result = await updatePayment(paymentId, paymentUpdate);
    
    if (!result.success) {
      throw new Error('Failed to update payment with screenshot');
    }

    // Get the updated payment
    const payment = await getPaymentById(paymentId);
    
    // Notify admins about the new payment proof
    await notifyAdminsAboutPayment(payment, screenshotUrl);

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
