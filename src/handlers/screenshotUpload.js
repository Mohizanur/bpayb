import { uploadScreenshot, getSubscription, getUserSubscriptions } from "../utils/database.js";
import { firestore } from "../utils/firestore.js";

export default function screenshotUploadHandler(bot) {
  // Handle screenshot upload after payment
  bot.action(/upload_screenshot_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
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
      
      const message = lang === 'am'
        ? `📸 **የክፍያ ስክሪንሾት ያስገቡ**
        
የክፍያዎን ስክሪንሾት ያስገቡ። ይህ የክፍያዎን ማረጋገጫ ለመረጋገጥ ያገለግላል።

**የክፍያ ማጣቀሻ:** ${subscription.paymentReference}
**መጠን:** ${subscription.amount} ETB

እባክዎ የክፍያዎን ስክሪንሾት ያስገቡ:`
        : `📸 **Upload Payment Screenshot**
        
Please upload a screenshot of your payment. This will be used to verify your payment.

**Payment Reference:** ${subscription.paymentReference}
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
  bot.action(/upload_photo_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
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
      
      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: `upload_screenshot_${subscriptionId}` }]
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
      // Check if user is expecting screenshot via session or database
      let subscriptionId = null;
      const lang = ctx.userLang || 'en';
      
      // First check session
      if (ctx.session?.expectingScreenshot) {
        subscriptionId = ctx.session.expectingScreenshot;
      } else {
        // Check database for pending screenshot upload
        const userSubscriptions = await getUserSubscriptions(String(ctx.from.id));
        const pendingSubscription = userSubscriptions.find(sub => 
          sub.status === 'pending' && 
          sub.paymentReference && 
          !sub.screenshotUploaded
        );
        
        if (pendingSubscription) {
          subscriptionId = pendingSubscription.id;
        }
      }
      
      if (!subscriptionId) {
        // Not expecting screenshot, ignore
        return;
      }
      
      // Verify subscription exists and belongs to user
      const subscription = await getSubscription(subscriptionId);
      if (!subscription || subscription.userId !== String(ctx.from.id)) {
        const errorMsg = lang === 'am' ? 'ምዝገባ አልተገኘም' : 'Subscription not found';
        await ctx.reply(errorMsg);
        return;
      }
      
      // Get the largest photo size
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      
      // Get file info
      const file = await ctx.telegram.getFile(photo.file_id);
      const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      
      // Upload screenshot to database
      const screenshotData = {
        url: fileUrl,
        filename: `payment_${subscriptionId}_${Date.now()}.jpg`,
        size: photo.file_size,
        fileId: photo.file_id,
        uploadedAt: new Date()
      };
      
      const uploadResult = await uploadScreenshot(subscriptionId, screenshotData);
      
      if (uploadResult.success) {
        const successMessage = lang === 'am'
          ? `✅ **ስክሪንሾት በተሳካተ ሁኔታ ተጫነ!**
          
የክፍያዎ ስክሪንሾት በተሳካተ ሁኔታ ተጫነ። የእኛ ቡድን የክፍያዎን ማረጋገጫ ያረጋግጣል።

**የክፍያ ማጣቀሻ:** ${subscription.paymentReference}
**መጠን:** ${subscription.amount} ETB

**የሚቀጥለው ደረጃ:**
• የእኛ ቡድን የክፍያዎን ማረጋገጫ ያረጋግጣል
• ክፍያው ከተረጋገጠ ምዝገባዎ ይጀመራል
• የምዝገባ ማረጋገጫ ይላክልዎታል

እባክዎ ያስተናግዱ...`
          : `✅ **Screenshot Uploaded Successfully!**
          
Your payment screenshot has been uploaded successfully. Our team will verify your payment.

**Payment Reference:** ${subscription.paymentReference}
**Amount:** ${subscription.amount} ETB

**Next Steps:**
• Our team will verify your payment
• Once verified, your subscription will be activated
• You'll receive a confirmation message

Please wait...`;
        
        await ctx.reply(successMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }],
              [{ text: lang === 'am' ? '📊 የእኔ ምዝገባዎች' : '📊 My Subscriptions', callback_data: 'my_subs' }]
            ]
          },
          parse_mode: 'Markdown'
        });
        
        // Clear session
        if (ctx.session?.expectingScreenshot) {
          delete ctx.session.expectingScreenshot;
        }
        
        // Log activity
        try {
          await firestore.collection('userActivities').add({
            userId: ctx.from.id,
            activity: 'screenshot_uploaded',
            subscriptionId: subscriptionId,
            timestamp: new Date(),
            metadata: {
              fileSize: photo.file_size,
              paymentReference: subscription.paymentReference
            }
          });
        } catch (logError) {
          console.error('Error logging screenshot upload:', logError);
        }
        
      } else {
        const errorMessage = lang === 'am'
          ? '❌ ስክሪንሾት ማስገቢያ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
          : '❌ Error uploading screenshot. Please try again.';
        
        await ctx.reply(errorMessage, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === 'am' ? '🔄 እንደገና ይሞክሩ' : '🔄 Try Again', callback_data: `upload_screenshot_${subscriptionId}` }]
            ]
          }
        });
      }
      
    } catch (error) {
      console.error('Error handling photo upload:', error);
      const lang = ctx.userLang || 'en';
      const errorMessage = lang === 'am'
        ? '❌ ስክሪንሾት ማስገቢያ ላይ ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።'
        : '❌ Error uploading screenshot. Please try again.';
      
      await ctx.reply(errorMessage);
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