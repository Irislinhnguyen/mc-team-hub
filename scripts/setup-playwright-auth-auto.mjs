#!/usr/bin/env node

/**
 * Automated Playwright auth setup
 * Logs in programmatically and saves the auth state
 */

import { chromium } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const EMAIL = 'testuser@geniee.co.jp';
const PASSWORD = 'TestUser@1234!';

async function main() {
  console.log('\n🔐 Automated Playwright Auth Setup\n');
  console.log(`URL: ${BASE_URL}/auth`);
  console.log(`Email: ${EMAIL}`);
  console.log(`Password: ${PASSWORD}\n`);

  const browser = await chromium.launch({ headless: false }); // Show browser for debugging
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to auth page
    console.log('⏳ Navigating to auth page...');
    await page.goto(`${BASE_URL}/auth`, { waitUntil: 'networkidle' });

    // Click Admin tab
    console.log('⏳ Clicking Admin tab...');
    await page.waitForSelector('button[role="tab"]:has-text("Admin")', { timeout: 10000 });
    await page.click('button[role="tab"]:has-text("Admin")');

    // Wait for email input
    console.log('⏳ Waiting for form...');
    await page.waitForSelector('#email', { timeout: 5000 });

    // Fill credentials
    console.log('⏳ Filling credentials...');
    await page.fill('#email', EMAIL);
    await page.fill('#password', PASSWORD);

    // Submit
    console.log('⏳ Submitting form...');
    await page.click('button[type="submit"]');

    // Wait for successful login (redirect away from /auth)
    console.log('⏳ Waiting for login...');
    await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 15000 });

    console.log('✅ Login successful!');
    console.log(`   Redirected to: ${page.url()}`);

    // Wait for cookies to be set
    await page.waitForTimeout(2000);

    // Save auth state
    console.log('⏳ Saving auth state...');
    await context.storageState({ path: 'tests/auth/auth.json' });
    console.log('✅ Auth state saved to tests/auth/auth.json');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Make sure the dev server is running: npm run dev');
    console.error('2. Make sure test users exist: node scripts/setup-challenges-tests.mjs');
    process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
