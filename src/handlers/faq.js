import { firestore } from "../utils/firestore.js";

export default function faqHandler(bot) {
  console.log("❓ Registering enhanced FAQ command handler");
  
  bot.command("faq", async (ctx) => {
    try {
      console.log("🚀 FAQ COMMAND TRIGGERED!");
      console.log("User ID:", ctx.from?.id);
      
      const lang = ctx.from.language_code === 'am' ? 'am' : 'en';
      
      // Enhanced FAQ data with comprehensive questions
      const faqData = {
        en: {
          title: "❓ **Frequently Asked Questions**",
          description: "Find quick answers to common questions about BirrPay:",
          categories: [
            {
              title: "🎯 Getting Started",
              questions: [
                { q: "How do I subscribe to a service?", a: "1. Use /start to browse services\n2. Select your desired service\n3. Choose your plan duration\n4. Make payment using Ethiopian Birr\n5. Upload payment screenshot\n6. Wait for admin approval (usually within 24 hours)" },
                { q: "What services are available?", a: "We offer subscriptions for:\n• Netflix\n• Amazon Prime Video\n• Spotify Premium\n• YouTube Premium\n• Disney+\n• And many more!\n\nUse /start → Services to see all available options." }
              ]
            },
            {
              title: "💰 Payment & Billing",
              questions: [
                { q: "What payment methods do you accept?", a: "We accept various Ethiopian payment methods:\n• TeleBirr\n• Commercial Bank of Ethiopia (CBE)\n• Awash Bank\n• Bank of Abyssinia\n• Other local banks\n\nPayment is made in Ethiopian Birr (ETB)." },
                { q: "How much does it cost?", a: "Pricing varies by service and duration:\n• Monthly plans: Starting from 200 ETB\n• 3-month plans: Get 5% discount\n• 6-month plans: Get 10% discount\n• Annual plans: Get 15% discount\n\nCheck /start → Services for current pricing." }
              ]
            },
            {
              title: "📊 Managing Subscriptions",
              questions: [
                { q: "How do I view my subscriptions?", a: "Use /mysubs command or:\n1. Use /start\n2. Click 'My Subscriptions'\n3. View all your active, pending, and expired subscriptions" },
                { q: "How do I cancel my subscription?", a: "1. Go to /mysubs\n2. Select the subscription you want to cancel\n3. Click 'Cancel Subscription'\n4. Confirm your cancellation\n\nNote: Cancellation takes effect at the end of your current billing period." }
              ]
            },
            {
              title: "🛠️ Support & Help",
              questions: [
                { q: "How do I get support?", a: "Multiple ways to get help:\n• Use /support command\n• Send any message (we'll respond within 24 hours)\n• Email: support@admin.birr-pay.com\n• Available 24/7 in Amharic and English" },
                { q: "How long does approval take?", a: "Subscription approval typically takes:\n• Standard approval: Within 24 hours\n• During business hours: Usually 2-6 hours\n• Weekends/holidays: May take up to 24 hours\n\nYou'll receive a notification once approved!" }
              ]
            }
          ]
        },
        am: {
          title: "❓ **በተደጋጋሚ የሚጠየቁ ጥያቄዎች**",
          description: "ስለ BirrPay የተለመዱ ጥያቄዎችን ፈጣን መልሶችን ያግኙ:",
          categories: [
            {
              title: "🎯 መጀመሪያ",
              questions: [
                { q: "አገልግሎት እንዴት እመዘገባለሁ?", a: "1. /start ን ተጠቅመው አገልግሎቶችን ይመልከቱ\n2. የሚፈልጉትን አገልግሎት ይምረጡ\n3. የእቅድ ጊዜን ይምረጡ\n4. በብር ይክፈሉ\n5. የክፍያ ፎቶ ይላኩ\n6. የአስተዳዳሪ ማጽደቅ ይጠብቁ (አብዛኛውን ጊዜ በ24 ሰዓት ውስጥ)" },
                { q: "ምን አይነት አገልግሎቶች አሉ?", a: "የሚከተሉትን አገልግሎቶች እናቀርባለን:\n• Netflix\n• Amazon Prime Video\n• Spotify Premium\n• YouTube Premium\n• Disney+\n• እና ሌሎች ብዙ!\n\n/start → አገልግሎቶች ተጠቅመው ሁሉንም ይመልከቱ።" }
              ]
            },
            {
              title: "💰 ክፍያ እና ክፍያ",
              questions: [
                { q: "ምን አይነት የክፍያ ዘዴዎችን ይቀበላሉ?", a: "የተለያዩ የኢትዮጵያ የክፍያ ዘዴዎችን እንቀበላለን:\n• TeleBirr\n• የኢትዮጵያ ንግድ ባንክ (CBE)\n• አዋሽ ባንክ\n• የአቢሲኒያ ባንክ\n• ሌሎች የአካባቢ ባንኮች\n\nክፍያ በኢትዮጵያ ብር (ETB) ነው።" },
                { q: "ክፍያው ምን ያህል ነው?", a: "ዋጋ በአገልግሎት እና ጊዜ ይለያያል:\n• ወርሃዊ እቅዶች: ከ200 ብር ጀምሮ\n• 3 ወር እቅዶች: 5% ቅናሽ\n• 6 ወር እቅዶች: 10% ቅናሽ\n• ዓመታዊ እቅዶች: 15% ቅናሽ\n\nየአሁኑን ዋጋ /start → አገልግሎቶች ላይ ይመልከቱ።" }
              ]
            },
            {
              title: "📊 ምዝገባዎችን አስተዳደር",
              questions: [
                { q: "ምዝገባዎቼን እንዴት እመለከታለሁ?", a: "/mysubs ትዕዛዝን ይጠቀሙ ወይም:\n1. /start ን ይጠቀሙ\n2. 'የእኔ ምዝገባዎች' ን ይጫኑ\n3. ሁሉንም ንቁ፣ የሚጠበቁ እና ያለፉ ምዝገባዎችዎን ይመልከቱ" },
                { q: "ምዝገባዬን እንዴት እሰርዛለሁ?", a: "1. ወደ /mysubs ይሂዱ\n2. መሰረዝ የሚፈልጉትን ምዝገባ ይምረጡ\n3. 'ምዝገባ ሰርዝ' ን ይጫኑ\n4. መሰረዝዎን ያረጋግጡ\n\nማስታወሻ: መሰረዝ በአሁኑ የክፍያ ጊዜ መጨረሻ ላይ ይሰራል።" }
              ]
            },
            {
              title: "🛠️ ድጋፍ እና እርዳታ",
              questions: [
                { q: "ድጋፍ እንዴት አገኛለሁ?", a: "ድጋፍ ለማግኘት በርካታ መንገዶች:\n• /support ትዕዛዝ ይጠቀሙ\n• ማንኛውንም መልእክት ይላኩ (በ24 ሰዓት ውስጥ እንመልሳለን)\n• ኢሜይል: support@admin.birr-pay.com\n• 24/7 በአማርኛ እና እንግሊዝኛ ዝግጁ" },
                { q: "ማጽደቅ ምን ያህል ጊዜ ይወስዳል?", a: "የምዝገባ ማጽደቅ አብዛኛውን ጊዜ:\n• መደበኛ ማጽደቅ: በ24 ሰዓት ውስጥ\n• በስራ ሰዓት: አብዛኛውን ጊዜ 2-6 ሰዓት\n• ቅዳሜ/በዓላት: እስከ 24 ሰዓት ሊወስድ ይችላል\n\nከተጸደቀ በኋላ ማሳወቂያ ይደርስዎታል!" }
              ]
            }
          ]
        }
      };

      const currentFaq = faqData[lang] || faqData.en;

      // Create category selection
      const categoryKeyboard = currentFaq.categories.map((category, index) => [
        {
          text: category.title,
          callback_data: `faq_category_${index}`
        }
      ]);

      categoryKeyboard.push([
        {
          text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu',
          callback_data: 'back_to_start'
        }
      ]);

      const faqMessage = `${currentFaq.title}\n\n${currentFaq.description}`;

      await ctx.reply(faqMessage, {
        reply_markup: { inline_keyboard: categoryKeyboard },
        parse_mode: 'Markdown'
      });

      // Log FAQ access
      await firestore.collection('userActivities').add({
        userId: ctx.from.id,
        activity: 'faq_accessed',
        timestamp: new Date(),
        metadata: { command: 'faq', language: lang }
      });

      console.log("FAQ response sent successfully!");
    } catch (error) {
      console.error("Error in faq handler:", error);
      try {
        await ctx.reply(
          ctx.from.language_code === 'am'
            ? "ይቅርታ፣ ችግር ተፈጥሯል። እባክዎ እንደገና ይሞክሩ።"
            : "Sorry, something went wrong. Please try again."
        );
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  });

  // Handle FAQ menu from start menu
  bot.action("faq_menu", async (ctx) => {
    try {
      const lang = ctx.from.language_code === 'am' ? 'am' : 'en';
      
      // Trigger the FAQ command functionality
      ctx.command = { command: 'faq' };
      await ctx.answerCbQuery();
      
      // Use the same FAQ logic but edit message instead
      const faqData = {
        en: {
          title: "❓ **BirrPay FAQ Center**",
          description: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📚 **Knowledge Base**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nFind answers to common questions by selecting a category:",
          categories: [
            { title: "🎯 Getting Started", key: "getting_started" },
            { title: "💰 Payment & Billing", key: "payment" },
            { title: "📊 Managing Subscriptions", key: "subscriptions" },
            { title: "🛠️ Support & Help", key: "support" }
          ]
        },
        am: {
          title: "❓ **BirrPay FAQ ማእከል**",
          description: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n📚 **የእውቀት ጎታ**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nየተለመዱ ጥያቄዎችን መልሶች ለማግኘት ምድብ ይምረጡ:",
          categories: [
            { title: "🎯 መጀመሪያ", key: "getting_started" },
            { title: "💰 ክፍያ እና ሂሳብ", key: "payment" },
            { title: "📊 ምዝገባዎችን አስተዳደር", key: "subscriptions" },
            { title: "🛠️ ድጋፍ እና እርዳታ", key: "support" }
          ]
        }
      };

      const currentFaq = faqData[lang] || faqData.en;

      const categoryKeyboard = currentFaq.categories.map((category, index) => [
        {
          text: category.title,
          callback_data: `faq_category_${index}`
        }
      ]);

      categoryKeyboard.push([
        {
          text: lang === 'am' ? '🔙 ወደ ኋላ' : '🔙 Back',
          callback_data: 'back_to_start'
        }
      ]);

      const faqMessage = `${currentFaq.title}\n\n${currentFaq.description}`;

      await ctx.editMessageText(faqMessage, {
        reply_markup: { inline_keyboard: categoryKeyboard },
        parse_mode: 'Markdown'
      });

    } catch (error) {
      console.error("Error in FAQ menu:", error);
      await ctx.answerCbQuery("Error loading FAQ");
    }
  });

  // Handle FAQ category selection
  bot.action(/faq_category_(\d+)/, async (ctx) => {
    try {
      const lang = ctx.from.language_code === 'am' ? 'am' : 'en';
      const categoryIndex = parseInt(ctx.match[1]);

      // Same FAQ data structure
      const faqData = {
        en: {
          categories: [
            {
              title: "🎯 Getting Started",
              questions: [
                { q: "How do I subscribe to a service?", a: "**Step-by-step process:**\n\n1️⃣ Use /start to browse services\n2️⃣ Select your desired service\n3️⃣ Choose your plan duration\n4️⃣ Make payment using Ethiopian Birr\n5️⃣ Upload payment screenshot\n6️⃣ Wait for admin approval (usually within 24 hours)\n\n✅ You'll receive a confirmation once approved!" },
                { q: "What services are available?", a: "**Available Services:**\n\n🎬 **Streaming:**\n• Netflix\n• Amazon Prime Video\n• Disney+\n• YouTube Premium\n\n🎵 **Music:**\n• Spotify Premium\n• Apple Music\n\n📱 **More services added regularly!**\n\nUse /start → Services to see all current options." }
              ]
            },
            {
              title: "💰 Payment & Billing",
              questions: [
                { q: "What payment methods do you accept?", a: "**Accepted Payment Methods:**\n\n🏦 **Banks:**\n• TeleBirr\n• Commercial Bank of Ethiopia (CBE)\n• Awash Bank\n• Bank of Abyssinia\n• Dashen Bank\n• Other Ethiopian banks\n\n💱 **Currency:** Ethiopian Birr (ETB) only\n\n📱 **Mobile payments preferred for faster processing**" },
                { q: "How much does it cost?", a: "**Pricing Structure:**\n\n⏰ **Monthly:** Starting from 200 ETB\n📅 **3 Months:** 5% discount\n📅 **6 Months:** 10% discount\n📅 **Annual:** 15% discount\n\n💡 **Special offers:**\n• First-time users: 10% off\n• Bundle deals available\n\n💰 Check /start → Services for current pricing" }
              ]
            },
            {
              title: "📊 Managing Subscriptions",
              questions: [
                { q: "How do I view my subscriptions?", a: "**Access Your Subscriptions:**\n\n🎯 **Quick Method:**\n• Use /mysubs command\n\n📱 **Menu Method:**\n1. Use /start\n2. Click 'My Subscriptions'\n3. View all subscriptions:\n   • ✅ Active\n   • ⏳ Pending\n   • ❌ Expired\n   • 🚫 Cancelled" },
                { q: "How do I cancel my subscription?", a: "**Cancellation Process:**\n\n1️⃣ Go to /mysubs\n2️⃣ Select subscription to cancel\n3️⃣ Click 'Cancel Subscription'\n4️⃣ Confirm cancellation\n\n⚠️ **Important:**\n• Cancellation takes effect at billing period end\n• No refunds for partial periods\n• You keep access until expiration" }
              ]
            },
            {
              title: "🛠️ Support & Help",
              questions: [
                { q: "How do I get support?", a: "**Multiple Support Channels:**\n\n💬 **Telegram:**\n• Use /support command\n• Send any message directly\n\n📧 **Email:**\n• support@admin.birr-pay.com\n\n🕐 **Response Time:**\n• Usually within 24 hours\n• Faster during business hours\n\n🌐 **Languages:** Amharic & English" },
                { q: "How long does approval take?", a: "**Approval Timeline:**\n\n⚡ **Business Hours:**\n• 2-6 hours typical\n• Monday-Friday: 9 AM - 6 PM\n\n🌙 **After Hours/Weekends:**\n• Up to 24 hours\n\n📱 **You'll receive notification:**\n• Telegram message\n• Status update in /mysubs\n\n🚀 **Factors affecting speed:**\n• Clear payment screenshot\n• Complete information\n• Payment verification" }
              ]
            }
          ]
        },
        am: {
          categories: [
            {
              title: "🎯 መጀመሪያ",
              questions: [
                { q: "አገልግሎት እንዴት እመዘገባለሁ?", a: "**ሂደት በደረጃ:**\n\n1️⃣ /start ን ተጠቅመው አገልግሎቶችን ይመልከቱ\n2️⃣ የሚፈልጉትን አገልግሎት ይምረጡ\n3️⃣ የእቅድ ጊዜን ይምረጡ\n4️⃣ በኢትዮጵያ ብር ይክፈሉ\n5️⃣ የክፍያ ፎቶ ይላኩ\n6️⃣ የአስተዳዳሪ ማጽደቅ ይጠብቁ (አብዛኛውን ጊዜ በ24 ሰዓት ውስጥ)\n\n✅ ከተጸደቀ በኋላ ማረጋገጫ ይደርስዎታል!" },
                { q: "ምን አይነት አገልግሎቶች አሉ?", a: "**ያሉ አገልግሎቶች:**\n\n🎬 **ስትሪሚንግ:**\n• Netflix\n• Amazon Prime Video\n• Disney+\n• YouTube Premium\n\n🎵 **ሙዚቃ:**\n• Spotify Premium\n• Apple Music\n\n📱 **ተጨማሪ አገልግሎቶች በመደበኛነት ይጨመራሉ!**\n\n/start → አገልግሎቶች ተጠቅመው ሁሉንም ይመልከቱ።" }
              ]
            },
            {
              title: "💰 ክፍያ እና ሂሳብ",
              questions: [
                { q: "ምን አይነት የክፍያ ዘዴዎችን ይቀበላሉ?", a: "**የተቀበሉ የክፍያ ዘዴዎች:**\n\n🏦 **ባንኮች:**\n• TeleBirr\n• የኢትዮጵያ ንግድ ባንክ (CBE)\n• አዋሽ ባንክ\n• የአቢሲኒያ ባንክ\n• ዳሽን ባንክ\n• ሌሎች የኢትዮጵያ ባንኮች\n\n💱 **ምንዛሬ:** የኢትዮጵያ ብር (ETB) ብቻ\n\n📱 **የሞባይል ክፍያዎች ለፈጣን ሂደት ይመረጣሉ**" },
                { q: "ክፍያው ምን ያህል ነው?", a: "**የዋጋ አወቃቀር:**\n\n⏰ **ወርሃዊ:** ከ200 ብር ጀምሮ\n📅 **3 ወር:** 5% ቅናሽ\n📅 **6 ወር:** 10% ቅናሽ\n📅 **ዓመታዊ:** 15% ቅናሽ\n\n💡 **ልዩ ቅናሾች:**\n• የመጀመሪያ ጊዜ ተጠቃሚዎች: 10% ቅናሽ\n• የጥቅል ስምምነቶች አሉ\n\n💰 /start → አገልግሎቶች ላይ የአሁኑን ዋጋ ይመልከቱ" }
              ]
            },
            {
              title: "📊 ምዝገባዎችን አስተዳደር",
              questions: [
                { q: "ምዝገባዎቼን እንዴት እመለከታለሁ?", a: "**ምዝገባዎችዎን ይድረሱ:**\n\n🎯 **ፈጣን ዘዴ:**\n• /mysubs ትዕዛዝ ይጠቀሙ\n\n📱 **ምንዩ ዘዴ:**\n1. /start ን ይጠቀሙ\n2. 'የእኔ ምዝገባዎች' ይጫኑ\n3. ሁሉንም ምዝገባዎች ይመልከቱ:\n   • ✅ ንቁ\n   • ⏳ የሚጠበቅ\n   • ❌ ያለፈ\n   • 🚫 የተሰረዘ" },
                { q: "ምዝገባዬን እንዴት እሰርዛለሁ?", a: "**የመሰረዝ ሂደት:**\n\n1️⃣ ወደ /mysubs ይሂዱ\n2️⃣ መሰረዝ የሚፈልጉትን ምዝገባ ይምረጡ\n3️⃣ 'ምዝገባ ሰርዝ' ን ይጫኑ\n4️⃣ መሰረዝን ያረጋግጡ\n\n⚠️ **አስፈላጊ:**\n• መሰረዝ በክፍያ ጊዜ መጨረሻ ላይ ይሰራል\n• ለከፊል ጊዜ ምንም ተመላሽ የለም\n• እስከ ማብቂያው ድረስ መዳረሻ ያስቀምጣሉ" }
              ]
            },
            {
              title: "🛠️ ድጋፍ እና እርዳታ",
              questions: [
                { q: "ድጋፍ እንዴት አገኛለሁ?", a: "**በርካታ የድጋፍ መንገዶች:**\n\n💬 **ቴሌግራም:**\n• /support ትዕዛዝ ይጠቀሙ\n• ማንኛውንም መልእክት በቀጥታ ይላኩ\n\n📧 **ኢሜይል:**\n• support@admin.birr-pay.com\n\n🕐 **የምላሽ ጊዜ:**\n• አብዛኛውን ጊዜ በ24 ሰዓት ውስጥ\n• በስራ ሰዓት ፈጣን\n\n🌐 **ቋንቋዎች:** አማርኛ እና እንግሊዝኛ" },
                { q: "ማጽደቅ ምን ያህል ጊዜ ይወስዳል?", a: "**የማጽደቅ የጊዜ ሰሌዳ:**\n\n⚡ **የስራ ሰዓት:**\n• 2-6 ሰዓት ተለምዷዊ\n• ሰኞ-አርብ: ከጠዋቱ 9 - ከምሽቱ 6\n\n🌙 **ከሰዓት በኋላ/ቅዳሜ:**\n• እስከ 24 ሰዓት\n\n📱 **ማሳወቂያ ይደርስዎታል:**\n• የቴሌግራም መልእክት\n• በ/mysubs ውስጥ የሁኔታ ዝማኔ\n\n🚀 **ፍጥነትን የሚነኩ ነገሮች:**\n• ግልጽ የክፍያ ፎቶ\n• ሙሉ መረጃ\n• የክፍያ ማረጋገጫ" }
              ]
            }
          ]
        }
      };

      const currentCategory = (faqData[lang] || faqData.en).categories[categoryIndex];
      
      if (!currentCategory) {
        await ctx.answerCbQuery("Category not found");
        return;
      }

      // Create question buttons
      const questionKeyboard = currentCategory.questions.map((question, index) => [
        {
          text: question.q,
          callback_data: `faq_answer_${categoryIndex}_${index}`
        }
      ]);

      questionKeyboard.push([
        {
          text: lang === 'am' ? '🔙 ወደ ጥያቄዎች' : '🔙 Back to Questions',
          callback_data: 'faq_menu'
        }
      ]);

      const categoryMessage = `${currentCategory.title}\n\n${lang === 'am' ? 'ጥያቄ ይምረጡ:' : 'Select a question:'}`;

      await ctx.editMessageText(categoryMessage, {
        reply_markup: { inline_keyboard: questionKeyboard },
        parse_mode: 'Markdown'
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error("Error in FAQ category:", error);
      await ctx.answerCbQuery("Error loading category");
    }
  });

  // Handle FAQ answer display
  bot.action(/faq_answer_(\d+)_(\d+)/, async (ctx) => {
    try {
      const lang = ctx.from.language_code === 'am' ? 'am' : 'en';
      const categoryIndex = parseInt(ctx.match[1]);
      const questionIndex = parseInt(ctx.match[2]);

      const faqData = {
        en: {
          categories: [
            {
              title: "🎯 Getting Started",
              questions: [
                { q: "How do I subscribe to a service?", a: "**Step-by-step process:**\n\n1️⃣ Use /start to browse services\n2️⃣ Select your desired service\n3️⃣ Choose your plan duration\n4️⃣ Make payment using Ethiopian Birr\n5️⃣ Upload payment screenshot\n6️⃣ Wait for admin approval (usually within 24 hours)\n\n✅ You'll receive a confirmation once approved!" },
                { q: "What services are available?", a: "**Available Services:**\n\n🎬 **Streaming:**\n• Netflix\n• Amazon Prime Video\n• Disney+\n• YouTube Premium\n\n🎵 **Music:**\n• Spotify Premium\n• Apple Music\n\n📱 **More services added regularly!**\n\nUse /start → Services to see all current options." }
              ]
            },
            {
              title: "💰 Payment & Billing",
              questions: [
                { q: "What payment methods do you accept?", a: "**Accepted Payment Methods:**\n\n🏦 **Banks:**\n• TeleBirr\n• Commercial Bank of Ethiopia (CBE)\n• Awash Bank\n• Bank of Abyssinia\n• Dashen Bank\n• Other Ethiopian banks\n\n💱 **Currency:** Ethiopian Birr (ETB) only\n\n📱 **Mobile payments preferred for faster processing**" },
                { q: "How much does it cost?", a: "**Pricing Structure:**\n\n⏰ **Monthly:** Starting from 200 ETB\n📅 **3 Months:** 5% discount\n📅 **6 Months:** 10% discount\n📅 **Annual:** 15% discount\n\n💡 **Special offers:**\n• First-time users: 10% off\n• Bundle deals available\n\n💰 Check /start → Services for current pricing" }
              ]
            },
            {
              title: "📊 Managing Subscriptions",
              questions: [
                { q: "How do I view my subscriptions?", a: "**Access Your Subscriptions:**\n\n🎯 **Quick Method:**\n• Use /mysubs command\n\n📱 **Menu Method:**\n1. Use /start\n2. Click 'My Subscriptions'\n3. View all subscriptions:\n   • ✅ Active\n   • ⏳ Pending\n   • ❌ Expired\n   • 🚫 Cancelled" },
                { q: "How do I cancel my subscription?", a: "**Cancellation Process:**\n\n1️⃣ Go to /mysubs\n2️⃣ Select subscription to cancel\n3️⃣ Click 'Cancel Subscription'\n4️⃣ Confirm cancellation\n\n⚠️ **Important:**\n• Cancellation takes effect at billing period end\n• No refunds for partial periods\n• You keep access until expiration" }
              ]
            },
            {
              title: "🛠️ Support & Help",
              questions: [
                { q: "How do I get support?", a: "**Multiple Support Channels:**\n\n💬 **Telegram:**\n• Use /support command\n• Send any message directly\n\n📧 **Email:**\n• support@admin.birr-pay.com\n\n🕐 **Response Time:**\n• Usually within 24 hours\n• Faster during business hours\n\n🌐 **Languages:** Amharic & English" },
                { q: "How long does approval take?", a: "**Approval Timeline:**\n\n⚡ **Business Hours:**\n• 2-6 hours typical\n• Monday-Friday: 9 AM - 6 PM\n\n🌙 **After Hours/Weekends:**\n• Up to 24 hours\n\n📱 **You'll receive notification:**\n• Telegram message\n• Status update in /mysubs\n\n🚀 **Factors affecting speed:**\n• Clear payment screenshot\n• Complete information\n• Payment verification" }
              ]
            }
          ]
        },
        am: {
          categories: [
            {
              title: "🎯 መጀመሪያ",
              questions: [
                { q: "አገልግሎት እንዴት እመዘገባለሁ?", a: "**ሂደት በደረጃ:**\n\n1️⃣ /start ን ተጠቅመው አገልግሎቶችን ይመልከቱ\n2️⃣ የሚፈልጉትን አገልግሎት ይምረጡ\n3️⃣ የእቅድ ጊዜን ይምረጡ\n4️⃣ በኢትዮጵያ ብር ይክፈሉ\n5️⃣ የክፍያ ፎቶ ይላኩ\n6️⃣ የአስተዳዳሪ ማጽደቅ ይጠብቁ (አብዛኛውን ጊዜ በ24 ሰዓት ውስጥ)\n\n✅ ከተጸደቀ በኋላ ማረጋገጫ ይደርስዎታል!" },
                { q: "ምን አይነት አገልግሎቶች አሉ?", a: "**ያሉ አገልግሎቶች:**\n\n🎬 **ስትሪሚንግ:**\n• Netflix\n• Amazon Prime Video\n• Disney+\n• YouTube Premium\n\n🎵 **ሙዚቃ:**\n• Spotify Premium\n• Apple Music\n\n📱 **ተጨማሪ አገልግሎቶች በመደበኛነት ይጨመራሉ!**\n\n/start → አገልግሎቶች ተጠቅመው ሁሉንም ይመልከቱ።" }
              ]
            },
            {
              title: "💰 ክፍያ እና ሂሳብ",
              questions: [
                { q: "ምን አይነት የክፍያ ዘዴዎችን ይቀበላሉ?", a: "**የተቀበሉ የክፍያ ዘዴዎች:**\n\n🏦 **ባንኮች:**\n• TeleBirr\n• የኢትዮጵያ ንግድ ባንክ (CBE)\n• አዋሽ ባንክ\n• የአቢሲኒያ ባንክ\n• ዳሽን ባንክ\n• ሌሎች የኢትዮጵያ ባንኮች\n\n💱 **ምንዛሬ:** የኢትዮጵያ ብር (ETB) ብቻ\n\n📱 **የሞባይል ክፍያዎች ለፈጣን ሂደት ይመረጣሉ**" },
                { q: "ክፍያው ምን ያህል ነው?", a: "**የዋጋ አወቃቀር:**\n\n⏰ **ወርሃዊ:** ከ200 ብር ጀምሮ\n📅 **3 ወር:** 5% ቅናሽ\n📅 **6 ወር:** 10% ቅናሽ\n📅 **ዓመታዊ:** 15% ቅናሽ\n\n💡 **ልዩ ቅናሾች:**\n• የመጀመሪያ ጊዜ ተጠቃሚዎች: 10% ቅናሽ\n• የጥቅል ስምምነቶች አሉ\n\n💰 /start → አገልግሎቶች ላይ የአሁኑን ዋጋ ይመልከቱ" }
              ]
            },
            {
              title: "📊 ምዝገባዎችን አስተዳደር",
              questions: [
                { q: "ምዝገባዎቼን እንዴት እመለከታለሁ?", a: "**ምዝገባዎችዎን ይድረሱ:**\n\n🎯 **ፈጣን ዘዴ:**\n• /mysubs ትዕዛዝ ይጠቀሙ\n\n📱 **ምንዩ ዘዴ:**\n1. /start ን ይጠቀሙ\n2. 'የእኔ ምዝገባዎች' ይጫኑ\n3. ሁሉንም ምዝገባዎች ይመልከቱ:\n   • ✅ ንቁ\n   • ⏳ የሚጠበቅ\n   • ❌ ያለፈ\n   • 🚫 የተሰረዘ" },
                { q: "ምዝገባዬን እንዴት እሰርዛለሁ?", a: "**የመሰረዝ ሂደት:**\n\n1️⃣ ወደ /mysubs ይሂዱ\n2️⃣ መሰረዝ የሚፈልጉትን ምዝገባ ይምረጡ\n3️⃣ 'ምዝገባ ሰርዝ' ን ይጫኑ\n4️⃣ መሰረዝን ያረጋግጡ\n\n⚠️ **አስፈላጊ:**\n• መሰረዝ በክፍያ ጊዜ መጨረሻ ላይ ይሰራል\n• ለከፊል ጊዜ ምንም ተመላሽ የለም\n• እስከ ማብቂያው ድረስ መዳረሻ ያስቀምጣሉ" }
              ]
            },
            {
              title: "🛠️ ድጋፍ እና እርዳታ",
              questions: [
                { q: "ድጋፍ እንዴት አገኛለሁ?", a: "**በርካታ የድጋፍ መንገዶች:**\n\n💬 **ቴሌግራም:**\n• /support ትዕዛዝ ይጠቀሙ\n• ማንኛውንም መልእክት በቀጥታ ይላኩ\n\n📧 **ኢሜይል:**\n• support@admin.birr-pay.com\n\n🕐 **የምላሽ ጊዜ:**\n• አብዛኛውን ጊዜ በ24 ሰዓት ውስጥ\n• በስራ ሰዓት ፈጣን\n\n🌐 **ቋንቋዎች:** አማርኛ እና እንግሊዝኛ" },
                { q: "ማጽደቅ ምን ያህል ጊዜ ይወስዳል?", a: "**የማጽደቅ የጊዜ ሰሌዳ:**\n\n⚡ **የስራ ሰዓት:**\n• 2-6 ሰዓት ተለምዷዊ\n• ሰኞ-አርብ: ከጠዋቱ 9 - ከምሽቱ 6\n\n🌙 **ከሰዓት በኋላ/ቅዳሜ:**\n• እስከ 24 ሰዓት\n\n📱 **ማሳወቂያ ይደርስዎታል:**\n• የቴሌግራም መልእክት\n• በ/mysubs ውስጥ የሁኔታ ዝማኔ\n\n🚀 **ፍጥነትን የሚነኩ ነገሮች:**\n• ግልጽ የክፍያ ፎቶ\n• ሙሉ መረጃ\n• የክፍያ ማረጋገጫ" }
              ]
            }
          ]
        }
      };

      const question = (faqData[lang] || faqData.en).categories[categoryIndex]?.questions[questionIndex];
      
      if (!question) {
        await ctx.answerCbQuery("Question not found");
        return;
      }

      const answerMessage = `❓ **${question.q}**\n\n${question.a}`;

      const answerKeyboard = [
        [
          {
            text: lang === 'am' ? '🔙 ወደ ጥያቄዎች' : '🔙 Back to Questions',
            callback_data: `faq_category_${categoryIndex}`
          }
        ],
        [
          {
            text: lang === 'am' ? '🛠️ ተጨማሪ እርዳታ' : '🛠️ Need More Help?',
            callback_data: 'support_menu'
          }
        ],
        [
          {
            text: lang === 'am' ? '🏠 ዋና ምንዩ' : '🏠 Main Menu',
            callback_data: 'back_to_start'
          }
        ]
      ];

      await ctx.editMessageText(answerMessage, {
        reply_markup: { inline_keyboard: answerKeyboard },
        parse_mode: 'Markdown'
      });

      // Log FAQ answer view
      await firestore.collection('userActivities').add({
        userId: ctx.from.id,
        activity: 'faq_answer_viewed',
        timestamp: new Date(),
        metadata: { 
          category: categoryIndex, 
          question: questionIndex,
          language: lang 
        }
      });

      await ctx.answerCbQuery();

    } catch (error) {
      console.error("Error showing FAQ answer:", error);
      await ctx.answerCbQuery("Error loading answer");
    }
  });
}
