import { chromium } from '@playwright/test';

/**
 * Automated auth setup - logs in via browser form
 */
async function setupAuth() {
  console.log('\n========================================');
  console.log('🔐 AUTO AUTH SETUP (Browser Login)');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to auth page
    console.log('1. Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(2000);

    // Wait for page to load
    console.log('2. Waiting for login form...');
    await page.waitForLoadState('networkidle');

    // Check if there's a password login form
    const hasPasswordForm = await page.locator('input[type="password"]').isVisible().catch(() => false);

    if (!hasPasswordForm) {
      // Look for a toggle or link to password login
      const passwordLoginLink = await page.locator('text=Password').or(page.locator('text=Email')).or(page.locator('text=Login with Email')).first();
      const hasLink = await passwordLoginLink.isVisible().catch(() => false);

      if (hasLink) {
        console.log('3. Switching to password login...');
        await passwordLoginLink.click();
        await page.waitForTimeout(1000);
      }
    }

    // Fill login form
    console.log('3. Filling login credentials...');
    await page.fill('input[type="email"]', 'admin@geniee.co.jp');
    await page.fill('input[type="password"]', 'admin123');

    // Screenshot before submit
    await page.screenshot({ path: 'test-results/auth-login-form.png' });

    // Submit form
    console.log('4. Submitting login form...');
    await page.click('button[type="submit"]');

    // Wait for redirect/navigation
    console.log('5. Waiting for login to complete...');
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 15000 });

    // Wait a bit for cookies to be fully set
    await page.waitForTimeout(3000);

    // Verify we're logged in
    const currentUrl = page.url();
    console.log(`   ✓ Logged in, current URL: ${currentUrl}`);

    // Save storage state
    console.log('6. Saving auth state...');
    await context.storageState({ path: 'tests/auth/auth.json' });
    console.log('   ✓ Auth state saved to tests/auth/auth.json\n');

    console.log('========================================');
    console.log('✅ AUTH SETUP COMPLETE');
    console.log('========================================\n');
    console.log('Tests will now use this authenticated session.\n');

  } catch (error) {
    console.error('\n❌ Auth setup failed:', error);
    console.log('\nTroubleshooting:');
    console.log('  - Make sure dev server is running: npm run dev');
    console.log('  - Check if admin user exists in database');
    console.log('  - Try opening http://localhost:3000/auth in browser\n');

    // Keep browser open for manual intervention if needed
    console.log('\n💡 Browser window left open - you can manually log in if needed.');
    console.log('Press Ctrl+C to close when done.\n');

    // Wait indefinitely for manual intervention
    await new Promise(() => {});

    throw error;
  } finally {
    await browser.close();
  }
}

setupAuth().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
