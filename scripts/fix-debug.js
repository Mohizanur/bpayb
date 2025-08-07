import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const debugPath = join(__dirname, '..', 'node_modules', 'debug', 'src', 'node.js');

if (existsSync(debugPath)) {
  try {
    const content = readFileSync(debugPath, 'utf8');
    const newContent = content.replace(
      /require\(['"]\.\/common['"]\)/g,
      'require("debug/src/common")'
    );
    
    if (content !== newContent) {
      writeFileSync(debugPath, newContent);
      console.log('✅ Fixed debug module require path');
    } else {
      console.log('ℹ️ No changes needed for debug module');
    }
  } catch (error) {
    console.error('❌ Error fixing debug module:', error.message);
    process.exit(1);
  }
} else {
  console.log('ℹ️ debug module not found, skipping fix');
}
