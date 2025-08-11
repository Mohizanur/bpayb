#!/usr/bin/env node

/**
 * 🔍 COMPREHENSIVE LANGUAGE PERSISTENCE DIAGNOSTIC TOOL
 * 
 * This script will identify ALL places where language detection might be failing
 * and causing the bot to revert to English after browsing.
 */

import fs from 'fs/promises';
import path from 'path';

const SEARCH_PATTERNS = [
  // Direct language code usage
  { pattern: /ctx\.from\.language_code/g, issue: "Using Telegram default language instead of user selection" },
  
  // Hardcoded language fallbacks
  { pattern: /\|\|\s*['"]en['"]/g, issue: "Hardcoded English fallback" },
  { pattern: /===\s*['"]en['"]/g, issue: "Hardcoded English comparison" },
  { pattern: /!==\s*['"]en['"]/g, issue: "Hardcoded English comparison" },
  
  // Missing ctx.userLang usage
  { pattern: /const\s+lang\s*=\s*['"]en['"]/g, issue: "Hardcoded English language variable" },
  { pattern: /let\s+lang\s*=\s*['"]en['"]/g, issue: "Hardcoded English language variable" },
  
  // Potential language context issues
  { pattern: /language\s*:\s*ctx\.from\.language_code/g, issue: "Saving Telegram language instead of user selection" },
  { pattern: /language\s*:\s*['"]en['"]/g, issue: "Hardcoded English in data structure" },
  
  // Missing userLang checks
  { pattern: /bot\.action\([^)]+,\s*async\s*\(ctx\)\s*=>\s*{[^}]*(?!ctx\.userLang)/g, issue: "Action handler missing ctx.userLang usage" }
];

async function scanFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const issues = [];
    
    SEARCH_PATTERNS.forEach(({ pattern, issue }) => {
      const matches = [...content.matchAll(pattern)];
      matches.forEach(match => {
        const lines = content.substring(0, match.index).split('\n');
        const lineNumber = lines.length;
        const lineContent = lines[lineNumber - 1].trim();
        
        issues.push({
          file: filePath,
          line: lineNumber,
          issue,
          code: lineContent,
          match: match[0]
        });
      });
    });
    
    return issues;
  } catch (error) {
    console.error(`Error scanning ${filePath}:`, error.message);
    return [];
  }
}

async function scanDirectory(dirPath) {
  const allIssues = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subIssues = await scanDirectory(fullPath);
        allIssues.push(...subIssues);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        const fileIssues = await scanFile(fullPath);
        allIssues.push(...fileIssues);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error.message);
  }
  
  return allIssues;
}

async function main() {
  console.log('🔍 SCANNING FOR LANGUAGE PERSISTENCE ISSUES...\n');
  
  const srcPath = './src';
  const allIssues = await scanDirectory(srcPath);
  
  if (allIssues.length === 0) {
    console.log('✅ NO LANGUAGE PERSISTENCE ISSUES FOUND!');
    return;
  }
  
  console.log(`❌ FOUND ${allIssues.length} POTENTIAL LANGUAGE ISSUES:\n`);
  
  // Group issues by file
  const issuesByFile = {};
  allIssues.forEach(issue => {
    if (!issuesByFile[issue.file]) {
      issuesByFile[issue.file] = [];
    }
    issuesByFile[issue.file].push(issue);
  });
  
  // Display issues grouped by file
  Object.entries(issuesByFile).forEach(([file, issues]) => {
    console.log(`📁 ${file}`);
    issues.forEach(issue => {
      console.log(`   Line ${issue.line}: ${issue.issue}`);
      console.log(`   Code: ${issue.code}`);
      console.log(`   Match: "${issue.match}"`);
      console.log('');
    });
    console.log('─'.repeat(80));
  });
  
  // Generate fix suggestions
  console.log('\n🔧 RECOMMENDED FIXES:\n');
  
  const fixSuggestions = [
    '1. Replace all "ctx.from.language_code" with "ctx.userLang"',
    '2. Replace hardcoded "en" fallbacks with "ctx.userLang || \'en\'"',
    '3. Ensure all action handlers use "const lang = ctx.userLang || \'en\';"',
    '4. Check that middleware sets ctx.userLang BEFORE all handlers',
    '5. Verify language cache is working correctly',
    '6. Add logging to track language context in problematic handlers'
  ];
  
  fixSuggestions.forEach(suggestion => {
    console.log(`   ${suggestion}`);
  });
  
  console.log('\n🎯 CRITICAL AREAS TO CHECK:');
  console.log('   - Action handlers that don\'t use ctx.userLang');
  console.log('   - User profile creation/update functions');
  console.log('   - Menu generation functions');
  console.log('   - Error message handlers');
  console.log('   - Middleware execution order');
}

main().catch(console.error);
