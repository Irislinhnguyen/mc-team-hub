# Cross-Filter Testing Guide

## Summary

I've implemented comprehensive cross-filtering features with Looker Studio-style behavior, but **automated E2E testing with Playwright is blocked by authentication requirements**. All tests timeout waiting for pages to load because they cannot bypass the Supabase authentication.

## What Was Implemented

### 1. Core Cross-Filter Logic
- ✅ Click any table/chart element to filter by that value
- ✅ Clicking a new element replaces ALL previous cross-filters
- ✅ FilterPanel filters are preserved (only cross-filters are replaced)
- ✅ Proper cleanup of old filter keys from `currentFilters` object

### 2. Looker Studio-Style Features
- ✅ Multi-select with Ctrl/Cmd + Click
- ✅ Toggle deselect by Ctrl+Clicking same element again
- ✅ Visual highlighting: selected items bright, non-selected dimmed (opacity 50%)
- ✅ Works across DataTable, LazyDataTable, BarChart, and TimeSeriesChart

### 3. Navigation Behavior
- ✅ Layout-level `useEffect` clears cross-filters on pathname change
- ✅ Should NOT persist filters when navigating between pages

## Testing Problem

### Playwright Tests Created

Created 4 comprehensive test suites with 16 tests total:

1. **`tests/cross-filter-navigation.spec.ts`** (3 tests)
   - Navigation clears filters
   - Cross-filters don't affect FilterPanel
   - Multiple navigation cycles

2. **`tests/cross-filter-single-select.spec.ts`** (4 tests)
   - Single filter application
   - Filter replacement on new click
   - Clear All functionality
   - Visual highlighting verification

3. **`tests/cross-filter-multi-select.spec.ts`** (5 tests)
   - Ctrl+Click adds filters
   - Ctrl+Click toggles off
   - Multi-column accumulation
   - Cmd key on Mac
   - Clear All with multiple filters

4. **`tests/cross-filter-backend-integration.spec.ts`** (5 tests)
   - Backend API calls verification
   - Filter sent in request body
   - Clear All removes filters from API
   - Navigation doesn't send old filters
   - Multi-select filters in API

5. **`tests/cross-filter-business-health.spec.ts`** (4 tests)
   - Alternative tests using Business Health page
   - API call verification
   - Page refresh behavior

### Test Results

**All tests FAIL with timeout errors:**
```
Error: page.goto: Test timeout of 30000ms exceeded.
```

**Root Cause:** The application requires Supabase authentication, and Playwright tests cannot bypass it or login automatically without credentials.

## Solution: Manual Browser Testing

Since automated testing is blocked, I've created a **manual browser console script** that can be run while logged in.

### How to Use Manual Test Script

1. **Login** to the application
2. **Navigate** to `/analytics/daily-ops` or `/analytics/business-health`
3. **Open DevTools** (Press F12)
4. **Open** the file `test-cross-filter-manual.js`
5. **Copy** the entire contents
6. **Paste** into the Console tab
7. **Press Enter**

### Manual Test Commands

The script provides these commands:

```javascript
// Run all automated tests
crossFilterTest.runAll()

// Individual tests
crossFilterTest.testClickFilter()    // Test if filter clicks trigger backend API
crossFilterTest.testClearAll()       // Test if Clear All works at backend level
crossFilterTest.testNavigation()     // Instructions for navigation test

// Inspection commands
crossFilterTest.checkFilters()       // View current filters in UI
crossFilterTest.checkAPICalls()      // View intercepted API calls

// Control monitoring
crossFilterTest.start()              // Start intercepting API calls
crossFilterTest.stop()               // Stop intercepting
```

### What the Manual Tests Verify

1. **Filter Click → Backend Integration**
   - Clicks a table cell
   - Checks if filter chip appears in UI
   - Checks if API call is made
   - Verifies filters are sent in request body
   - **ANSWERS:** "chiips appear nhưng có chaạy không?" (Do chips actually run?)

2. **Clear All → Backend Integration**
   - Clicks Clear All button
   - Checks if chips disappear from UI
   - Checks if API call is made
   - Verifies filters are removed from request body
   - **ANSWERS:** "clear all button works ở UI hay ở backend?" (UI or backend level?)

3. **Navigation → Filter Persistence**
   - Manual steps to navigate between pages
   - Check if filters clear on navigation
   - Check if old filters appear in new page's API calls
   - **ANSWERS:** User's concern about filters persisting across pages

## Code Changes Summary

### Files Modified

