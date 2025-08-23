// Enhanced mysubs command - now directly shows full subscription interface
bot.command("mysubs", async (ctx) => {
  try {
    const userId = String(ctx.from.id);
    const lang = ctx.userLang || 'en';
    
    // Import the subscription handler functions
    const { getUserSubscriptions } = await import("../utils/database.js");
    
    // Get user's subscriptions
    const subscriptions = await getUserSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      const message = lang === 'am'
        ? `📊 **የእኔ ምዝገባዎች**
        
እስካሁን ምንም ምዝገባዎች የሉዎትም። አዲስ ምዝገባ ለመጀመር እባክዎ አገልግሎቶችን ይምረጡ:`
        : `📊 **My Subscriptions**
        
You don't have any subscriptions yet. To start a new subscription, please select a service:`;
      
      const keyboard = [
        [{ text: lang === 'am' ? '📱 አገልግሎቶች ይምረጡ' : '📱 Select Services', callback_data: 'services' }],
        [{ text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }]
      ];
      
      await ctx.reply(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      
      // Log activity
      await firestore.collection('userActivities').add({
        userId: ctx.from.id,
        activity: 'mysubs_accessed',
        timestamp: new Date(),
        metadata: { command: 'mysubs', language: lang, hasSubscriptions: false }
      });
      
      return;
    }
    
    // Group subscriptions by status
    const pendingSubs = subscriptions.filter(sub => sub.status === 'pending');
    const activeSubs = subscriptions.filter(sub => sub.status === 'active');
    const cancelledSubs = subscriptions.filter(sub => sub.status === 'cancelled');
    const rejectedSubs = subscriptions.filter(sub => sub.status === 'rejected');
    
    let message = lang === 'am'
      ? `📊 **የእኔ ምዝገባዎች**
      
**የሚጠበቁ:** ${pendingSubs.length}
**ንቁ:** ${activeSubs.length}
**የተሰረዙ:** ${cancelledSubs.length}
**የተቀበሉ:** ${rejectedSubs.length}

**የምዝገባዎችዎን ያሳዩ:**`
      : `📊 **My Subscriptions**
      
**Pending:** ${pendingSubs.length}
**Active:** ${activeSubs.length}
**Cancelled:** ${cancelledSubs.length}
**Rejected:** ${rejectedSubs.length}

**View your subscriptions:**`;
    
    const keyboard = [];
    
    // Add subscription buttons
    subscriptions.slice(0, 5).forEach(sub => {
      const statusEmoji = {
        'pending': '⏳',
        'active': '✅',
        'cancelled': '❌',
        'rejected': '🚫'
      };
      
      const statusText = {
        'pending': lang === 'am' ? 'የሚጠበቅ' : 'Pending',
        'active': lang === 'am' ? 'ንቁ' : 'Active',
        'cancelled': lang === 'am' ? 'የተሰረዘ' : 'Cancelled',
        'rejected': lang === 'am' ? 'የተቀበለ' : 'Rejected'
      };
      
      keyboard.push([
        {
          text: `${statusEmoji[sub.status]} ${sub.serviceName} - ${statusText[sub.status]}`,
          callback_data: `view_subscription_${sub.id}`
        }
      ]);
    });
    
    // Add action buttons
    keyboard.push([
      { text: lang === 'am' ? '📱 አዲስ ምዝገባ' : '📱 New Subscription', callback_data: 'services' },
      { text: lang === 'am' ? '🔄 እንደገና ጫን' : '🔄 Refresh', callback_data: 'my_subs' }
    ]);
    
    keyboard.push([
      { text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu', callback_data: 'back_to_start' }
    ]);
    
    await ctx.reply(message, {
      reply_markup: { inline_keyboard: keyboard },
      parse_mode: 'Markdown'
    });

    // Log activity
    await firestore.collection('userActivities').add({
      userId: ctx.from.id,
      activity: 'mysubs_accessed',
      timestamp: new Date(),
      metadata: { command: 'mysubs', language: lang, hasSubscriptions: true, subscriptionCount: subscriptions.length }
    });

  } catch (error) {
    console.error("Error in mysubs command:", error);
    await ctx.reply(
      ctx.userLang === 'am'
        ? "ይቅርታ፣ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
        : "Sorry, something went wrong. Please try again."
    );
  }
});


