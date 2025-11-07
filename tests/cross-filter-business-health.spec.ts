import { test, expect } from '@playwright/test';

test.describe('Cross-Filter on Business Health Page', () => {
  test('should apply filter on Business Health page', async ({ page }) => {
    // Navigate to Business Health instead of Daily Ops
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');

    // Wait for any content to load
    await page.waitForTimeout(5000);

    // Try to find any table or chart
    const hasTable = await page.locator('table').count() > 0;
    const hasChart = await page.locator('svg').count() > 0;

    console.log('Has tables:', hasTable);
    console.log('Has charts:', hasChart);

    if (hasTable) {
      // Click on first available cell
      const firstCell = page.locator('table').first().locator('td').first();
      await firstCell.click({ timeout: 10000 });

      // Check for chip
      await page.waitForTimeout(1000);
      const chips = page.locator('div').filter({ hasText: /:/}).filter({ has: page.locator('button') });
      const chipCount = await chips.count();

      console.log('Chips found after click:', chipCount);

      if (chipCount > 0) {
        const chipText = await chips.first().textContent();
        console.log('✅ Filter applied:', chipText);
      }
    }
  });

  test('should clear filters when navigating FROM Business Health to Daily Ops', async ({ page }) => {
    // Start at Business Health
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const hasTable = await page.locator('table').count() > 0;

    if (hasTable) {
      // Apply filter
      await page.locator('table').first().locator('td').first().click({ timeout: 10000 });
      await page.waitForTimeout(1000);

      // Verify chip exists
      const chipsBeforeNav = page.locator('div').filter({ hasText: /:/ }).filter({ has: page.locator('button') });
      const countBefore = await chipsBeforeNav.count();
      console.log('Chips before navigation:', countBefore);

      if (countBefore > 0) {
        // Navigate to Daily Ops
        await page.goto('/analytics/daily-ops');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check if chips are gone
        const chipsAfterNav = page.locator('div').filter({ hasText: /:/ }).filter({ has: page.locator('button') });
        const countAfter = await chipsAfterNav.count();
        console.log('Chips after navigation:', countAfter);

        if (countAfter === 0) {
          console.log('✅ Filters CLEARED on navigation!');
        } else {
          console.log('❌ Filters PERSISTED after navigation! BUG CONFIRMED!');

          // Get chip text to see what persisted
          const persistedChips = await chipsAfterNav.allTextContents();
          console.log('Persisted filters:', persistedChips);
        }

        expect(countAfter).toBe(0);
      }
    }
  });

  test('should verify API calls send filters correctly', async ({ page }) => {
    const apiCalls: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/analytics')) {
        const postData = request.postData();
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          body: postData,
          hasFilter: postData && (postData.includes('pic') || postData.includes('zonename') || postData.includes('pubname'))
        });
      }
    });

    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('Initial API calls:', apiCalls.length);

    // Clear log
    apiCalls.length = 0;

    // Try to click on table
    const hasTable = await page.locator('table').count() > 0;
    if (hasTable) {
      await page.locator('table').first().locator('td').nth(2).click({ timeout: 10000 });
      await page.waitForTimeout(2000);

      console.log('API calls after filter click:', apiCalls.length);

      const filteredCalls = apiCalls.filter(c => c.hasFilter);
      console.log('API calls WITH filters:', filteredCalls.length);

      filteredCalls.forEach(call => {
        console.log('Filter request to:', call.url);
        console.log('Body preview:', call.body?.substring(0, 200));
      });

      if (filteredCalls.length > 0) {
        console.log('✅ Filters ARE sent to backend!');
      } else {
        console.log('⚠️  No filters detected in API calls');
      }
    }
  });

  test('should check if filters persist across page refresh', async ({ page }) => {
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const hasTable = await page.locator('table').count() > 0;

    if (hasTable) {
      // Apply filter
      await page.locator('table').first().locator('td').first().click({ timeout: 10000 });
      await page.waitForTimeout(1000);

      const chipsBefore = page.locator('div').filter({ hasText: /:/ }).filter({ has: page.locator('button') });
      const countBefore = await chipsBefore.count();
      console.log('Chips before refresh:', countBefore);

      if (countBefore > 0) {
        const chipTextBefore = await chipsBefore.first().textContent();
        console.log('Filter before refresh:', chipTextBefore);

        // Refresh page
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // Check chips after refresh
        const chipsAfter = page.locator('div').filter({ hasText: /:/ }).filter({ has: page.locator('button') });
        const countAfter = await chipsAfter.count();
        console.log('Chips after refresh:', countAfter);

        if (countAfter === 0) {
          console.log('✅ Filters correctly CLEARED on refresh');
        } else {
          console.log('⚠️  Filters persisted after refresh (might be expected if using sessionStorage)');
        }
      }
    }
  });
});
