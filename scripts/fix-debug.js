const fs = require('fs');
const path = require('path');

const debugPath = path.join(__dirname, '..', 'node_modules', 'debug', 'src', 'node.js');

if (fs.existsSync(debugPath)) {
  try {
    const content = fs.readFileSync(debugPath, 'utf8');
    const newContent = content.replace(
      /require\(['"]\.\/common['"]\)/g,
      'require("debug/src/common")'
    );
    
    if (content !== newContent) {
      fs.writeFileSync(debugPath, newContent);
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
