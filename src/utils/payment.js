import { createPayment, updatePaymentStatus, updateSubscription } from "./database.js";

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

// Create a new payment
export const processPayment = async (subscriptionData, paymentMethod) => {
  try {
    // Find payment method case-insensitively
    const paymentMethodConfig = Object.values(PAYMENT_METHODS).find(
      method => method.id.toLowerCase() === paymentMethod.toLowerCase()
    );
    
    if (!paymentMethodConfig) {
      console.error(`❌ Invalid payment method: ${paymentMethod}`);
      throw new Error('Invalid payment method');
    }

    const paymentReference = generatePaymentReference(subscriptionData.subscriptionId);
    
    // Create payment record
    const paymentData = {
      subscriptionId: subscriptionData.subscriptionId,
      userId: subscriptionData.userId,
      amount: subscriptionData.amount,
      currency: 'ETB',
      paymentMethod: paymentMethod,
      paymentReference: paymentReference,
      description: `${subscriptionData.serviceName} - ${subscriptionData.duration}`,
      status: 'pending'
    };

    const paymentResult = await createPayment(paymentData);
    if (!paymentResult.success) {
      throw new Error('Failed to create payment record');
    }

    // Update subscription with payment ID
    await updateSubscription(subscriptionData.subscriptionId, {
      paymentId: paymentResult.paymentId,
      paymentReference: paymentReference
    });

    return {
      success: true,
      paymentId: paymentResult.paymentId,
      paymentReference: paymentReference,
      paymentMethod: paymentMethodConfig,
      instructions: paymentMethodConfig.instructions.replace('{reference}', paymentReference)
    };

  } catch (error) {
    console.error('Error processing payment:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

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

// Get payment instructions for user
export const getPaymentInstructions = (paymentMethod, paymentReference, lang = 'en') => {
  const method = PAYMENT_METHODS[paymentMethod];
  if (!method) {
    return null;
  }

  const instructions = lang === 'am' ? method.instructions_am : method.instructions;
  return instructions.replace('{reference}', paymentReference);
};

// Format currency
export const formatCurrency = (amount, currency = 'ETB') => {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

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