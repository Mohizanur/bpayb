import { createPayment, updatePayment, updateSubscription } from './database.js';

// Payment methods configuration
const PAYMENT_METHODS = {
  cbe: {
    name: 'Commercial Bank of Ethiopia',
    accountNumber: '1000123456789',
    accountName: 'BirrPay Services',
    instructions: [
      'Send payment to CBE account',
      'Include your phone number as reference',
      'Screenshot the payment confirmation',
      'Upload the screenshot here'
    ]
  },
  telebirr: {
    name: 'Telebirr',
    phoneNumber: '+251912345678',
    accountName: 'BirrPay Services',
    instructions: [
      'Send payment via Telebirr',
      'Use the phone number above',
      'Include your phone number as reference',
      'Screenshot the payment confirmation',
      'Upload the screenshot here'
    ]
  },
  amole: {
    name: 'Amole',
    phoneNumber: '+251912345678',
    accountName: 'BirrPay Services',
    instructions: [
      'Send payment via Amole',
      'Use the phone number above',
      'Include your phone number as reference',
      'Screenshot the payment confirmation',
      'Upload the screenshot here'
    ]
  }
};

// Generate payment instructions
export const generatePaymentInstructions = (paymentMethod, amount, reference) => {
  const method = PAYMENT_METHODS[paymentMethod];
  if (!method) {
    throw new Error('Invalid payment method');
  }

  return {
    method: method.name,
    amount: amount,
    reference: reference,
    instructions: method.instructions,
    accountInfo: method.accountNumber || method.phoneNumber,
    accountName: method.accountName
  };
};

// Create a new payment record
export const initiatePayment = async (userId, serviceId, amount, duration, paymentMethod) => {
  try {
    // Generate unique reference number
    const reference = `BP${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    
    // Create payment record
    const paymentData = {
      userId: String(userId),
      serviceId,
      amount,
      duration,
      paymentMethod,
      reference,
      status: 'pending'
    };
    
    const paymentResult = await createPayment(paymentData);
    
    if (!paymentResult.success) {
      throw new Error(paymentResult.error);
    }
    
    // Generate payment instructions
    const instructions = generatePaymentInstructions(paymentMethod, amount, reference);
    
    return {
      success: true,
      paymentId: paymentResult.paymentId,
      reference,
      instructions
    };
  } catch (error) {
    console.error('Error initiating payment:', error);
    return { success: false, error: error.message };
  }
};

// Verify payment (admin function)
export const verifyPayment = async (paymentId, adminId) => {
  try {
    // Update payment status
    const paymentUpdate = await updatePayment(paymentId, {
      status: 'completed',
      verifiedBy: adminId,
      verifiedAt: new Date()
    });
    
    if (!paymentUpdate.success) {
      throw new Error(paymentUpdate.error);
    }
    
    // Get payment details to update subscription
    // This would typically involve getting the payment details first
    // For now, we'll assume the subscription update is handled separately
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying payment:', error);
    return { success: false, error: error.message };
  }
};

// Reject payment (admin function)
export const rejectPayment = async (paymentId, adminId, reason) => {
  try {
    const paymentUpdate = await updatePayment(paymentId, {
      status: 'rejected',
      rejectedBy: adminId,
      rejectedAt: new Date(),
      rejectionReason: reason
    });
    
    if (!paymentUpdate.success) {
      throw new Error(paymentUpdate.error);
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error rejecting payment:', error);
    return { success: false, error: error.message };
  }
};

// Get payment status
export const getPaymentStatus = async (paymentId) => {
  try {
    // This would typically fetch from database
    // For now, return a mock status
    return { success: true, status: 'pending' };
  } catch (error) {
    console.error('Error getting payment status:', error);
    return { success: false, error: error.message };
  }
};

// Format currency
export const formatCurrency = (amount, currency = 'ETB') => {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

// Calculate subscription end date
export const calculateEndDate = (startDate, duration) => {
  const start = new Date(startDate);
  const end = new Date(start);
  
  switch (duration) {
    case '1month':
      end.setMonth(end.getMonth() + 1);
      break;
    case '3months':
      end.setMonth(end.getMonth() + 3);
      break;
    case '6months':
      end.setMonth(end.getMonth() + 6);
      break;
    case '12months':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      end.setMonth(end.getMonth() + 1);
  }
  
  return end;
};