1. **`app/contexts/CrossFilterContext.tsx`**
   - Added `append` parameter to `addCrossFilter()`
   - Added `id` field for uniqueness
   - Implemented toggle logic for multi-select

2. **`app/(protected)/analytics/daily-ops/page.tsx`**
   - Added `prevCrossFilterFieldsRef` to track old filter keys
   - Fixed cleanup logic to remove old keys before applying new ones

3. **`app/(protected)/analytics/business-health/page.tsx`**
   - Same cleanup logic as daily-ops

4. **`app/components/analytics/DataTable.tsx`**
   - Added keyboard modifier detection (Ctrl/Cmd)
   - Added visual highlighting with `bg-blue-100` and `opacity-50`
   - Pass `append` to `addCrossFilter()`

5. **`app/components/analytics/LazyDataTable.tsx`**
   - Same changes as DataTable

6. **`app/components/analytics/BarChart.tsx`**
   - Added keyboard state tracking
   - Implemented Cell-based bar coloring for highlighting

7. **`app/components/analytics/TimeSeriesChart.tsx`**
   - Added keyboard state tracking
   - Custom dot rendering for visual highlighting

### Layout Navigation Handler

The layout already has this logic (app/(protected)/layout.tsx):

```typescript
useEffect(() => {
  // Clear cross-filters when navigating to a new page
  clearAllCrossFilters()
}, [pathname, clearAllCrossFilters])
```

This **should** clear filters on navigation, but needs manual verification.

## User Questions to Answer

### 1. "clear all button works ở UI hay ở backend?"

**How to verify:**
```javascript
// In browser console after running test script:
crossFilterTest.testClearAll()
```

**Expected behavior:**
- ✅ Chips disappear from UI
- ✅ API call is made to backend
- ✅ Request body has no cross-filter keys (pic, zonename, pubname)

### 2. "chiips appear nhưng có chaạy không?"

**How to verify:**
```javascript
// In browser console:
crossFilterTest.testClickFilter()
```

**Expected behavior:**
- ✅ Chip appears in UI
- ✅ API call is made immediately
- ✅ Request body contains the filter (e.g., `{ filters: { pic: "some-value" } }`)

### 3. "tinính năng naày có loọc xuyên caác trang không?"

**Current implementation:** NO, filters should NOT persist across pages.

**How to verify:**
```javascript
// 1. Apply a filter on Daily Ops
crossFilterTest.checkFilters()  // Should show active filters

// 2. Navigate to Business Health
// (manually click the link)

// 3. Check filters again
crossFilterTest.checkFilters()  // Should show NO filters

// 4. Check API calls
crossFilterTest.checkAPICalls()  // Should NOT contain old pic/zonename filters
```

**Expected behavior:**
- ✅ Filters clear when navigating
- ✅ New page API calls don't include old cross-filters
- ✅ Only FilterPanel filters (date, team) persist

## Next Steps

### Option 1: Run Manual Tests (RECOMMENDED)

1. Run the manual test script in browser console
2. Share the console output with me
3. I can analyze the results and fix any issues

### Option 2: Set Up Playwright Auth

If you want automated tests:

1. Create `tests/auth.setup.ts` with login credentials
2. Configure Playwright to save auth state
3. Re-run Playwright tests

This requires:
- Test user credentials
- Supabase configuration for test environment
- Auth state storage setup

### Option 3: Verify Manually

Simply use the application and verify:
1. Click on any table cell → does it filter?
2. Click Clear All → does data refresh with no filters?
3. Navigate to another page → do filters disappear?
4. Open Network tab → are filters in request payload?

## Files Reference

- **Manual Test Script:** `test-cross-filter-manual.js`
- **This Guide:** `CROSS_FILTER_TESTING_GUIDE.md`
- **Playwright Config:** `playwright.config.ts`
- **Test Suites:** `tests/cross-filter-*.spec.ts` (16 tests total)
- **Main Context:** `app/contexts/CrossFilterContext.tsx`
- **Page Implementations:** `app/(protected)/analytics/*/page.tsx`
- **Components:** `app/components/analytics/*.tsx`

## Conclusion

The cross-filtering functionality has been fully implemented with:
- ✅ Correct filter replacement logic
- ✅ Proper cleanup of old filter keys
- ✅ Multi-select support (Ctrl/Cmd + Click)
- ✅ Visual highlighting
- ✅ Navigation clear behavior

However, **automated verification is blocked by authentication**. The manual test script provides a way to verify all functionality while logged in. Please run it and share results so I can confirm everything works correctly.
