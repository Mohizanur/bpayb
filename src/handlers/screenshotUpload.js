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
      
      // Parse amount properly
      let displayAmount = 'N/A';
      if (subscription.amount) {
        if (typeof subscription.amount === 'string') {
          // Extract number from string like "ETB 11515" or "11515"
          const match = subscription.amount.match(/(\d+(?:\.\d+)?)/);
          displayAmount = match ? `ETB ${parseFloat(match[1]).toFixed(2)}` : 'N/A';
        } else if (typeof subscription.amount === 'number') {
          displayAmount = `ETB ${subscription.amount.toFixed(2)}`;
        }
      }

      const message = lang === 'am'
        ? `📸 **የክፍያ ስክሪንሾት ያስገቡ**
        
የክፍያዎን ስክሪንሾት ያስገቡ። ይህ የክፍያዎን ማረጋገጥ ለመረጋገጥ ያገለግላል።

**የክፍያ ማጣቀሻ:** ${displayPaymentReference || 'N/A'}
**መጠን:** ${displayAmount}

እባክዎ የክፍያዎን ስክሪንሾት ያስገቡ:`
        : `📸 **Upload Payment Screenshot**
        
Please upload a screenshot of your payment. This will be used to verify your payment.

**Payment Reference:** ${displayPaymentReference || 'N/A'}
**Amount:** ${displayAmount}

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
      console.log('📸 Photo received from user:', ctx.from.id);
      const { session } = ctx;
      const lang = ctx.userLang || 'en';
      
      // Check if we have a pending payment in session, a subscription ID, or a session expecting a screenshot
      const hasPendingPayment = session.pendingPayment?.paymentId;
      const hasSubscriptionId = session.uploadingScreenshotFor;
      const isExpectingScreenshot = session.expectingScreenshot;
      
      console.log('🔍 Payment proof state check:', {
        hasPendingPayment,
        hasSubscriptionId,
        isExpectingScreenshot,
        userId: ctx.from.id
      });
      
      // ZERO QUOTA: Check in-memory state first (no DB read!)
      const userId = String(ctx.from.id);
      const inMemoryState = global.userDetailsState && global.userDetailsState[userId];
      const isAwaitingPaymentProof = inMemoryState?.awaitingProof || inMemoryState?.step === 'awaiting_payment_proof';
      
      // Also check Firestore state for legacy support (but prefer in-memory)
      let firestoreUserState = null;
      if (!inMemoryState) {
        try {
          const { smartGet } = await import('../utils/optimizedDatabase.js');
          const userStateData = await smartGet('userStates', userId, false);
          if (userStateData) {
            firestoreUserState = userStateData;
            console.log('✅ Found user state in cache (ZERO quota used!)');
          }
        } catch (error) {
          console.error('❌ Error fetching user state from cache:', error);
        }
      }
      
      const isAwaitingFromFirestore = firestoreUserState?.state === 'awaiting_payment_proof';
      
      console.log('🔍 Payment proof state check:', {
        hasPendingPayment,
        hasSubscriptionId,
        isExpectingScreenshot,
        isAwaitingPaymentProof,
        isAwaitingFromFirestore,
        userId: ctx.from.id
      });
      
      if (!hasPendingPayment && !hasSubscriptionId && !isExpectingScreenshot && !isAwaitingPaymentProof && !isAwaitingFromFirestore) {
        console.log('⚠️ Photo received but user is not in payment proof state, ignoring...');
        return; // Not in payment proof state
      }
      
      console.log('✅ Processing payment proof upload...');
      
      // Get the highest resolution photo
      const photo = ctx.message.photo.pop();
      const fileId = photo.file_id;
      const fileLink = await ctx.telegram.getFileLink(fileId);
      
      let paymentId, paymentReference, userDetailsFromMemory = null;
      let paymentData = null; // Declare paymentData as let, not const
      
      // Handle payment proof - check in-memory state FIRST (ZERO quota!)
      if (inMemoryState && inMemoryState.awaitingProof) {
        // User provided details and is uploading proof - NOW write to DB!
        paymentId = inMemoryState.paymentId;
        paymentReference = inMemoryState.paymentReference;
        userDetailsFromMemory = {
          userName: inMemoryState.userName,
          userEmail: inMemoryState.userEmail,
          userPhone: inMemoryState.userPhone
        };
        
        console.log('✅ Found payment details in memory - will write to DB now!');
        
        // NOW write to DB with all details - FIRST AND ONLY DB WRITE!
        paymentData = {
          id: paymentId,
          userId: userId,
          serviceId: inMemoryState.serviceId,
          serviceName: inMemoryState.serviceName,
          duration: inMemoryState.duration,
          durationName: inMemoryState.durationName,
          price: inMemoryState.price,
          amount: `ETB ${inMemoryState.price}`,
          status: 'pending_verification',
          paymentReference: paymentReference,
          createdAt: new Date().toISOString(),
          paymentMethod: 'manual',
          paymentDetails: {},
          screenshotUrl: fileLink.href,
          // User details - all at once!
          userName: inMemoryState.userName,
          userEmail: inMemoryState.userEmail,
          userPhone: inMemoryState.userPhone,
          userDetailsCollected: true
        };

        // Create subscription
        const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const subscriptionData = {
          id: subscriptionId,
          userId: userId,
          serviceId: inMemoryState.serviceId,
          serviceName: inMemoryState.serviceName,
          status: 'pending',
          duration: inMemoryState.duration,
          durationName: inMemoryState.durationName,
          amount: `ETB ${inMemoryState.price}`,
          price: inMemoryState.price,
          paymentId: paymentId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Write both to DB
        await firestore.collection('pendingPayments').doc(paymentId).set(paymentData);
        await firestore.collection('subscriptions').doc(subscriptionId).set(subscriptionData);
        
        console.log('✅ Written payment and subscription to DB with all user details!');
        console.log('📋 Payment data written:', JSON.stringify(paymentData, null, 2));
        
        // Store payment data to pass to handlePaymentProofUpload (includes user details)
        paymentData = { id: paymentId, ...paymentData };
        
        // Clear in-memory state AFTER storing payment data
        delete global.userDetailsState[userId];
        
      } else if (session.pendingPayment?.paymentId || session.expectingScreenshot || isAwaitingFromFirestore) {
        // Legacy flow - payment already exists in DB
        paymentId = session.pendingPayment?.paymentId || firestoreUserState?.paymentId;
        paymentReference = session.pendingPayment?.paymentReference || 
          `TEMP-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
        
        console.log('🔍 Payment ID resolved from legacy flow:', paymentId);
        
        if (!paymentId) {
          console.error('❌ Payment ID is missing! Cannot process payment proof.');
          await ctx.reply(
            lang === 'am'
              ? '❌ ስህተት: የክፍያ መለያ አልተገኘም። እባክዎ እንደገና ይሞክሩ።'
              : '❌ Error: Payment ID not found. Please try again.',
            { parse_mode: 'Markdown' }
          );
          return;
        }
        
        // Store the file link in the pending payment if it exists
        if (session.pendingPayment) {
          session.pendingPayment.proofUrl = fileLink.href;
        }
        
        // Clear the Firestore user state since we're processing the payment proof
        if (isAwaitingFromFirestore) {
          try {
            await firestore.collection('userStates').doc(userId).delete();
            console.log('✅ Cleared user state from Firestore');
          } catch (error) {
            console.error('❌ Error clearing user state:', error);
          }
        }
      } else {
        console.error('❌ No valid payment state found');
        await ctx.reply(
          lang === 'am'
            ? '❌ ስህተት: የክፍያ መለያ አልተገኘም። እባክዎ እንደገና ይሞክሩ።'
            : '❌ Error: Payment ID not found. Please try again.',
          { parse_mode: 'Markdown' }
        );
        return;
      }
      
      // Handle the payment proof with our verification system
      console.log('📤 Calling handlePaymentProofUpload with paymentId:', paymentId);
      console.log('📤 User details from memory:', userDetailsFromMemory);
      
      const result = await handlePaymentProofUpload({
        paymentId: paymentId,
        screenshotUrl: fileLink.href, // Keep URL for storage
        fileId: fileId, // Add file_id for forwarding
        userId: ctx.from.id,
        paymentReference,
        userInfo: {
          id: ctx.from.id,
          username: ctx.from.username,
          firstName: ctx.from.first_name,
          lastName: ctx.from.last_name,
          ...(userDetailsFromMemory || {}) // Include user details if from memory
        },
        // Pass the payment data if we just wrote it (includes all user details)
        payment: paymentData || null,
        // Pass the bot instance from context
        botInstance: bot
      });
      
      console.log('📥 handlePaymentProofUpload result:', result);
      
      if (result.success) {
        // Clear the waiting state
        session.waitingForPaymentProof = false;
        delete session.pendingPayment;
        
        console.log('✅ Payment proof processed successfully, sending reply to user...');
        // Notify user
        try {
          await ctx.reply(
            lang === 'am'
              ? '✅ የክፍያ ማስረጃው በተሳካ ሁኔታ ተልኳል። የእርስዎ ክፍያ እንዲረጋገጥ በማስተናገድ ላይ ነው። አመሰግናለሁ!' 
              : '✅ Payment proof uploaded successfully! Your payment is being processed. Thank you for your patience!',
            { parse_mode: 'Markdown' }
          );
          console.log('✅ User reply sent successfully');
        } catch (replyError) {
          console.error('❌ Error sending reply to user:', replyError);
          // Try to send a simple text message as fallback
          try {
            await ctx.reply('✅ Payment proof received! Thank you.');
          } catch (fallbackError) {
            console.error('❌ Error sending fallback reply:', fallbackError);
          }
        }
        
        // Admin notification is already handled in handlePaymentProofUpload
        // No need to call it again here
        
        return;
      } else {
        console.error('❌ handlePaymentProofUpload returned success: false, error:', result.error);
        throw new Error(result.error || 'Failed to process payment proof');
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