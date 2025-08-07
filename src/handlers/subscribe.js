// ... (previous imports)

  // Handle service selection with more flexible ID matching
  bot.action(/^select_service_([a-z0-9_-]+)$/i, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang || 'en';
      
      console.log(`🔍 Looking up service with ID: ${serviceId}`);
      
      // Load services
      const services = await loadServices();
      console.log('Available services:', services.map(s => `${s.serviceID} (${s.name})`).join(', '));
      
      // Try exact match first
      let selectedService = services.find(s => s.serviceID === serviceId);
      
      // If not found, try case-insensitive match
      if (!selectedService) {
        selectedService = services.find(s => s.serviceID && s.serviceID.toLowerCase() === serviceId.toLowerCase());
      }
      
      // If still not found, log available services for debugging
      if (!selectedService) {
        console.error(`❌ Service not found: ${serviceId}`);
        console.log('Available services:', services);
        await ctx.answerCbQuery(lang === 'am' ? 'አገልግሎት አልተገኘም' : 'Service not found');
        return;
      }
      
      // Rest of the handler...
      
    } catch (error) {
      console.error('Error in service selection:', error);
      await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተፈጥሯል' : 'An error occurred');
    }
  });

// ... (rest of the file)
