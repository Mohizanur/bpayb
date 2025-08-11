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
    const lang = ctx.userLang || 'en';
    const { message, keyboard } = getMainMenuContent(lang, isNewUser);
    
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
        // If editing fails (e.g., message is too similar), send a new one
        console.log('Could not edit message, sending new one:', editError);
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
    // Fallback to simple message if there's an error
    const fallbackMsg = lang === 'am' 
      ? 'የዋና ምናሌ ማሳየት አልተቻለም። እባክዎ ቆይተው ይሞክሩ።' 
      : 'Could not show main menu. Please try again.';
    
    await ctx.reply(fallbackMsg, {
      reply_markup: { inline_keyboard: [[getBackToMenuButton(lang)]] }
    });
  }
};
