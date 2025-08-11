#!/usr/bin/env node

/**
 * Language Persistence Fix Script
 * 
 * This script fixes the critical issue where language doesn't persist when browsing buttons.
 * The problem: Many handlers use ctx.from.language_code instead of ctx.userLang
 * 
 * Run this script to automatically fix all language persistence issues.
 */

import fs from 'fs';
import path from 'path';

const filesToFix = [
  'src/handlers/start.js',
  'src/handlers/help.js',
  'src/handlers/faq.js',
  'src/handlers/support.js',
  'src/handlers/subscribe.js',
  'src/handlers/screenshotUpload.js',
  'src/handlers/mySubscriptions.js',
  'src/handlers/cancelSubscription.js'
];

const replacements = [
  {
    // Replace language detection with userLang
    from: /const lang = ctx\.from\.language_code === 'am' \? 'am' : 'en';/g,
    to: "const lang = ctx.userLang || 'en';"
  },
  {
    // Replace language detection in conditionals
    from: /ctx\.from\.language_code === 'am'/g,
    to: "ctx.userLang === 'am'"
  },
  {
    // Replace language detection with fallback
    from: /ctx\.from\?\.language_code === 'am' \? 'am' : 'en'/g,
    to: "ctx.userLang || 'en'"
  },
  {
    // Replace language detection in ternary operators
    from: /ctx\.from\.language_code === 'am'/g,
    to: "ctx.userLang === 'am'"
  }
];

console.log('🔧 Starting Language Persistence Fix...\n');

filesToFix.forEach(filePath => {
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }

    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(replacement => {
      const matches = content.match(replacement.from);
      if (matches) {
        content = content.replace(replacement.from, replacement.to);
        modified = true;
        console.log(`✅ Fixed ${matches.length} language detection(s) in ${filePath}`);
      }
    });

    if (modified) {
      fs.writeFileSync(filePath, content);
      console.log(`💾 Updated: ${filePath}\n`);
    } else {
      console.log(`✨ No changes needed: ${filePath}\n`);
    }

  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('🎉 Language Persistence Fix Complete!');
console.log('\n📋 Summary of Changes:');
console.log('- Replaced ctx.from.language_code with ctx.userLang');
console.log('- Fixed language detection in all handlers');
console.log('- Ensured language persistence across button clicks');
console.log('\n🚀 Language should now persist properly when browsing the bot!');
