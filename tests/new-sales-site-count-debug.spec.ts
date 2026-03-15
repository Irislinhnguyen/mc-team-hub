import { test, expect } from '@playwright/test';

test.describe('New Sales Site Count Debug', () => {
  test.use({ storageState: undefined }); // Don't use saved auth state
  test.setTimeout(180000); // 3 minute timeout for this test

  test('check VN_hang site count discrepancy', async ({ page }) => {
    // Enable console logging
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('transformSiteCountDetails') ||
          text.includes('siteCountDetailsData') ||
          text.includes('SiteCount')) {
        consoleLogs.push(text);
        console.log('[Browser Console]', text);
      }
    });

    // Enable API response logging
    let apiData: any = null;
    page.on('response', async response => {
      if (response.url().includes('/api/performance-tracker/new-sales')) {
        try {
          const result = await response.json();
          apiData = result.data;
          console.log('\n[API Response] Status:', response.status());
          console.log('[API Response] salesCsSiteDetails length:', apiData?.salesCsSiteDetails?.length || 'N/A');

          if (apiData?.salesCsSiteDetails) {
            const vnHangEntries = apiData.salesCsSiteDetails.filter((item: any) => item.pic === 'VN_hang');
            console.log('[API Response] VN_hang entries:', vnHangEntries.length);

            if (vnHangEntries.length > 0) {
              console.log('[API Response] VN_hang PIDs:', vnHangEntries.map((e: any) => e.pid));
            }
          }

          if (apiData?.salesCsSiteCountsByPic) {
            const vnHangData = apiData.salesCsSiteCountsByPic.find((item: any) => item.pic === 'VN_hang');
            if (vnHangData) {
              console.log('[API Response] VN_hang aggregated: Sales=' + vnHangData.sales_sites + ', CS=' + vnHangData.cs_sites);
            }
          }
        } catch (e) {
          console.log('[API Response] Parse error:', e);
        }
      }
    });

    // Navigate to the app
    console.log('[Test] Navigating to app...');
    await page.goto('http://localhost:3000');

    // Check if we need to login
    const currentUrl = page.url();
    console.log('[Test] Current URL:', currentUrl);

    if (currentUrl.includes('/login') || currentUrl.includes('/auth')) {
      console.log('[Test] Logging in...');

      // Take screenshot before login
      await page.screenshot({ path: 'before-login.png' });
      console.log('[Test] Screenshot saved to before-login.png');

      // Click on Admin tab
      console.log('[Test] Clicking Admin tab...');
      await page.getByText('Admin').click();
      await page.waitForTimeout(1000);

      // Fill in credentials using the correct IDs
      console.log('[Test] Filling email...');
      await page.fill('#email', 'admin@geniee.co.jp');
      console.log('[Test] Filling password...');
      await page.fill('#password', 'admin123');
      console.log('[Test] Credentials filled');

      // Submit the form
      await page.click('button[type="submit"]');

      // Wait for successful login - try multiple approaches
      try {
        // Approach 1: Wait for URL change
        await page.waitForURL(/^(?!.*\/login|.*\/auth).*$/, { timeout: 10000 });
      } catch (e) {
        // Approach 2: Wait for navigation to complete
        await page.waitForLoadState('networkidle', { timeout: 10000 });
      }

      console.log('[Test] Login completed, current URL:', page.url());

      // We're on the home page, now navigate to New Sales
      await page.goto('/performance-tracker/new-sales');
      await page.waitForLoadState('networkidle');
      console.log('[Test] Navigated to New Sales page');
    }

    // Wait for the page to load
    console.log('[Test] Waiting 45 seconds for page to fully load...');
    await page.waitForTimeout(45000);

    // Find and click "Last Month" preset button
    console.log('[Test] Looking for Last Month preset...');
    try {
      const buttons = page.getByRole('button');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const text = await buttons.nth(i).textContent();
        if (text && text.includes('Last Month')) {
          await buttons.nth(i).click();
          console.log('[Test] Clicked Last Month button');
          console.log('[Test] Waiting 45 seconds for data to load...');
          await page.waitForTimeout(45000); // Wait for data to load
          break;
        }
      }
    } catch (e) {
      console.log('[Test] Could not find Last Month button:', e);
    }

    // Check the console logs
    console.log('\n[Test] Console Logs Analysis:');
    console.log('='.repeat(60));

    const transformLog = consoleLogs.find(log => log.includes('[transformSiteCountDetails] Transformed'));
    if (transformLog) {
      const match = transformLog.match(/Transformed (\d+) rows/);
      if (match) {
        console.log('✓ transformSiteCountDetails: ' + match[1] + ' rows');
      }
    } else {
      console.log('✗ No transformSiteCountDetails log found');
    }

    // Take screenshot
    console.log('\n[Test] Taking screenshot...');
    await page.screenshot({ path: 'test-debug-screenshot.png', fullPage: true });
    console.log('✓ Screenshot saved to test-debug-screenshot.png');

    // Try to find the Details table and check its row count
    console.log('\n[Test] Checking Details table...');
    try {
      const tables = page.locator('table');
      const tableCount = await tables.count();
      console.log('Found ' + tableCount + ' tables');

      for (let i = 0; i < tableCount; i++) {
        const table = tables.nth(i);
        const text = await table.textContent();
        if (text && text.includes('Details') && text.includes('Raw Sites')) {
          console.log('Found Details table (table ' + i + ')');

          const rows = table.locator('tbody tr');
          const rowCount = await rows.count();
          console.log('Details table has ' + rowCount + ' rows');

          // Count VN_hang rows
          let vnHangRows = 0;
          for (let j = 0; j < Math.min(rowCount, 50); j++) {
            const row = rows.nth(j);
            const rowText = await row.textContent();
            if (rowText && rowText.includes('VN_hang')) {
              vnHangRows++;
            }
          }
          console.log('VN_hang rows visible in Details table: ' + vnHangRows);
          break;
        }
      }
    } catch (e) {
      console.log('Could not read Details table:', e);
    }

    // Check By PIC table
    console.log('\n[Test] Checking By PIC table...');
    try {
      const byPicTable = page.locator('table').filter({ hasText: /By PIC/i });
      const rows = byPicTable.locator('tbody tr');
      const rowCount = await rows.count();

      console.log('By PIC table has ' + rowCount + ' rows');

      // Find VN_hang row
      for (let i = 0; i < rowCount; i++) {
        const row = rows.nth(i);
        const text = await row.textContent();
        if (text && text.includes('VN_hang')) {
          console.log('VN_hang row in By PIC table:', text.trim());
        }
      }
    } catch (e) {
      console.log('Could not read By PIC table:', e);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log('1. API Response salesCsSiteDetails: ' + (apiData?.salesCsSiteDetails?.length || 'N/A'));
    console.log('2. API Response VN_hang entries: ' + (apiData?.salesCsSiteDetails?.filter((i: any) => i.pic === 'VN_hang').length || 'N/A'));
    console.log('3. Check test-debug-screenshot.png for visual confirmation');

    // Keep page open for a bit
    await page.waitForTimeout(5000);
  });
});
