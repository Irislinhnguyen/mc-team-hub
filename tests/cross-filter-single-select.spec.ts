import { test, expect } from '@playwright/test';

test.describe('Cross-Filter Single Select', () => {
  test('should apply filter when clicking on a table cell', async ({ page }) => {
    // Navigate to Daily Ops page
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click on first cell
    const firstCell = page.locator('table').first().locator('td').first();
    const cellText = await firstCell.textContent();
    await firstCell.click();

    // Verify chip appears
    const chip = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chip).toBeVisible();

    const chipText = await chip.textContent();
    console.log('Filter applied:', chipText);
    console.log('Cell clicked:', cellText);
  });

  test('should replace old filter when clicking new cell', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click first cell
    const firstCell = page.locator('table').first().locator('td').nth(0);
    await firstCell.click();

    // Get first chip text
    const chip = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chip).toBeVisible();
    const firstChipText = await chip.first().textContent();

    // Click different cell
    const secondCell = page.locator('table').first().locator('td').nth(1);
    await secondCell.click();

    // Verify chip changed
    await expect(chip).toBeVisible();
    const secondChipText = await chip.first().textContent();

    // Verify only ONE chip exists (old one replaced)
    await expect(chip).toHaveCount(1);

    console.log('First filter:', firstChipText);
    console.log('Second filter (replaced):', secondChipText);
    expect(firstChipText).not.toBe(secondChipText);
  });

  test('should clear filter when clicking "Clear all" button', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Apply filter
    const firstCell = page.locator('table').first().locator('td').first();
    await firstCell.click();

    // Verify chip appears
    const chip = page.locator('[class*="bg-blue"]').filter({ hasText: /:/ });
    await expect(chip).toBeVisible();

    // Click "Clear all" button
    const clearButton = page.locator('button').filter({ hasText: /clear all/i });
    await clearButton.click();

    // Verify chip disappears
    await expect(chip).not.toBeVisible();

    console.log('✅ Clear all button works!');
  });

  test('should show visual highlighting on selected cell', async ({ page }) => {
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('table', { timeout: 10000 });

    // Click cell
    const targetCell = page.locator('table').first().locator('td').nth(2);
    await targetCell.click();

    // Wait for filter to apply
    await page.waitForTimeout(500);

    // Check if cell has blue background (selected style)
    const cellClasses = await targetCell.getAttribute('class');
    expect(cellClasses).toContain('bg-blue');

    console.log('✅ Visual highlighting applied to selected cell');
  });
});
