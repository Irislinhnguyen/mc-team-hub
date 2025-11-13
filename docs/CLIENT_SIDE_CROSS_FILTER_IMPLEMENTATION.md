# Client-Side Cross-Filter Implementation

## Overview

Đã implement client-side filtering cho cross-filters (click vào cells/charts) để có instant response thay vì reload toàn bộ page. Date range và metadata filters vẫn gọi API như cũ.

## Changes Summary

### 1. Core Utilities Created

#### `lib/hooks/useClientSideFilter.ts`
Hook mới để filter data client-side:
- `useClientSideFilter()` - Filter with AND logic across different fields
- `useClientSideFilterMulti()` - Support OR logic for same field

#### `lib/utils/filterHelpers.ts`
Helper functions:
- `extractBaseFilters()` - Tách base filters (date, metadata) khỏi cross-filters
- `extractCrossFilterValues()` - Extract cross-filter values
- `shouldFetchFullData()` - Detect khi nào cần fetch full data

### 2. Context Enhanced

#### `app/contexts/CrossFilterContext.tsx`
Added:
- `fetchStrategy: 'server' | 'client'` - Track filter mode
- `isClientFilterMode` - Boolean flag
- Auto-detect: có cross-filters → switch to 'client' mode

### 3. Query Hooks Updated

**Tất cả hooks đã được update** để exclude cross-filters khỏi query key:

#### GCPP Check (✅ Done)
- `useGCPPMarketOverview`
- `useGCPPMarketBreakdown`
- `useGCPPPartnerBreakdown`
- `useGCPPPartnerBreakdown2`
- `useGCPPPublisherMonitoring`

#### Performance Tracker (✅ Done)
- `useBusinessHealth`
- `useDailyOps`
- `useNewSales`
- `useProfitProjections`
- `useDeepDive`
- `usePublisherHealth`

**Pattern:**
```typescript
// Before
queryKey: queryKeys.businessHealth(filters)  // includes cross-filters

// After
const { crossFilters } = useCrossFilter()
const baseFilters = extractBaseFilters(filters, crossFilters)
queryKey: queryKeys.businessHealth(baseFilters)  // excludes cross-filters
```

### 4. Page Components Updated

#### GCPP Check - Market Overview (✅ Done)

**File:** `app/(protected)/gcpp-check/market-overview/page.tsx`

**Changes:**
```typescript
// Import new hooks
import { useCrossFilter } from '@/app/contexts/CrossFilterContext'
import { useClientSideFilter } from '@/lib/hooks/useClientSideFilter'

// Apply client-side filtering
const { data: rawData } = useGCPPMarketOverview(filters)
const { filteredData: filteredMarketShareDetail } = useClientSideFilter(
  rawData?.marketShareDetail,
  crossFilters
)
// Repeat for each data array...

// Combine filtered data
const data = useMemo(() => ({
  marketShareDetail: filteredMarketShareDetail,
  marketShareByMarketPartner: filteredMarketShareByMarketPartner,
  // ...
}), [filteredMarketShareDetail, ...])
```

**Result:**
- Click on any cell/chart → instant filter
- Change date/metadata → API call (như cũ)
- No full page reload sensation

## Implementation Status

### ✅ Completed
1. Core hooks và utilities
2. CrossFilterContext enhancement
3. All query hooks updated (GCPP + Performance Tracker)
4. GCPP Market Overview page updated

### ⏳ Remaining Work

#### A. Remaining GCPP Pages (Easy - Same Pattern)
Apply same pattern as Market Overview:
- `market-breakdown/page.tsx`
- `partner-breakdown/page.tsx`
- `partner-breakdown-2/page.tsx`
- `publisher-monitoring/page.tsx`

**Estimated time:** 30 minutes total

#### B. Performance Tracker Pages (More Complex)
Need to handle lazy-loaded tables:
- `business-health/page.tsx` ⚠️ Has 5 LazyDataTables
- `daily-ops/page.tsx`
- `new-sales/page.tsx`
- `profit-projections/page.tsx`

**Challenge:** LazyDataTable components load 500 rows at a time server-side

**Options:**
1. **Simple:** Apply same pattern to main data, keep lazy tables as-is
   - Lazy tables sẽ vẫn server-side filter
   - Main metrics/charts sẽ instant

2. **Complete:** Update LazyDataTable to fetch all data when cross-filter active
   - Need to modify `LazyDataTable.tsx`
   - Add `fetchAllOnCrossFilter` prop
   - More complex but fully instant

**Recommendation:** Start with Option 1 (simple), upgrade to Option 2 if needed

#### C. Loading State Optimization (Optional)
- Differentiate between server refetch (show skeleton) vs client filter (subtle indicator)
- Add `<Suspense>` boundaries for smoother transitions

## How to Complete Remaining Work

### For GCPP Pages (Copy-Paste Pattern)

