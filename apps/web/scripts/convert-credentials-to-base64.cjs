/**
 * Convert Google Service Account Credentials to Base64
 *
 * This script converts service account JSON credentials to base64 encoding
 * to fix the OpenSSL "DECODER routines::unsupported" error.
 *
 * Usage:
 *   node apps/web/scripts/convert-credentials-to-base64.cjs
 *
 * The script will:
 * 1. Read the GOOGLE_APPLICATION_CREDENTIALS_JSON from .env.local
 * 2. Convert it to base64
 * 3. Output the base64 value to add to .env.local
 */

const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '../../.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ .env.local file not found at:', envPath);
  console.error('\nPlease create .env.local with your GOOGLE_APPLICATION_CREDENTIALS_JSON value.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Extract the JSON credentials (handle both single and double quotes)
const singleQuoteMatch = envContent.match(/GOOGLE_APPLICATION_CREDENTIALS_JSON='(.+?)'/s);
const doubleQuoteMatch = envContent.match(/GOOGLE_APPLICATION_CREDENTIALS_JSON="(.+?)"/s);

let credentialsJson = null;

if (singleQuoteMatch) {
  credentialsJson = singleQuoteMatch[1];
} else if (doubleQuoteMatch) {
  credentialsJson = doubleQuoteMatch[1];
}

if (!credentialsJson) {
  console.error('❌ Could not find GOOGLE_APPLICATION_CREDENTIALS_JSON in .env.local');
  console.error('\nMake sure your .env.local contains a line like:');
  console.error('GOOGLE_APPLICATION_CREDENTIALS_JSON=\'{"type":"service_account",...}\'');
  process.exit(1);
}

try {
  // Parse and re-stringify to fix any formatting issues
  const credentials = JSON.parse(credentialsJson);

  // Validate the credentials structure
  if (!credentials.type || credentials.type !== 'service_account') {
    console.warn('⚠️  Warning: credentials.type is not "service_account"');
  }

  if (!credentials.private_key) {
    console.error('❌ Error: credentials missing private_key field');
    process.exit(1);
  }

  if (!credentials.project_id) {
    console.warn('⚠️  Warning: credentials missing project_id field');
  }

  // Convert to base64
  const base64 = Buffer.from(JSON.stringify(credentials)).toString('base64');

  console.log('\n✅ Successfully converted credentials to base64!\n');
  console.log('─'.repeat(80));
  console.log('\n📋 Step 1: Add this to your .env.local:\n');
  console.log(`GOOGLE_APPLICATION_CREDENTIALS_BASE64="${base64}"`);
  console.log('\n');
  console.log('─'.repeat(80));
  console.log('\n📋 Step 2: Comment out or remove the old GOOGLE_APPLICATION_CREDENTIALS_JSON line:\n');
  console.log('# GOOGLE_APPLICATION_CREDENTIALS_JSON=\'{"type":"service_account",...}\'');
  console.log('\n');
  console.log('─'.repeat(80));
  console.log('\n✨ Done! Your .env.local should now look like:\n');
  console.log('# Option 1: Base64 encoded (recommended - fixes OpenSSL decoder error)');
  console.log(`GOOGLE_APPLICATION_CREDENTIALS_BASE64="${base64}"`);
  console.log('\n# Option 2: JSON string (disabled - causes OpenSSL error)');
  console.log('# GOOGLE_APPLICATION_CREDENTIALS_JSON=\'{"type":"service_account",...}\'');
  console.log('\n');
  console.log('─'.repeat(80));
  console.log('\n🔄 Step 3: Restart your dev server:\n');
  console.log('pnpm dev');
  console.log('\n');

} catch (error) {
  console.error('❌ Error parsing credentials JSON:', error.message);
  console.error('\nMake sure your GOOGLE_APPLICATION_CREDENTIALS_JSON contains valid JSON.');
  console.error('Common issues:');
  console.error('  - Missing quotes around property names');
  console.error('  - Trailing commas (not valid in JSON)');
  console.error('  - Unescaped special characters');
  process.exit(1);
}
