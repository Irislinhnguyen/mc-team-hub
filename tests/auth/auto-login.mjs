import { chromium } from '@playwright/test';

/**
 * Automated auth setup - logs in via API and saves session
 */
async function setupAuth() {
  console.log('\n========================================');
  console.log('🔐 AUTO AUTH SETUP (Password Login)');
  console.log('========================================\n');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to auth page
    console.log('1. Navigating to auth page...');
    await page.goto('http://localhost:3000/auth');
    await page.waitForTimeout(1000);

    // Get CSRF token
    console.log('2. Getting CSRF token...');
    const csrfResponse = await page.request.get('http://localhost:3000/api/auth/csrf');
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    console.log('   ✓ CSRF token obtained');

    // Login via API
    console.log('3. Logging in via API...');
    const loginResponse = await page.request.post('http://localhost:3000/api/auth/login-password', {
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
      data: JSON.stringify({
        email: 'bible-admin@geniee.co.jp',
        password: 'test12345',
      }),
    });

    if (loginResponse.status() === 401) {
      throw new Error('Invalid credentials. Please check the test user credentials.');
    }

    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text();
      throw new Error(`Login failed: ${loginResponse.status()} ${errorText}`);
    }

    console.log('   ✓ Login successful');

    // Wait for cookies to be set
    await page.waitForTimeout(2000);

    // Save storage state (cookies, localStorage, sessionStorage)
    console.log('4. Saving auth state...');
    await context.storageState({ path: 'tests/auth/auth.json' });
    console.log('   ✓ Auth state saved to tests/auth/auth.json\n');

    console.log('========================================');
    console.log('✅ AUTH SETUP COMPLETE');
    console.log('========================================\n');
    console.log('Tests will now use this authenticated session.\n');

  } catch (error) {
    console.error('\n❌ Auth setup failed:', error);
    console.log('\nMake sure:');
    console.log('  - Dev server is running on http://localhost:3000');
    console.log('  - Test user exists (email: bible-admin@geniee.co.jp, password: test12345)');
    console.log('  - User has admin role\n');
    throw error;
  } finally {
    await browser.close();
  }
}

setupAuth().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
