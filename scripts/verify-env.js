/**
 * Verify all required environment variables are set
 * Run this script before starting the application in production
 */

const requiredVars = [
  'TELEGRAM_BOT_TOKEN',
  'FIREBASE_CONFIG',
  'PORT',
  'NODE_ENV',
  'ADMIN_USER_IDS'
];

let missingVars = [];

// Check for missing required variables
requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

// Check Firebase config
if (process.env.FIREBASE_CONFIG) {
  try {
    const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
    const requiredFirebaseFields = [
      'type', 'project_id', 'private_key', 'client_email', 'client_id',
      'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 'client_x509_cert_url'
    ];
    
    requiredFirebaseFields.forEach(field => {
      if (!firebaseConfig[field]) {
        missingVars.push(`FIREBASE_CONFIG.${field}`);
      }
    });
  } catch (e) {
    console.error('❌ Error parsing FIREBASE_CONFIG:', e.message);
    process.exit(1);
  }
}

// Handle missing variables
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`  - ${varName}`));
  process.exit(1);
}

console.log('✅ All required environment variables are set');
process.exit(0);
