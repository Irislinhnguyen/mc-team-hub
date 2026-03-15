import { chromium, FullConfig } from '@playwright/test';

/**
 * Setup script to capture authenticated browser state for admin user
 */

async function setupAuth(config: FullConfig) {
  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('\n========================================');
  console.log('🔐 ADMIN AUTH SETUP');
  console.log('========================================\n');
  console.log('Logging in with admin credentials...');
  console.log('  Email: admin@geniee.co.jp\n');

  // Navigate to home page
  await page.goto('http://localhost:3000');

  // Check if we need to login
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
    console.log('Login page detected, filling credentials...');

    // Fill in credentials
    await page.fill('input[type="email"]', 'admin@geniee.co.jp');
    await page.fill('input[type="password"]', 'admin123');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for successful login
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 });
    console.log('✅ Login successful!');
  }

  // Wait a bit for everything to load
  await page.waitForTimeout(3000);

  // Save storage state
  await context.storageState({ path: 'tests/auth/auth.json' });
  console.log('✅ Auth state saved to tests/auth/auth.json\n');

  await browser.close();
}

export default setupAuth;
