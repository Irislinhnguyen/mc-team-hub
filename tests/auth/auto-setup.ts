import { chromium, FullConfig } from '@playwright/test';
import path from 'path';
import { existsSync, writeFileSync } from 'fs';

/**
 * Automated auth setup - no user interaction required
 * This creates a minimal auth state file for testing
 */
async function setupAuthAuto() {
  console.log('\n========================================');
  console.log('🔐 AUTO AUTH SETUP (No user interaction needed)');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();

  // Create a minimal auth state for a test user
  const authState = {
    cookies: [
      {
        name: 'sb-access-token',
        value: 'mock-test-token-for-playwright',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      },
      {
        name: 'sb-refresh-token',
        value: 'mock-refresh-token-for-playwright',
        domain: 'localhost',
        path: '/',
        httpOnly: true,
      }
    ],
    origins: [
      {
        origin: 'http://localhost:3000',
        localStorage: [
          {
            name: 'user',
            value: JSON.stringify({
              email: 'testuser@geniee.co.jp',
              name: 'Test User',
              role: 'admin',
              accessLevel: 'admin',
            }),
          },
        ],
      },
    ],
  };

  // Write auth state
  const authDir = path.join(__dirname, 'auth.json');
  writeFileSync(authDir, JSON.stringify(authState, null, 2));

  console.log('✅ Auth state saved to tests/auth/auth.json');
  console.log('✅ Test user configured with admin role');
  console.log('\nYou can now run tests with:');
  console.log('  npm run test -- bible.spec.ts\n');

  await browser.close();
}

setupAuthAuto().catch(error => {
  console.error('\n❌ Auth setup failed:', error);
  process.exit(1);
});
