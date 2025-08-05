export default function faqHandler(bot) {
  bot.command("faq", async (ctx) => {
    try {
      console.log("FAQ command triggered!");
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
      console.log("Sending FAQ response...");
      await ctx.reply(ctx.i18n.faq_title[lang], {
        reply_markup: { inline_keyboard: keyboard },
      });
      console.log("FAQ response sent successfully!");
    } catch (error) {
      console.error("Error in faq handler:", error);
      await ctx.reply("Sorry, something went wrong. Please try again.");
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
