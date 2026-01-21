# Multi-Select Operators Guide

## Overview

The Advanced Filter system now supports **multi-select** for operators that require multiple values. This makes operators like "has all" and "has any" meaningful and powerful.

## Supported Multi-Value Operators

### 1. **in** (Branch 2 - Direct)
- **Usage**: `field in [value1, value2, ...]`
- **Logic**: Matches rows where the field equals ANY of the specified values (OR logic)
- **Example**: `team in ['web_gi', 'web_gti']` → data from web_gi OR web_gti

### 2. **has_all** (Branch 1 - Entity)
- **Usage**: `entity has_all attribute in [value1, value2, ...]`
- **Logic**: Entity must have ALL specified values for the attribute (may have others too)
- **Example**: `MID has_all product in ['standardbanner', 'video']` → MIDs that have BOTH products
- **When to use**: Find entities that definitely have certain characteristics

### 3. **has_any** (Branch 1 - Entity)
- **Usage**: `entity has_any attribute in [value1, value2, ...]`
- **Logic**: Entity needs at least ONE of the specified values
- **Example**: `MID has_any product in ['standardbanner', 'video']` → MIDs with at least one of these products
- **When to use**: Cast a wider net, find entities with any of the characteristics

### 4. **only_has** (Branch 1 - Entity)
- **Usage**: `entity only_has attribute in [value1, value2, ...]`
- **Logic**: Entity has ONLY the specified values and nothing else
- **Example**: `MID only_has product in ['standardbanner', 'video']` → MIDs with exactly these 2 products, no others
- **When to use**: Find pure/exclusive entities

## UI Implementation

### Component: HorizontalFilterClause.tsx

**Line 146-149**: Detection logic
```typescript
const needsMultipleValues = ['in', 'only_has', 'has_all', 'has_any'].includes(effectiveOperator)
```

**Lines 248-256**: Multi-select input
```typescript
{needsMultipleValues && fieldOptions.length > 0 ? (
  <MultiSelectFilter
    label=""
    options={fieldOptionsForMultiSelect}
    value={Array.isArray(clause.value) ? clause.value : clause.value ? [clause.value] : []}
    onChange={handleValueChange}
    compact={true}
    disabled={!clause.enabled}
  />
```

### Features

1. **Automatic detection**: When you select "has all", "has any", "only has", or "in" operators, the UI automatically switches to multi-select mode
2. **Search**: Type to filter options in the dropdown
3. **Select All**: Quickly select/deselect all options with one click
4. **Visual feedback**: Shows count of selected items (e.g., "3 selected")
5. **Compact mode**: Integrated seamlessly into the horizontal filter clause layout

## Real-World Examples

### Example 1: Find MIDs with multiple specific products
```
Field: MID
Operator: has_all
Attribute: product
Condition: in
Value: [standardbanner, video, mobile]
```
**Result**: Only MIDs that have all 3 products (may have others too)

### Example 2: Find data from multiple teams
```
Field: team
Operator: in
Value: [web_gi, web_gti, web_adm]
```
**Result**: All data from any of these 3 teams

### Example 3: Find PICs working on video OR mobile
```
Field: PIC
Operator: has_any
Attribute: product
Condition: in
Value: [video, mobile]
```
**Result**: PICs who work on video, mobile, or both

### Example 4: Find pure banner-only MIDs
```
Field: MID
Operator: only_has
Attribute: product
Condition: in
Value: [standardbanner]
```
**Result**: MIDs that only have standardbanner, no other products

## SQL Generation

The system properly handles these operators in SQL:

### has_all → HAVING COUNT(DISTINCT ...)
```sql
MID IN (
  SELECT mid
  WHERE product IN ('standardbanner', 'video')
  GROUP BY mid
  HAVING COUNT(DISTINCT product) = 2
)
```

### has_any → EXISTS with OR
```sql
MID IN (
  SELECT DISTINCT mid
  WHERE product IN ('standardbanner', 'video')
)
```

### only_has → Set equality check
```sql
MID IN (
  SELECT mid
  WHERE product IN ('standardbanner', 'video')
  GROUP BY mid
  HAVING COUNT(DISTINCT product) = 2
    AND NOT EXISTS (
      SELECT 1 WHERE product NOT IN ('standardbanner', 'video')
    )
)
```

### in → Simple IN clause
```sql
team IN ('web_gi', 'web_gti')
```

## Tips

1. **Meaningful combinations**: Multi-value operators only make sense with 2+ values selected
2. **Performance**: "has_all" and "only_has" require subqueries with grouping - use judiciously for large datasets
3. **Clarity**: Name your saved filters descriptively to remember the logic (e.g., "MIDs with Video AND Banner")
4. **Merging**: When merging multiple filters, all clauses are combined with AND logic

## Testing

Run the test to verify functionality:
```bash
node test-multi-value-operators.mjs
```

This will show examples of how each operator works with multiple values.
