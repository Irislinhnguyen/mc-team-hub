# Autonomous Analytics Refactoring - Instructions

## What Was Done (Already Completed)

✅ **Daily Ops page** - Fully refactored and replaced
✅ **Shared abstractions** created:
  - `lib/hooks/useAnalyticsMetadata.ts` - Centralized metadata fetching
  - `lib/hooks/useLazyTable.ts` - Reusable lazy loading
  - `lib/hooks/useDefaultDateRange.ts` - Standardized date ranges
  - `lib/api/analytics.ts` - API helper functions
  - `lib/config/filterConfigs.ts` - Filter configurations
  - `lib/config/tableColumns.ts` - Column definitions
  - `lib/types/analytics.ts` - Shared TypeScript types
  - `app/components/analytics/MetadataFilterPanel.tsx` - Integrated filter panel
  - `app/components/analytics/MetadataErrorUI.tsx` - Error handling component
  - `app/components/analytics/AnalyticsPageLayout.tsx` - Standard page wrapper
✅ **Metadata API** extended to include `rev_flag` filter
✅ **Git backup** completed (commit 8453196)

## What Remains To Do

🔄 **4 pages to refactor:**

1. **Business Health** (`app/(protected)/analytics/business-health/page.tsx`)
2. **Profit Projections** (`app/(protected)/analytics/profit-projections/page.tsx`)
3. **New Sales** (`app/(protected)/analytics/new-sales/page.tsx`)
4. **Daily Ops Publisher Summary** (`app/(protected)/analytics/daily-ops-publisher-summary/page.tsx`)

## Refactoring Pattern (For Each Page)

```typescript
// BEFORE: ~300-400 lines with duplicated metadata fetching
// AFTER: ~200 lines using shared abstractions

1. Replace metadata fetching with:
   import { useAnalyticsMetadata } from '../../../../lib/hooks/useAnalyticsMetadata'

2. Replace filter panel with:
   <MetadataFilterPanel
     filterFields={['daterange', 'team', 'pic', 'product']}
     onFilterChange={setCurrentFilters}
     isLoading={loading}
   />

3. Replace API calls with:
   import { fetchAnalyticsData } from '../../../../lib/api/analytics'
   const data = await fetchAnalyticsData('/api/analytics/...', filters)

4. Wrap page in layout:
   <AnalyticsPageLayout title="Page Title" showExport={true}>
     ...
   </AnalyticsPageLayout>

5. Keep cross-filter logic unchanged (as per requirement)
```

## How to Run Autonomous Refactoring

### Option 1: Run the Script (Recommended)

```bash
# Make executable
chmod +x refactor-overnight.sh

# Run in screen session (survives terminal close)
screen -S refactor
./refactor-overnight.sh
# Press Ctrl+A then D to detach

# Or run in background
./refactor-overnight.sh &
```

### Option 2: Manual Command

```bash
# Single iteration (if you want to test first)
claude --continue "continue with the refactoring task" \
  --dangerously-skip-permissions \
  --max-turns 50
```

## What to Check in the Morning

1. **Review logs**: Check `refactor-log-1.json` through `refactor-log-5.json`

2. **Check git status**: See what files were changed
   ```bash
   git status
   git diff
   ```

3. **Build verification**: Run build once to check everything
   ```bash
   npm run build
   ```

4. **Test in browser**: Visit each refactored page
   - http://localhost:3000/analytics/business-health
   - http://localhost:3000/analytics/profit-projections
   - http://localhost:3000/analytics/new-sales
   - http://localhost:3000/analytics/daily-ops-publisher-summary

5. **Compare with backups**: Original files saved as `.backup`
   ```bash
   ls app/(protected)/analytics/*/*.backup
   ```

## Expected Results

- **Code reduction**: ~30-40% fewer lines per page
- **Consistency**: All pages use same patterns
- **Maintainability**: Changes to filters/metadata affect all pages
- **Cross-filter**: Preserved unchanged
- **Loading states**: Fixed heights, no layout shift
- **Backups**: All originals saved as `page-original.tsx.backup`

## If Something Goes Wrong

All originals are backed up:
```bash
# Restore a page if needed
cd app/(protected)/analytics/business-health/
mv page.tsx page-refactored-broken.tsx
mv page-original.tsx.backup page.tsx
```

Git has the checkpoint:
```bash
git log  # See commit 8453196
git reset --hard 8453196  # Nuclear option: restore everything
```

## Notes

- Script will run 5 iterations to handle token limits
- Each iteration allows up to 50 tool calls
- Permission prompts are auto-approved
- Total estimated time: 30-60 minutes
- Logs saved for troubleshooting

Good night! 🌙
