import { test, expect } from '@playwright/test';

test.describe('Cross-Filter Multi-Select (Ctrl/Cmd + Click)', () => {
  test('should add second filter when Ctrl+Click', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click first cell (normal click)
    const firstCell = page.locator('table').first().locator('td').nth(0);
    await firstCell.click();

    // Verify first chip
    const chips = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chips).toHaveCount(1);
    const firstChipText = await chips.first().textContent();

    // Ctrl+Click second cell
    const secondCell = page.locator('table').first().locator('td').nth(1);
    await secondCell.click({ modifiers: ['Control'] });

    // Verify TWO chips now exist
    await expect(chips).toHaveCount(2);

    const allChips = await chips.allTextContents();
    console.log('Filters after Ctrl+Click:', allChips);

    expect(allChips).toHaveLength(2);
    expect(allChips).toContain(firstChipText);
  });

  test('should toggle off filter when Ctrl+Click same cell again', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click cell
    const targetCell = page.locator('table').first().locator('td').nth(0);
    const cellText = await targetCell.textContent();
    await targetCell.click();

    // Verify chip appears
    const chips = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chips).toHaveCount(1);

    // Ctrl+Click SAME cell
    await targetCell.click({ modifiers: ['Control'] });

    // Verify chip is removed (toggle off)
    await expect(chips).not.toBeVisible();

    console.log('✅ Toggle off works: clicked', cellText, '→ removed filter');
  });

  test('should accumulate multiple filters from different columns', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    const chips = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });

    // Click first column
    await page.locator('table').first().locator('td').nth(0).click();
    await expect(chips).toHaveCount(1);

    // Ctrl+Click second column
    await page.locator('table').first().locator('td').nth(1).click({ modifiers: ['Control'] });
    await expect(chips).toHaveCount(2);

    // Ctrl+Click third column
    await page.locator('table').first().locator('td').nth(2).click({ modifiers: ['Control'] });
    await expect(chips).toHaveCount(3);

    const allFilters = await chips.allTextContents();
    console.log('Three filters accumulated:', allFilters);

    expect(allFilters).toHaveLength(3);
  });

  test('should work with Cmd key on Mac', async ({ page, browserName }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click first cell
    await page.locator('table').first().locator('td').nth(0).click();

    const chips = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chips).toHaveCount(1);

    // Cmd+Click second cell (Meta key)
    await page.locator('table').first().locator('td').nth(1).click({ modifiers: ['Meta'] });

    // Should have 2 chips
    await expect(chips).toHaveCount(2);

    console.log('✅ Cmd/Meta key works for multi-select');
  });

  test('should clear all filters including multi-selected ones', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Add 3 filters with multi-select
    await page.locator('table').first().locator('td').nth(0).click();
    await page.locator('table').first().locator('td').nth(1).click({ modifiers: ['Control'] });
    await page.locator('table').first().locator('td').nth(2).click({ modifiers: ['Control'] });

    const chips = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chips).toHaveCount(3);

    // Click "Clear all"
    const clearButton = page.locator('button').filter({ hasText: /clear all/i });
    await clearButton.click();

    // Verify all chips removed
    await expect(chips).not.toBeVisible();

    console.log('✅ Clear all removes all multi-selected filters');
  });
});
