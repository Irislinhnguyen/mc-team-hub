# Quick Test Guide - Filter System

## Run This First

```bash
node test-complete-filter-system.mjs
```

Expected: All 10 tests pass ✅

## What Gets Tested

### ✅ Database Schema
- All columns exist (filters, cross_filters, simplified_filter, filter_type)
- Constraints work
- Timestamps auto-update

### ✅ Advanced Filters
- Create with `has_all` operator
- Save to `simplified_filter` column
- Multi-select values stored as arrays
- Entity operators (field + operator + attributeField + condition + value)

### ✅ Regular Filters
- Team, PIC, Product, Date Range
- Stored in `filters` column
- Still work independently

### ✅ Mixed Presets
- Combine all filter types
- All saved to same record
- All loaded together

### ✅ CRUD Operations
- Create (POST)
- Read (GET)
- Update (PATCH)
- Delete (DELETE)

## Quick Database Check

```sql
-- View all presets
SELECT id, name, filter_type,
       jsonb_object_keys(filters) as regular_filters,
       jsonb_array_length(cross_filters) as cross_count,
       CASE WHEN simplified_filter IS NOT NULL
            THEN jsonb_array_length(simplified_filter->'clauses')
            ELSE 0 END as advanced_count
FROM filter_presets
ORDER BY created_at DESC;

-- View advanced filter details
SELECT name,
       simplified_filter->>'includeExclude' as mode,
       simplified_filter->>'clauseLogic' as logic,
       jsonb_pretty(simplified_filter->'clauses') as clauses
FROM filter_presets
WHERE simplified_filter IS NOT NULL;

-- Find entity operator filters
SELECT name,
       clause->>'field' || ' ' ||
       clause->>'operator' || ' ' ||
       clause->>'attributeField' || ' ' ||
       clause->>'condition' || ' ' ||
       clause->>'value' as filter_expression
FROM filter_presets,
     jsonb_array_elements(simplified_filter->'clauses') as clause
WHERE clause->>'operator' IN ('has', 'has_all', 'has_any');
```

## Manual UI Test (5 minutes)

### Test 1: Create Advanced Filter (2 min)
1. Open "Advanced Filters" button
2. Click "Create New Filter"
3. Add clause:
   - Field: PID
   - Operator: has_all
   - Attribute: product
   - Condition: in
   - Value: Select 2+ products
4. Name: "Test Multi-Select"
5. Save
6. Check database:
   ```sql
   SELECT * FROM filter_presets WHERE name = 'Test Multi-Select';
   ```

### Test 2: Load Filter (1 min)
1. Open "Advanced Filters"
2. Click "Test Multi-Select"
3. Click Load
4. Verify data refreshes

### Test 3: Edit Filter (1 min)
1. Open "Advanced Filters"
2. Click Edit on "Test Multi-Select"
3. Add another clause
4. Update
5. Verify changes saved

### Test 4: Regular Filters (30 sec)
1. Use Team dropdown
2. Use PIC dropdown
3. Apply
4. Verify results

### Test 5: Mixed Preset (30 sec)
1. Set team filter
2. Add advanced filter
3. Save Preset
4. Reload page
5. Load preset
6. Verify all restored

## Expected Results

### ✅ Working Correctly

1. **Advanced Filters:**
   - `simplified_filter` column populated
   - Entity operators saved correctly
   - Multi-select values as arrays
   - `filter_type = 'advanced'`

2. **Regular Filters:**
   - `filters` column populated
   - Team, PIC, Product, Date saved
   - Works independently

3. **Mixed Presets:**
   - Both `filters` and `simplified_filter` populated
   - All filter types restored on load

4. **CRUD:**
   - Create works (POST)
   - Load works (GET)
   - Update works (PATCH)
   - Delete works (DELETE)

### ⚠️ Known Issue

**FilterManagementModal cross filters:**
- Currently saves `cross_filters: []` (empty)
- `FilterPresetManager` correctly saves cross filters

**Impact:** Low - Advanced filters created via modal won't include cross filters.

