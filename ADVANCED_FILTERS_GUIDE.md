# Advanced Filters Feature - Complete Guide

## Overview

The Advanced Filters feature enables Looker Studio-style filtering with powerful operators like `greater than`, `less than`, `contains`, `NOT IN`, and complex AND/OR logic combinations. This feature is currently available in the **Deep Dive** page.

## Features Implemented

### ✅ Phase 1: Foundation (COMPLETED)
- TypeScript types for advanced filters
- SQL generation with all operators
- Basic filter UI components
- Integration with existing CompactFilterPanel

### ✅ Phase 2: Complex Logic (COMPLETED)
- Filter group management (add/remove groups)
- AND/OR logic toggles within groups
- AND/OR logic toggles between groups
- String pattern operators (contains, starts_with, regex)

### ✅ Phase 3: UX Enhancements (COMPLETED)
- Input validation with error messages
- Enable/disable toggle for individual clauses
- Pre-built filter templates
- Visual feedback for validation errors

### ✅ Phase 4: Integration (COMPLETED)
- Integration with filter preset system
- API route updates to process advanced filters
- End-to-end data flow from UI → API → BigQuery

## How to Use

### Accessing Advanced Filters

1. Navigate to **Performance Tracker → Deep Dive**
2. Look for the **"Advanced Filters"** button below the quick filters
3. Click to expand the advanced filter builder

### Creating Your First Advanced Filter

#### Example 1: High Revenue Publishers (Simple)
**Goal**: Find publishers with revenue > $20,000

1. Click "Advanced Filters" to expand
2. Click "High Revenue (> $20k)" template button, or:
   - The first group is created automatically
   - Select field: **PID**
   - Select operator: **is greater than**
   - Enter value: **20000**
3. Click "Analyze" to apply

**Generated SQL**: `WHERE pid > 20000`

#### Example 2: Product Exclusion (NOT Logic)
**Goal**: Find PIDs using Product A but NOT using Product B

1. Expand "Advanced Filters"
2. Click "Product Exclusion" template, or manually create:

**Group 1**:
- Field: **product**
- Operator: **equals**
- Value: **Native**

**Group 2**:
- Field: **product**
- Operator: **does not equal**
- Value: **FB**

3. Click "Analyze"

**Generated SQL**: `WHERE (product = 'Native') AND (product != 'FB')`

#### Example 3: Complex Team Revenue Comparison (OR Logic)
**Goal**: (Team A with revenue > 10k) OR (Team B with revenue > 15k)

1. Expand "Advanced Filters"
2. Click "Team Revenue Comparison" template, or:

**Group 1** (AND logic within group):
- Clause 1: **team** equals **Team A**
- Clause 2: **pid** is greater than **10000**

**Between groups**: Toggle to **OR**

**Group 2** (AND logic within group):
- Clause 1: **team** equals **Team B**
- Clause 2: **pid** is greater than **15000**

3. Click "Analyze"

**Generated SQL**:
```sql
WHERE (team = 'Team A' AND pid > 10000)
   OR (team = 'Team B' AND pid > 15000)
```

### Available Operators by Field Type

#### Numeric Fields (PID, MID, Zone ID)
- **equals** - Exact match
- **does not equal** - Exclude exact value
- **is one of** - Match any in list (multi-select)
- **is not one of** - Exclude list values (multi-select)
- **is greater than** - Strict greater than
- **is greater than or equal to** - Inclusive greater
- **is less than** - Strict less than
- **is less than or equal to** - Inclusive less
- **is between** - Range with two values
- **is empty** / **is not empty** - NULL checks

#### String Fields (Team, PIC, Publisher Name, etc.)
- **equals** - Exact match
- **does not equal** - Exclude value
- **is one of** - Match any in list
- **is not one of** - Exclude list
- **contains** - Substring match (e.g., "test" matches "test-publisher")
- **does not contain** - Exclude substring
- **starts with** - Prefix match
- **ends with** - Suffix match (publisher/media/zone names only)
- **matches pattern** - Regex match (publisher/media/zone names only)
- **is empty** / **is not empty** - NULL checks

#### Categorical Fields (Product, Revenue Tier, Rev Flag)
- **equals** - Exact match
- **does not equal** - Exclude value
- **is one of** - Match any in list
- **is not one of** - Exclude list
- **is empty** / **is not empty** - NULL checks

## Real-World Use Cases

### Use Case 1: Find Declining High-Value Publishers
**Scenario**: Alert on publishers with > $10k revenue in Period 1 but dropping > 20% in Period 2

**Solution**: Use simple filters for time comparison, then advanced filter:
- **Field**: pid
- **Operator**: is greater than
- **Value**: 10000

Then manually check % change in results, OR create custom threshold in advanced filter.

### Use Case 2: Exclude Test/Internal Publishers
**Scenario**: Remove all publishers with "test" or "internal" in their name

**Group 1**:
- **Field**: pubname
- **Operator**: does not contain
- **Value**: test

**Group 2**:
- **Field**: pubname
- **Operator**: does not contain
- **Value**: internal

**Between groups**: AND

