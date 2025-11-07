/**
 * MANUAL CROSS-FILTER TEST SCRIPT
 *
 * HOW TO USE:
 * 1. Login to the application and navigate to /analytics/daily-ops or /analytics/business-health
 * 2. Open browser DevTools (F12)
 * 3. Copy this entire script and paste it into the Console tab
 * 4. Press Enter to run
 * 5. Follow the on-screen instructions
 *
 * WHAT THIS TESTS:
 * - Whether cross-filters actually trigger API calls to backend
 * - Whether filters are sent in request body
 * - Whether navigation clears filters properly
 * - Whether Clear All button works at backend level
 */

(function() {
  console.clear();
  console.log('%c=== CROSS-FILTER MANUAL TEST ===', 'color: #4CAF50; font-size: 18px; font-weight: bold;');
  console.log('');

  // Track API calls
  const apiCalls = [];
  let isIntercepting = false;

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    const options = args[1] || {};

    if (isIntercepting && url.includes('/api/analytics')) {
      const body = options.body ? JSON.parse(options.body) : null;
      apiCalls.push({
        timestamp: new Date().toISOString(),
        url: url,
        method: options.method || 'GET',
        filters: body?.filters || null,
        fullBody: body
      });

      console.log('%c[API CALL DETECTED]', 'color: #2196F3; font-weight: bold;');
      console.log('URL:', url);
      console.log('Filters:', body?.filters);
      console.log('');
    }

    return originalFetch.apply(this, args);
  };

  // Helper function to get filter chips
  function getFilterChips() {
    // Look for filter chips in the UI
    const chips = document.querySelectorAll('[class*="bg-blue"]');
    return Array.from(chips)
      .filter(el => el.textContent && el.textContent.includes(':'))
      .map(el => el.textContent.trim());
  }

  // Helper function to find clickable table cells
  function getTableCells() {
    const tables = document.querySelectorAll('table');
    if (tables.length === 0) return null;

    const firstTable = tables[0];
    const cells = firstTable.querySelectorAll('td');
    return Array.from(cells).slice(0, 5); // First 5 cells
  }

  // Test scenarios
  window.crossFilterTest = {
    // Start monitoring
    start: function() {
      isIntercepting = true;
      apiCalls.length = 0;
      console.log('%c✓ Monitoring started', 'color: #4CAF50; font-weight: bold;');
      console.log('All API calls to /api/analytics will be logged.');
      console.log('');
      console.log('Next steps:');
      console.log('1. Click on any table cell to apply a filter');
      console.log('2. Check the console for API calls');
      console.log('3. Run crossFilterTest.checkFilters() to verify filters in UI');
      console.log('');
    },

    // Stop monitoring
    stop: function() {
      isIntercepting = false;
      console.log('%c✓ Monitoring stopped', 'color: #FF9800; font-weight: bold;');
    },

    // Check current filters in UI
    checkFilters: function() {
      const chips = getFilterChips();
      console.log('%c=== CURRENT FILTERS (UI) ===', 'color: #9C27B0; font-weight: bold;');
      if (chips.length === 0) {
        console.log('No filters active (no chips visible)');
      } else {
        console.log('Active filters:', chips);
      }
      console.log('');
      return chips;
    },

    // Check API calls made
    checkAPICalls: function() {
      console.log('%c=== API CALLS LOG ===', 'color: #9C27B0; font-weight: bold;');
      if (apiCalls.length === 0) {
        console.log('No API calls recorded yet');
      } else {
        console.log(`Total API calls: ${apiCalls.length}`);
        apiCalls.forEach((call, index) => {
          console.log(`\nCall #${index + 1}:`);
          console.log('  Time:', call.timestamp);
          console.log('  URL:', call.url);
          console.log('  Filters:', call.filters);
        });
      }
      console.log('');
      return apiCalls;
    },

    // Test scenario 1: Click filter and verify backend call
    testClickFilter: async function() {
      console.log('%c=== TEST 1: Click Filter → Check Backend ===', 'color: #E91E63; font-weight: bold;');

      const cells = getTableCells();
      if (!cells || cells.length === 0) {
        console.error('❌ No table cells found. Make sure you are on an analytics page.');
        return;
      }

      console.log('Found table with cells. Clicking first cell...');

      apiCalls.length = 0;
      cells[0].click();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const chips = this.checkFilters();
      const calls = this.checkAPICalls();

      if (chips.length > 0 && calls.length > 0) {
        const hasFiltersInAPI = calls.some(c => c.filters && Object.keys(c.filters).length > 0);
        if (hasFiltersInAPI) {
          console.log('%c✅ SUCCESS: Filter works at backend level!', 'color: #4CAF50; font-weight: bold;');
        } else {
          console.log('%c❌ FAIL: Chip appears but filter NOT sent to backend!', 'color: #F44336; font-weight: bold;');
        }
      } else if (chips.length === 0) {
        console.log('%c❌ FAIL: No filter chip appeared in UI', 'color: #F44336; font-weight: bold;');
      } else if (calls.length === 0) {
        console.log('%c❌ FAIL: No API call made after clicking', 'color: #F44336; font-weight: bold;');
      }
      console.log('');
    },

    // Test scenario 2: Clear All and verify backend
    testClearAll: async function() {
      console.log('%c=== TEST 2: Clear All → Check Backend ===', 'color: #E91E63; font-weight: bold;');

      const clearButton = Array.from(document.querySelectorAll('button'))
        .find(btn => btn.textContent.toLowerCase().includes('clear all'));

      if (!clearButton) {
        console.error('❌ Clear All button not found. Apply a filter first.');
        return;
      }

      const chipsBefore = this.checkFilters();
      if (chipsBefore.length === 0) {
        console.log('⚠️  No filters to clear. Apply a filter first.');
        return;
      }

      console.log('Clicking Clear All button...');
      apiCalls.length = 0;
      clearButton.click();

      await new Promise(resolve => setTimeout(resolve, 2000));

      const chipsAfter = this.checkFilters();
      const calls = this.checkAPICalls();

      if (chipsAfter.length === 0 && calls.length > 0) {
        const lastCall = calls[calls.length - 1];
        const hasFilters = lastCall.filters && Object.keys(lastCall.filters).length > 0;

        if (!hasFilters) {
          console.log('%c✅ SUCCESS: Clear All works at backend level!', 'color: #4CAF50; font-weight: bold;');
        } else {
          console.log('%c❌ FAIL: Chips cleared but filters still sent to backend!', 'color: #F44336; font-weight: bold;');
          console.log('Filters still present:', lastCall.filters);
        }
      } else if (chipsAfter.length > 0) {
        console.log('%c❌ FAIL: Chips not cleared in UI', 'color: #F44336; font-weight: bold;');
      } else if (calls.length === 0) {
        console.log('%c⚠️  WARNING: No API call made after Clear All', 'color: #FF9800; font-weight: bold;');
      }
      console.log('');
    },

    // Test scenario 3: Navigation clears filters
    testNavigation: function() {
      console.log('%c=== TEST 3: Navigation Clear Test ===', 'color: #E91E63; font-weight: bold;');
      console.log('');
      console.log('MANUAL STEPS:');
      console.log('1. Apply a filter by clicking a table cell');
      console.log('2. Run: crossFilterTest.checkFilters() - should show active filters');
      console.log('3. Navigate to a different analytics page (Business Health / Daily Ops)');
      console.log('4. Run: crossFilterTest.checkFilters() - should show NO filters');
      console.log('5. Run: crossFilterTest.checkAPICalls() - check if filters in new page API calls');
      console.log('');
      console.log('Expected: Filters should be cleared and NOT sent in new page API calls');
      console.log('');
    },

    // Run all automated tests
    runAll: async function() {
      this.start();
      await this.testClickFilter();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await this.testClearAll();
      this.testNavigation();
      this.stop();

      console.log('%c=== ALL TESTS COMPLETE ===', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
      console.log('For navigation test, follow the manual steps above.');
    }
  };

  // Start automatically
  window.crossFilterTest.start();

  console.log('%c=== READY TO TEST ===', 'color: #4CAF50; font-size: 16px; font-weight: bold;');
  console.log('');
  console.log('Available commands:');
  console.log('  crossFilterTest.runAll()          - Run all automated tests');
  console.log('  crossFilterTest.testClickFilter() - Test single filter click');
  console.log('  crossFilterTest.testClearAll()    - Test Clear All button');
  console.log('  crossFilterTest.testNavigation()  - Instructions for navigation test');
  console.log('  crossFilterTest.checkFilters()    - Check current filters in UI');
  console.log('  crossFilterTest.checkAPICalls()   - View API calls log');
  console.log('  crossFilterTest.start()           - Start monitoring');
  console.log('  crossFilterTest.stop()            - Stop monitoring');
  console.log('');
  console.log('Quick start: crossFilterTest.runAll()');
  console.log('');
})();
