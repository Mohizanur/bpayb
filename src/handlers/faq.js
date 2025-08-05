export default function faqHandler(bot) {
  bot.command("faq", async (ctx) => {
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
    await ctx.reply(ctx.i18n.faq_title[lang], {
      reply_markup: { inline_keyboard: keyboard },
    });
  });

  bot.action(/faq_(\d+)/, async (ctx) => {
    const lang = ctx.userLang;
    const idx = Number(ctx.match[1]);
    const answer = ctx.i18n[`faq_${idx + 1}_a`][lang];
    await ctx.reply(answer);
    await ctx.answerCbQuery();
  });
}
