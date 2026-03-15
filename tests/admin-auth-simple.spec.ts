import { test, expect } from '@playwright/test';

test.describe('Admin Auth Flow - Simple Debug', () => {
  const ADMIN_URL = 'https://mc-team-hub-admin.vercel.app';
  const WEB_URL = 'https://mc.genieegroup.com';
  const ADMIN_EMAIL = 'admin@geniee.co.jp';
  const ADMIN_PASSWORD = 'admin123';

  test('step by step auth flow with screenshots', async ({ page }) => {
    console.log('=== Step 1: Visit Admin URL ===');
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('After visit, URL:', page.url());
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'test-results/step1-visit-admin.png' });

    console.log('=== Step 2: Check if redirected to auth ===');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    await page.screenshot({ path: 'test-results/step2-auth-page.png' });

    // Check if we're on the auth page
    if (currentUrl.includes('/auth')) {
      console.log('✓ Redirected to auth page');

      // Get returnUrl parameter
      const urlObj = new URL(currentUrl);
      const returnUrl = urlObj.searchParams.get('returnUrl');
      console.log('returnUrl:', returnUrl);

      console.log('=== Step 3: Fill in credentials ===');
      // Wait for form
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.waitForTimeout(500);

      // Click Admin tab
      const adminTab = page.locator('button:has-text("Admin")');
      if (await adminTab.count() > 0) {
        await adminTab.click();
      }
      await page.waitForTimeout(500);

      // Fill form
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.screenshot({ path: 'test-results/step3-form-filled.png' });

      console.log('=== Step 4: Submit login ===');

      // Track navigation events
      page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        if (url.includes('login') || url.includes('auth')) {
          console.log(`API Response: ${url} - Status: ${status}`);
        }
      });

      // Submit and wait for navigation
      const [response] = await Promise.all([
        page.waitForNavigation({ timeout: 15000 }).catch(e => {
          console.log('Navigation timeout/error:', e.message);
          return null;
        }),
        page.click('button[type="submit"]')
      ]);

      console.log('After submit, URL:', page.url());
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'test-results/step4-after-submit.png' });

      // Check for errors
      const errorSelectors = [
        'text=Login failed',
        'text=Invalid credentials',
        'text=Error',
        '[role="alert"]'
      ];

      for (const selector of errorSelectors) {
        const errorElement = page.locator(selector).first();
        if (await errorElement.count() > 0) {
          const errorText = await errorElement.textContent();
          console.log('❌ Error found:', selector, '-', errorText);
        }
      }

      console.log('=== Step 5: Final state ===');
      await page.waitForTimeout(3000);
      console.log('Final URL:', page.url());
      console.log('Page title:', await page.title());
      await page.screenshot({ path: 'test-results/step5-final.png', fullPage: true });

      // Check cookies
      const cookies = await page.context().cookies();
      console.log('Cookies:', cookies.map(c => ({
        name: c.name,
        domain: c.domain,
        value: c.value ? '***' : 'empty'
      })));

    } else {
      console.log('❌ Not redirected to auth page. Current URL:', currentUrl);
    }
  });

  test('check what happens after successful login by directly calling API', async ({ page, context }) => {
    console.log('=== Direct API Test ===');

    // First visit the auth page to get any cookies
    await page.goto(`${WEB_URL}/auth`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Try to login via API
    const response = await context.request.post(`${WEB_URL}/api/auth/login-password`, {
      data: {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD
      },
      timeout: 15000
    });

    console.log('Login API response status:', response.status());
    console.log('Login API response headers:', response.headers());

    const body = await response.text();
    console.log('Login API response body:', body);

    // Check if we got a redirect
    if (response.status() === 307 || response.status() === 302) {
      const location = response.headers()['location'];
      console.log('Redirect location:', location);
    }
  });
});
