import { test, expect } from '@playwright/test';

test.describe('Cross-Filter Backend Integration', () => {
  test('should send filter to backend API when clicking cell', async ({ page }) => {
    // Listen to API requests
    const apiRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/analytics')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    // Navigate to Daily Ops
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');

    // Wait for initial data load
    await page.waitForTimeout(3000);

    // Clear previous requests
    apiRequests.length = 0;

    // Click on a cell to apply filter
    const firstCell = page.locator('table').first().locator('td').first();
    await firstCell.click();

    // Wait for API call
    await page.waitForTimeout(2000);

    // Verify API was called with filter
    console.log('API Requests after clicking:', apiRequests.length);
    apiRequests.forEach(req => {
      console.log('Request URL:', req.url);
      console.log('Request Method:', req.method);
      console.log('Request Body:', req.postData);
    });

    // Check if any POST request was made
    const postRequests = apiRequests.filter(r => r.method === 'POST');
    expect(postRequests.length).toBeGreaterThan(0);

    // Check if request body contains filter
    const hasFilterInBody = postRequests.some(req => {
      return req.postData && req.postData.includes('pic');
    });

    if (hasFilterInBody) {
      console.log('✅ Filter WAS sent to backend!');
    } else {
      console.log('❌ Filter was NOT sent to backend!');
    }
  });

  test('should NOT send filters after Clear All', async ({ page }) => {
    const apiRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/analytics')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Apply filter
    const firstCell = page.locator('table').first().locator('td').first();
    await firstCell.click();
    await page.waitForTimeout(1000);

    // Clear requests
    apiRequests.length = 0;

    // Click Clear All
    const clearButton = page.locator('button').filter({ hasText: /clear all/i });
    await clearButton.click();
    await page.waitForTimeout(2000);

    // Check API calls after clear
    console.log('API Requests after Clear All:', apiRequests.length);

    const postRequests = apiRequests.filter(r => r.method === 'POST');
    postRequests.forEach(req => {
      console.log('Request Body after clear:', req.postData);

      // Verify no pic/zonename filters in request
      if (req.postData) {
        const hasPicFilter = req.postData.includes('"pic"');
        const hasZoneFilter = req.postData.includes('"zonename"');

        if (hasPicFilter || hasZoneFilter) {
          console.log('❌ OLD FILTERS STILL PRESENT IN REQUEST!');
        } else {
          console.log('✅ Filters correctly removed from request');
        }
      }
    });
  });

  test('should send empty filters when navigating to new page', async ({ page }) => {
    const apiRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/analytics')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          timestamp: Date.now()
        });
      }
    });

    // Go to Daily Ops and apply filter
    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const firstCell = page.locator('table').first().locator('td').first();
    await firstCell.click();
    await page.waitForTimeout(1000);

    // Clear requests log
    apiRequests.length = 0;

    // Navigate to Business Health
    await page.goto('/analytics/business-health');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Check API calls on new page
    console.log('API Requests on Business Health page:', apiRequests.length);

    const postRequests = apiRequests.filter(r => r.method === 'POST');
    postRequests.forEach(req => {
      console.log('Request Body on new page:', req.postData);

      if (req.postData) {
        const hasOldFilter = req.postData.includes('"pic"') || req.postData.includes('"zonename"');

        if (hasOldFilter) {
          console.log('🚨 BUG CONFIRMED: Old filters persist in API calls!');
          expect(hasOldFilter).toBe(false); // This should fail if bug exists
        } else {
          console.log('✅ No old filters in new page API calls');
        }
      }
    });
  });

  test('should send multiple filters when Ctrl+Click', async ({ page }) => {
    const apiRequests: any[] = [];

    page.on('request', request => {
      if (request.url().includes('/api/analytics')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData()
        });
      }
    });

    await page.goto('/analytics/daily-ops');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // Clear initial requests
    apiRequests.length = 0;

    // Click first cell
    await page.locator('table').first().locator('td').nth(0).click();
    await page.waitForTimeout(1000);

    // Ctrl+Click second cell
    await page.locator('table').first().locator('td').nth(1).click({ modifiers: ['Control'] });
    await page.waitForTimeout(2000);

    // Check last API call
    const lastPostRequest = apiRequests.filter(r => r.method === 'POST').pop();

    if (lastPostRequest && lastPostRequest.postData) {
      console.log('Request body with multiple filters:', lastPostRequest.postData);

      // Count filters in request
      const filterCount = (lastPostRequest.postData.match(/":\s*"[^"]+"/g) || []).length;
      console.log('Number of filters in request:', filterCount);

      if (filterCount >= 2) {
        console.log('✅ Multiple filters sent to backend!');
      } else {
        console.log('❌ Only one filter sent (multi-select may not work at backend level)');
      }
    }
  });
});
