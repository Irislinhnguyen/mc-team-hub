import { test, expect } from '@playwright/test';

test.describe('Admin App - Local Testing', () => {
  const ADMIN_URL = 'http://localhost:3002';
  const ADMIN_EMAIL = 'admin@geniee.co.jp';
  const ADMIN_PASSWORD = 'admin123';

  test.beforeEach(async ({ page }) => {
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  });

  test('should show login page', async ({ page }) => {
    console.log('=== Test: Visit admin URL and verify login page ===');
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('Current URL:', page.url());
    await page.screenshot({ path: 'test-results/local-admin-01-login-page.png' });

    // Should be on login page
    expect(page.url()).toContain('/login');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    console.log('✓ Login page displayed');
  });

  test('should login successfully', async ({ page }) => {
    console.log('=== Test: Login with credentials ===');
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.screenshot({ path: 'test-results/local-admin-02-form-filled.png' });

    console.log('Submitting login...');

    // Submit and wait for navigation
    const response = await page.goto(`${ADMIN_URL}/api/auth/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    });

    console.log('Login API response status:', response?.status());

    // Now try to access admin page
    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('After login, URL:', page.url());
    await page.screenshot({ path: 'test-results/local-admin-03-after-login.png' });
  });

  test('should check login API directly', async ({ request }) => {
    console.log('=== Test: Direct API call ===');

    const response = await request.post(`${ADMIN_URL}/api/auth/login-password`, {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD }
    });

    console.log('API Response status:', response.status());
    console.log('API Response headers:', JSON.stringify(response.headers(), null, 2));

    const body = await response.text();
    console.log('API Response body (first 500 chars):', body.substring(0, 500));

    // Check for cookies
    const cookies = response.headers()['set-cookie'];
    console.log('Cookies set:', cookies);
  });
});
