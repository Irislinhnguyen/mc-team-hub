import { test, expect } from '@playwright/test';

test.describe('Admin App - Login and Dashboard Access', () => {
  const ADMIN_URL = 'https://mc-team-hub-admin.vercel.app';
  const ADMIN_EMAIL = 'admin@geniee.co.jp';
  const ADMIN_PASSWORD = 'admin123';

  test.beforeEach(async ({ page }) => {
    // Enable console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
      }
    });
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  });

  test('should show login page when not authenticated', async ({ page }) => {
    console.log('=== Test: Visit admin URL and verify login page ===');

    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);

    console.log('Current URL:', page.url());

    // Should be on login page
    expect(page.url()).toContain('/login');

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-login-page.png', fullPage: true });

    // Verify login form elements are present
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();

    // Verify page title/text
    await expect(page.locator('text=Admin Login')).toBeVisible();
    await expect(page.locator('text=Sign in to access the admin dashboard')).toBeVisible();

    console.log('✓ Login page displayed correctly');
  });

  test('should successfully login and redirect to admin dashboard', async ({ page }) => {
    console.log('=== Test: Login with valid credentials ===');

    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Screenshot before login
    await page.screenshot({ path: 'test-results/admin-before-login.png' });

    // Fill in credentials
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);

    // Screenshot with filled form
    await page.screenshot({ path: 'test-results/admin-form-filled.png' });

    // Submit form
    console.log('Submitting login...');
    await Promise.all([
      page.waitForURL('**/admin**', { timeout: 15000 }),
      page.click('button[type="submit"]')
    ]);

    await page.waitForTimeout(2000);
    console.log('After login, URL:', page.url());

    // Should be on admin dashboard
    expect(page.url()).toContain('/admin');

    // Screenshot after login
    await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });

    // Verify dashboard elements
    await expect(page.locator('text=AI Usage')).toBeVisible({ timeout: 10000 });

    console.log('✓ Login successful and redirected to dashboard');
  });

  test('should show error with invalid credentials', async ({ page }) => {
    console.log('=== Test: Login with invalid credentials ===');

    await page.goto(ADMIN_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1000);

    // Fill in invalid credentials
    await page.fill('input[type="email"]', 'invalid@test.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Should show error message
    const errorElement = page.locator('text=Invalid email or password, text=Login failed');
    await expect(errorElement.first()).toBeVisible({ timeout: 5000 });

    // Screenshot of error
    await page.screenshot({ path: 'test-results/admin-login-error.png' });

    console.log('✓ Error message shown for invalid credentials');
  });

  test('should access all admin pages after login', async ({ page }) => {
    console.log('=== Test: Access all admin pages ===');

    // Login first
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await page.waitForTimeout(2000);

    const adminPages = [
      '/admin',
      '/admin/ai-usage',
      '/admin/users',
      '/admin/challenges',
      '/admin/feedback',
      '/admin/team-settings'
    ];

    for (const pagePath of adminPages) {
      console.log(`Visiting: ${pagePath}`);
      await page.goto(`${ADMIN_URL}${pagePath}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Screenshot each page
      const screenshotName = pagePath.replace(/\//g, '-').replace(/^-/, '') || 'admin-home';
      await page.screenshot({ path: `test-results/admin-${screenshotName}.png`, fullPage: true });

      // Verify we're not redirected back to login
      expect(page.url()).not.toContain('/login');

      console.log(`✓ ${pagePath} accessible`);
    }

    console.log('✓ All admin pages accessible');
  });

  test('should have working navigation between admin sections', async ({ page }) => {
    console.log('=== Test: Navigation between admin sections ===');

    // Login first
    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'test-results/admin-navigation-initial.png' });

    // Look for navigation links/buttons
    const navigationLinks = [
      { text: 'AI Usage', path: '/admin/ai-usage' },
      { text: 'Users', path: '/admin/users' },
      { text: 'Challenges', path: '/admin/challenges' },
      { text: 'Feedback', path: '/admin/feedback' },
      { text: 'Team Settings', path: '/admin/team-settings' }
    ];

    for (const link of navigationLinks) {
      console.log(`Testing navigation to: ${link.text}`);

      // Try to click on the navigation item
      const navElement = page.locator(`text=${link.text}`).first();
      if (await navElement.count() > 0) {
        await navElement.click();
        await page.waitForTimeout(2000);

        // Verify navigation
        expect(page.url()).toContain(link.path);

        // Screenshot
        await page.screenshot({ path: `test-results/admin-nav-${link.text.toLowerCase().replace(/\s+/g, '-')}.png` });

        console.log(`✓ Navigation to ${link.text} works`);
      } else {
        console.log(`⚠ Navigation element for ${link.text} not found`);
      }
    }

    console.log('✓ Navigation test completed');
  });

  test('should check cookies after login', async ({ page, context }) => {
    console.log('=== Test: Verify auth cookie is set ===');

    await page.goto(`${ADMIN_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });

    // Check cookies before login
    let cookiesBefore = await context.cookies();
    console.log('Cookies before login:', cookiesBefore.map(c => c.name));

    // Login
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/admin**', { timeout: 15000 });
    await page.waitForTimeout(2000);

    // Check cookies after login
    let cookiesAfter = await context.cookies();
    console.log('Cookies after login:', cookiesAfter.map(c => ({
      name: c.name,
      domain: c.domain,
      hasValue: !!c.value
    })));

    // Verify auth token cookie exists
    const authTokenCookie = cookiesAfter.find(c => c.name === '__Host-auth_token');
    expect(authTokenCookie).toBeDefined();
    expect(authTokenCookie?.value).toBeTruthy();

    console.log('✓ Auth cookie is set correctly');
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    console.log('=== Test: Protected route redirect ===');

    // Clear cookies to simulate logged out state
    await page.context().clearCookies();

    // Try to access admin pages directly
    const protectedRoutes = [
      '/admin/ai-usage',
      '/admin/users',
      '/admin/challenges'
    ];

    for (const route of protectedRoutes) {
      console.log(`Testing protected route: ${route}`);

      await page.goto(`${ADMIN_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Should redirect to login
      expect(page.url()).toContain('/login');

      console.log(`✓ ${route} correctly redirects to login`);
    }

    console.log('✓ Protected routes redirect to login correctly');
  });
});
