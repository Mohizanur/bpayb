import { escapeMarkdownV2 } from "../utils/i18n.js";
import { firestore } from "../utils/firestore.js";

export default function startHandler(bot) {
  bot.start(async (ctx) => {
    try {
      const lang = ctx.userLang;
      const title = ctx.i18n.hero_title[lang];
      const subtitle = ctx.i18n.hero_subtitle[lang];

      await ctx.reply(title + "\n\n" + subtitle, {
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
    } catch (error) {
      console.error("Error in start handler:", error);
      await ctx.reply("Welcome! Please try again.");
    }
  });

  bot.action("manage_plans", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const services = ctx.services;
      
      // Create service grid (2 services per row)
      const keyboard = [];
      for (let i = 0; i < services.length; i += 2) {
        const row = [];
        if (services[i]) {
          row.push({
            text: `📱 ${services[i].name}`,
            callback_data: `service_details_${services[i].serviceID}`
          });
        }
        if (services[i + 1]) {
          row.push({
            text: `📱 ${services[i + 1].name}`,
            callback_data: `service_details_${services[i + 1].serviceID}`
          });
        }
        keyboard.push(row);
      }
      
      // Add navigation buttons
      keyboard.push([
        { text: lang === "en" ? "📊 My Subscriptions" : "📊 የእንወ መዋቅሮች", callback_data: "my_subs" },
        { text: lang === "en" ? "❓ FAQ" : "❓ ጥያቄዎች", callback_data: "faq_menu" }
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
  
  // Handle FAQ menu from start
  bot.action("faq_menu", async (ctx) => {
    try {
      const lang = ctx.userLang;
      const faqs = [
        { q: ctx.i18n.faq_1_q[lang], a: ctx.i18n.faq_1_a[lang] },
        { q: ctx.i18n.faq_2_q[lang], a: ctx.i18n.faq_2_a[lang] },
        { q: ctx.i18n.faq_3_q[lang], a: ctx.i18n.faq_3_a[lang] },
        { q: ctx.i18n.faq_4_q[lang], a: ctx.i18n.faq_4_a[lang] },
      ];
      
      const keyboard = faqs.map((f, i) => [
        { text: f.q, callback_data: `faq_${i}` },
      ]);
      
      keyboard.push([
        { text: lang === "en" ? "⬅️ Back to Menu" : "⬅️ ወደ ሜኑ ተመለስ", callback_data: "back_to_start" }
      ]);
      
      await ctx.editMessageText(ctx.i18n.faq_title[lang], {
        reply_markup: { inline_keyboard: keyboard },
      });
      
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in faq_menu action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
  
  // Handle back to start
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
