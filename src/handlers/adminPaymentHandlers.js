import { Markup } from 'telegraf';
import { verifyManualPayment, rejectManualPayment } from '../utils/payment.js';
import { getPaymentById } from '../utils/database.js';

/**
 * Handle payment verification callback from admin
 * @param {Object} ctx - Telegraf context
 * @param {string} action - Action to perform (verify/reject)
 * @param {string} paymentId - Payment ID to process
 */
export async function handlePaymentVerificationCallback(ctx, action, paymentId) {
  try {
    // Check if user is admin
    if (!ctx.session.isAdmin) {
      await ctx.answerCbQuery('❌ Unauthorized');
      return;
    }

    const adminId = ctx.from.id;
    const adminName = `${ctx.from.first_name || ''} ${ctx.from.last_name || ''}`.trim() || `Admin-${adminId}`;
    
    // Get payment details
    const payment = await getPaymentById(paymentId);
    if (!payment) {
      await ctx.answerCbQuery('❌ Payment not found');
      return;
    }

    // Handle different actions
    if (action === 'verify') {
      await handleVerifyPayment(ctx, payment, adminId, adminName);
    } else if (action === 'reject') {
      await handleRejectPayment(ctx, payment, adminId, adminName);
    } else {
      await ctx.answerCbQuery('❌ Invalid action');
    }
  } catch (error) {
    console.error('Error in payment verification callback:', error);
    try {
      await ctx.answerCbQuery('❌ An error occurred');
      await ctx.reply('An error occurred while processing your request. Please try again.');
    } catch (e) {
      console.error('Error sending error message:', e);
    }
  }
}

/**
 * Handle payment verification
 */
async function handleVerifyPayment(ctx, payment, adminId, adminName) {
  // If already verified, just acknowledge
  if (payment.status === 'completed') {
    await ctx.answerCbQuery('✅ Already verified');
    return;
  }

  // Show loading state
  await ctx.answerCbQuery('Verifying payment...');

  // Verify the payment
  const result = await verifyManualPayment(payment.id, adminId, 'Verified via admin panel');
  
  if (result.success) {
    // Update the message with verification info
    try {
      await ctx.editMessageText(
        `✅ *Payment Verified*\n\n` +
        `💰 *Amount:* ${formatCurrency(payment.amount)}\n` +
        `👤 *User:* ${payment.userName || `ID: ${payment.userId}`}\n` +
        `📝 *Reference:* \`${payment.paymentReference}\`\n` +
        `🛒 *Service:* ${payment.serviceName || 'N/A'}\n` +
        `✅ *Verified by:* ${adminName} (${adminId})\n` +
        `🕒 *Verified at:* ${new Date().toLocaleString()}`,
        {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: [] } // Remove buttons
        }
      );
    } catch (e) {
      console.error('Error updating message:', e);
      await ctx.reply('✅ Payment verified successfully!');
    }
  } else {
    await ctx.answerCbQuery('❌ Verification failed');
    await ctx.reply(`❌ Failed to verify payment: ${result.error}`);
  }
}

/**
 * Handle payment rejection
 */
async function handleRejectPayment(ctx, payment, adminId, adminName) {
  // If already rejected, just acknowledge
  if (payment.status === 'rejected') {
    await ctx.answerCbQuery('❌ Already rejected');
    return;
  }

  // Ask for rejection reason
  ctx.session.awaitingRejectionReason = {
    paymentId: payment.id,
    adminId,
    adminName,
    messageId: ctx.update.callback_query.message.message_id
  };

  await ctx.answerCbQuery();
  await ctx.reply(
    'Please enter the reason for rejecting this payment:',
    Markup.keyboard([['Cancel']]).resize().oneTime()
  );
}

/**
 * Handle rejection reason input
 */
export async function handleRejectionReason(ctx) {
  if (!ctx.session.awaitingRejectionReason) return false;
  
  const { paymentId, adminId, adminName, messageId } = ctx.session.awaitingRejectionReason;
  const reason = ctx.message.text.trim();
  
  if (reason.toLowerCase() === 'cancel') {
    delete ctx.session.awaitingRejectionReason;
    await ctx.reply('Cancelled payment rejection.', Markup.removeKeyboard());
    return true;
  }
  
  try {
    // Show loading state
    await ctx.sendChatAction('typing');
    
    // Reject the payment
    const result = await rejectManualPayment(paymentId, adminId, reason);
    
    if (result.success) {
      // Update the original message
      try {
        await ctx.telegram.editMessageText(
          ctx.chat.id,
          messageId,
          undefined,
          `❌ *Payment Rejected*\n\n` +
          `💰 *Amount:* ${formatCurrency(result.payment.amount)}\n` +
          `👤 *User:* ${result.payment.userName || `ID: ${result.payment.userId}`}\n` +
          `📝 *Reference:* \`${result.payment.paymentReference}\`\n` +
          `🛒 *Service:* ${result.payment.serviceName || 'N/A'}\n` +
          `❌ *Rejected by:* ${adminName} (${adminId})\n` +
          `📝 *Reason:* ${reason}\n` +
          `🕒 *Rejected at:* ${new Date().toLocaleString()}`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: [] } // Remove buttons
          }
        );
      } catch (e) {
        console.error('Error updating message:', e);
        await ctx.reply('❌ Payment rejected successfully!');
      }
      
      await ctx.reply('Payment has been rejected.', Markup.removeKeyboard());
    } else {
      await ctx.reply(`❌ Failed to reject payment: ${result.error}`, Markup.removeKeyboard());
    }
  } catch (error) {
    console.error('Error rejecting payment:', error);
    await ctx.reply('An error occurred while rejecting the payment.', Markup.removeKeyboard());
  }
  
  // Clear the session
  delete ctx.session.awaitingRejectionReason;
  return true;
}

// Helper function to format currency
function formatCurrency(amount, currency = 'ETB') {
  return new Intl.NumberFormat('en-ET', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
}

/**
 * Register admin payment handlers
 * @param {Telegraf} bot - Telegraf bot instance
 */
export function registerAdminPaymentHandlers(bot) {
  // Handle verify/reject callbacks
  bot.action(/^(verify|reject)_payment:(.+)$/, async (ctx) => {
    const [_, action, paymentId] = ctx.match;
    await handlePaymentVerificationCallback(ctx, action, paymentId);
  });
  
  // Handle rejection reason input
  bot.on('text', async (ctx, next) => {
    const handled = await handleRejectionReason(ctx);
    if (!handled) await next();
  });
}
