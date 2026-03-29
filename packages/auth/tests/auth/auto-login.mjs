import { chromium } from '@playwright/test';

/**
 * Fully automated auth setup - logs in automatically
 *
 * Usage: node tests/auth/auto-login.mjs
 *
 * This will:
 * 1. Open a browser window
 * 2. Log in with test credentials automatically
 * 3. Save the auth state to tests/auth/auth.json
 * 4. All subsequent tests will use this saved session
 */

async function setupAuth() {
  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  const email = 'bible-admin@geniee.co.jp';
  const password = 'test12345';

  console.log('\n========================================');
  console.log('🔐 AUTO AUTH SETUP - Logging in automatically');
  console.log('========================================\n');
  console.log('Using credentials:');
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${password}\n`);

  try {
    // Navigate to auth page
    console.log('📍 Navigating to auth page...');
    await page.goto('http://localhost:3000/auth', { waitUntil: 'networkidle' });

    // Wait for the form to be visible
    await page.waitForLoadState('networkidle');

    // Check if we need to switch to password login tab
    const passwordTab = page.locator('text=Password').first();
    if (await passwordTab.isVisible()) {
      console.log('🔄 Switching to password login tab...');
      await passwordTab.click();
      await page.waitForTimeout(500);
    }

    // Fill in email
    console.log('📧 Filling in email...');
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 5000 });
    await emailInput.fill(email);

    // Fill in password
    console.log('🔒 Filling in password...');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 5000 });
    await passwordInput.fill(password);

    // Click login button
    console.log('🔑 Clicking login button...');
    const loginButton = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
    await loginButton.waitFor({ state: 'visible', timeout: 5000 });
    await loginButton.click();

    // Wait for navigation away from /auth (meaning login succeeded)
    console.log('⏳ Waiting for login to complete...');
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 10000 });
    console.log('✅ Login successful!\n');

    // Give it a moment for cookies to be fully set
    await page.waitForTimeout(2000);

    // Save storage state
    await context.storageState({ path: 'tests/auth/auth.json' });
    console.log('✅ Auth state saved to tests/auth/auth.json\n');
    console.log('========================================');
    console.log('🎉 Setup complete! You can now run E2E tests.');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ Auto-login failed:', error.message);
    console.log('\n💡 You may need to log in manually. Run: node tests/auth/auto-setup.mjs');
    console.log('Then use these credentials:');
    console.log(`  Email: ${email}`);
    console.log(`  Password: ${password}\n`);
  } finally {
    await browser.close();
  }
}

setupAuth().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
