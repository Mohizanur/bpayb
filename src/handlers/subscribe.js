import { firestore } from "../utils/firestore.js";

export default function subscribeHandler(bot) {
  // Handle subscription requests
  bot.action(/^subscribe_(.+)$/, async (ctx) => {
    try {
      const serviceID = ctx.match[1];
      const userID = ctx.from.id;
      const lang = ctx.userLang || 'en';
      
      // Get service details
      const services = ctx.services || [];
      const service = services.find(s => s.serviceID === serviceID);
      
      if (!service) {
        const errorMsg = lang === 'am' 
          ? '❌ አገልግሎቱ አልተገኘም'
          : '❌ Service not found';
        return await ctx.answerCbQuery(errorMsg);
      }

      // Create subscription request
      const subscriptionRequest = {
        id: `sub_${Date.now()}_${userID}`,
        telegramUserID: userID,
        serviceID: service.serviceID,
        serviceName: service.name,
        price: service.price,
        userLanguage: lang,
        status: 'payment_pending',
        requestedAt: new Date().toISOString(),
        paymentScreenshot: null,
        adminNotes: ''
      };

      // Save to database
      await firestore.collection('subscription_requests').doc(subscriptionRequest.id).set(subscriptionRequest);

      // Payment instructions message
      const paymentInstructions = lang === 'am' ? `
💰 **የክፍያ መመሪያዎች**

አገልግሎት: ${service.name}
ዋጋ: ${service.price} ብር/ወር

**የክፍያ መንገዶች:**

🏦 **ባንክ ካርድ:**
• CBE ባንክ: 1000123456789
• ዳሽን ባንክ: 2000987654321
• አቢሲኒያ ባንክ: 3000555444333

📱 **ሞባይል ባንኪንግ:**
• ቴሌ ብር: 0912345678
• CBE ብር: 0987654321

**ማስታወሻ:** ከተከፈለ በኋላ የክፍያ ማረጋገጫ ስክሪን ሾት ላክልን
      ` : `
💰 **Payment Instructions**

Service: ${service.name}
Price: ${service.price} ETB/month

**Payment Methods:**

🏦 **Bank Transfer:**
• CBE Bank: 1000123456789
• Dashen Bank: 2000987654321
• Abyssinia Bank: 3000555444333

📱 **Mobile Banking:**
• TeleBirr: 0912345678
• CBE Birr: 0987654321

**Note:** After payment, send us the payment screenshot for verification
      `;

      const uploadInstructions = lang === 'am' 
        ? '\n📸 **የክፍያ ማረጋገጫ ስክሪን ሾት ላክ**\n\nየክፍያ ማረጋገጫ ስክሪን ሾት ወይም ሪሲት ፎቶ ላኩልን፣ ወዲያውኑ አገልግሎትዎን እንጀምራለን።'
        : '\n📸 **Send Payment Screenshot**\n\nSend us your payment screenshot or receipt photo, and we\'ll activate your service immediately.';

      await ctx.editMessageText(paymentInstructions + uploadInstructions, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'am' ? '📸 ስክሪን ሾት ላክ' : '📸 Upload Screenshot',
              callback_data: `upload_payment_${subscriptionRequest.id}`
            }
          ], [
            {
              text: lang === 'am' ? '🔙 ተመለስ' : '🔙 Back',
              callback_data: 'back_to_services'
            }
          ]]
        }
      });

      await ctx.answerCbQuery();
      
    } catch (error) {
      console.error('Error in subscribe handler:', error);
      await ctx.answerCbQuery('Error processing subscription request');
    }
  });

  // Handle payment screenshot upload request
  bot.action(/^upload_payment_(.+)$/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';

      const instructionMsg = lang === 'am' 
        ? '📸 እባክዎ የክፍያ ማረጋገጫ ስክሪን ሾት ወይም ሪሲት ፎቶ ላኩ (JPG, PNG formats)'
        : '📸 Please send your payment screenshot or receipt photo (JPG, PNG formats)';

      await ctx.editMessageText(instructionMsg, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'am' ? '❌ ተወው' : '❌ Cancel',
              callback_data: 'cancel_upload'
            }
          ]]
        }
      });

      // Store the subscription ID for this user
      ctx.session = ctx.session || {};
      ctx.session.pendingScreenshot = subscriptionId;

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in upload payment handler:', error);
      await ctx.answerCbQuery('Error processing upload request');
    }
  });

  // Handle photo uploads for payment verification
  bot.on('photo', async (ctx) => {
    try {
      const userID = ctx.from.id;
      const lang = ctx.userLang || 'en';
      
      // Check if user has pending screenshot upload
      const pendingScreenshot = ctx.session?.pendingScreenshot;
      if (!pendingScreenshot) {
        const noRequestMsg = lang === 'am' 
          ? '❌ የክፍያ ማረጋገጫ ጥያቄ አልተገኘም። እባክዎ በመጀመሪያ አገልግሎት ይምረጡ።'
          : '❌ No payment verification request found. Please select a service first.';
        return await ctx.reply(noRequestMsg);
      }

      // Get the largest photo size
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      
      // Update subscription request with photo
      await firestore.collection('subscription_requests').doc(pendingScreenshot).update({
        paymentScreenshot: {
          file_id: photo.file_id,
          file_size: photo.file_size,
          uploadedAt: new Date().toISOString()
        },
        status: 'pending_admin_approval'
      });

      // Clear pending screenshot
      delete ctx.session.pendingScreenshot;

      const successMsg = lang === 'am' 
        ? '✅ ክፍያ ማረጋገጫ ስክሪን ሾት በተሳካ ሁኔታ ተልኳል!\n\n👨‍💼 አስተዳዳሪዎች ይመረመራሉ እና በቅርቡ አገልግሎትዎን ያገጥሙታል።\n\n⏰ ብዙ ጊዜ ወስዶ 24 ሰዓት ውስጥ ይሆናል።'
        : '✅ Payment screenshot uploaded successfully!\n\n👨‍💼 Admins will review and activate your service soon.\n\n⏰ This usually takes up to 24 hours.';

      await ctx.reply(successMsg, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: lang === 'am' ? '📋 የእኔ ማግኘቶች' : '📋 My Subscriptions',
              callback_data: 'my_subscriptions'
            }
          ], [
            {
              text: lang === 'am' ? '🏠 ዋና ምናሌ' : '🏠 Main Menu',
              callback_data: 'start'
            }
          ]]
        }
      });

      // Notify admin about new payment screenshot
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId) {
        try {
          // Get subscription details
          const subDoc = await firestore.collection('subscription_requests').doc(pendingScreenshot).get();
          const subData = subDoc.data();

          const adminNotification = `🔔 **New Payment Screenshot**

📋 **Subscription ID:** ${pendingScreenshot}
👤 **User:** ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})
📱 **Telegram ID:** ${userID}
🎯 **Service:** ${subData.serviceName}
💰 **Amount:** ${subData.price} ETB

⏰ **Submitted:** ${new Date().toLocaleString()}

Use /admin to review and approve.`;

          await bot.telegram.sendMessage(adminId, adminNotification, { parse_mode: 'Markdown' });
          await bot.telegram.sendPhoto(adminId, photo.file_id, {
            caption: `Payment screenshot for subscription: ${pendingScreenshot}`
          });
        } catch (adminError) {
          console.log("Could not notify admin:", adminError.message);
        }
      }

    } catch (error) {
      console.error('Error handling photo upload:', error);
      const errorMsg = ctx.userLang === 'am' 
        ? '❌ ስክሪን ሾት መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Failed to upload screenshot. Please try again.';
      await ctx.reply(errorMsg);
    }
  });

  // Handle document uploads (for PDF receipts)
  bot.on('document', async (ctx) => {
    try {
      const document = ctx.message.document;
      const userID = ctx.from.id;
      const lang = ctx.userLang || 'en';
      
      // Check if it's a PDF or image
      const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedMimeTypes.includes(document.mime_type)) {
        const errorMsg = lang === 'am' 
          ? '❌ እባክዎ PDF, JPG ወይም PNG ፋይል ብቻ ላኩ'
          : '❌ Please send only PDF, JPG or PNG files';
        return await ctx.reply(errorMsg);
      }

      // Check if user has pending screenshot upload
      const pendingScreenshot = ctx.session?.pendingScreenshot;
      if (!pendingScreenshot) {
        const noRequestMsg = lang === 'am' 
          ? '❌ የክፍያ ማረጋገጫ ጥያቄ አልተገኘም። እባክዎ በመጀመሪያ አገልግሎት ይምረጡ።'
          : '❌ No payment verification request found. Please select a service first.';
        return await ctx.reply(noRequestMsg);
      }

      // Update subscription request with document
      await firestore.collection('subscription_requests').doc(pendingScreenshot).update({
        paymentScreenshot: {
          file_id: document.file_id,
          file_name: document.file_name,
          file_size: document.file_size,
          mime_type: document.mime_type,
          uploadedAt: new Date().toISOString()
        },
        status: 'pending_admin_approval'
      });

      // Clear pending screenshot
      delete ctx.session.pendingScreenshot;

      const successMsg = lang === 'am' 
        ? '✅ ክፍያ ማረጋገጫ በተሳካ ሁኔታ ተልኳል!\n\n👨‍💼 አስተዳዳሪዎች ይመረመራሉ እና በቅርቡ አገልግሎትዎን ያገጥሙታል።'
        : '✅ Payment verification uploaded successfully!\n\n👨‍💼 Admins will review and activate your service soon.';

      await ctx.reply(successMsg);

      // Notify admin
      const adminId = process.env.ADMIN_TELEGRAM_ID;
      if (adminId) {
        try {
          const subDoc = await firestore.collection('subscription_requests').doc(pendingScreenshot).get();
          const subData = subDoc.data();

          const adminNotification = `🔔 **New Payment Document**

📋 **Subscription ID:** ${pendingScreenshot}
👤 **User:** ${ctx.from.first_name} ${ctx.from.last_name || ''} (@${ctx.from.username || 'no_username'})
📱 **Telegram ID:** ${userID}
🎯 **Service:** ${subData.serviceName}
💰 **Amount:** ${subData.price} ETB
📄 **File:** ${document.file_name}

Use /admin to review and approve.`;

          await bot.telegram.sendMessage(adminId, adminNotification, { parse_mode: 'Markdown' });
          await bot.telegram.sendDocument(adminId, document.file_id, {
            caption: `Payment document for subscription: ${pendingScreenshot}`
          });
        } catch (adminError) {
          console.log("Could not notify admin:", adminError.message);
        }
      }

    } catch (error) {
      console.error('Error handling document upload:', error);
      const errorMsg = ctx.userLang === 'am' 
        ? '❌ ሰነድ መላክ አልተሳካም። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Failed to upload document. Please try again.';
      await ctx.reply(errorMsg);
    }
  });
}
