import { createPayment, updatePaymentStatus, updateSubscription, getPaymentById } from "./database.js";
import { notifyAdminsAboutPayment } from "./paymentVerification.js";

// Payment Methods Configuration
export const PAYMENT_METHODS = {
  TELEBIRR: {
    id: 'telebirr',
    name: 'TeleBirr',
    name_am: 'ቴሌብር',
    description: 'Mobile money transfer via TeleBirr',
    description_am: 'በቴሌብር የስልክ ገንዘብ ማስተላለፊያ',
    instructions: 'Send payment to: 0912345678\nReference: {reference}',
    instructions_am: 'ክፍያ ይላኩ: 0912345678\nማጣቀሻ: {reference}',
    accountNumber: '0912345678',
    accountName: 'BirrPay Services'
  },
  CBE_BIRR: {
    id: 'cbe_birr',
    name: 'CBE Birr',
    name_am: 'የኢትዮጵያ ንግድ ባንክ ብር',
    description: 'Bank transfer via Commercial Bank of Ethiopia',
    description_am: 'በየኢትዮጵያ ንግድ ባንክ የባንክ ማስተላለፊያ',
    instructions: 'Transfer to: 1000123456789\nAccount: BirrPay Services\nReference: {reference}',
    instructions_am: 'ወደ ያስተላልፉ: 1000123456789\nመለያ: BirrPay Services\nማጣቀሻ: {reference}',
    accountNumber: '1000123456789',
    accountName: 'BirrPay Services'
  },
  AWASH_BANK: {
    id: 'awash_bank',
    name: 'Awash Bank',
    name_am: 'አዋሽ ባንክ',
    description: 'Bank transfer via Awash Bank',
    description_am: 'በአዋሽ ባንክ የባንክ ማስተላለፊያ',
    instructions: 'Transfer to: 0134567890123\nAccount: BirrPay Services\nReference: {reference}',
    instructions_am: 'ወደ ያስተላልፉ: 0134567890123\nመለያ: BirrPay Services\nማጣቀሻ: {reference}',
    accountNumber: '0134567890123',
    accountName: 'BirrPay Services'
  }
};

// Generate unique payment reference
export const generatePaymentReference = (subscriptionId) => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `BP${subscriptionId.slice(0, 4)}${timestamp}${random}`;
};

// Generate a payment reference for manual payment
export function generateManualPaymentReference(userId) {
  return `BP-${Date.now()}-${userId.toString().slice(-4)}`;
}

// Get payment instructions for a specific method
export function getPaymentInstructions(paymentMethodId, reference, lang = 'en') {
  const method = Object.values(PAYMENT_METHODS).find(m => m.id === paymentMethodId);
  if (!method) {
    return {
      title: 'Payment Instructions',
      title_am: 'የክፍያ መመሪያዎች',
      instructions: 'Please contact support for payment instructions.',
      instructions_am: 'እባክዎ የክፍያ መመሪያዎችን ለማግኘት ድጋፍ ያነጋግሩ።'
    };
  }

  return {
    title: `Pay with ${method.name}`,
    title_am: `በ${method.name_am} ይክፈሉ`,
    instructions: method.instructions.replace('{reference}', reference),
    instructions_am: method.instructions_am.replace('{reference}', reference),
    accountNumber: method.accountNumber,
    accountName: method.accountName
  };
}

