import { chromium, FullConfig } from '@playwright/test';

/**
 * Setup script to capture authenticated browser state
 *
 * Usage: npx playwright test tests/auth/setup.ts --config=playwright.config.ts
 *
 * This will:
 * 1. Open a browser window
 * 2. Let you log in manually
 * 3. Save the auth state to tests/auth/auth.json
 * 4. All subsequent tests will use this saved session
 */

async function setupAuth(config: FullConfig) {
  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n========================================');
  console.log('🔐 AUTH SETUP');
  console.log('========================================\n');
  console.log('1. Log in to the application');
  console.log('2. Once logged in, press Ctrl+C or close the browser');
  console.log('3. Auth state will be saved to tests/auth/auth.json\n');
  console.log('Test credentials:');
  console.log('  Email: testuser@geniee.co.jp');
  console.log('  Password: TestUser@1234!\n');
  console.log('========================================\n');

  // Navigate to auth page
  await page.goto('http://localhost:3000/auth');

  // Wait for user to log in - we'll detect when we're redirected away from auth page
  try {
    // Wait for navigation away from /auth (meaning login succeeded)
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 300000 }); // 5 minute timeout
    console.log('✅ Login detected! Saving auth state...\n');

    // Give it a moment for cookies to be fully set
    await page.waitForTimeout(2000);

    // Save storage state
    await context.storageState({ path: 'tests/auth/auth.json' });
    console.log('✅ Auth state saved to tests/auth/auth.json\n');

  } catch (error) {
    console.log('\n⚠️  Setup was interrupted or timeout reached');
    console.log('You may need to run this script again.');
  } finally {
    await browser.close();
  }
}

export default setupAuth;
