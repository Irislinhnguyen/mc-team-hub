import { authenticate } from '@playwright/test';

/**
 * Setup authentication for E2E tests
 * This logs in via API and saves the session state for tests to use
 *
 * Usage: npx playwright test --config=playwright.config.ts
 * The config will automatically use the saved auth state
 */

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

async function setupAuth() {
  console.log('Setting up authentication for E2E tests...');

  // Authenticate as Leader
  await authenticate({
    storageState: 'tests/e2e/fixtures/auth-leader.json',
  }, async ({ page }) => {
    await page.post(`${BASE_URL}/api/auth/login-password`, {
      data: {
        email: 'test-leader@example.com',
        password: 'Leader123!',
      },
    });
    // Wait for auth cookie to be set
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
  });

  // Authenticate as Manager
  await authenticate({
    storageState: 'tests/e2e/fixtures/auth-manager.json',
  }, async ({ page }) => {
    await page.post(`${BASE_URL}/api/auth/login-password`, {
      data: {
        email: 'test-manager@example.com',
        password: 'Manager123!',
      },
    });
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState('networkidle');
  });

  console.log('✓ Authentication setup complete');
}

setupAuth().catch(console.error);
