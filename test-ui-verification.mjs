/**
 * UI Verification Test for Site Count Fix
 */

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('Navigating to app...');
    await page.goto('http://localhost:3000');

    // Login if needed
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('Logging in...');
      await page.getByText('Admin').click();
      await page.fill('#email', 'admin@geniee.co.jp');
      await page.fill('#password', 'admin123');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('networkidle');
    }

    // Navigate to New Sales
    console.log('Navigating to New Sales...');
    await page.goto('http://localhost:3000/performance-tracker/new-sales');
    await page.waitForLoadState('networkidle');

    console.log('Waiting for page to load...');
    await page.waitForTimeout(5000);

    // Click Last Month
    console.log('Clicking Last Month...');
    const buttons = await page.$$('button');
    for (const button of buttons) {
      const text = await button.textContent();
      if (text && text.includes('Last Month')) {
        await button.click();
        break;
      }
    }

    console.log('Waiting for data to load...');
    await page.waitForTimeout(45000);

    // Take screenshot
    await page.screenshot({ path: 'ui-verification-last-month.png', fullPage: true });
    console.log('Screenshot saved to ui-verification-last-month.png');

    // Check By PIC table
    console.log('\n=== Checking By PIC Table ===');
    const byPicRows = await page.locator('table').filter({ hasText: /By PIC/i }).locator('tbody tr').all();
    console.log(`Found ${byPicRows.length} rows in By PIC table`);

    for (let i = 0; i < Math.min(byPicRows.length, 5); i++) {
      const row = byPicRows[i];
      const text = await row.textContent();
      console.log(`Row ${i + 1}: ${text.trim().substring(0, 80)}...`);
    }

    // Check Details table
    console.log('\n=== Checking Details Table ===');
    const detailsTable = page.locator('table').filter({ hasText: /Details/i }).filter({ hasText: /Raw Sites/i });
    const detailsRows = await detailsTable.locator('tbody tr').all();
    console.log(`Found ${detailsRows.length} rows in Details table`);

    // Count VN_hang rows in Details table
    let vnHangCount = 0;
    for (let i = 0; i < Math.min(detailsRows.length, 50); i++) {
      const text = await detailsRows[i].textContent();
      if (text.includes('VN_hang')) {
        vnHangCount++;
      }
    }
    console.log(`VN_hang rows in Details table (first 50): ${vnHangCount}`);

    // Now test team filter
    console.log('\n=== Testing Team Filter (APP) ===');

    // Find and click team dropdown
    const teamDropdown = page.locator('[data-testid="team-select"], select').filter({ hasText: /Team/i }).first();
    await teamDropdown.click();
    await page.waitForTimeout(1000);

    // Select APP team
    await page.selectOption('[data-testid="team-select"], select', 'APP');
    await page.waitForTimeout(5000);

    await page.screenshot({ path: 'ui-verification-app-team.png', fullPage: true });
    console.log('Screenshot saved to ui-verification-app-team.png');

    // Check APP team results
    const appTeamRows = await page.locator('table').filter({ hasText: /By PIC/i }).locator('tbody tr').all();
    console.log(`Found ${appTeamRows.length} rows in By PIC table for APP team`);

    console.log('\n=== Verification Complete ===');
    console.log('Please check the screenshots:');
    console.log('  - ui-verification-last-month.png');
    console.log('  - ui-verification-app-team.png');

    // Keep browser open for manual inspection
    console.log('\nKeeping browser open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('Error:', error);
  }

  await browser.close();
  console.log('\n✅ UI verification complete!');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