**Fix:** Pass `currentCrossFilters` to createPreset in FilterManagementModal (line 173).

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Filter Preset                          │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │   filters   │  │cross_filters │  │simplified_filter│   │
│  │   (JSONB)   │  │   (JSONB)    │  │     (JSONB)     │   │
│  └─────────────┘  └──────────────┘  └─────────────────┘   │
│       ↓                  ↓                    ↓             │
│   Regular           Cross Filter         Advanced          │
│   Filters           State                Filters           │
│                                                             │
│  team: []          [{ field,            includeExclude     │
│  pic: []             value,             clauseLogic        │
│  product: []         label }]           clauses: [...]     │
│  daterange: {}                                             │
└─────────────────────────────────────────────────────────────┘
```

## Filter Types

### 1. Regular Filters
```json
{
  "team": ["Team A"],
  "pic": ["John Doe"],
  "product": ["app_video"],
  "daterange": { "start": "2025-01-01", "end": "2025-01-31" }
}
```

### 2. Cross Filters
```json
[
  { "field": "revenue_tier", "value": "Tier 1", "label": "Revenue Tier: Tier 1" }
]
```

### 3. Advanced Filters
```json
{
  "includeExclude": "INCLUDE",
  "clauseLogic": "AND",
  "clauses": [
    {
      "id": "clause1",
      "field": "pid",
      "operator": "has_all",
      "attributeField": "product",
      "condition": "in",
      "value": ["app_video", "app_banner"],
      "enabled": true
    }
  ]
}
```

## API Endpoints

```
POST   /api/filter-presets              - Create preset
GET    /api/filter-presets?page={page}  - List presets
PATCH  /api/filter-presets/[id]         - Update preset
DELETE /api/filter-presets/[id]         - Delete preset
```

All endpoints support all filter types.

## Files to Review

### Backend
- `app/api/filter-presets/route.ts` - GET, POST (lines 190-191 for simplified_filter)
- `app/api/filter-presets/[id]/route.ts` - PATCH, DELETE (lines 173-174 for simplified_filter)

### Frontend
- `lib/hooks/useFilterPresets.ts` - React hook for CRUD
- `lib/types/filterPreset.ts` - Type definitions
- `app/components/performance-tracker/FilterManagementModal/index.tsx` - Advanced filter modal (line 174)
- `app/components/performance-tracker/FilterPresetManager.tsx` - Preset manager (line 241)

### Database
- `supabase/migrations/20250107_add_simplified_filter.sql` - Schema

## Success Criteria

After running tests, you should see:

✅ All 10 automated tests pass
✅ Can create advanced filter with entity operators
✅ Can save filter with multi-select values
✅ Can load filter and data refreshes
✅ Can edit and update filter
✅ Regular filters still work
✅ Can create mixed presets
✅ Database contains correct data structure

If any fail, check:
1. Database migration ran successfully
2. API routes return correct fields
3. UI components pass correct data
4. Type definitions match

## Troubleshooting

### Test fails: "simplified_filter is NULL"
- Check migration 20250107 ran
- Verify API route includes `simplified_filter: body.simplified_filter || null`

### UI doesn't show filter
- Check FilterManagementModal receives metadata
- Verify useFilterPresets hook returns data
- Check filter list rendering

### Data doesn't refresh after load
- Verify filter applied to query builder
- Check query merging logic
- Review analytics query service

### Multi-select not working
- Check HorizontalFilterClause component
- Verify MultiSelectFilter props
- Ensure value stored as array

## Next Steps After Tests Pass

1. ✅ Verify query builder translates simplified_filter to SQL
2. ✅ Test filter merging (regular + cross + advanced)
3. ⚠️ Fix cross filter integration in FilterManagementModal
4. ✅ Add integration tests
5. ✅ Deploy to production

## Time Estimate

- Automated test: 30 seconds
- Manual UI test: 5 minutes
- Database verification: 2 minutes
- **Total: ~8 minutes**

## Need Help?

See full documentation:
- `FILTER_SYSTEM_COMPLETE_ANALYSIS.md` - Complete system analysis
- `FILTER_SYSTEM_TEST_REPORT.md` - Detailed test report
- `test-complete-filter-system.mjs` - Automated test script
