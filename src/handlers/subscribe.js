/**
 * Import admin from 'firebase-admin';
 */

import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseConfig.project_id,
        clientEmail: firebaseConfig.client_email,
        privateKey: firebaseConfig.private_key.replace(/\\\\n/g, '\\n')
      })
    });
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
    throw error; // Fail fast if Firebase initialization fails
  }
}

const firestore = admin.firestore();

/**
 * Subscribe handler for the Telegram bot
 * @param {import('telegraf').Telegraf} bot - The Telegraf bot instance
 */
function setupSubscribeHandler(bot) {
  // Handle service selection with more flexible ID matching
  bot.action(/^select_service_([a-z0-9_-]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Get the service details from the context or database
      const service = ctx.services?.find(s => s.id === serviceId);
      
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      // Show service details and subscription options with 1, 3, 6, 12 month choices
      const message = lang === 'am' 
        ? `✅ *${service.name}* የተመረጠ\n\nእባክዎ የምትፈልጉትን የደንበኝነት ምዝገባ ዓይነት ይምረጥ:`
        : `✅ *${service.name}* selected\n\nPlease choose your subscription duration:`;
      
      // Calculate prices based on service price (assuming monthly price is stored)
      const monthlyPrice = service.price || 0;
      const prices = {
        '1m': monthlyPrice,
        '3m': Math.round(monthlyPrice * 3 * 0.9),  // 10% discount for 3 months
        '6m': Math.round(monthlyPrice * 6 * 0.85), // 15% discount for 6 months
        '12m': Math.round(monthlyPrice * 12 * 0.8) // 20% discount for 12 months
      };

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? '1 ወር' : '1 Month', 
                callback_data: `subscribe_${serviceId}_1m_${prices['1m']}` },
              { text: lang === 'am' ? '3 ወራት' : '3 Months', 
                callback_data: `subscribe_${serviceId}_3m_${prices['3m']}` }
            ],
            [
              { text: lang === 'am' ? '6 ወራት' : '6 Months', 
                callback_data: `subscribe_${serviceId}_6m_${prices['6m']}` },
              { text: lang === 'am' ? '12 ወራት' : '12 Months', 
                callback_data: `subscribe_${serviceId}_12m_${prices['12m']}` }
            ],
            [
              { text: lang === 'am' ? '🔙 ወደ ኋላ' : '🔙 Back', 
                callback_data: 'back_to_services' }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in service selection:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle subscription with duration and price
  bot.action(/^subscribe_([a-z0-9_-]+)_(\d+m)_(\d+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2]; // e.g., '1m', '3m', '6m', '12m'
      const price = parseInt(ctx.match[3], 10);
      const lang = ctx.userLang || 'en';
      
      // Get the service details
      const service = ctx.services?.find(s => s.id === serviceId);
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      // Parse duration
      const months = parseInt(duration, 10);
      const durationText = lang === 'am' 
        ? `${months} ${months === 1 ? 'ወር' : 'ወራት'}`
        : `${months} ${months === 1 ? 'Month' : 'Months'}`;

      // Format price
      const formattedPrice = price.toLocaleString('en-US');
      
      // Show confirmation message
      const confirmMessage = lang === 'am'
        ? `✅ *${service.name} - ${durationText}*\n\n` +
          `ዋጋ: *${formattedPrice} ብር*\n\n` +
          `ይህን የደንበኝነት ምዝገባ መግዛት ይፈልጋሉ?`
        : `✅ *${service.name} - ${durationText}*\n\n` +
          `Price: *${formattedPrice} ETB*\n\n` +
          `Do you want to proceed with this subscription?`;

      await ctx.editMessageText(confirmMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? '✅ አዎ' : '✅ Yes', 
                callback_data: `confirm_sub_${serviceId}_${duration}_${price}` },
              { text: lang === 'am' ? '❌ አይ' : '❌ No', 
                callback_data: `back_to_services` }
            ]
          ]
        }
      });
      
    } catch (error) {
      console.error('Error in subscription selection:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle subscription confirmation
  bot.action(/^confirm_sub_([a-z0-9_-]+)_(\d+m)_(\d+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const duration = ctx.match[2];
      const price = parseInt(ctx.match[3], 10);
      const userId = String(ctx.from.id);
      const lang = ctx.userLang || 'en';
      
      // Get the service details
      const service = ctx.services?.find(s => s.id === serviceId);
      if (!service) {
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }

      const months = parseInt(duration, 10);
      
      // Payment instructions
      const paymentMessage = lang === 'am'
        ? `💳 *የክፍያ መመሪያ*\n\n` +
          `አገልግሎት: ${service.name}\n` +
          `ቆይታ: ${months} ${months === 1 ? 'ወር' : 'ወራት'}\n` +
          `ጠቅላላ ዋጋ: *${price.toLocaleString()} ብር*\n\n` +
          `ክፍያ ለማድረግ ወደሚከተሉት አካውንቶች ገንዘብ ያስተላልፉ፡\n` +
          `\n📱 *TeleBirr*: 0912345678\n` +
          `🏦 *CBE Birr*: 1000000000000\n` +
          `🏛 *Bank Transfer*:\n` +
          `   - Bank: Commercial Bank of Ethiopia\n` +
          `   - Account: 1000000000000\n` +
          `   - Name: Your Business Name\n\n` +
          `ክፍያ ካደረጉ በኋላ የክፍያ ማረጋገጫ ስክሪንሾት ወይም ሪሲት ይላኩ።\n` +
          `አስተናጋጁ ክፍያዎን ከፀደቀ በኋላ አገልግሎቱ ይጀምራል።`
        : `💳 *Payment Instructions*\n\n` +
          `Service: ${service.name}\n` +
          `Duration: ${months} ${months === 1 ? 'Month' : 'Months'}\n` +
          `Total Amount: *${price.toLocaleString()} ETB*\n\n` +
          `Please make payment to any of the following accounts:\n` +
          `\n📱 *TeleBirr*: 0912345678\n` +
          `🏦 *CBE Birr*: 1000000000000\n` +
          `🏛 *Bank Transfer*:\n` +
          `   - Bank: Commercial Bank of Ethiopia\n` +
          `   - Account: 1000000000000\n` +
          `   - Name: Your Business Name\n\n` +
          `After making the payment, please upload your payment proof (screenshot or receipt).\n` +
          `Your subscription will start once the admin verifies your payment.`;

      // Save pending payment to database (without starting subscription yet)
      const paymentId = `pay_${Date.now()}_${userId}`;
      const paymentData = {
        userId,
        serviceId,
        serviceName: service.name,
        duration,
        price,
        status: 'pending',
        createdAt: new Date().toISOString(),
        paymentMethod: 'manual',
        paymentDetails: {}
      };

      // Save to Firestore
      await firestore.collection('pendingPayments').doc(paymentId).set(paymentData);

      // Send payment instructions
      await ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? '📤 የክፍያ ማስረጃ አስገባ' : '📤 Upload Payment Proof',
                callback_data: `upload_proof_${paymentId}` }
            ],
            [
              { text: lang === 'am' ? '🏠 ዋና ገጽ' : '🏠 Main Menu',
                callback_data: 'main_menu' }
            ]
          ]
        }
      });
      
      // Notify admin about new pending payment
      const adminMessage = `🆕 *New Pending Payment*\n\n` +
        `👤 User: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})\n` +
        `🆔 User ID: ${userId}\n` +
        `📱 Service: ${service.name}\n` +
        `⏳ Duration: ${months} ${months === 1 ? 'Month' : 'Months'}\n` +
        `💰 Amount: ${price.toLocaleString()} ETB\n\n` +
        `Payment ID: ${paymentId}`;

      await ctx.telegram.sendMessage(
        process.env.ADMIN_TELEGRAM_ID,
        adminMessage,
        { parse_mode: 'Markdown' }
      );
      
    } catch (error) {
      console.error('Error in payment instructions:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle payment proof upload
  bot.action(/^upload_proof_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      // Set user state to expect photo
      await firestore.collection('userStates').doc(String(ctx.from.id)).set({
        state: 'awaiting_payment_proof',
        paymentId,
        timestamp: new Date().toISOString()
      });
      
      const message = lang === 'am'
        ? `📤 *የክፍያ ማስረጃ ይላኩ*\n\n` +
          `እባክዎ የክፍያ ማስረጃዎን (ስክሪንሾት ወይም ሪሲት) ይላኩ።\n` +
          `ለማሰረዝ /cancel ይጫኑ።`
        : `📤 *Upload Payment Proof*\n\n` +
          `Please send a screenshot or photo of your payment receipt.\n` +
          `Click /cancel to cancel.`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown'
      });
      
    } catch (error) {
      console.error('Error in upload proof handler:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

  // Handle photo messages (payment proof)
  bot.on('photo', async (ctx) => {
    try {
      const userId = String(ctx.from.id);
      const userState = await firestore.collection('userStates').doc(userId).get();
      
      if (!userState.exists || userState.data().state !== 'awaiting_payment_proof') {
        return; // Not waiting for payment proof
      }
      
      const paymentId = userState.data().paymentId;
      const lang = ctx.userLang || 'en';
      
      // Get the highest resolution photo
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Update payment with proof
      await firestore.collection('pendingPayments').doc(paymentId).update({
        paymentProof: fileUrl,
        proofSubmittedAt: new Date().toISOString(),
        status: 'proof_submitted'
      });
      
      // Clear user state
      await firestore.collection('userStates').doc(userId).delete();
      
      // Notify user
      const userMessage = lang === 'am'
        ? `✅ *የክፍያ ማስረጃዎ ተቀብለናል!*\n\n` +
          `አስተናጋጁ ክፍያዎን እያረጋገጠ ነው። አገልግሎቱ ከተረጋገጠ በኋላ ወዲያው ይጀምራል።\n` +
          `ለማንኛውም ጥያቄ የድጋፍ ቡድናችንን ያነጋግሩ።`
        : `✅ *Payment Proof Received!*\n\n` +
          `We've received your payment proof and our team is reviewing it.\n` +
          `Your subscription will start as soon as we verify your payment.\n` +
          `Please contact support if you have any questions.`;
      
      await ctx.reply(userMessage, { parse_mode: 'Markdown' });
      
      // Notify admin with the proof
      const payment = await firestore.collection('pendingPayments').doc(paymentId).get();
      const paymentData = payment.data();
      
      const adminMessage = `🆕 *Payment Proof Submitted*\n\n` +
        `👤 User: ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})\n` +
        `🆔 User ID: ${userId}\n` +
        `📱 Service: ${paymentData.serviceName}\n` +
        `⏳ Duration: ${paymentData.duration}\n` +
        `💰 Amount: ${paymentData.price.toLocaleString()} ETB\n\n` +
        `Payment ID: ${paymentId}`;
      
      await ctx.telegram.sendPhoto(
        process.env.ADMIN_TELEGRAM_ID,
        { url: fileUrl },
        {
          caption: adminMessage,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '✅ Approve', callback_data: `approve_payment_${paymentId}` },
                { text: '❌ Reject', callback_data: `reject_payment_${paymentId}` }
              ]
            ]
          }
        }
      );
      
    } catch (error) {
      console.error('Error processing payment proof:', error);
      const lang = ctx.userLang || 'en';
      await ctx.reply(
        lang === 'am' 
          ? 'ስህተት ተፈጥሯል። እባክዎ ቆይተው እንደገና ይሞክሩ።' 
          : 'An error occurred. Please try again later.'
      );
    }
  });

  // Handle admin approval of payment
  bot.action(/^approve_payment_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      const adminId = String(ctx.from.id);
      
      // Verify admin
      if (String(adminId) !== process.env.ADMIN_TELEGRAM_ID) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }
      
      // Get payment data
      const paymentRef = firestore.collection('pendingPayments').doc(paymentId);
      const paymentDoc = await paymentRef.get();
      
      if (!paymentDoc.exists) {
        await ctx.answerCbQuery('Payment not found');
        return;
      }
      
      const payment = paymentDoc.data();
      const userId = payment.userId;
      const months = parseInt(payment.duration, 10);
      
      // Calculate subscription dates
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + months);
      
      // Create subscription
      const subscriptionId = `sub_${Date.now()}_${userId}`;
      const subscriptionData = {
        userId,
        serviceId: payment.serviceId,
        serviceName: payment.serviceName,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        price: payment.price,
        status: 'active',
        paymentId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Save subscription to database
      await firestore.collection('subscriptions').doc(subscriptionId).set(subscriptionData);
      
      // Update payment status
      await paymentRef.update({
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: adminId,
        subscriptionId
      });
      
      // Notify admin
      await ctx.answerCbQuery('✅ Payment approved!');
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [{ text: '✅ Approved', callback_data: 'approved' }]
        ]
      });
      
      // Notify user
      const userLang = await getUserLanguage(userId);
      const userMessage = userLang === 'am'
        ? `✅ *ክፍያዎ ተረጋግሯል!*\n\n` +
          `የ${payment.serviceName} የደንበኝነት ምዝገባዎ ተጠናቍሯል!\n` +
          `ቆይታ: ${months} ${months === 1 ? 'ወር' : 'ወራት'}\n` +
          `የሚያበቃበት ቀን: ${endDate.toLocaleDateString('en-ET')}\n\n` +
          `አገልግሎቱን ለመጠቀም የእርስዎ መለያ ዝግጁ ነው። አመሰግናለን!`
        : `✅ *Payment Verified!*\n\n` +
          `Your ${payment.serviceName} subscription is now active!\n` +
          `Duration: ${months} ${months === 1 ? 'Month' : 'Months'}\n` +
          `Ends on: ${endDate.toLocaleDateString('en-US')}\n\n` +
          `Your account is now ready to use. Thank you for subscribing!`;
      
      await ctx.telegram.sendMessage(userId, userMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error approving payment:', error);
      await ctx.answerCbQuery('Error approving payment');
    }
  });
  
  // Handle admin rejection of payment
  bot.action(/^reject_payment_(.+)$/i, async (ctx) => {
    try {
      const paymentId = ctx.match[1];
      
      // Verify admin
      if (String(ctx.from.id) !== process.env.ADMIN_TELEGRAM_ID) {
        await ctx.answerCbQuery('Unauthorized');
        return;
      }
      
      // Update payment status
      await firestore.collection('pendingPayments').doc(paymentId).update({
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectedBy: String(ctx.from.id)
      });
      
      await ctx.answerCbQuery('❌ Payment rejected');
      await ctx.editMessageReplyMarkup({
        inline_keyboard: [
          [{ text: '❌ Rejected', callback_data: 'rejected' }]
        ]
      });
      
      // Get payment data to notify user
      const payment = await firestore.collection('pendingPayments').doc(paymentId).get();
      const paymentData = payment.data();
      const userId = paymentData.userId;
      
      // Notify user
      const userLang = await getUserLanguage(userId);
      const userMessage = userLang === 'am'
        ? `❌ *የክፍያ ማረጋገጫ አልተቀበለም*\n\n` +
          `ያስገቡት የክፍያ ማስረጃ አልተቀበለም። እባክዎ የበለጠ ዝርዝር ለማግኘት የድጋፍ ቡድናችንን ያነጋግሩ።`
        : `❌ *Payment Verification Failed*\n\n` +
          `The payment proof you submitted was not accepted. ` +
          `Please contact our support team for more details.`;
      
      await ctx.telegram.sendMessage(userId, userMessage, { parse_mode: 'Markdown' });
      
    } catch (error) {
      console.error('Error rejecting payment:', error);
      await ctx.answerCbQuery('Error rejecting payment');
    }
  });
  
  // Helper function to get user language
  async function getUserLanguage(userId) {
    try {
      const userDoc = await firestore.collection('users').doc(userId).get();
      return userDoc.exists ? (userDoc.data().language || 'en') : 'en';
    } catch (error) {
      console.error('Error getting user language:', error);
      return 'en';
    }
  }
}

export default setupSubscribeHandler;