// Format currency for display
export function formatCurrency(amount, currency = 'ETB') {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Create a new manual payment
 * @param {Object} subscriptionData - Subscription data
 * @param {Object} paymentMethod - Payment method details
 * @param {Object} user - User information
 * @returns {Promise<Object>} Result of the operation
 */
export async function createManualPayment(subscriptionData, paymentMethod, user) {
  try {
    // Find payment method case-insensitively
    const paymentMethodConfig = Object.values(PAYMENT_METHODS).find(
      method => method.id.toLowerCase() === paymentMethod.toLowerCase()
    );
    
    if (!paymentMethodConfig) {
      console.error(`❌ Invalid payment method: ${paymentMethod}`);
      throw new Error('Invalid payment method');
    }

    const paymentReference = generateManualPaymentReference(subscriptionData.userId);
    
    // Create a pending payment record
    const paymentData = {
      userId: subscriptionData.userId,
      subscriptionId: subscriptionData.id,
      amount: subscriptionData.amount,
      currency: 'ETB',
      paymentMethod: paymentMethod.id,
      status: 'pending_verification',
      paymentReference,
      userName: user?.username || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || `User-${subscriptionData.userId}`,
      serviceId: subscriptionData.serviceId,
      serviceName: subscriptionData.serviceName,
      duration: subscriptionData.duration,
      metadata: {
        duration: subscriptionData.duration,
        serviceId: subscriptionData.serviceId,
        serviceName: subscriptionData.serviceName,
        createdAt: new Date().toISOString()
      }
    };

    const paymentResult = await createPayment(paymentData);

    if (!paymentResult.success) {
      console.error('Failed to create payment record:', paymentResult.error);
      return { 
        success: false, 
        error: 'Failed to create payment record',
        details: paymentResult.error 
      };
    }

    // Update subscription with payment ID
    if (subscriptionData.subscriptionId) {
      await updateSubscription(subscriptionData.subscriptionId, {
        paymentId: paymentResult.id,
        paymentReference: paymentReference,
        status: 'pending_payment'
      });
    }

    // Prepare response with payment instructions
    const response = {
      success: true,
      paymentId: paymentResult.id,
      subscriptionId: subscriptionData.id,
      paymentReference: paymentReference,
      amount: subscriptionData.amount,
      currency: 'ETB',
      paymentMethod: paymentMethod.id,
      requiresVerification: true,
      instructions: getPaymentInstructions(paymentMethod.id, paymentReference, subscriptionData.language || 'en')
    };
    
    return response;
  } catch (error) {
    console.error('Error creating manual payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Verify a manual payment (admin function)
// This is now handled by paymentVerification.js
export async function verifyManualPayment(paymentId, adminId, notes = '') {
  try {
    const { verifyPayment } = await import('./paymentVerification.js');
    return await verifyPayment(paymentId, adminId, notes);
  } catch (error) {
    console.error('Error in verifyManualPayment:', error);
    return { success: false, error: error.message };
  }
};

// Reject a manual payment (admin function)
// This is now handled by paymentVerification.js
export async function rejectManualPayment(paymentId, adminId, reason = '') {
  try {
    const { rejectPayment } = await import('./paymentVerification.js');
    return await rejectPayment(paymentId, adminId, reason);
  } catch (error) {
    console.error('Error in rejectManualPayment:', error);
    return { success: false, error: error.message };
  }
};

// Helper function to calculate end date based on duration
function calculateEndDate(startDate, duration) {
  const date = new Date(startDate);
  const [value, unit] = duration.split('_');
  const months = unit === 'month' || unit === 'months' ? parseInt(value) : 1;
  date.setMonth(date.getMonth() + months);
  return date.toISOString();
}

// Verify payment (admin function)
export const verifyPayment = async (paymentId, adminId, verificationData) => {
  try {
    const { isVerified, transactionId, notes } = verificationData;
    
    if (isVerified) {
      // Update payment status to completed
      await updatePaymentStatus(paymentId, 'completed', transactionId);
      
      // Get subscription and update its status
      // This will be handled by the admin approval process
      
      return { success: true, status: 'completed' };
    } else {
      // Update payment status to failed
      await updatePaymentStatus(paymentId, 'failed');
      
      return { success: true, status: 'failed' };
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
};

// This function was a duplicate and has been removed. Use getPaymentInstructions(paymentMethodId, reference, lang) instead.

// Calculate subscription amount based on duration
export const calculateAmount = (basePrice, duration) => {
  const durationMultipliers = {
    '1_month': 1,
    '3_months': 2.7, // 10% discount
    '6_months': 5.1, // 15% discount
    '12_months': 9.6  // 20% discount
  };
  
  return Math.round(basePrice * durationMultipliers[duration]);
};