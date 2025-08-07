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
      
      // Show service details and subscription options
      const message = lang === 'am' 
        ? `✅ *${service.name}* የተመረጠ\n\nእባክዎ የምትፈልጉትን የደንበኝነት ምዝገባ ዓይነት ይምረጡ:`
        : `✅ *${service.name}* selected\n\nPlease choose your subscription plan:`;
      
      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === 'am' ? 'ወርሃዊ' : 'Monthly', 
                callback_data: `subscribe_${serviceId}_monthly` },
              { text: lang === 'am' ? 'ዓመታዊ' : 'Yearly', 
                callback_data: `subscribe_${serviceId}_yearly` }
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
}

export default setupSubscribeHandler;