1. Add imports:
```typescript
import { useCrossFilter } from '@/app/contexts/CrossFilterContext'
import { useClientSideFilter } from '@/lib/hooks/useClientSideFilter'
import { useMemo } from 'react'
```

2. Get cross-filters:
```typescript
const { crossFilters } = useCrossFilter()
```

3. Apply filtering to each data array:
```typescript
const { data: rawData } = useGCPPMarketBreakdown(filters)
const { filteredData: filteredDataset1 } = useClientSideFilter(
  rawData?.dataset1,
  crossFilters
)
const { filteredData: filteredDataset2 } = useClientSideFilter(
  rawData?.dataset2,
  crossFilters
)
```

4. Combine filtered data:
```typescript
const data = useMemo(() => {
  if (!rawData) return undefined
  return {
    dataset1: filteredDataset1,
    dataset2: filteredDataset2,
  }
}, [filteredDataset1, filteredDataset2, rawData])
```

### For Performance Tracker Pages

**Option 1 (Simple - Recommended First):**
- Apply same pattern as GCPP pages
- Only filter main data (metrics, charts)
- LazyDataTables keep current behavior (server-side pagination + filtering)

**Option 2 (Complete):**
- Update `LazyDataTable.tsx` component:
  - Add `fetchMode: 'lazy' | 'full'` prop
  - When cross-filters active → switch to 'full' mode
  - Fetch all data in single request
  - Apply client-side filtering
  - Use client-side pagination

Example for LazyDataTable enhancement:
```typescript
// In LazyDataTable.tsx
const { isClientFilterMode } = useCrossFilter()

const fetchData = async () => {
  if (isClientFilterMode) {
    // Fetch all data
    const response = await fetch(endpoint, {
      body: JSON.stringify({ ...filters, limit: 999999 })
    })
    setAllData(response.data)
  } else {
    // Lazy load as usual
    const response = await fetch(endpoint, {
      body: JSON.stringify({ ...filters, offset, limit: 500 })
    })
    // ...
  }
}
```

## Testing Instructions

### 1. Test GCPP Market Overview
1. Go to `/gcpp-check/market-overview`
2. Select a date
3. Click on any cell in the table → Should filter instantly (no skeleton reload)
4. Click on a bar in the chart → Should filter instantly
5. Ctrl+Click multiple items → Should support multi-select
6. Change date → Should trigger API call (skeleton shows)

### 2. Test Cross-Filter Behavior
- Single click → replaces all filters
- Ctrl/Cmd + click → adds to existing filters (multi-select)
- Click same value again → toggles off
- Clear all filters → resets to base data

### 3. Verify Cache Behavior
1. Apply cross-filter (e.g., click partner="GENIEE")
2. Navigate to different page
3. Come back
4. Apply same cross-filter again
5. **Expected:** Instant (cache hit)

### 4. Performance Check
- Open Network tab
- Apply cross-filter
- **Expected:** 0 new API calls
- Change date/metadata filter
- **Expected:** New API calls appear

## Known Limitations

1. **First cross-filter application:** Same speed as before (cache miss)
2. **Subsequent cross-filters:** Lightning fast (cache hit + client filtering)
3. **Memory usage:** Slightly higher (holds full dataset for current date range)
4. **Lazy tables:** Not yet client-filtered (pending LazyDataTable update)

## Architecture Benefits

✅ **Backward Compatible:** Date/metadata filters work exactly as before
✅ **Incremental:** Can update pages one by one
✅ **Cacheable:** React Query cache reused across cross-filter combinations
✅ **Scalable:** Pattern applies to all pages uniformly
✅ **Type Safe:** Full TypeScript support

## Future Enhancements

1. **Prefetching:** Pre-load common filter combinations on hover
2. **Optimistic UI:** Show old data while fetching new
3. **Service Worker:** Offline support with cached data
4. **WebWorker:** Move filtering logic to background thread for large datasets
5. **Virtual Scrolling:** For even larger datasets (10k+ rows)

## Files Modified

### Created
- `lib/hooks/useClientSideFilter.ts`
- `lib/utils/filterHelpers.ts`
- `docs/CLIENT_SIDE_CROSS_FILTER_IMPLEMENTATION.md` (this file)

### Modified
- `app/contexts/CrossFilterContext.tsx`
- All query hooks in `lib/hooks/queries/`
- `app/(protected)/gcpp-check/market-overview/page.tsx`

### To Modify (Remaining)
- 4 remaining GCPP pages
- 4-5 Performance Tracker pages
- `app/components/performance-tracker/LazyDataTable.tsx` (optional)

## Questions?

Contact the implementation team or refer to:
- Context API docs: `app/contexts/CrossFilterContext.tsx`
- Hook examples: `lib/hooks/useClientSideFilter.ts`
- Page example: `app/(protected)/gcpp-check/market-overview/page.tsx`
