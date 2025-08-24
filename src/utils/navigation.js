import { Markup } from 'telegraf';
import { getMainMenuContent } from './menuContent.js';

// Function to get back to main menu button
export const getBackToMenuButton = (lang = 'en') => ({
  text: lang === 'am' ? '🔙 ወደ ዋና ገጽ' : '🔙 Back to Menu',
  callback_data: 'back_to_menu'
});

// Function to create a standard keyboard with back to menu button
export const getStandardKeyboard = (buttons = [], lang = 'en') => {
  // Ensure buttons is a 2D array
  const buttonRows = Array.isArray(buttons[0]) ? buttons : [buttons];
  
  // Add back to menu button as the last row
  return [
    ...buttonRows,
    [getBackToMenuButton(lang)]
  ];
};

// Function to create an inline keyboard with back to menu button
export const getInlineKeyboard = (buttons = [], lang = 'en') => {
  // Ensure buttons is a 2D array
  const buttonRows = Array.isArray(buttons[0]) ? buttons : [buttons];
  
  // Add back to menu button as the last row
  return Markup.inlineKeyboard([
    ...buttonRows,
    [Markup.button.callback(
      lang === 'am' ? '🔙 ወደ ዋና ገጽ' : '🔙 Back to Menu',
      'back_to_menu'
    )]
  ]);
};

// Function to show main menu with consistent content
export const showMainMenu = async (ctx, isNewUser = false) => {
  try {
    // Get user language from database
    let lang = 'en';
    try {
      const { firestore } = await import('./firestore.js');
      const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
      const userData = userDoc.data() || {};
      lang = userData.language || (ctx.from?.language_code === 'am' ? 'am' : 'en');
    } catch (error) {
      console.error('Error getting user language:', error);
      lang = ctx.from?.language_code === 'am' ? 'am' : 'en';
    }
    
    // Check if user is admin
    let isAdmin = false;
    try {
      // Import the admin check function
      const { isAuthorizedAdmin } = await import('../handlers/admin.js');
      isAdmin = await isAuthorizedAdmin(ctx);
    } catch (error) {
      console.log('Could not check admin status:', error.message);
    }
    
    const { message, keyboard } = getMainMenuContent(lang, isNewUser, isAdmin);
    
    // Try to edit the existing message if it's a callback query
    if (ctx.updateType === 'callback_query') {
      try {
        await ctx.editMessageText(message, {
          reply_markup: { inline_keyboard: keyboard },
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        });
        return;
      } catch (editError) {
        // If editing fails due to identical content, just answer the callback query
        if (editError.description && editError.description.includes('message is not modified')) {
          try {
            await ctx.answerCbQuery();
            return;
          } catch (answerError) {
            // Ignore answer callback errors
          }
        }
        // For other edit errors, fall through to send new message
        console.log('Could not edit message, sending new one:', editError.message || editError);
      }
    }
    
    // Otherwise, send a new message
    await ctx.reply(message, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error showing main menu:', error);
    // Fallback to a simple message
    const fallbackMsg = lang === 'am' ? 
      '🏠 ዋና ገጽ' : 
      '🏠 Main Menu';
    try {
      await ctx.reply(fallbackMsg);
    } catch (fallbackError) {
      console.error('Failed to send fallback message:', fallbackError);
    }
  }
};
