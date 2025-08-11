import { escapeMarkdownV2, loadI18n } from "../utils/i18n.js";
import { firestore } from "../utils/firestore.js";
import { loadServices } from "../utils/loadServices.js";
import { getBackToMenuButton, getInlineKeyboard, showMainMenu } from "../utils/navigation.js";

// Helper function to check if user is new
const isNewUser = async (userId) => {
  try {
    const userDoc = await firestore.collection('users').doc(String(userId)).get();
    return !userDoc.exists || !userDoc.data().hasCompletedOnboarding;
  } catch (error) {
    console.error('Error checking user status:', error);
    return false;
  }
};

// Helper function to create user profile
const createUserProfile = async (ctx) => {
  try {
    // Check if user already exists to preserve their language selection
    const userDoc = await firestore.collection('users').doc(String(ctx.from.id)).get();
    const existingData = userDoc.exists ? userDoc.data() : {};
    
    await firestore.collection('users').doc(String(ctx.from.id)).set({
      telegramId: ctx.from.id,
      firstName: ctx.from.first_name,
      lastName: ctx.from.last_name || '',
      username: ctx.from.username || '',
      // PRESERVE existing language selection, only set default for new users
      language: existingData.language || ctx.userLang || ctx.from.language_code || 'en',
      phoneVerified: existingData.phoneVerified || false,
      hasCompletedOnboarding: existingData.hasCompletedOnboarding || false,
      joinedAt: existingData.joinedAt || new Date(),
      updatedAt: new Date(),
      createdAt: existingData.createdAt || new Date(),
      lastActiveAt: new Date(),
      totalSubscriptions: existingData.totalSubscriptions || 0,
      activeSubscriptions: existingData.activeSubscriptions || 0
    }, { merge: true });
    
    // Log user registration
    await firestore.collection('userActivities').add({
      userId: ctx.from.id,
      activity: 'user_registered',
      timestamp: new Date(),
      metadata: {
        firstName: ctx.from.first_name,
        username: ctx.from.username,
        language: existingData.language || ctx.userLang || ctx.from.language_code || 'en'
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error creating user profile:', error);
    return false;
  }
};

export function setupStartHandler(bot) {
  bot.start(async (ctx) => {
    try {
      // Use the user's saved language preference, not Telegram's default
      const lang = ctx.userLang || 'en';
      const isFirstTime = await isNewUser(ctx.from.id);
      
      // Update user info and create profile
      await createUserProfile(ctx);
      
      // Show main menu with appropriate welcome message
      await showMainMenu(ctx, isFirstTime);
      
      // Update last active time
      await firestore.collection('users').doc(String(ctx.from.id)).update({
        lastActiveAt: new Date()
      });

    } catch (error) {
      console.error("Error in start handler:", error);
      await ctx.reply(
        ctx.userLang === 'am' 
          ? "ሰላምታ! እባክዎ እንደገና ይሞክሩ።" 
          : "Welcome! Please try again."
      );
    }
  });

  // Handle onboarding flow for new users
  bot.action("start_onboarding", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const onboardingMessage = lang === "am"
        ? `🚀 **BirrPay የመጀመሪያ እርምጃዎች**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **ቀላል 3 እርምጃዎች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** 🎯 የሚፈልጉትን አገልግሎት ይምረጡ
**2.** 💰 በብር ይክፈሉ (እንደ TeleBirr, CBE ወዘተ)
**3.** ✅ ድረስ! ሳብስክሪፕሽንዎ ነቅቷል

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 **ለምን BirrPay?**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ በብር ይክፈሉ - የውጭ ካርድ አያስፈልግም
✅ ደህንነቱ የተጠበቀ - የባንክ ደረጃ ደህንነት
✅ ፈጣን ማጽደቅ - በ24 ሰዓት ውስጥ
✅ 24/7 ድጋፍ - በአማርኛ እና እንግሊዝኛ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 **ልዩ ቅናሽ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

የመጀመሪያ ምዝገባዎ 10% ቅናሽ ያግኙ!`
        : `🚀 **BirrPay Quick Start Guide**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **Simple 3 Steps**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**1.** 🎯 Choose your desired service
**2.** 💰 Pay using Ethiopian Birr (TeleBirr, CBE, etc.)
**3.** ✅ Done! Your subscription is activated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 **Why Choose BirrPay?**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Pay in Birr - No foreign cards needed
✅ Secure Platform - Bank-grade security
✅ Fast Approval - Within 24 hours
✅ 24/7 Support - In Amharic & English

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎁 **Special Offer**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Get 10% off your first subscription!`;

      const onboardingKeyboard = [
        [
          { 
            text: lang === "am" ? "🎯 አሁን አገልግሎቶችን ይመልከቱ" : "🎯 Browse Services Now", 
            callback_data: "services" 
          }
        ],
        [
          { 
            text: lang === "am" ? "❓ ተጨማሪ ጥያቄዎች" : "❓ Have Questions?", 
            callback_data: "faq_menu" 
          },
          { 
            text: lang === "am" ? "🛠️ ድጋፍ አግኙ" : "🛠️ Get Support", 
            callback_data: "support_menu" 
          }
        ],
        [
          { 
            text: lang === "am" ? "🏠 ዋና ምንዩ" : "🏠 Main Menu", 
            callback_data: "back_to_start" 
          }
        ]
      ];

      await ctx.editMessageText(onboardingMessage, {
        reply_markup: { inline_keyboard: onboardingKeyboard },
        parse_mode: 'Markdown'
      });

      // Mark onboarding as started
      await firestore.collection('users').doc(String(ctx.from.id)).update({
        hasStartedOnboarding: true,
        onboardingStartedAt: new Date()
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error("Error in onboarding:", error);
      await ctx.answerCbQuery("Error starting onboarding");
    }
  });

  // Features section handler (matching website features)
  bot.action("features", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      const featuresText = lang === "am"
        ? `🎯 **የBirrPay ባህሪያት**

🔄 **ተለዋዋጭ እቅዶች**
የሚፈልጉትን ብቻ ይክፈሉ። ወርሃዊ፣ ሳምንታዊ ወይም ዓመታዊ እቅዶች።

🔒 **ደህንነቱ የተጠበቀ መድረክ**
የእርስዎ የክፍያ መረጃ እና የግል መረጃ ሙሉ በሙሉ የተጠበቀ ነው።

📱 **ቀላል አስተዳደር**
ሁሉንም ምዝገባዎችዎን በአንድ ቦታ ይቆጣጠሩ።

🇪🇹 **የአካባቢ ድጋፍ**
በአማርኛ እና በእንግሊዝኛ የደንበኞች አገልግሎት።`
        : `🎯 **BirrPay Features**

🔄 **Flexible Plans**
Pay only for what you need. Monthly, weekly, or yearly plans available.

🔒 **Secure Platform**
Your payment information and personal data are fully protected.

📱 **Easy Management**
Control all your subscriptions from one convenient location.

🇪🇹 **Local Support**
Customer service available in Amharic and English.`;

      await ctx.editMessageText(featuresText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }]
          ]
        },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in features action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Services section handler
  bot.action("services", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      const services = await loadServices();
      if (!services || services.length === 0) {
        await ctx.answerCbQuery();
        await ctx.editMessageText(lang === 'am' ? 'ምንም አገልግሎት አልተገኘም። እባክዎ በኋላ ይሞክሩ።' : 'No services are currently available. Please try again later.', {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }]
            ]
          }
        });
        return;
      }
      
      // Create service grid (2 services per row)
      const keyboard = [];
      for (let i = 0; i < services.length; i += 2) {
        const row = [];
        if (services[i]) {
          row.push({
            text: `📱 ${services[i].name}`,
            callback_data: `select_service_${services[i].serviceID}`
          });
        }
        if (services[i + 1]) {
          row.push({
            text: `📱 ${services[i + 1].name}`,
            callback_data: `select_service_${services[i + 1].serviceID}`
          });
        }
        keyboard.push(row);
      }
      
      // Add navigation buttons
      keyboard.push([
        { text: lang === "en" ? "💳 View Plans" : "💳 እቅዶች ይመልከቱ", callback_data: "plans" },
        { text: lang === "en" ? "📊 My Subscriptions" : "📊 የእኔ ምዝገባዎች", callback_data: "my_subs" }
      ]);
      
      keyboard.push([
        { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
      ]);
      
      const message = lang === "en" 
        ? "🎆 **Available Services**\n\nChoose a service to view details and subscribe:"
        : "🎆 **የሚገኙ አገልግሎቶች**\n\nዝርዝር መረጃ እና መመዝገብ አገልግሎት ይምረጡ:";
      
      await ctx.editMessageText(message, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in manage_plans action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Plans section handler (1, 3, 6, 12 months for all services)
  bot.action("plans", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      const plansText = lang === "am"
        ? `💳 **የምዝገባ እቅዶች**

ሁሉም አገልግሎቶች ለሚከተሉት ጊዜዎች ይገኛሉ:

📅 **1 ወር እቅድ**
• ሁሉንም አገልግሎቶች መዳረሻ
• ቀላል እና ተመጣጣኝ
• በማንኛውም ጊዜ መሰረዝ ይቻላል

📅 **3 ወር እቅድ**
• ሁሉንም አገልግሎቶች መዳረሻ
• ከ1 ወር እቅድ ቅናሽ
• የቅድሚያ ድጋፍ

📅 **6 ወር እቅድ**
• ሁሉንም አገልግሎቶች መዳረሻ
• የተሻለ ዋጋ
• የተሻሻለ ድጋፍ

📅 **12 ወር እቅድ**
• ሁሉንም አገልግሎቶች መዳረሻ
• ከፍተኛ ቅናሽ
• VIP ድጋፍ እና የቅድሚያ መዳረሻ`
        : `💳 **Subscription Plans**

All services are available for the following durations:

📅 **1 Month Plan**
• Access to all services
• Simple and affordable
• Cancel anytime

📅 **3 Month Plan**
• Access to all services
• Savings vs 1 month plan
• Priority support

📅 **6 Month Plan**
• Access to all services
• Better value
• Enhanced support

📅 **12 Month Plan**
• Access to all services
• Maximum savings
• VIP support & priority access`;

      const keyboard = [
        [
          { text: lang === "en" ? "📅 1 Month" : "📅 1 ወር", callback_data: "select_plan_1month" },
          { text: lang === "en" ? "📅 3 Months" : "📅 3 ወር", callback_data: "select_plan_3months" }
        ],
        [
          { text: lang === "en" ? "📅 6 Months" : "📅 6 ወር", callback_data: "select_plan_6months" },
          { text: lang === "en" ? "📅 12 Months" : "📅 12 ወር", callback_data: "select_plan_12months" }
        ],
        [
          { text: lang === "en" ? "🎯 Custom Plan" : "🎯 ብጁ እቅድ", callback_data: "custom_plan" }
        ],
        [
          { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
        ]
      ];

      await ctx.editMessageText(plansText, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in plans action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Plan selection handlers (1, 3, 6, 12 months)
  bot.action(/select_plan_(1month|3months|6months|12months)/, async (ctx) => {
    try {
      const planType = ctx.match[1];
      const lang = ctx.userLang;
      
      const planDetails = {
        "1month": { duration: "1 month", period: "30 days" },
        "3months": { duration: "3 months", period: "90 days" },
        "6months": { duration: "6 months", period: "180 days" },
        "12months": { duration: "12 months", period: "365 days" }
      };
      
      const plan = planDetails[planType];
      const confirmText = lang === "am"
        ? `${plan.duration} እቅድን መመረጥ ይፈልጋሉ?

⏰ ጊዜ: ${plan.duration} (${plan.period})

📝 ቀጣዩ ደረጃ:
• አገልግሎት ይምረጡ
• የክፍያ መረጃ ያስገቡ
• አስተዳዳሪ ማጽደቅ ይጠብቁ

ሁሉም አገልግሎቶች ለዚህ ጊዜ ይገኛሉ።`
        : `Do you want to select the ${plan.duration} plan?

⏰ Duration: ${plan.duration} (${plan.period})

📝 Next steps:
• Choose a service
• Provide payment information
• Wait for admin approval

All services are available for this duration.`;

      await ctx.editMessageText(confirmText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === "en" ? "📱 Choose Service" : "📱 አገልግሎት ይምረጡ", callback_data: "services" },
              { text: lang === "en" ? "❌ Cancel" : "❌ አስረስ", callback_data: "plans" }
            ],
            [
              { text: lang === "en" ? "⬅️ Back to Plans" : "⬅️ ወደ እቅዶች", callback_data: "plans" }
            ]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in plan selection:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Custom plan handler
  bot.action("custom_plan", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      const customPlanText = lang === "am"
        ? `🎯 **ብጁ እቅድ ጥያቄ**

📝 **ብጁ እቅድ ለመጠየቅ:**
• የሚፈልጉትን አገልግሎት ይምረጡ
• የሚፈልጉትን ጊዜ ይግለጹ (ለምሳሌ: 2 ወር፣ 5 ወር፣ 18 ወር)
• ልዩ መስፈርቶችዎን ይግለጹ

💡 **ብጁ እቅዶች ለ:**
• ልዩ የጊዜ ፍላጎቶች
• የቡድን ምዝገባዎች
• የንግድ መለያዎች
• የረጅም ጊዜ ቅናሽዎች

⚡ **ሂደት:**
1. ከታች "ብጁ እቅድ ይጠይቁ" ይጫኑ
2. የሚፈልጉትን ዝርዝሮች ይላኩ
3. አስተዳዳሪ ዋጋ እና ሁኔታዎች ይላካል
4. ከተስማሙ ክፍያ ያድርጉ

📞 **ወይም በቀጥታ ያነጋግሩን:**
የብጁ እቅድ ጥያቄዎች በ24 ሰዓት ውስጥ ይመለሳሉ።`
        : `🎯 **Custom Plan Request**

📝 **To request a custom plan:**
• Choose your desired service
• Specify your preferred duration (e.g., 2 months, 5 months, 18 months)
• Mention any special requirements

💡 **Custom plans are perfect for:**
• Unique duration needs
• Group subscriptions
• Business accounts
• Long-term discounts

⚡ **Process:**
1. Click "Request Custom Plan" below
2. Send us your requirements
3. Admin will send pricing and terms
4. Pay if you agree

📞 **Or contact us directly:**
Custom plan requests are answered within 24 hours.`;

      const keyboard = [
        [
          { text: lang === "en" ? "📝 Request Custom Plan" : "📝 ብጁ እቅድ ይጠይቁ", callback_data: "request_custom_plan" }
        ],
        [
          { text: lang === "en" ? "📞 Contact Support" : "📞 ድጋፍ ያነጋግሩ", callback_data: "support" }
        ],
        [
          { text: lang === "en" ? "⬅️ Back to Plans" : "⬅️ ወደ እቅዶች", callback_data: "plans" }
        ]
      ];

      await ctx.editMessageText(customPlanText, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in custom_plan action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Request custom plan handler
  bot.action("request_custom_plan", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      const requestText = lang === "am"
        ? `📝 **ብጁ እቅድ ጥያቄ**

እባክዎ የሚከተለውን መረጃ ይላኩ:

1️⃣ **አገልግሎት:** የሚፈልጉት አገልግሎት (Netflix, Spotify, ወዘተ)
2️⃣ **ጊዜ:** የሚፈልጉት ጊዜ (ለምሳሌ: 2 ወር, 5 ወር)
3️⃣ **ብዛት:** ስንት መለያ (ለቡድን ምዝገባ)
4️⃣ **ልዩ መስፈርቶች:** ማንኛውም ተጨማሪ መረጃ

**ምሳሌ:**
"Netflix 2 ወር, 3 መለያዎች, የቤተሰብ እቅድ"

💬 በሚቀጥለው መልእክትዎ ላይ ዝርዝሮችን ይላኩ።`
        : `📝 **Custom Plan Request**

Please send the following information:

1️⃣ **Service:** Which service you want (Netflix, Spotify, etc.)
2️⃣ **Duration:** How long you need it (e.g., 2 months, 5 months)
3️⃣ **Quantity:** How many accounts (for group subscriptions)
4️⃣ **Special Requirements:** Any additional information

**Example:**
"Netflix for 2 months, 3 accounts, family plan"

💬 Send your details in your next message.`;

      const keyboard = [
        [
          { text: lang === "en" ? "📞 Contact Support Instead" : "📞 ይልቁንም ድጋፍ ያነጋግሩ", callback_data: "support" }
        ],
        [
          { text: lang === "en" ? "⬅️ Back" : "⬅️ ተመለስ", callback_data: "custom_plan" }
        ]
      ];

      await ctx.editMessageText(requestText, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();

      // Set user state to expect custom plan details
      if (!global.userStates) global.userStates = {};
      global.userStates[ctx.from.id] = { 
        state: 'awaiting_custom_plan_details',
        timestamp: Date.now()
      };

    } catch (error) {
      console.error("Error in request_custom_plan action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Handle custom pricing acceptance
  bot.action(/^accept_custom_pricing_(.+)$/, async (ctx) => {
    try {
      const requestId = ctx.match[1];
      const lang = ctx.userLang;

      // Get the custom plan request with pricing
      const requestDoc = await firestore.collection('customPlanRequests').doc(requestId).get();
      if (!requestDoc.exists) {
        await ctx.answerCbQuery('❌ Request not found');
        return;
      }

      const requestData = requestDoc.data();

      // Create a pending payment for this custom plan
      const pendingPaymentData = {
        userId: ctx.from.id,
        userFirstName: ctx.from.first_name || '',
        userLastName: ctx.from.last_name || '',
        username: ctx.from.username || '',
        serviceName: 'Custom Plan',
        serviceID: 'custom_plan',
        duration: 'Custom Duration',
        durationName: 'Custom Duration',
        amount: requestData.price,
        paymentReference: `CUSTOM_${Date.now()}`,
        paymentStatus: 'pending',
        customPlanRequestId: requestId,
        createdAt: new Date(),
        language: lang || 'en'
      };

      const pendingPaymentRef = await firestore.collection('pendingPayments').add(pendingPaymentData);

      // Update custom plan request status
      await firestore.collection('customPlanRequests').doc(requestId).update({
        status: 'accepted',
        acceptedAt: new Date(),
        pendingPaymentId: pendingPaymentRef.id
      });

      // Show payment methods
      const paymentMethodsSnapshot = await firestore.collection('config').doc('paymentMethods').get();
      let paymentMethods = [];

      if (paymentMethodsSnapshot.exists) {
        const methodsData = paymentMethodsSnapshot.data();
        paymentMethods = methodsData.methods?.filter(method => method.active) || [];
      }

      // Fallback to default methods if none configured
      if (paymentMethods.length === 0) {
        paymentMethods = [
          {
            id: 'telebirr',
            name: 'TeleBirr',
            nameAm: 'ቴሌ ብር',
            account: '0911234567',
            instructions: 'Send payment to this TeleBirr number and upload screenshot',
            instructionsAm: 'ወደዚህ ቴሌ ብር ቁጥር ክፍያ ይላኩ እና ስክሪንሾት ይላኩ',
            icon: '📱'
          }
        ];
      }

      const paymentText = lang === 'am'
        ? `💰 **ክፍያ ዝርዝር**

📋 **የእርስዎ ብጁ እቅድ:**
• **ጥያቄ:** ${requestData.customPlanDetails}
• **ዋጋ:** ${requestData.price}

💳 **የክፍያ ዘዴዎች:**

${paymentMethods.map(method => 
  `${method.icon} **${method.nameAm || method.name}**
📞 መለያ: ${method.account}
📝 ${method.instructionsAm || method.instructions}`
).join('\n\n')}

📤 **ቀጣይ ደረጃ:**
ክፍያ ካደረጉ በኋላ የክፍያ ማረጋገጫ ፎቶ ይላኩ።`
        : `💰 **Payment Details**

📋 **Your Custom Plan:**
• **Request:** ${requestData.customPlanDetails}
• **Price:** ${requestData.price}

💳 **Payment Methods:**

${paymentMethods.map(method => 
  `${method.icon} **${method.name}**
📞 Account: ${method.account}
📝 ${method.instructions}`
).join('\n\n')}

📤 **Next Step:**
After making payment, send a screenshot of your payment proof.`;

      const keyboard = [
        [
          { text: lang === 'am' ? '📤 የክፍያ ማረጋገጫ ላክ' : '📤 Send Payment Proof', 
            callback_data: `upload_custom_proof_${pendingPaymentRef.id}` }
        ],
        [
          { text: lang === 'am' ? '❌ ሰርዝ' : '❌ Cancel', 
            callback_data: 'back_to_menu' }
        ]
      ];

      await ctx.editMessageText(paymentText, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: 'Markdown'
      });
      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error accepting custom pricing:', error);
      await ctx.answerCbQuery('❌ Error processing request');
    }
  });

  // Handle custom pricing decline
  bot.action(/^decline_custom_pricing_(.+)$/, async (ctx) => {
    try {
      const requestId = ctx.match[1];
      const lang = ctx.userLang;

      // Update custom plan request status
      await firestore.collection('customPlanRequests').doc(requestId).update({
        status: 'declined_by_user',
        declinedAt: new Date()
      });

      const declineMsg = lang === 'am'
        ? `❌ **ብጁ እቅድ ውድቅ ተደረገ**

የብጁ እቅዱን ዋጋ ውድቅ አድርገዋል።

💡 **ሌሎች አማራጮች:**
• የተለየ ብጁ እቅድ ይጠይቁ
• ከመደበኛ እቅዶች ይምረጡ
• ለተጨማሪ መረጃ /support ይጠቀሙ

🏠 ወደ ዋና ገጽ ለመመለስ /start ይጫኑ።`
        : `❌ **Custom Plan Declined**

You have declined the custom plan pricing.

💡 **Other Options:**
• Request a different custom plan
• Choose from our standard plans
• Use /support for more information

🏠 Press /start to return to main menu.`;

      await ctx.editMessageText(declineMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '🏠 ዋና ገጽ' : '🏠 Main Menu', callback_data: 'back_to_menu' }]
          ]
        },
        parse_mode: 'Markdown'
      });
      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error declining custom pricing:', error);
      await ctx.answerCbQuery('❌ Error processing decline');
    }
  });

  // Handle custom payment proof upload
  bot.action(/^upload_custom_proof_(.+)$/, async (ctx) => {
    try {
      const pendingPaymentId = ctx.match[1];
      const lang = ctx.userLang;

      const instructionMsg = lang === 'am'
        ? `📤 **የክፍያ ማረጋገጫ ላክ**

እባክዎ የክፍያ ማረጋገጫዎን (ስክሪንሾት) ይላኩ።

📝 **መመሪያዎች:**
• የክፍያ ማረጋገጫ ፎቶ ይላኩ
• ግልጽ እና ሊነበብ የሚችል መሆን አለበት
• የክፍያ መጠን እና ቀን መታየት አለበት

📤 በሚቀጥለው መልእክት ፎቶውን ይላኩ።`
        : `📤 **Send Payment Proof**

Please send your payment proof (screenshot).

📝 **Instructions:**
• Send a photo of your payment confirmation
• Make sure it's clear and readable
• Payment amount and date should be visible

📤 Send the photo in your next message.`;

      await ctx.editMessageText(instructionMsg, {
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '❌ ሰርዝ' : '❌ Cancel', callback_data: 'back_to_menu' }]
          ]
        },
        parse_mode: 'Markdown'
      });

      // Set user state to expect payment proof
      if (!global.userStates) global.userStates = {};
      global.userStates[ctx.from.id] = { 
        state: 'awaiting_custom_payment_proof',
        pendingPaymentId: pendingPaymentId,
        timestamp: Date.now()
      };

      await ctx.answerCbQuery();

    } catch (error) {
      console.error('Error setting up payment proof upload:', error);
      await ctx.answerCbQuery('❌ Error setting up upload');
    }
  });

  // Handle service-specific custom plan requests
  bot.action(/^custom_plan_for_(.+)$/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang;
      
      // Get service details
      let service;
      if (ctx.services) {
        service = ctx.services.find(s => s.id === serviceId || s.serviceID === serviceId);
      }
      
      if (!service) {
        try {
          const serviceDoc = await firestore.collection('services').doc(serviceId).get();
          if (serviceDoc.exists) {
            service = { id: serviceDoc.id, ...serviceDoc.data() };
          }
        } catch (error) {
          console.error('Error fetching service:', error);
        }
      }

      const serviceName = service ? service.name : serviceId;
      
      const customPlanText = lang === "am"
        ? `🎯 **${serviceName} ብጁ እቅድ ጥያቄ**

📝 **ለ${serviceName} ብጁ እቅድ ለመጠየቅ:**
• የሚፈልጉትን ጊዜ ይግለጹ (ለምሳሌ: 7 ቀናት፣ 2 ሳምንት፣ 45 ቀናት)
• የሚፈልጉትን የመለያ ብዛት ይግለጹ
• ልዩ መስፈርቶችዎን ይግለጹ

💡 **ብጁ እቅዶች ለ:**
• ልዩ የጊዜ ፍላጎቶች (ቀናት፣ ሳምንታት)
• የቡድን ምዝገባዎች
• የንግድ መለያዎች
• የረጅም ጊዜ ቅናሽዎች

⚡ **ሂደት:**
1. ከታች "ብጁ እቅድ ይጠይቁ" ይጫኑ
2. የሚፈልጉትን ዝርዝሮች ይላኩ
3. አስተዳዳሪ ዋጋ እና ሁኔታዎች ይላካል
4. ከተስማሙ ክፍያ ያድርጉ

📞 **ወይም በቀጥታ ያነጋግሩን:**
የብጁ እቅድ ጥያቄዎች በ24 ሰዓት ውስጥ ይመለሳሉ።`
        : `🎯 **${serviceName} Custom Plan Request**

📝 **To request a custom plan for ${serviceName}:**
• Specify your preferred duration (e.g., 7 days, 2 weeks, 45 days)
• Mention how many accounts you need
• Include any special requirements

💡 **Custom plans are perfect for:**
• Unique duration needs (days, weeks)
• Group subscriptions
• Business accounts
• Long-term discounts

⚡ **Process:**
1. Click "Request Custom Plan" below
2. Send us your requirements
3. Admin will send pricing and terms
4. Pay if you agree

📞 **Or contact us directly:**
Custom plan requests are answered within 24 hours.`;

      const keyboard = [
        [
          { text: lang === "en" ? "📝 Request Custom Plan" : "📝 ብጁ እቅድ ይጠይቁ", 
            callback_data: `request_custom_plan_for_${serviceId}` }
        ],
        [
          { text: lang === "en" ? "📞 Contact Support" : "📞 ድጋፍ ያነጋግሩ", callback_data: "support" }
        ],
        [
          { text: lang === "en" ? "⬅️ Back to Plans" : "⬅️ ወደ እቅዶች", 
            callback_data: `select_service_${serviceId}` }
        ]
      ];

      await ctx.editMessageText(customPlanText, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in custom_plan_for action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Handle service-specific custom plan request
  bot.action(/^request_custom_plan_for_(.+)$/, async (ctx) => {
    try {
      const serviceId = ctx.match[1];
      const lang = ctx.userLang;
      
      // Get service details
      let service;
      if (ctx.services) {
        service = ctx.services.find(s => s.id === serviceId || s.serviceID === serviceId);
      }
      
      if (!service) {
        try {
          const serviceDoc = await firestore.collection('services').doc(serviceId).get();
          if (serviceDoc.exists) {
            service = { id: serviceDoc.id, ...serviceDoc.data() };
          }
        } catch (error) {
          console.error('Error fetching service:', error);
        }
      }

      const serviceName = service ? service.name : serviceId;
      
      const requestText = lang === "am"
        ? `📝 **${serviceName} ብጁ እቅድ ጥያቄ**

እባክዎ የሚከተለውን መረጃ ይላኩ:

1️⃣ **ጊዜ:** የሚፈልጉት ጊዜ (ለምሳሌ: 7 ቀናት, 2 ሳምንት, 45 ቀናት)
2️⃣ **ብዛት:** ስንት መለያ (ለቡድን ምዝገባ)
3️⃣ **ልዩ መስፈርቶች:** ማንኛውም ተጨማሪ መረጃ

**ምሳሌ:**
"${serviceName} 15 ቀናት, 2 መለያዎች, የቤተሰብ እቅድ"

💬 በሚቀጥለው መልእክትዎ ላይ ዝርዝሮችን ይላኩ።`
        : `📝 **${serviceName} Custom Plan Request**

Please send the following information:

1️⃣ **Duration:** How long you need it (e.g., 7 days, 2 weeks, 45 days)
2️⃣ **Quantity:** How many accounts (for group subscriptions)
3️⃣ **Special Requirements:** Any additional information

**Example:**
"${serviceName} for 15 days, 2 accounts, family plan"

💬 Send your details in your next message.`;

      const keyboard = [
        [
          { text: lang === "en" ? "📞 Contact Support Instead" : "📞 ይልቁንም ድጋፍ ያነጋግሩ", callback_data: "support" }
        ],
        [
          { text: lang === "en" ? "⬅️ Back" : "⬅️ ተመለስ", 
            callback_data: `custom_plan_for_${serviceId}` }
        ]
      ];

      await ctx.editMessageText(requestText, {
        reply_markup: { inline_keyboard: keyboard },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();

      // Set user state to expect custom plan details with service context
      if (!global.userStates) global.userStates = {};
      global.userStates[ctx.from.id] = { 
        state: 'awaiting_custom_plan_details',
        serviceId: serviceId,
        serviceName: serviceName,
        timestamp: Date.now()
      };

    } catch (error) {
      console.error("Error in request_custom_plan_for action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
  
  // Handle service details view
  bot.action(/service_details_(.+)/, async (ctx) => {
    try {
      const serviceID = ctx.match[1];
      const lang = ctx.userLang;
      const services = ctx.services;
      const service = services.find(s => s.serviceID === serviceID);
      
      if (!service) {
        await ctx.answerCbQuery("Service not found.");
        return;
      }
      
      const cycleText = ctx.i18n[service.billingCycle.toLowerCase()]?.[lang] || service.billingCycle;
      const detailsText = ctx.i18n.service_details[lang]
        .replace("{service}", service.name)
        .replace("{price}", service.price)
        .replace("{cycle}", cycleText)
        .replace("{description}", service.description || "Premium streaming service");
      
      const subscribeText = ctx.i18n.subscribe_button[lang];
      const backText = ctx.i18n.back_button[lang];
      
      await ctx.editMessageText(detailsText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: subscribeText, callback_data: `subscribe_${serviceID}` }],
            [{ text: backText, callback_data: "manage_plans" }]
          ]
        }
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in service_details action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // My subscriptions handler is now in mySubscriptions.js to avoid conflicts

  // How to Use section handler (matching website how-to-use)
  bot.action("how_to_use", async (ctx) => {
    try {
      const lang = ctx.userLang;

      
      const howToText = lang === "am"
        ? `📖 **BirrPay እንዴት እንደሚጠቀሙ**

**ደረጃ 1: አገልግሎት ይምረጡ** 🎯
• ከሚገኙ አገልግሎቶች ውስጥ የሚፈልጉትን ይምረጡ
• Netflix, Amazon Prime, Spotify እና ሌሎች

**ደረጃ 2: እቅድ ይምረጡ** 💳
• ሳምንታዊ, ወርሃዊ ወይም ዓመታዊ እቅድ
• የሚመጥንዎትን የክፍያ መርሃግብር ይምረጡ

**ደረጃ 3: ክፍያ ያድርጉ** 💰
• በብር በተለያዩ የክፍያ መንገዶች
• ደህንነቱ የተጠበቀ እና ቀላል ክፍያ

**ደረጃ 4: ይደሰቱ** 🎉
• አስተዳዳሪ ማጽደቅ በኋላ
• ሙሉ አገልግሎት መዳረሻ ያገኛሉ`
        : `📖 **How to Use BirrPay**

**Step 1: Choose Service** 🎯
• Select from available services
• Netflix, Amazon Prime, Spotify and more

**Step 2: Select Plan** 💳
• Weekly, monthly, or yearly plans
• Choose payment schedule that fits you

**Step 3: Make Payment** 💰
• Pay in Ethiopian Birr
• Secure and easy payment process

**Step 4: Enjoy** 🎉
• After admin approval
• Get full access to your service`;

      await ctx.editMessageText(howToText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === "en" ? "🎯 Browse Services" : "🎯 አገልግሎቶች ይመልከቱ", callback_data: "services" },
              { text: lang === "en" ? "💳 View Plans" : "💳 እቅዶች ይመልከቱ", callback_data: "plans" }
            ],
            [
              { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
            ]
          ]
        },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in how_to_use action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Contact section handler (matching website contact)
  bot.action("contact", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      const contactText = lang === "am"
        ? `📞 **እኛን ያግኙ**

📧 **ኢሜይል:** support@birrpay.et
📱 **ስልክ:** +251-911-123456
🌐 **ድህረ ገጽ:** www.birrpay.et

🏢 **አድራሻ:**
BirrPay Technologies
Addis Ababa, Ethiopia
Bole Sub-city

⏰ **የስራ ሰዓት:**
ሰኞ - አርብ: 8:00 AM - 6:00 PM
ቅዳሜ: 9:00 AM - 1:00 PM
እሁድ: ዝግ

💬 **ወይም በዚህ ቦት ውስጥ መልእክት ይላኩ**
የእርስዎን መልእክት ወዲያውኑ ለአስተዳዳሪ እንልካለን።`
        : `📞 **Contact Us**

📧 **Email:** support@birrpay.et
📱 **Phone:** +251-911-123456
🌐 **Website:** www.birrpay.et

🏢 **Address:**
BirrPay Technologies
Addis Ababa, Ethiopia
Bole Sub-city

⏰ **Business Hours:**
Mon - Fri: 8:00 AM - 6:00 PM
Saturday: 9:00 AM - 1:00 PM
Sunday: Closed

💬 **Or send a message in this bot**
We'll forward your message to admin immediately.`;

      await ctx.editMessageText(contactText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: lang === "en" ? "💬 Send Message" : "💬 መልእክት ላክ", callback_data: "send_message" },
              { text: lang === "en" ? "🛠️ Support" : "🛠️ ድጋፍ", callback_data: "support" }
            ],
            [
              { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
            ]
          ]
        },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in contact action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Language settings handler
  bot.action("language_settings", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      const langText = lang === "am"
        ? `🌐 **ቋንቋ ቅንብሮች**

የሚፈልጉትን ቋንቋ ይምረጡ:`
        : `🌐 **Language Settings**

Choose your preferred language:`;

      await ctx.editMessageText(langText, {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇺🇸 English", callback_data: "set_lang_en" },
              { text: "🇪🇹 አማርኛ", callback_data: "set_lang_am" }
            ],
            [
              { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
            ]
          ]
        },
        parse_mode: "Markdown"
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in language_settings action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Handle FAQ menu from start (matching website FAQ)
  bot.action("faq_menu", async (ctx) => {
    try {
      const lang = ctx.userLang;
      
      // FAQ data matching the website
      const faqs = lang === "am" ? [
        { q: "BirrPay ምንድን ነው?", a: "BirrPay የኢትዮጵያ የመጀመሪያ የምዝገባ ማዕከል ነው። ሁሉንም የዲጂታል ምዝገባዎችዎን በአንድ ቦታ ማስተዳደር ይችላሉ።" },
        { q: "እንዴት ምዝገባ እጀምራለሁ?", a: "አገልግሎት ይምረጡ፣ የክፍያ እቅድ ይምረጡ፣ ክፍያ ያድርጉ እና አስተዳዳሪ ካጸደቀ በኋላ ይጀምሩ።" },
        { q: "ምን ዓይነት የክፍያ መንገዶች ይቀበላሉ?", a: "የሞባይል ገንዘብ፣ የባንክ ዝውውር እና ሌሎች የአካባቢ የክፍያ መንገዶች እንቀበላለን።" },
        { q: "ምዝገባዬን መሰረዝ እችላለሁ?", a: "አዎ፣ በማንኛውም ጊዜ ምዝገባዎን መሰረዝ ይችላሉ። ወደ 'የእኔ ምዝገባዎች' ይሂዱ።" },
        { q: "ድጋፍ እንዴት አገኛለሁ?", a: "በዚህ ቦት ውስጥ መልእክት ይላኩ ወይም support@birrpay.et ላይ ያግኙን።" }
      ] : [
        { q: "What is BirrPay?", a: "BirrPay is Ethiopia's premier subscription hub. You can manage all your digital subscriptions in one secure place." },
        { q: "How do I start a subscription?", a: "Choose a service, select a payment plan, make payment, and start after admin approval." },
        { q: "What payment methods do you accept?", a: "We accept mobile money, bank transfers, and other local payment methods." },
        { q: "Can I cancel my subscription?", a: "Yes, you can cancel your subscription anytime. Go to 'My Subscriptions' section." },
        { q: "How do I get support?", a: "Send a message in this bot or contact us at support@birrpay.et" }
      ];
      
      const keyboard = faqs.map((f, i) => [
        { text: `❓ ${f.q}`, callback_data: `faq_answer_${i}` },
      ]);
      
      keyboard.push([
        { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
      ]);
      
      const title = lang === "am" ? "❓ በተደጋጋሚ የሚጠየቁ ጥያቄዎች" : "❓ Frequently Asked Questions";
      
      await ctx.editMessageText(title, {
        reply_markup: { inline_keyboard: keyboard },
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in faq_menu action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Handle FAQ answers
  bot.action(/faq_answer_(\d+)/, async (ctx) => {
    try {
      const index = parseInt(ctx.match[1]);
      const lang = ctx.userLang;
      
      const faqs = lang === "am" ? [
        { q: "BirrPay ምንድን ነው?", a: "BirrPay የኢትዮጵያ የመጀመሪያ የምዝገባ ማዕከል ነው። ሁሉንም የዲጂታል ምዝገባዎችዎን በአንድ ቦታ ማስተዳደር ይችላሉ።" },
        { q: "እንዴት ምዝገባ እጀምራለሁ?", a: "አገልግሎት ይምረጡ፣ የክፍያ እቅድ ይምረጡ፣ ክፍያ ያድርጉ እና አስተዳዳሪ ካጸደቀ በኋላ ይጀምሩ።" },
        { q: "ምን ዓይነት የክፍያ መንገዶች ይቀበላሉ?", a: "የሞባይል ገንዘብ፣ የባንክ ዝውውር እና ሌሎች የአካባቢ የክፍያ መንገዶች እንቀበላለን።" },
        { q: "ምዝገባዬን መሰረዝ እችላለሁ?", a: "አዎ፣ በማንኛውም ጊዜ ምዝገባዎን መሰረዝ ይችላሉ። ወደ 'የእኔ ምዝገባዎች' ይሂዱ።" },
        { q: "ድጋፍ እንዴት አገኛለሁ?", a: "በዚህ ቦት ውስጥ መልእክት ይላኩ ወይም support@birrpay.et ላይ ያግኙን።" }
      ] : [
        { q: "What is BirrPay?", a: "BirrPay is Ethiopia's premier subscription hub. You can manage all your digital subscriptions in one secure place." },
        { q: "How do I start a subscription?", a: "Choose a service, select a payment plan, make payment, and start after admin approval." },
        { q: "What payment methods do you accept?", a: "We accept mobile money, bank transfers, and other local payment methods." },
        { q: "Can I cancel my subscription?", a: "Yes, you can cancel your subscription anytime. Go to 'My Subscriptions' section." },
        { q: "How do I get support?", a: "Send a message in this bot or contact us at support@birrpay.et" }
      ];
      
      const faq = faqs[index];
      if (faq) {
        await ctx.editMessageText(`❓ **${faq.q}**\n\n✅ ${faq.a}`, {
          reply_markup: {
            inline_keyboard: [
              [
                { text: lang === "en" ? "⬅️ Back to FAQ" : "⬅️ ወደ ጥያቄዎች", callback_data: "faq_menu" },
                { text: lang === "en" ? "🏠 Main Menu" : "🏠 ዋና ሜኑ", callback_data: "back_to_start" }
              ]
            ]
          },
          parse_mode: "Markdown"
        });
      }
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in FAQ answer:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
  
  // Handle back to start
  // Handle start callback (same as back_to_start)
  bot.action("start", async (ctx) => {
    try {
      const lang = ctx.userLang || "en";
      
      // Main welcome message matching website hero section
      const title = lang === "am" 
        ? "🌍 BirrPay - የኢትዮጵያ የምዝገባ መከር"
        : "🌍 BirrPay - Ethiopia's Premier Subscription Hub";
      
      const subtitle = lang === "am"
        ? "ሁሉንም የዲጂታል ምዝገባዎችዎን በአንድ የተጠቃማ ቦታ ይአስተዳድሩ። Netflix፣ Amazon Prime፣ Spotify እና ተጨማሪዎችን በቀላሉ በብር ያግኙ።"
        : "Manage all your digital subscriptions in one secure place. Access Netflix, Amazon Prime, Spotify, and more with ease using Ethiopian Birr.";

      // Create main menu matching website structure
      const keyboard = [
        // Features row
        [
          { text: lang === "en" ? "🎯 Features" : "🎯 ባህሪያት", callback_data: "features" },
          { text: lang === "en" ? "📱 Services" : "📱 አገልግሎቶች", callback_data: "services" }
        ],
        // Plans and subscriptions row
        [
          { text: lang === "en" ? "💳 Plans" : "💳 እቅዶች", callback_data: "plans" },
          { text: lang === "en" ? "📊 My Subs" : "📊 የእኔ ምዝገባዎች", callback_data: "my_subs" }
        ],
        // How to use and FAQ row
        [
          { text: lang === "en" ? "📖 How to Use" : "📖 እንዴት እንደሚጠቀሙ", callback_data: "how_to_use" },
          { text: lang === "en" ? "❓ FAQ" : "❓ ጥያቄዎች", callback_data: "faq_menu" }
        ],
        // Contact and support row
        [
          { text: lang === "en" ? "📞 Contact" : "📞 አግኙን", callback_data: "contact" },
          { text: lang === "en" ? "🛠️ Support" : "🛠️ ድጋፍ", callback_data: "support" }
        ],
        // Language settings
        [
          { text: lang === "en" ? "🌐 Language" : "🌐 ቋንቋ", callback_data: "language_settings" }
        ]
      ];

      try {
        await ctx.editMessageText(
          `${title}\n\n${subtitle}\n\n${lang === "en" ? "Choose an option below:" : "ከታች አንዱን ይምረጡ:"}`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          }
        );
      } catch (e) {
        // If message can't be edited, send a new one
        await ctx.reply(
          `${title}\n\n${subtitle}\n\n${lang === "en" ? "Choose an option below:" : "ከታች አንዱን ይምረጡ:"}`,
          {
            parse_mode: 'Markdown',
            reply_markup: { inline_keyboard: keyboard }
          }
        );
      }
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in start action:', error);
      try {
        await ctx.answerCbQuery('An error occurred. Please try again.');
      } catch (e) {
        console.error('Error sending error message:', e);
      }
    }
  });

  // Handle back to menu action - works from any screen
  bot.action('back_to_menu', async (ctx) => {
    try {
      await showMainMenu(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in back_to_menu action:', error);
      try {
        const lang = ctx.userLang || (ctx.userLang === 'am' ? 'am' : 'en');
        await ctx.answerCbQuery(lang === 'am' ? 'ስህተት ተከስቷል። እባክዎ ቆይተው ይሞክሩ።' : 'An error occurred. Please try again.');
      } catch (e) {
        console.error('Error sending error message:', e);
      }
    }
  });
  
  // Keep back_to_start as an alias for backward compatibility
  bot.action('back_to_start', async (ctx) => {
    try {
      await showMainMenu(ctx);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in back_to_start action:', error);
      await ctx.answerCbQuery('Error returning to menu');
    }
  });

  bot.action("support", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const supportText =
        lang === "en"
          ? `💬 Support Information:

📧 Contact: support@admin.birr‑pay

📱 How to get help:
• Send any message to this bot
• Admin will review and respond
• You'll get a confirmation when message is received

🔧 Other commands:
/help - Show all commands
/faq - Frequently asked questions
/lang en - Switch to English
/lang am - Switch to Amharic`
          : `💬 የድጋፍ መረጃ:

📧 አድራሻ: support@admin.birr‑pay

📱 እርዳታ እንዴት እንደሚያገኙ:
• ለዚህ ቦት ማንኛውንም መልእክት ይላኩ
• አስተዳዳሪ ያገኝ እና ይመልሳል
• መልእክቱ እንደተቀበለ ማረጋገጫ ያገኛሉ

🔧 ሌሎች ትዕዛዞች:
/help - ሁሉንም ትዕዛዞች ያሳዩ
/faq - በተደጋጋሚ የሚጠየቁ ጥያቄዎች
/lang en - ወደ እንግሊዝኛ ቀይር
/lang am - ወደ አማርኛ ቀይር`;

      await ctx.editMessageText(supportText);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in support action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Pricing button handler
  bot.action("pricing", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const pricingMessage = lang === 'am'
        ? `💰 **BirrPay የዋጋ አሰጣጥ**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **የአገልግሎት ዋጋዎች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📺 **Netflix**
• 1 ወር - 350 ብር
• 3 ወር - 900 ብር (50 ብር ቅናሽ)
• 6 ወር - 1,700 ብር (100 ብር ቅናሽ)
• 12 ወር - 3,200 ብር (200 ብር ቅናሽ)

🎵 **Spotify Premium**
• 1 ወር - 250 ብር
• 3 ወር - 650 ብር (100 ብር ቅናሽ)
• 6 ወር - 1,200 ብር (300 ብር ቅናሽ)
• 12 ወር - 2,200 ብር (800 ብር ቅናሽ)

📦 **Amazon Prime**
• 1 ወር - 300 ብር
• 3 ወር - 800 ብር (100 ብር ቅናሽ)
• 6 ወር - 1,500 ብር (300 ብር ቅናሽ)
• 12 ወር - 2,800 ብር (800 ብር ቅናሽ)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **ቅናሽ ጥቅሞች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ የረዥም ጊዜ እቅድ ይመረጡ እና ብር ይቆጥቡ
✅ ሁሉም ክፍያዎች በብር ናቸው
✅ ምንም የተደበቀ ክፍያ የለም
✅ በማንኛውም ጊዜ ሰርዝ ይችላሉ`
        : `💰 **BirrPay Pricing**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **Service Pricing**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📺 **Netflix**
• 1 Month - 350 ETB
• 3 Months - 900 ETB (50 ETB savings)
• 6 Months - 1,700 ETB (100 ETB savings)
• 12 Months - 3,200 ETB (200 ETB savings)

🎵 **Spotify Premium**
• 1 Month - 250 ETB
• 3 Months - 650 ETB (100 ETB savings)
• 6 Months - 1,200 ETB (300 ETB savings)
• 12 Months - 2,200 ETB (800 ETB savings)

📦 **Amazon Prime**
• 1 Month - 300 ETB
• 3 Months - 800 ETB (100 ETB savings)
• 6 Months - 1,500 ETB (300 ETB savings)
• 12 Months - 2,800 ETB (800 ETB savings)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
💡 **Discount Benefits**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Choose longer plans and save money
✅ All payments in Ethiopian Birr
✅ No hidden fees
✅ Cancel anytime`;

      await ctx.editMessageText(pricingMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '🚀 አገልግሎቶች' : '🚀 Services', callback_data: 'services' }],
            [getBackToMenuButton(lang)]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in pricing action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Payment methods button handler
  bot.action("payment_methods", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const paymentMessage = lang === 'am'
        ? `💳 **የክፍያ ዘዴዎች**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 **ተቀባይነት ያላቸው ክፍያ ዘዴዎች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏦 **የባንክ ዝውውር**
• የንግድ ባንክ (CBE)
• አዋሽ ባንክ
• ዳሽን ባንክ
• ሌሎች የኢትዮጵያ ባንኮች

📱 **ሞባይል ገንዘብ**
• TeleBirr
• HelloCash
• M-Birr
• Amole

💰 **ሌሎች ዘዴዎች**
• የባንክ ካርድ (Visa/MasterCard)
• PayPal (በዶላር)
• Western Union

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 **ደህንነት**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ ሁሉም ክፍያዎች በደህንነት የተጠበቁ ናቸው
✅ SSL ምስጠራ
✅ የባንክ ደረጃ ደህንነት
✅ የክፍያ መረጃዎ አይቀመጥም

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ **የማረጋገጫ ጊዜ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• TeleBirr: ፈጣን (5-15 ደቂቃ)
• የባንክ ዝውውር: 1-24 ሰዓት
• ካርድ ክፍያ: ፈጣን (5-10 ደቂቃ)`
        : `💳 **Payment Methods**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 **Accepted Payment Methods**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏦 **Bank Transfer**
• Commercial Bank of Ethiopia (CBE)
• Awash Bank
• Dashen Bank
• Other Ethiopian Banks

📱 **Mobile Money**
• TeleBirr
• HelloCash
• M-Birr
• Amole

💰 **Other Methods**
• Bank Cards (Visa/MasterCard)
• PayPal (USD)
• Western Union

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 **Security**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All payments are securely processed
✅ SSL encryption
✅ Bank-level security
✅ Your payment info is not stored

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏱️ **Verification Time**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• TeleBirr: Instant (5-15 minutes)
• Bank Transfer: 1-24 hours
• Card Payment: Instant (5-10 minutes)`;

      await ctx.editMessageText(paymentMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '🚀 አገልግሎቶች' : '🚀 Services', callback_data: 'services' }],
            [getBackToMenuButton(lang)]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in payment_methods action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Terms button handler
  bot.action("terms", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const termsMessage = lang === 'am'
        ? `📜 **የአገልግሎት ደረጃዎች**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **አጠቃላይ ደንቦች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ **መለያ ፈጠራ**
• እውነተኛ መረጃ ብቻ ይጠቀሙ
• አንድ ሰው አንድ መለያ ብቻ ይፈጥራል
• የስልክ ቁጥር ማረጋገጫ አስፈላጊ ነው

2️⃣ **ክፍያ እና ሰርዝ**
• ሁሉም ክፍያዎች ቅድሚያ መከፈል አለባቸው
• በማንኛውም ጊዜ ሰርዝ ይችላሉ
• የተከፈለ ገንዘብ አይመለስም

3️⃣ **አገልግሎት አጠቃቀም**
• አገልግሎቶች ለግል አጠቃቀም ብቻ ናቸው
• መለያ መጋራት አይፈቀድም
• የአገልግሎት ሰጪዎች ደንብ መከተል አለባቸው

4️⃣ **ግላዊነት**
• የእርስዎ መረጃ በደህንነት ይጠበቃል
• ለሶስተኛ ወገን አይሰጥም
• የEU GDPR ደንቦች ይከተላሉ

5️⃣ **ድጋፍ**
• 24/7 የደንበኞች ድጋፍ
• በአማርኛ እና እንግሊዝኛ
• የመልስ ጊዜ: 1-24 ሰዓት

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ **ተጠያቂነት**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BirrPay የሶስተኛ ወገን አገልግሎት ሰጪዎች ለሚሰሩት ለውጦች ተጠያቂ አይደለም። የአገልግሎት ጥራት እና ተገኝነት በአገልግሎት ሰጪዎች ይወሰናል።`
        : `📜 **Terms of Service**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 **General Terms**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ **Account Creation**
• Use only genuine information
• One person, one account only
• Phone number verification required

2️⃣ **Payment & Cancellation**
• All payments must be made in advance
• You can cancel anytime
• No refunds for paid services

3️⃣ **Service Usage**
• Services are for personal use only
• Account sharing is not allowed
• Service provider rules must be followed

4️⃣ **Privacy**
• Your information is securely protected
• Not shared with third parties
• EU GDPR compliance followed

5️⃣ **Support**
• 24/7 customer support
• Available in Amharic and English
• Response time: 1-24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚖️ **Liability**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BirrPay is not responsible for changes made by third-party service providers. Service quality and availability are determined by the service providers.`;

      await ctx.editMessageText(termsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [getBackToMenuButton(lang)]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in terms action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // About button handler
  bot.action("about", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const aboutMessage = lang === 'am'
        ? `ℹ️ **BirrPay ስለ እኛ**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 **ራዕያችን**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BirrPay የኢትዮጵያ #1 የሳብስክሪፕሽን ፕላትፎርም ሆኖ ሁሉም ኢትዮጵያውያን ዓለም አቀፍ ዲጂታል አገልግሎቶችን በቀላሉ እና በተመጣጣኝ ዋጋ እንዲያገኙ ማድረግ ነው።

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **ተልእኮአችን**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• የውጭ ካርድ ሳያስፈልግ በብር ክፍያ
• ደህንነቱ የተጠበቀ እና ፈጣን አገልግሎት
• 24/7 የአማርኛ ደንበኞች ድጋፍ
• ሁሉንም ሳብስክሪፕሽኖች በአንድ ቦታ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **የእኛ ስታቲስቲክስ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 10,000+ ደስተኛ ደንበኞች
✅ 50+ የተለያዩ አገልግሎቶች
✅ 99.9% የአገልግሎት ተገኝነት
✅ 24/7 የደንበኞች ድጋፍ

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 **ኩባንያ መረጃ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 **አድራሻ:** አዲስ አበባ፣ ኢትዮጵያ
📧 **ኢሜል:** info@birrpay.com
📱 **ስልክ:** +251-911-123456
🌐 **ድረ-ገጽ:** www.birrpay.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤝 **ተባባሪዎቻችን**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Netflix • Spotify • Amazon Prime • YouTube Premium • Disney+ • HBO Max • Apple Music • Adobe Creative Cloud`
        : `ℹ️ **About BirrPay**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 **Our Vision**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BirrPay aims to be Ethiopia's #1 subscription platform, making global digital services easily accessible and affordable for all Ethiopians.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 **Our Mission**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Pay in Ethiopian Birr without foreign cards
• Secure and fast service delivery
• 24/7 customer support in Amharic
• Manage all subscriptions in one place

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **Our Statistics**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ 10,000+ Happy Customers
✅ 50+ Different Services
✅ 99.9% Service Uptime
✅ 24/7 Customer Support

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏢 **Company Information**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📍 **Address:** Addis Ababa, Ethiopia
📧 **Email:** info@birrpay.com
📱 **Phone:** +251-911-123456
🌐 **Website:** www.birrpay.com

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤝 **Our Partners**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Netflix • Spotify • Amazon Prime • YouTube Premium • Disney+ • HBO Max • Apple Music • Adobe Creative Cloud`;

      await ctx.editMessageText(aboutMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '📞 አግኙን' : '📞 Contact', callback_data: 'contact' }],
            [getBackToMenuButton(lang)]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in about action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Change language button handler
  bot.action("change_language", async (ctx) => {
    try {
      const currentLang = ctx.userLang || 'en';
      
      const languageMessage = currentLang === 'am'
        ? `🌐 **ቋንቋ ቀይር**

እባክዎ የሚፈልጉትን ቋንቋ ይምረጡ:`
        : `🌐 **Change Language**

Please select your preferred language:`;

      await ctx.editMessageText(languageMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '🇺🇸 English', callback_data: 'lang_en' },
              { text: '🇪🇹 አማርኛ', callback_data: 'lang_am' }
            ],
            [getBackToMenuButton(currentLang)]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in change_language action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });

  // Notifications button handler
  bot.action("notifications", async (ctx) => {
    try {
      const lang = ctx.userLang || 'en';
      
      const notificationsMessage = lang === 'am'
        ? `🔔 **ማሳወቂያ ቅንብሮች**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 **የማሳወቂያ አይነቶች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **የክፍያ ማረጋገጫ**
ክፍያዎ ሲረጋገጥ ማሳወቂያ ያገኛሉ

✅ **የሳብስክሪፕሽን ማሳወቂያ**
ሳብስክሪፕሽንዎ ሲጀመር ወይም ሲያልቅ

✅ **የአገልግሎት ዝማኔዎች**
አዳዲስ አገልግሎቶች እና ዋጋ ለውጦች

✅ **የድጋፍ መልሶች**
የደንበኞች ድጋፍ ቡድን መልሶች

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ **ቅንብሮች**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 **ሁሉም ማሳወቂያዎች:** ነቅተዋል
📧 **ኢሜል ማሳወቂያዎች:** ነቅተዋል
📱 **SMS ማሳወቂያዎች:** ጠፍተዋል

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ **መረጃ**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

የማሳወቂያ ቅንብሮችን ለመቀየር የደንበኞች ድጋፍ ያግኙ።`
        : `🔔 **Notification Settings**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 **Notification Types**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ **Payment Confirmations**
Get notified when your payment is confirmed

✅ **Subscription Alerts**
When your subscription starts or expires

✅ **Service Updates**
New services and price changes

✅ **Support Responses**
Customer support team replies

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚙️ **Settings**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 **All Notifications:** Enabled
📧 **Email Notifications:** Enabled
📱 **SMS Notifications:** Disabled

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ℹ️ **Information**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Contact customer support to change notification settings.`;

      await ctx.editMessageText(notificationsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: lang === 'am' ? '💬 ድጋፍ' : '💬 Support', callback_data: 'support' }],
            [getBackToMenuButton(lang)]
          ]
        }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in notifications action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
}
