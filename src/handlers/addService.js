import { firestore } from "../utils/firestore.js";
import { clearServicesCache } from "../utils/loadServices.js";
import path from 'path';
import fs from 'fs';

// Helper function for admin security check
const isAuthorizedAdmin = async (ctx) => {
  try {
    const userId = ctx.from?.id?.toString();
    if (!userId) return false;
    
    // Check against environment variable first (for backward compatibility)
    if (process.env.ADMIN_TELEGRAM_ID && userId === process.env.ADMIN_TELEGRAM_ID) {
      return true;
    }
    
    // Check against Firestore config
    // ULTRA-CACHE: Get admin list from cache (no DB read!)
    const { getCachedAdminList } = await import('../utils/ultraCache.js');
    const admins = await getCachedAdminList();
    const adminDoc = { exists: admins.length > 0, data: () => ({ userIds: admins }) };
    if (adminDoc.exists) {
      const admins = adminDoc.data().userIds || [];
      if (admins.includes(userId)) {
        return true;
      }
    }
    
    console.warn(`Unauthorized admin access attempt from user ${userId} (${ctx.from?.username || 'no username'})`);
    return false;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
};

// Helper function for error logging
const logAdminAction = async (action, adminId, details = {}) => {
  try {
    await firestore.collection('adminLogs').add({
      action,
      adminId,
      details,
      timestamp: new Date(),
      ip: details.ip || 'unknown'
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
  }
};

export default function addServiceHandler(bot) {
  // Handle admin_add_service action
  bot.action('admin_add_service', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const message = `➕ **Add New Service** ➕

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📝 **Instructions:**
1. Click "Start Adding Service" below
2. You'll be prompted to enter service details step by step:
   • Service name
   • Service description  
   • Service ID (unique identifier)
   • Plans and pricing
   • Logo URL (optional)

🎯 **Service Details Required:**
• **Name:** Display name for the service
• **Description:** Brief description of what the service offers
• **Service ID:** Unique identifier (e.g., "netflix", "spotify")
• **Plans:** Duration and pricing options
• **Logo:** URL to service logo (optional)

💡 **Example Plan Format:**
• 1 Month: ETB 350
• 3 Months: ETB 1000  
• 6 Months: ETB 1900
• 12 Months: ETB 3600`;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Start Adding Service', callback_data: 'start_add_service' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error loading add service:', error);
      await ctx.answerCbQuery('❌ Error loading add service');
    }
  });

  // Handle start_add_service action
  bot.action('start_add_service', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      // Initialize service creation state
      global.serviceCreationState = global.serviceCreationState || {};
      global.serviceCreationState[ctx.from.id] = {
        step: 'service_name',
        serviceData: {}
      };

      await ctx.editMessageText(
        "📝 **Step 1: Service Name**\n\nPlease send the name of the service (e.g., 'Netflix', 'Spotify Premium'):",
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
            ]
          }
        }
      );

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error starting service creation:', error);
      await ctx.answerCbQuery('❌ Error starting service creation');
    }
  });

  // Handle service creation message flow
  const handleServiceCreationMessage = async (ctx, next) => {
    try {
      const userId = ctx.from?.id;
      if (userId && global.serviceCreationState && global.serviceCreationState[userId]) {
        if (!(await isAuthorizedAdmin(ctx))) {
          delete global.serviceCreationState[userId];
          return next();
        }

        const state = global.serviceCreationState[userId];
        const messageText = ctx.message.text;

        switch (state.step) {
          case 'service_name':
            state.serviceData.name = messageText;
            state.step = 'service_description';
            
            await ctx.reply(
              "📝 **Step 2: Service Description**\n\nPlease send a brief description of the service (e.g., 'Stream movies, TV shows and more'):",
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
                  ]
                }
              }
            );
            break;

          case 'service_description':
            state.serviceData.description = messageText;
            state.step = 'service_id';
            
            await ctx.reply(
              "📝 **Step 3: Service ID**\n\nPlease send a unique identifier for the service (e.g., 'netflix', 'spotify'):\n\n💡 This should be lowercase, no spaces, unique identifier",
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
                  ]
                }
              }
            );
            break;

          case 'service_id':
            state.serviceData.serviceID = messageText.toLowerCase().replace(/\s+/g, '');
            state.step = 'logo_url';
            
            await ctx.reply(
              "📝 **Step 4: Logo URL (Optional)**\n\nPlease send the URL to the service logo, or send 'skip' to skip this step:\n\n💡 Example: https://example.com/logo.png",
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '⏭️ Skip Logo', callback_data: 'skip_logo' }],
                    [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
                  ]
                }
              }
            );
            break;

          case 'logo_url':
            if (messageText.toLowerCase() !== 'skip') {
              state.serviceData.logoUrl = messageText;
            }
            state.step = 'plans';
            
            await ctx.reply(
              "📝 **Step 5: Service Plans**\n\nPlease send the plans in this format:\n\n1 Month: 350\n3 Months: 1000\n6 Months: 1900\n12 Months: 3600\n\n💡 One plan per line, format: 'Duration: Price'",
              {
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
                  ]
                }
              }
            );
            break;

          case 'plans':
            // Import price parsing utility
            const { parsePrice, formatPrice } = await import('../utils/priceFormat.js');
            
            // Parse plans from message - accept formatted prices with commas
            const planLines = messageText.split('\n').filter(line => line.trim());
            const plans = [];
            
            for (const line of planLines) {
              // Updated regex to capture price with or without commas, and handle "ETB" prefix
              // Matches: "1 Month: 350", "1 Month: 1,000", "1 Month: ETB 1,000", etc.
              const match = line.match(/(\d+)\s*(?:month|months?|m):\s*(?:etb\s+)?([\d,]+)/i);
              if (match) {
                const duration = parseInt(match[1]);
                const priceText = match[2];
                const price = parsePrice(priceText);
                
                if (price !== null && price > 0) {
                  const billingCycle = duration === 1 ? 'Monthly' : `${duration} Months`;
                  plans.push({
                    duration,
                    price,
                    billingCycle
                  });
                }
              }
            }

            if (plans.length === 0) {
              await ctx.reply(
                "❌ **Invalid Plan Format**\n\nPlease use the format:\n1 Month: 350\n3 Months: 1,000\n6 Months: 1,900\n\n💡 You can use commas in prices (e.g., 1,000) or without (e.g., 1000)\n\nTry again:",
                {
                  parse_mode: 'Markdown',
                  reply_markup: {
                    inline_keyboard: [
                      [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
                    ]
                  }
                }
              );
              return;
            }

            state.serviceData.plans = plans;
            state.serviceData.approvalRequiredFlag = true;
            state.step = 'confirm';

            // Show confirmation with formatted prices
            const confirmMessage = `✅ **Service Details Confirmation** ✅

📋 **Service Information:**
• **Name:** ${state.serviceData.name}
• **Description:** ${state.serviceData.description}
• **Service ID:** ${state.serviceData.serviceID}
• **Logo URL:** ${state.serviceData.logoUrl || 'Not set'}

💰 **Plans:**
${plans.map(plan => `• ${plan.billingCycle}: ETB ${formatPrice(plan.price)}`).join('\n')}

📊 **Total Plans:** ${plans.length}

Is this information correct?`;

            await ctx.reply(confirmMessage, {
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: '✅ Confirm & Save', callback_data: 'confirm_service' }],
                  [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
                ]
              }
            });
            break;
        }

        // Delete the user's message for cleaner flow
        try {
          await ctx.deleteMessage();
        } catch (e) {
          // Ignore delete errors
        }

        return;
      }
    } catch (error) {
      console.error('Error in service creation message handler:', error);
    }
    return next();
  };

  // Register the message handler for service creation
  bot.on('text', handleServiceCreationMessage);

  // Handle skip logo
  bot.action('skip_logo', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const userId = ctx.from.id;
      const state = global.serviceCreationState[userId];
      
      if (state && state.step === 'logo_url') {
        state.step = 'plans';
        
        await ctx.editMessageText(
          "📝 **Step 5: Service Plans**\n\nPlease send the plans in this format:\n\n1 Month: 350\n3 Months: 1000\n6 Months: 1900\n12 Months: 3600\n\n💡 One plan per line, format: 'Duration: Price'",
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '❌ Cancel', callback_data: 'admin_add_service' }]
              ]
            }
          }
        );
      }

      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error skipping logo:', error);
      await ctx.answerCbQuery('❌ Error skipping logo');
    }
  });

  // Handle confirm service
  bot.action('confirm_service', async (ctx) => {
    if (!(await isAuthorizedAdmin(ctx))) {
      await ctx.answerCbQuery("❌ Access denied.");
      return;
    }

    try {
      const userId = ctx.from.id;
      const state = global.serviceCreationState[userId];
      
      if (!state || !state.serviceData) {
        await ctx.answerCbQuery('❌ No service data found');
        return;
      }

      // Save service to Firestore
      const serviceData = {
        ...state.serviceData,
        createdAt: new Date(),
        createdBy: userId.toString(),
        status: 'active'
      };

      await firestore.collection('services').doc(serviceData.serviceID).set(serviceData);

      // Clear services cache to force reload with new service (QUOTA OPTIMIZATION)
      clearServicesCache();

      // Also save to local services.json for backup
      try {
        const servicesPath = path.join(process.cwd(), 'src', 'services.json');
        let services = [];
        
        if (fs.existsSync(servicesPath)) {
          services = JSON.parse(fs.readFileSync(servicesPath, 'utf8'));
        }
        
        // Check if service already exists
        const existingIndex = services.findIndex(s => s.serviceID === serviceData.serviceID);
        if (existingIndex >= 0) {
          services[existingIndex] = serviceData;
        } else {
          services.push(serviceData);
        }
        
        fs.writeFileSync(servicesPath, JSON.stringify(services, null, 2));
      } catch (fileError) {
        console.error('Error saving to services.json:', fileError);
      }

      // Log the action
      await logAdminAction('service_added', userId, {
        serviceName: serviceData.name,
        serviceID: serviceData.serviceID,
        plansCount: serviceData.plans.length
      });

      // Clean up state
      delete global.serviceCreationState[userId];

      const successMessage = `✅ **Service Added Successfully!** ✅

🎉 **Service Details:**
• **Name:** ${serviceData.name}
• **Service ID:** ${serviceData.serviceID}
• **Plans:** ${serviceData.plans.length} plans added
• **Status:** Active

📊 **Available Plans:**
${serviceData.plans.map(plan => `• ${plan.billingCycle}: ETB ${plan.price}`).join('\n')}

🔄 **Next Steps:**
• The service is now available for users
• Users can subscribe to this service immediately
• You can manage it from the admin panel`;

      await ctx.editMessageText(successMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Add Another Service', callback_data: 'admin_add_service' }],
            [{ text: '🔙 Back to Admin', callback_data: 'back_to_admin' }]
          ]
        }
      });

      await ctx.answerCbQuery('✅ Service added successfully!');
    } catch (error) {
      console.error('Error confirming service:', error);
      await ctx.answerCbQuery('❌ Error saving service');
      
      // Clean up state on error
      const userId = ctx.from.id;
      delete global.serviceCreationState[userId];
    }
  });
}


