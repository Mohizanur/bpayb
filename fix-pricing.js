import fs from 'fs';

console.log('🔧 Finding and fixing pricing content...');

// Search through all JS files for pricing content
const files = [
  'complete-admin-bot.js',
  'src/utils/menuContent.js',
  'src/handlers/services.js',
  'src/handlers/start.js'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`Checking ${file}...`);
    let content = fs.readFileSync(file, 'utf8');
    
    // Check if file contains pricing content
    if (content.includes('Netflix') || content.includes('350 ETB') || content.includes('Discount Benefits')) {
      console.log(`Found pricing content in ${file}`);
      
      // Replace hardcoded content with translatable versions
      content = content.replace(
        /text: '🚀 Services'/g,
        "text: t('services', lang)"
      );
      
      content = content.replace(
        /text: '🔙 Back to Menu'/g,
        "text: t('back_to_menu', lang)"
      );
      
      // Replace pricing text patterns
      content = content.replace(
        /Discount Benefits/g,
        '${t("discount_benefits", lang)}'
      );
      
      content = content.replace(
        /Choose longer plans and save money/g,
        '${t("choose_longer_plans", lang)}'
      );
      
      content = content.replace(
        /All payments in Ethiopian Birr/g,
        '${t("all_payments_birr", lang)}'
      );
      
      content = content.replace(
        /No hidden fees/g,
        '${t("no_hidden_fees", lang)}'
      );
      
      content = content.replace(
        /Cancel anytime/g,
        '${t("cancel_anytime", lang)}'
      );
      
      fs.writeFileSync(file, content);
      console.log(`✅ Fixed pricing content in ${file}`);
    }
  }
});

// Add missing translation keys
let translationsContent = fs.readFileSync('src/utils/translations.js', 'utf8');

const newTranslations = `
  // Pricing content
  services: { en: "🚀 Services", am: "🚀 አገልግሎቶች" },
  discount_benefits: { en: "Discount Benefits", am: "የቁጠባ ጥቅሞች" },
  choose_longer_plans: { en: "Choose longer plans and save money", am: "የተራ ዕቅዶችን ይምረጡ እና ገንዘብ ያስቀምጡ" },
  all_payments_birr: { en: "All payments in Ethiopian Birr", am: "ሁሉም ክፍያዎች በኢትዮጵያ ብር" },
  no_hidden_fees: { en: "No hidden fees", am: "ምንም የተደበቁ ክፍያዎች የሉም" },
  cancel_anytime: { en: "Cancel anytime", am: "በማንኛውም ጊዜ ሰርዝ" }
`;

// Insert new translations before the closing brace
const insertIndex = translationsContent.lastIndexOf('};');
if (insertIndex !== -1) {
  translationsContent = translationsContent.slice(0, insertIndex) + newTranslations + translationsContent.slice(insertIndex);
  fs.writeFileSync('src/utils/translations.js', translationsContent);
  console.log('✅ Added pricing translation keys');
}

console.log('🎉 Pricing content should now be translatable!');



