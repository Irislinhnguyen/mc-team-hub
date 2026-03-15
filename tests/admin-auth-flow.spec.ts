import { test, expect } from '@playwright/test';

test.describe('Admin Auth Flow Debug', () => {
  const ADMIN_URL = 'https://mc-team-hub-admin.vercel.app';
  const WEB_URL = 'https://mc.genieegroup.com';
  const ADMIN_EMAIL = 'admin@geniee.co.jp';
  const ADMIN_PASSWORD = 'admin123';

  test('debug redirect flow from admin to auth and back', async ({ page, context }) => {
    // Enable detailed request/response logging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err));

    console.log('=== Step 1: Visit Admin URL ===');
    const response = await page.goto(ADMIN_URL);
    console.log('Initial URL:', page.url());
    console.log('Response status:', response?.status());
    console.log('Response headers:', response?.headers());

    // Wait for navigation to complete
    await page.waitForLoadState('networkidle');
    console.log('After networkidle URL:', page.url());

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-redirect-1.png', fullPage: true });
    console.log('Screenshot saved: admin-redirect-1.png');

    // Check if we were redirected to the auth page
    expect(page.url()).toContain('/auth');
    console.log('✓ Correctly redirected to auth page');

    // Check for returnUrl parameter
    const currentUrl = new URL(page.url());
    const returnUrl = currentUrl.searchParams.get('returnUrl');
    console.log('returnUrl parameter:', returnUrl);

    console.log('=== Step 2: Fill in login form ===');
    // Wait for the form to be ready
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    await page.screenshot({ path: 'test-results/admin-auth-form.png', fullPage: true });

    // Click on Admin tab
    await page.click('button:has-text("Admin")');
    await page.waitForTimeout(500);

    // Fill in credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    console.log('Filled in credentials');

    // Set up navigation tracking BEFORE clicking submit
    const navigatedUrl: string[] = [];
    page.on('response', response => {
      const url = response.url();
      if (url.includes('login') || url.includes('auth')) {
        console.log('Login response:', url, response.status());
      }
    });

    console.log('=== Step 3: Submit login form ===');
    // Submit form
    await Promise.all([
      page.waitForNavigation({ timeout: 15000 }).then(() => {
        console.log('Navigation completed to:', page.url());
        navigatedUrl.push(page.url());
      }),
      page.click('button[type="submit"]')
    ]);

    await page.waitForLoadState('networkidle');
    console.log('Final URL after login:', page.url());

    // Take screenshot of final page
    await page.screenshot({ path: 'test-results/admin-after-login.png', fullPage: true });
    console.log('Screenshot saved: admin-after-login.png');

    // Check for any error messages
    const errorElement = page.locator('text=Login failed, text=Invalid credentials');
    if (await errorElement.count() > 0) {
      console.log('❌ Login failed - credentials rejected');
    }

    console.log('=== Step 4: Check cookies ===');
    const cookies = await context.cookies();
    console.log('Cookies after login:', cookies.map(c => ({
      name: c.name,
      domain: c.domain,
      path: c.path
    })));

    // Check if we have any redirect happening
    await page.waitForTimeout(3000);
    console.log('URL after 3 seconds:', page.url());
    await page.screenshot({ path: 'test-results/admin-final.png', fullPage: true });
  });

  test('direct login test', async ({ page }) => {
    console.log('=== Direct Login Test ===');
    console.log('Going to auth page directly');

    await page.goto(`${WEB_URL}/auth?returnUrl=${ADMIN_URL}`);
    await page.waitForLoadState('networkidle');

    console.log('Auth page URL:', page.url());
    await page.screenshot({ path: 'test-results/direct-auth-page.png', fullPage: true });

    // Try login
    await page.click('button:has-text("Admin")');
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    console.log('Submitting login...');
    await page.click('button[type="submit"]');

    // Wait for navigation
    await page.waitForNavigation({ timeout: 15000 });
    await page.waitForLoadState('networkidle');

    console.log('Final URL:', page.url());
    console.log('Page title:', await page.title());

    await page.screenshot({ path: 'test-results/direct-login-result.png', fullPage: true });
  });
});
