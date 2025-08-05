export default function faqHandler(bot) {
  bot.command("faq", async (ctx) => {
    try {
      console.log("FAQ command triggered!");
      console.log("User language:", ctx.userLang);
      console.log("i18n available:", !!ctx.i18n);
      
      const lang = ctx.userLang || "en";
      
      // Fallback FAQ data
      const fallbackFaqs = {
        en: {
          title: "❓ Frequently Asked Questions",
          questions: [
            { q: "How do I subscribe to a service?", a: "Use /start to browse services, select one, and follow the subscription instructions." },
            { q: "How do I cancel my subscription?", a: "Use /mysubs to view your subscriptions and click the cancel button." },
            { q: "What payment methods do you accept?", a: "We accept various payment methods including mobile money and bank transfers." },
            { q: "How do I get support?", a: "Use /support to contact our customer service team." }
          ]
        },
        am: {
          title: "❓ በተደጋጋሚ የሚጠየቁ ጥያቄዎች",
          questions: [
            { q: "አገልግሎት እንዴት እመዘገባለሁ?", a: "/start ን ተጠቅመው አገልግሎቶችን ይመልከቱ፣ አንዱን ይምረጡ እና የምዝገባ መመሪያዎችን ይከተሉ።" },
            { q: "ምዝገባዬን እንዴት እሰርዛለሁ?", a: "/mysubs ን ተጠቅመው ምዝገባዎችዎን ይመልከቱ እና የሰርዝ ቁልፍን ይጫኑ።" },
            { q: "ምን አይነት የክፍያ ዘዴዎችን ይቀበላሉ?", a: "የተለያዩ የክፍያ ዘዴዎችን እንቀበላለን፣ የሞባይል ገንዘብ እና የባንክ ዝውውርን ጨምሮ።" },
            { q: "ድጋፍ እንዴት አገኛለሁ?", a: "/support ን ተጠቅመው የደንበኞች አገልግሎት ቡድናችንን ያግኙ።" }
          ]
        }
      };
      
      let faqs, title;
      if (ctx.i18n && ctx.i18n.faq_title && ctx.i18n.faq_1_q) {
        // Use i18n data
        title = ctx.i18n.faq_title[lang] || ctx.i18n.faq_title["en"];
        faqs = [
          { q: ctx.i18n.faq_1_q[lang] || ctx.i18n.faq_1_q["en"], a: ctx.i18n.faq_1_a[lang] || ctx.i18n.faq_1_a["en"] },
          { q: ctx.i18n.faq_2_q[lang] || ctx.i18n.faq_2_q["en"], a: ctx.i18n.faq_2_a[lang] || ctx.i18n.faq_2_a["en"] },
          { q: ctx.i18n.faq_3_q[lang] || ctx.i18n.faq_3_q["en"], a: ctx.i18n.faq_3_a[lang] || ctx.i18n.faq_3_a["en"] },
          { q: ctx.i18n.faq_4_q[lang] || ctx.i18n.faq_4_q["en"], a: ctx.i18n.faq_4_a[lang] || ctx.i18n.faq_4_a["en"] },
        ];
      } else {
        // Use fallback data
        const faqData = fallbackFaqs[lang] || fallbackFaqs["en"];
        title = faqData.title;
        faqs = faqData.questions;
      }
      
      const keyboard = faqs.map((f, i) => [
        { text: f.q, callback_data: `faq_${i}` },
      ]);
      
      console.log("Sending FAQ response...");
      await ctx.reply(title, {
        reply_markup: { inline_keyboard: keyboard },
      });
      console.log("FAQ response sent successfully!");
    } catch (error) {
      console.error("Error in faq handler:", error);
      try {
        await ctx.reply("Sorry, something went wrong. Please try again.");
      } catch (replyError) {
        console.error("Failed to send error message:", replyError);
      }
    }
  });

  bot.action(/faq_(\d+)/, async (ctx) => {
    try {
      const lang = ctx.userLang;
      const idx = Number(ctx.match[1]);
      const answer = ctx.i18n[`faq_${idx + 1}_a`][lang];
      await ctx.reply(answer);
      await ctx.answerCbQuery();
    } catch (error) {
      console.error("Error in faq action:", error);
      await ctx.answerCbQuery("Sorry, something went wrong.");
    }
  });
}
