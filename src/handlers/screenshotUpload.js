import { uploadScreenshot, getSubscription, getUserSubscriptions, getPaymentById } from "../utils/database.js";
import { firestore } from "../utils/firestore.js";
import { handlePaymentProofUpload, notifyAdminsAboutPayment } from "../utils/paymentVerification.js";

export default function screenshotUploadHandler(bot) {
  // Handle screenshot upload after payment
  bot.action(/upload_screenshot_(.+?)(?:_(.*))?$/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const paymentReference = ctx.match[2]; // Get payment reference if provided
      const lang = ctx.userLang || 'en';
      
      // Check if subscription exists and belongs to user
      const subscription = await getSubscription(subscriptionId);
      if (!subscription || subscription.userId !== String(ctx.from.id)) {
        await ctx.answerCbQuery(lang === 'am' ? 'ምዝገባ አልተገኘም' : 'Subscription not found');
        return;
      }
      
      if (subscription.screenshotUploaded) {
        await ctx.answerCbQuery(lang === 'am' ? 'ስክሪንሾት አስቀድሞ ተጫንቷል' : 'Screenshot already uploaded');
        return;
      }
      
      // Use payment reference from callback data if available, otherwise from subscription
      const displayPaymentReference = paymentReference || subscription.paymentReference;
      
      const message = lang === 'am'
        ? `📸 **የክፍያ ስክሪንሾት ያስገቡ**
        
የክፍያዎን ስክሪንሾት ያስገቡ። ይህ የክፍያዎን ማረጋገጥ ለመረጋገጥ ያገለግላል።

**የክፍያ ማጣቀሻ:** ${displayPaymentReference || 'N/A'}
**መጠን:** ${subscription.amount} ETB

እባክዎ የክፍያዎን ስክሪንሾት ያስገቡ:`
        : `📸 **Upload Payment Screenshot**
        
Please upload a screenshot of your payment. This will be used to verify your payment.

**Payment Reference:** ${displayPaymentReference || 'N/A'}
**Amount:** ${subscription.amount} ETB

Please upload your payment screenshot:`;
      
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '📸 ስክሪንሾት ያስገቡ' : '📸 Upload Screenshot', callback_data: `upload_photo_${subscriptionId}` }],
            [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_subscription' }]
          ]
        },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in screenshot upload action:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });
  
  // Handle photo upload
  bot.action(/upload_photo_(.+?)(?:_(.*))?$/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const paymentReference = ctx.match[2]; // Get payment reference if provided
      const lang = ctx.userLang || 'en';
      
      const message = lang === 'am'
        ? `📸 **ስክሪንሾት ያስገቡ**
        
እባክዎ የክፍያዎን ስክሪንሾት ያስገቡ። ይህ የክፍያዎን ማረጋገጫ ለመረጋገጥ ያገለግላል።

**አስፈላጊ መረጃዎች:**
• የክፍያ ማጣቀሻ ቁጥር ሊታይ አለበት
• የክፍያ መጠን ሊታይ አለበት
• የክፍያ ቀን ሊታይ አለበት

እባክዎ ስክሪንሾትዎን ያስገቡ:`
        : `📸 **Upload Screenshot**
        
Please upload a screenshot of your payment. This will be used to verify your payment.

**Required Information:**
• Payment reference number should be visible
• Payment amount should be visible
• Payment date should be visible

Please upload your screenshot:`;
      
      // Include payment reference in back button if available
      const backButtonData = paymentReference 
        ? `upload_screenshot_${subscriptionId}_${paymentReference}`
        : `upload_screenshot_${subscriptionId}`;
      
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: backButtonData }]
          ]
        },
        parse_mode: 'Markdown'
      });
      
      // Set user state to expect photo
      ctx.session = ctx.session || {};
      ctx.session.expectingScreenshot = subscriptionId;
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in upload photo action:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });
  
  // Handle photo message
  bot.on('photo', async (ctx) => {
    try {
      const { session } = ctx;
      const lang = ctx.userLang || 'en';
      
      // Check if we have a pending payment in session, a subscription ID, or a session expecting a screenshot
      const hasPendingPayment = session.pendingPayment?.paymentId;
      const hasSubscriptionId = session.uploadingScreenshotFor;
      const isExpectingScreenshot = session.expectingScreenshot;
      
      if (!hasPendingPayment && !hasSubscriptionId && !isExpectingScreenshot) {
        return; // Not in payment proof state
      }
      
      // Get the highest resolution photo
      const photo = ctx.message.photo.pop();
      const fileId = photo.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      let paymentId, payment;
      
      // Handle payment proof from session
      if (session.pendingPayment?.paymentId || session.expectingScreenshot) {
        paymentId = session.pendingPayment?.paymentId;
        
        // Get payment reference from session or generate a new one
        const paymentReference = session.pendingPayment?.paymentReference || 
          `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        // Store the file link in the pending payment if it exists
        if (session.pendingPayment) {
          session.pendingPayment.proofUrl = fileLink.href;
        }
        
        // Handle the payment proof with our verification system
        const result = await handlePaymentProofUpload({
          paymentId: paymentId || `pending-${Date.now()}`,
          screenshotUrl: fileLink.href,
          userId: ctx.from.id,
          paymentReference,
          userInfo: {
            id: ctx.from.id,
            username: ctx.from.username,
            firstName: ctx.from.first_name,
            lastName: ctx.from.last_name
          }
          }
        });
        
        if (result.success) {
          // Clear the waiting state
          session.waitingForPaymentProof = false;
          delete session.pendingPayment;
          
          // Notify user
          await ctx.reply(
            lang === 'am'
              ? '✅ የክፍያ ማስረጃው በተሳካ ሁኔታ ተልኳል። የእርስዎ ክፍያ እንዲረጋገጥ በማስተናገድ ላይ ነው። አመሰግናለሁ!' 
              : '✅ Payment proof uploaded successfully! Your payment is being processed. Thank you for your patience!',
            { parse_mode: 'Markdown' }
          );
          
          // Get payment details for admin notification
          payment = await getPaymentById(paymentId);
          if (payment) {
            await notifyAdminsAboutPayment(payment);
          }
          
          return;
        } else {
          throw new Error(result.error || 'Failed to process payment proof');
        }
      }
      
      // Handle screenshot upload for existing subscription (legacy flow)
      if (session.uploadingScreenshotFor) {
        const subscriptionId = session.uploadingScreenshotFor;
        const subscription = await getSubscription(subscriptionId);
        
        if (!subscription || subscription.userId !== String(ctx.from.id)) {
          throw new Error('Subscription not found or access denied');
        }
        
        // Upload the screenshot
        await uploadScreenshot(subscriptionId, fileLink.href, ctx.from);
        
        // Clear the session
        delete session.uploadingScreenshotFor;
        
        // Notify user
        await ctx.reply(
          lang === 'am'
            ? '✅ የክፍያ ማስረጃው በተሳካ ሁኔታ ተልኳል። የእርስዎ ክፍያ እንዲረጋገጥ በማስተናገድ ላይ ነው። አመሰግናለሁ!' 
            : '✅ Payment proof uploaded successfully! Your payment is being processed. Thank you for your patience!',
          { parse_mode: 'Markdown' }
        );
        
        // Notify admins (legacy notification)
        await notifyAdminsAboutPayment({
          id: `sub_${subscriptionId}`,
          userId: subscription.userId,
          serviceName: subscription.serviceName,
          amount: subscription.amount,
          paymentReference: subscription.paymentReference,
          screenshotUrl: fileLink.href,
          status: 'pending_verification',
          timestamp: new Date().toISOString()
        });
        
        return;
      }
      
    } catch (error) {
      console.error('Error processing payment proof:', error);
      const lang = ctx.userLang || 'en';
      await ctx.reply(
        lang === 'am' 
          ? '❌ የክፍያ ማረጋገጫ በማስገባት ላይ ስህተት ተፈጥሯል። እባክዎ ቆይተው እንደገና ይሞክሩ።' 
          : '❌ An error occurred while processing your payment proof. Please try again later.'
      );
    }
  });
  
  // Handle back to subscription
  bot.action('back_to_subscription', async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const message = lang === 'am'
        ? '📊 **የእኔ ምዝገባዎች**\n\nየእርስዎ ምዝገባዎችን ያሳዩ:'
        : '📊 **My Subscriptions**\n\nView your subscriptions:';
      
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '📊 ምዝገባዎች ያሳዩ' : '📊 View Subscriptions', callback_data: 'my_subs' }],
            [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
          ]
        },
        parse_mode: 'Markdown'
      });
      
      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in back to subscription:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });
}