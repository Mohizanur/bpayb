// 📱 SMART PHONE VERIFICATION HANDLERS
// Handles phone verification with caching and optimization

import { firestore } from '../utils/firestore.js';
import { cache } from '../utils/cache.js';
import { invalidateUserCache } from '../middleware/smartVerification.js';

// Phone verification callback handler
export const handleVerifyPhone = async (ctx) => {
  try {
    const lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
    const requestMsg = lang === 'am'
      ? '📱 የተልፍዎን ማረጋገጫ\n\nእባክዎ የተልፍዎን መረጃ ለማረጋገጥ ከታች ያለውን ቁልፍ በመጫን እውቂያዎን ያጋሩ።\n\nአስፈላጊ: ይህ የሚያስፈልገው የእርስዎን ስልክ ቁጥር ለማረጋገጥ ብቻ ነው።'
      : '📱 Phone Verification\n\nPlease tap the button below to share your contact for verification.\n\nNote: This is only used to verify your phone number.';
    
    await ctx.answerCbQuery();
    
    // Create reply keyboard with contact sharing option
    const keyboard = {
      keyboard: [
        [
          {
            text: lang === 'am' ? '📱 እውቂያ ማጋራት' : '📱 Share Contact',
            request_contact: true
          }
        ],
        [
          {
            text: lang === 'am' ? '✍️ በእጅ መፃፍ' : '✍️ Type Manually'
          }
        ]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    };
    
    await ctx.reply(requestMsg, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    });
    
    // Set user state to expect phone number
    const userId = String(ctx.from.id);
    const updateData = {
      telegramId: userId,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || '',
      language: lang,
      awaitingPhone: true,
      hasCompletedOnboarding: false,
      phoneVerified: false,
      updatedAt: new Date()
    };
    
    await firestore.collection('users').doc(userId).set(updateData, { merge: true });
    
    // Invalidate cache to force refresh
    invalidateUserCache(userId);
    
  } catch (error) {
    console.error('Error in verify_phone:', error);
    await ctx.answerCbQuery('Error occurred');
  }
};

// Handle contact sharing for phone verification
export const handleContactSharing = async (ctx) => {
  try {
    const userId = String(ctx.from.id);
    
    // ULTRA-CACHE: Get language from cache (no DB read!)
    const { getUserLang } = await import('../utils/i18n.js');
    const lang = await getUserLang(ctx);
    
    const phoneNumber = ctx.message.contact.phone_number;
    
    // Ensure phone number has + prefix
    const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
    
    // Validate Ethiopian phone number format
    const phoneRegex = /^\+251[79]\d{8}$/;
    
    if (!phoneRegex.test(formattedPhone)) {
      const errorMsg = lang === 'am'
        ? '⚠️ እባክዎ የኢትዮጵያ ስልክ ቁጥር ይጠቀሙ (+251...)\n\nለምሳሌ: +251912345678'
        : '⚠️ Please use an Ethiopian phone number (+251...)\n\nExample: +251912345678';
      await ctx.reply(errorMsg);
      return;
    }
    
    // Check if user exists first
    const userDoc = await firestore.collection('users').doc(userId).get();
    
    // Create user update data
    const updateData = {
      phoneNumber: formattedPhone,
      phoneVerified: true,
      awaitingPhone: false,
      awaitingCode: false,
      verifiedAt: new Date(),
      updatedAt: new Date(),
      // Set initial values if they don't exist
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || '',
      language: lang,
      hasCompletedOnboarding: true
    };
    
    // If this is a new user, set created timestamp
    if (!userDoc.exists) {
      updateData.createdAt = new Date();
      updateData.telegramId = userId;
    }
    
    // Update user with verified phone
    await firestore.collection('users').doc(userId).set(updateData, { merge: true });
    
    // Invalidate cache to force refresh
    invalidateUserCache(userId);
    
    // Clear any existing reply markup
    try {
      await ctx.answerCbQuery();
    } catch (e) {
      /* Ignore if not a callback query */
    }
    
    // Prepare success message - tell user to use /start command
    const successMessage = lang === 'am'
      ? `🎉 **እንኳን ደስ አለዎት!**\n\n📱 የስልክ ቁጥርዎ በተሳካ ሁኔታ ተረጋግጧል: \`${formattedPhone}\`\n\n✅ አሁን የBirrPay አገልግሎቶችን መጠቀም ይችላሉ።\n\n🏠 ዋና ገጽን ለመመልከት **/start** ይጫኑ።`
      : `🎉 **Welcome!**\n\n📱 Your phone number has been successfully verified: \`${formattedPhone}\`\n\n✅ You can now use BirrPay services.\n\n🏠 Press **/start** to go to the main menu.`;
    
    // Send the success message without buttons - user should use /start
    // Make sure to remove any keyboard that might be showing
    await ctx.reply(successMessage, {
      parse_mode: 'Markdown',
      reply_markup: { remove_keyboard: true }
    });
    
  } catch (error) {
    console.error('Error handling contact:', error);
    const errorMsg = 'An error occurred while verifying your phone. Please try again.';
    await ctx.reply(errorMsg);
  }
};

