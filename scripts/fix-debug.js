import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const debugPath = join(__dirname, '..', 'node_modules', 'debug', 'src');
const nodeJsPath = join(debugPath, 'node.js');
const commonJsPath = join(debugPath, 'common.js');

// Create a simple common.js file if it doesn't exist
const createCommonJs = () => {
  const commonJsContent = `module.exports = require('debug');
// This is a shim to fix the debug module in production`;
  
  try {
    if (!existsSync(commonJsPath)) {
      writeFileSync(commonJsPath, commonJsContent, 'utf8');
      console.log('✅ Created debug/common.js shim');
    }
  } catch (error) {
    console.error('❌ Error creating debug/common.js:', error.message);
  }
};

// Patch node.js to use the correct require path
const patchNodeJs = () => {
  try {
    if (existsSync(nodeJsPath)) {
      const content = readFileSync(nodeJsPath, 'utf8');
      const newContent = content
        .replace(
          /require\(['"]\.\/common['"]\)/g,
          'require(\'debug/src/common\')'
        )
        .replace(
          /require\(['"]\.\/common\.js['"]\)/g,
          'require(\'debug/src/common\')'
        );
      
      if (content !== newContent) {
        writeFileSync(nodeJsPath, newContent, 'utf8');
        console.log('✅ Patched debug/node.js require paths');
      }
    }
  } catch (error) {
    console.error('❌ Error patching debug/node.js:', error.message);
  }
};

// Main function
const main = () => {
  console.log('🔧 Checking debug module...');
  
  if (!existsSync(debugPath)) {
    console.log('ℹ️ debug module not found, skipping fix');
    return;
  }
  
  // Create the common.js shim
  createCommonJs();
  
  // Patch the node.js file
  patchNodeJs();
  
  console.log('✅ Debug module fixes applied successfully');
};

// Run the main function
main();
