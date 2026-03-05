#!/usr/bin/env node

/**
 * Setup script to capture authenticated browser state for Playwright tests
 *
 * Usage: node scripts/setup-playwright-auth.mjs
 *
 * This will open a browser window where you can log in.
 * Once logged in, the auth state is saved and reused by all tests.
 */

import { chromium } from '@playwright/test';

async function main() {
  console.log('\n========================================');
  console.log('🔐 PLAYWRIGHT AUTH SETUP');
  console.log('========================================\n');
  console.log('A browser window will open.');
  console.log('\nTest credentials:');
  console.log('  Email:    testuser@geniee.co.jp');
  console.log('  Password: TestUser@1234!');
  console.log('\n1. Click the "Admin" tab');
  console.log('2. Enter the credentials above');
  console.log('3. Click "Sign In"');
  console.log('4. Once you see the home page, come back here and press Ctrl+C');
  console.log('========================================\n');

  const browser = await chromium.launch({
    headless: false,
  });
  const context = await browser.newContext({
    // Accept all cookies/storage
    storageState: undefined,
  });
  const page = await context.newPage();

  // Navigate to auth page
  await page.goto('http://localhost:3000/auth');

  console.log('✅ Browser opened. Please log in now...\n');

  // Set up graceful shutdown
  let saved = false;
  const saveState = async () => {
    if (saved) return;
    saved = true;

    try {
      console.log('Saving auth state...');
      await context.storageState({ path: 'tests/auth/auth.json' });
      console.log('\n✅ Auth state saved to tests/auth/auth.json');
      console.log('✅ Tests will now use this saved session!\n');
    } catch (error) {
      console.error('❌ Failed to save auth state:', error.message);
    } finally {
      await browser.close();
      process.exit(0);
    }
  };

  // Save on Ctrl+C
  process.on('SIGINT', saveState);

  // Also auto-save when we detect successful login (redirect from auth page)
  page.on('load', async () => {
    const url = page.url();
    if (!url.includes('/auth') && !saved) {
      console.log(`✅ Login successful! Detected navigation to: ${url}`);
      await page.waitForTimeout(2000); // Wait for cookies to be set
      await saveState();
    }
  });

  // Keep running until user intervenes or login is detected
  await new Promise(() => {});
}

main().catch(console.error);
