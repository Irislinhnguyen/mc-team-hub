import { test, expect } from '@playwright/test';

test.describe('Cross-Filter Navigation Clear', () => {
  test('should clear cross-filters when navigating between pages', async ({ page }) => {
    // Step 1: Navigate to Daily Ops page
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');

    // Step 2: Wait for data to load - look for any table content
    await page.waitForSelector('table', { timeout: 10000 });

    // Step 3: Click on a cell in the "Top movers" table to apply a cross-filter
    // Looking for the first clickable cell in the pic or zonename column
    const firstCell = page.locator('table').first().locator('td').first();
    await firstCell.click();

    // Step 4: Verify that a cross-filter chip appears
    const chipLocator = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chipLocator).toBeVisible({ timeout: 5000 });

    // Get the chip text to verify it has a filter
    const chipText = await chipLocator.first().textContent();
    console.log('Cross-filter chip appeared:', chipText);

    // Step 5: Navigate to Business Health page
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');

    // Step 6: CRITICAL CHECK - Verify that the cross-filter chip is gone
    // This test will FAIL if filters persist across navigation
    await expect(chipLocator).not.toBeVisible({ timeout: 2000 });

    console.log('✅ Cross-filters cleared on navigation!');
  });

  test('should start with no filters on Business Health after Daily Ops filtering', async ({ page }) => {
    // Step 1: Go to Daily Ops and apply a filter
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click to apply filter
    const firstCell = page.locator('table').first().locator('td').first();
    await firstCell.click();

    // Verify chip exists
    const chipLocator = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chipLocator).toBeVisible();

    // Step 2: Navigate to Business Health
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');

    // Step 3: Check URL doesn't have filter parameters
    const url = page.url();
    expect(url).not.toContain('pic=');
    expect(url).not.toContain('zonename=');
    expect(url).not.toContain('filter=');

    // Step 4: Verify no filter chips are present
    await expect(chipLocator).not.toBeVisible();

    console.log('✅ Business Health page has no filters from previous page!');
  });

  test('should allow new filters on new page without old filters', async ({ page }) => {
    // Step 1: Go to Daily Ops, apply filter
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    const dailyOpsCell = page.locator('table').first().locator('td').nth(1);
    await dailyOpsCell.click();

    // Step 2: Navigate to Business Health
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Step 3: Apply a NEW filter on Business Health page
    const businessHealthCell = page.locator('table').first().locator('td').first();
    await businessHealthCell.click();

    // Step 4: Verify only ONE chip appears (the new one, not the old one)
    const chips = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chips).toHaveCount(1);

    const chipText = await chips.first().textContent();
    console.log('New filter on Business Health:', chipText);

    // Verify it's NOT the filter from Daily Ops
    expect(chipText).not.toContain('Daily Ops');

    console.log('✅ New page allows new filters without old ones!');
  });
});