### Use Case 3: Multi-Team Performance Tiers
**Scenario**: (Team A with tier A or B) OR (Team B with tier A)

**Group 1**:
- Clause 1: team equals Team A
- Clause 2: revenue_tier is one of [A, B]

**Between groups**: OR

**Group 2**:
- Clause 1: team equals Team B
- Clause 2: revenue_tier equals A

## Advanced Features

### Enable/Disable Clauses
- Click the eye icon (👁️) to temporarily disable a clause without deleting it
- Disabled clauses are shown with reduced opacity
- Useful for testing different filter combinations

### Filter Validation
- Required fields are validated before query execution
- Error messages appear below invalid clauses:
  - "Value required" - Empty value
  - "At least one value required" - Empty multi-select
  - "Both min and max required" - Incomplete range
  - "Min must be less than max" - Invalid range

### Saving Advanced Filters
1. Configure your advanced filters
2. Click the "Save" icon in the Filter Presets section
3. Give it a name and description
4. Your advanced filters are saved with the preset
5. Load the preset later to restore all filters

### Sharing Advanced Filter Presets
1. Save your advanced filter preset
2. Click the "⋮" menu next to the preset
3. Select "Share"
4. Enter colleague's email
5. They receive access to your advanced filter configuration

## Architecture Details

### Data Flow

```
User Input (UI)
    ↓
AdvancedFilters State
    ↓
FilterPresetManager (Save/Load)
    ↓
API Request Body { advancedFilters }
    ↓
Deep Dive API Route
    ↓
buildAdvancedWhereClause()
    ↓
SQL WHERE Clause
    ↓
BigQuery Execution
    ↓
Results
```

### SQL Generation

Advanced filters are converted to SQL using the `buildAdvancedWhereClause()` function:

**Input**:
```json
{
  "groups": [{
    "id": "abc",
    "logic": "AND",
    "clauses": [
      { "field": "pid", "operator": "greater_than", "value": 20000, "enabled": true }
    ]
  }],
  "groupLogic": "AND"
}
```

**Output**: `pid > 20000`

### Security

- **SQL Injection Protection**: All values are escaped using `escapeSqlValue()`
- **Type Validation**: Data types are enforced (string, number, date)
- **Regex Safety**: Regex patterns are escaped before execution
- **Team Filter Integration**: Special handling for team filters to respect existing team mapping logic

## Component Structure

```
CompactFilterPanel
├── Quick Filters (Existing)
└── AdvancedFilterBuilder
    ├── FilterGroup[]
    │   ├── GroupLogicToggle (AND/OR)
    │   └── FilterClause[]
    │       ├── EnableToggle
    │       ├── FieldSelector
    │       ├── OperatorSelector
    │       ├── ValueInput
    │       └── DeleteButton
    ├── AddGroupButton
    └── FilterTemplates
```

## Files Modified/Created

### New Files
- `lib/types/performanceTracker.ts` - Advanced filter types added
- `lib/services/analyticsQueries.ts` - SQL generation functions added
- `app/components/performance-tracker/AdvancedFilterBuilder.tsx` - NEW
- `app/components/performance-tracker/FilterGroup.tsx` - NEW
- `app/components/performance-tracker/FilterClause.tsx` - NEW

### Modified Files
- `app/(protected)/performance-tracker/deep-dive/page.tsx` - Added advanced filters state
- `app/components/performance-tracker/CompactFilterPanel.tsx` - Added advanced filter section
- `app/components/performance-tracker/FilterPresetManager.tsx` - Added advanced filters support
- `app/components/performance-tracker/UnifiedDeepDiveView.tsx` - Pass advanced filters to API
- `app/api/performance-tracker/deep-dive/route.ts` - Process advanced filters
- `lib/types/filterPreset.ts` - Added advanced_filters field

## Troubleshooting

### Problem: Filters not applying
**Solution**:
1. Check validation errors (red borders, error messages)
2. Ensure at least one clause is enabled
3. Click "Analyze" button to apply changes

### Problem: Unexpected results
**Solution**:
1. Check AND/OR logic between groups
2. Verify operator selection (e.g., "equals" vs "is one of")
3. Review generated SQL in browser console logs

### Problem: Saved preset not loading advanced filters
**Solution**:
1. Re-save the preset after configuring advanced filters
2. Presets saved before this feature was added won't have advanced filters
3. Create a new preset to include advanced filters

## Future Enhancements (Not Yet Implemented)

### Phase 3: Result Count Preview
- Show "Showing 24 of 150 items" before clicking Analyze
- Real-time count updates as filters change

### Additional Templates
- "Rising Stars" - New publishers with high growth
- "At Risk" - Established publishers with declining metrics
- "Product Migration" - Publishers using old product versions

### Advanced Date Filters
- Relative dates: "Last 7 days", "This month"
- Date ranges with operators

## Support

For questions or issues:
1. Check this documentation
2. Review console logs for SQL generation
3. Test with simple filters first
4. Contact the development team

---

**Last Updated**: January 2025
**Version**: 1.0
**Status**: Production Ready ✅
