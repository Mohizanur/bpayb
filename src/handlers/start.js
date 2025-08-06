import { escapeMarkdownV2 } from "../utils/i18n.js";
import { firestore } from "../utils/firestore.js";
import { loadServices } from "../utils/loadServices.js";

export default function startHandler(bot) {
  bot.start(async (ctx) => {
    try {
      // Save/update user info in Firestore on every /start
      await firestore.collection('users').doc(String(ctx.from.id)).set({
        telegramId: ctx.from.id,
        firstName: ctx.from.first_name,
        lastName: ctx.from.last_name || '',
        username: ctx.from.username || '',
        language: ctx.from.language_code || 'en',
        updatedAt: new Date(),
        createdAt: new Date()
      }, { merge: true });
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

      await ctx.reply(`${title}\n\n${subtitle}\n\n${lang === "en" ? "Choose an option below:" : "ከታች አንዱን ይምረጡ:"}`, {
        reply_markup: { inline_keyboard: keyboard }
      });
    } catch (error) {
      console.error("Error in start handler:", error);
      await ctx.reply("Welcome! Please try again.");
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
  
  // Handle my subscriptions from start menu
  bot.action("my_subs", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const userID = ctx.from.id;
      
      const subsSnap = await firestore
        .collection("subscriptions")
        .where("telegramUserID", "==", userID)
        .where("status", "==", "active")
        .get();
        
      if (subsSnap.empty) {
        const noSubsMsg = ctx.i18n.no_active_subs[lang];
        await ctx.editMessageText(noSubsMsg, {
          reply_markup: {
            inline_keyboard: [
              [{ text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }]
            ]
          }
        });
        await ctx.answerCbQuery();
        return;
      }
      
      const services = ctx.services;
      const title = ctx.i18n.active_subs_title[lang];
      let msg = `${title}\n\n`;
      const keyboard = [];
      
      subsSnap.forEach((doc) => {
        const sub = doc.data();
        const service = services.find((s) => s.serviceID === sub.serviceID);
        const serviceName = service ? service.name : sub.serviceID;
        const nextBilling = sub.nextBillingDate || "N/A";
        const price = service ? service.price : "N/A";
        
        msg += `📱 ${serviceName}\n`;
        msg += `💰 ${price} Birr/month\n`;
        msg += `📅 Next billing: ${nextBilling}\n\n`;
        
        keyboard.push([{
          text: `❌ Cancel ${serviceName}`,
          callback_data: `cancel_sub_${doc.id}`
        }]);
      });
      
      keyboard.push([
        { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
      ]);
      
      await ctx.editMessageText(msg, {
        reply_markup: { inline_keyboard: keyboard }
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in my_subs action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
  
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

      await ctx.editMessageText(`${title}\n\n${subtitle}\n\n${lang === "en" ? "Choose an option below:" : "ከታች አንዱን ይምረጡ:"}`, {
        reply_markup: { inline_keyboard: keyboard }
      });
      await ctx.answerCbQuery();
    } catch (error) {
      console.error('Error in start action:', error);
      await ctx.answerCbQuery();
    }
  });

  bot.action("back_to_start", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const title = ctx.i18n.hero_title[lang];
      const subtitle = ctx.i18n.hero_subtitle[lang];

      await ctx.editMessageText(title + "\n\n" + subtitle, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: lang === "en" ? "Manage Plans" : "የአገልግሎት እቅዶች",
                callback_data: "manage_plans",
              },
            ],
            [
              {
                text: lang === "en" ? "Support" : "ድጋፍ",
                callback_data: "support",
              },
            ],
          ],
        },
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in back_to_start action:", error);
      await ctx.answerCbQuery();
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
}