// Handle manual phone number input
export const handleManualPhoneInput = async (ctx) => {
  try {
    const userId = String(ctx.from.id);
    // ULTRA-CACHE: Get user data from cache (no DB read!)
    const { getCachedUserData } = await import('../utils/ultraCache.js');
    const userData = await getCachedUserData(userId) || {};
    const lang = userData.language || (ctx.from.language_code === 'am' ? 'am' : 'en');
    
    // Check if user is in phone verification flow
    if (userData.awaitingPhone && !userData.phoneVerified) {
      const phoneNumber = ctx.message.text.trim();
      
      // Validate Ethiopian phone number format
      const phoneRegex = /^\+251[79]\d{8}$/;
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : '+' + phoneNumber;
      
      if (!phoneRegex.test(formattedPhone)) {
        const errorMsg = lang === 'am'
          ? '⚠️ የተልፍዎን መረጃ ቅርጸት ትክክል አይደለም። እባክዎ ይጠቁሉ: +251912345678'
          : '⚠️ Invalid phone number format. Please use: +251912345678';
        await ctx.reply(errorMsg);
        return;
      }
      
      // Update user with verified phone
      const updateData = {
        ...userData,
        phoneNumber: formattedPhone,
        phoneVerified: true,
        awaitingPhone: false,
        awaitingCode: false,
        verifiedAt: new Date(),
        updatedAt: new Date(),
        // Set initial values if they don't exist
        firstName: userData.firstName || ctx.from.first_name,
        lastName: userData.lastName || ctx.from.last_name || '',
        username: userData.username || ctx.from.username || '',
        language: lang,
        hasCompletedOnboarding: true
      };
      
      await firestore.collection('users').doc(userId).set(updateData, { merge: true });
      
      // Invalidate cache to force refresh
      invalidateUserCache(userId);
      
      // Prepare success message - tell user to use /start command
      const successMessage = lang === 'am'
        ? `🎉 **እንኳን ደስ አለዎት!**\n\n📱 የስልክ ቁጥርዎ በተሳካ ሁኔታ ተረጋግጧል: \`${formattedPhone}\`\n\n✅ አሁን የBirrPay አገልግሎቶችን መጠቀም ይችላሉ።\n\n🏠 ዋና ገጽን ለመመልከት **/start** ይጫኑ።`
        : `🎉 **Welcome!**\n\n📱 Your phone number has been successfully verified: \`${formattedPhone}\`\n\n✅ You can now use BirrPay services.\n\n🏠 Press **/start** to go to the main menu.`;
      
      // Send the success message without buttons - user should use /start
      // Make sure to remove any keyboard that might be showing
      await ctx.reply(successMessage, {
        parse_mode: 'Markdown',
        reply_markup: { remove_keyboard: true }
      });
    }
  } catch (error) {
    console.error('Error handling manual phone input:', error);
    const errorMsg = 'An error occurred while verifying your phone. Please try again.';
    await ctx.reply(errorMsg);
  }
};

// Setup phone verification handlers
export const setupPhoneVerificationHandlers = (bot) => {
  // Phone verification callback
  bot.action('verify_phone', handleVerifyPhone);
  
  // Contact sharing handler
  bot.on('contact', handleContactSharing);
  
  // Manual phone input handler
  bot.on('text', handleManualPhoneInput);
  
  console.log('✅ Smart phone verification handlers registered');
};




