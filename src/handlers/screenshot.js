import { uploadScreenshot, updateSubscription } from '../utils/database.js';

export default function screenshotHandler(bot) {
  // Handle screenshot upload after payment
  bot.action(/upload_screenshot_(.+)/, async (ctx) => {
    try {
      const subscriptionId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      const message = lang === 'am'
        ? `📸 **የክፍያ ስክሪንሾት ይጫኑ**

የክፍያዎን ስክሪንሾት ይላኩ። ይህ የክፍያዎን ማረጋገጫ ለማረጋገጥ ያገለግላል።

**የሚጠበቁ ፎርማቶች:**
• JPEG/JPG
• PNG
• የፎቶ መጠን: እስከ 10MB

የስክሪንሾት ፎቶውን ይላኩ:`
        : `📸 **Upload Payment Screenshot**

Please send your payment screenshot. This helps us verify your payment.

**Accepted formats:**
• JPEG/JPG
• PNG
• File size: Up to 10MB

Send the screenshot photo:`;

      await ctx.editMessageText(message, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '⬅️ ወደ ኋላ' : '⬅️ Back', callback_data: 'back_to_payment' }]
          ]
        },
        parse_mode: 'Markdown'
      });
      
      // Set user state to expect screenshot
      ctx.session = ctx.session || {};
      ctx.session.expectingScreenshot = subscriptionId;
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in screenshot upload action:', error);
      await ctx.answerCbQuery('Error occurred');
    }
  });

  // Handle photo upload
  bot.on('photo', async (ctx) => {
    try {
      if (!ctx.session?.expectingScreenshot) {
        return; // Not expecting screenshot
      }

      const subscriptionId = ctx.session.expectingScreenshot;
      const lang = ctx.userLang || 'en';
      
      // Get the largest photo size
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      
      if (!photo) {
        await ctx.reply(lang === 'am' ? '❌ ፎቶ አልተገኘም። እባክዎ እንደገና ይሞክሩ።' : '❌ No photo found. Please try again.');
        return;
      }

      // Check file size (10MB limit)
      if (photo.file_size > 10 * 1024 * 1024) {
        await ctx.reply(lang === 'am' ? '❌ ፎቶው በጣም ትልቅ ነው። እባክዎ ትንሽ ፎቶ ይላኩ።' : '❌ Photo is too large. Please send a smaller photo.');
        return;
      }

      // Get file info
      const fileInfo = await ctx.telegram.getFile(photo.file_id);
      
      // Upload screenshot to database
      const screenshotData = {
        fileId: photo.file_id,
        fileSize: photo.file_size,
        filePath: fileInfo.file_path,
        uploadedBy: ctx.from.id,
        fileName: `screenshot_${subscriptionId}_${Date.now()}.jpg`
      };

      const uploadResult = await uploadScreenshot(subscriptionId, screenshotData);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Clear session state
      delete ctx.session.expectingScreenshot;

      const successMessage = lang === 'am'
        ? `✅ **የክፍያ ስክሪንሾት ተሳትሟል!**

የክፍያዎን ስክሪንሾት ተቀብለናል። የእርስዎ ክፍያ በቅርቡ ይገመገማል።

**የሚጠበቁ ደረጃዎች:**
1. የክፍያ ማረጋገጫ ይገመገማል
2. የምዝገባዎ ይጀመራል
3. የምዝገባ መረጃዎች ይላካሉ

ለማንኛውም ጥያቄ ድጋፍ ያግኙን።`
        : `✅ **Payment Screenshot Uploaded!**

We have received your payment screenshot. Your payment will be reviewed shortly.

**Next Steps:**
1. Payment verification in progress
2. Subscription will be activated
3. Login credentials will be sent

Contact support for any questions.`;

      await ctx.reply(successMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }],
            [{ text: lang === 'am' ? '📞 ድጋፍ' : '📞 Support', callback_data: 'support' }]
          ]
        },
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error handling screenshot upload:', error);
      const lang = ctx.userLang || 'en';
      await ctx.reply(lang === 'am' ? '❌ ስክሪንሾት ለመጫን ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።' : '❌ Error uploading screenshot. Please try again.');
    }
  });

  // Handle document upload (alternative to photo)
  bot.on('document', async (ctx) => {
    try {
      if (!ctx.session?.expectingScreenshot) {
        return; // Not expecting screenshot
      }

      const subscriptionId = ctx.session.expectingScreenshot;
      const lang = ctx.userLang || 'en';
      
      const document = ctx.message.document;
      
      // Check if it's an image file
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(document.mime_type)) {
        await ctx.reply(lang === 'am' ? '❌ የተሳሳተ ፋይል አይነት። እባክዎ የምስል ፋይል ይላኩ።' : '❌ Invalid file type. Please send an image file.');
        return;
      }

      // Check file size (10MB limit)
      if (document.file_size > 10 * 1024 * 1024) {
        await ctx.reply(lang === 'am' ? '❌ ፋይሉ በጣም ትልቅ ነው። እባክዎ ትንሽ ፋይል ይላኩ።' : '❌ File is too large. Please send a smaller file.');
        return;
      }

      // Get file info
      const fileInfo = await ctx.telegram.getFile(document.file_id);
      
      // Upload screenshot to database
      const screenshotData = {
        fileId: document.file_id,
        fileSize: document.file_size,
        filePath: fileInfo.file_path,
        uploadedBy: ctx.from.id,
        fileName: document.file_name || `screenshot_${subscriptionId}_${Date.now()}.${document.mime_type.split('/')[1]}`
      };

      const uploadResult = await uploadScreenshot(subscriptionId, screenshotData);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error);
      }

      // Clear session state
      delete ctx.session.expectingScreenshot;

      const successMessage = lang === 'am'
        ? `✅ **የክፍያ ስክሪንሾት ተሳትሟል!**

የክፍያዎን ስክሪንሾት ተቀብለናል። የእርስዎ ክፍያ በቅርቡ ይገመገማል።

**የሚጠበቁ ደረጃዎች:**
1. የክፍያ ማረጋገጫ ይገመገማል
2. የምዝገባዎ ይጀመራል
3. የምዝገባ መረጃዎች ይላካሉ

ለማንኛውም ጥያቄ ድጋፍ ያግኙን።`
        : `✅ **Payment Screenshot Uploaded!**

We have received your payment screenshot. Your payment will be reviewed shortly.

**Next Steps:**
1. Payment verification in progress
2. Subscription will be activated
3. Login credentials will be sent

Contact support for any questions.`;

      await ctx.reply(successMessage, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }],
            [{ text: lang === 'am' ? '📞 ድጋፍ' : '📞 Support', callback_data: 'support' }]
          ]
        },
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error('Error handling document upload:', error);
      const lang = ctx.userLang || 'en';
      await ctx.reply(lang === 'am' ? '❌ ስክሪንሾት ለመጫን ስህተት ተከስቷል። እባክዎ እንደገና ይሞክሩ።' : '❌ Error uploading screenshot. Please try again.');
    }
  });
}