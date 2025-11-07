# Entity-Level Filtering - Quick Start Guide

## 🎯 What Problem Does This Solve?

**Before**: Could only filter individual rows
- Example: Show rows where product = 'standardbanner'
- Problem: Couldn't find MIDs that use standardbanner but NOT flexiblesticky

**After**: Can filter entire entities (MIDs/PIDs/ZIDs)
- Example: Show MIDs that use standardbanner but NOT flexiblesticky
- Solution: New natural language operators handle entity-level logic

## 🚀 How to Use

### Step 1: Open Advanced Filters
```
CompactFilterPanel → "Advanced Filters" button → "Create New Filter"
```

### Step 2: Configure Your Filter

#### Example: MIDs using standardbanner but NOT flexiblesticky

```
┌─────────────────────────────────────────────────────────┐
│ Filter Name: MIDs with standardbanner but no flexible   │
├─────────────────────────────────────────────────────────┤
│ Mode: [Include ▼]  ← Compact dropdown (was big buttons) │
├─────────────────────────────────────────────────────────┤
│ Conditions:                                             │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Product ▼] [has this value ▼] [standardbanner ▼]  │ │
│ │                                          [👁] [🗑]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│                      [AND ▼]  ← Badge shows logic       │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ [Product ▼] [does not have ▼] [flexiblesticky ▼]   │ │
│ │                                          [👁] [🗑]   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│         [+ Add Condition]                               │
├─────────────────────────────────────────────────────────┤
│ Combine conditions with: [AND ▼]  ← Compact dropdown    │
├─────────────────────────────────────────────────────────┤
│ Preview:                                                │
│ Include records where:                                  │
│   • product has this value 'standardbanner'             │
│   AND                                                   │
│   • product does not have this value 'flexiblesticky'   │
└─────────────────────────────────────────────────────────┘

[Cancel]  [Save Filter]
```

### Step 3: Save and Load
```
1. Click "Save Filter"
2. Filter appears in saved filters list
3. Select it from list
4. Click "Load Selected"
5. Click "Analyze" to apply
```

## 🎨 New Natural Language Operators

### For Entity-Level Filtering

| Operator Label | What It Does | Example Use Case |
|----------------|--------------|------------------|
| **has this value** | Entities that have this value | MIDs using standardbanner |
| **does not have this value** | Entities that don't have this value | MIDs NOT using flexiblesticky |
| **only has these values** | Entities with ONLY these values | MIDs using ONLY standardbanner and flexiblesticky (no others) |
| **has all of these values** | Entities with ALL listed values | MIDs using both standardbanner AND flexiblesticky (may have others) |
| **has any of these values** | Entities with ANY listed value | MIDs using standardbanner OR flexiblesticky |

### When to Use Each Operator

#### Scenario 1: Find MIDs using a specific product
```
Field: product
Operator: "has this value"
Value: standardbanner
Result: All MIDs that have at least one zone using standardbanner
```

#### Scenario 2: Exclude MIDs using a specific product
```
Field: product
Operator: "does not have this value"
Value: flexiblesticky
Result: All MIDs that have zero zones using flexiblesticky
```

#### Scenario 3: MIDs using ONLY certain products
```
Field: product
Operator: "only has these values"
Value: [standardbanner, flexiblesticky]  ← Multi-select
Result: MIDs using ONLY these two products, no others
```

#### Scenario 4: MIDs using BOTH products
```
Field: product
Operator: "has all of these values"
Value: [standardbanner, flexiblesticky]  ← Multi-select
Result: MIDs using BOTH products (may also use others)
```

#### Scenario 5: MIDs using EITHER product
```
Field: product
Operator: "has any of these values"
Value: [standardbanner, flexiblesticky]  ← Multi-select
Result: MIDs using at least one of these products
```

## 🔍 Real-World Examples

### Example 1: High-Value MIDs Without Problem Products
**Goal**: Find MIDs in Tier ">10000" that don't use "flexiblesticky"

```
Mode: Include

Condition 1:
  revenue_tier | has this value | >10000

Logic: AND

Condition 2:
  product | does not have this value | flexiblesticky
```

**Result**: Shows only high-value MIDs that aren't using the problem product

### Example 2: Team-Specific Product Analysis
**Goal**: Find MIDs managed by Team A using standardbanner

```
Mode: Include

Condition 1:
  team | has this value | Team A

Logic: AND

Condition 2:
  product | has this value | standardbanner
```

**Result**: Shows MIDs from Team A portfolio that use standardbanner

### Example 3: Clean Product Adoption
**Goal**: MIDs using ONLY modern products (no legacy)

```
Mode: Include

Condition 1:
  product | only has these values | [standardbanner, flexiblesticky, videoads]
```

**Result**: MIDs exclusively using the selected products

## 📊 Understanding the SQL (Optional)

You don't need to understand this, but if you're curious:

### "has this value" generates:
```sql
mid IN (SELECT DISTINCT mid FROM table WHERE product = 'standardbanner')
```

### "does not have this value" generates:
```sql
mid NOT IN (SELECT DISTINCT mid FROM table WHERE product = 'flexiblesticky')
```

### Combined (your use case) generates:
```sql
WHERE (
  mid IN (SELECT DISTINCT mid WHERE product = 'standardbanner')
  AND
  mid NOT IN (SELECT DISTINCT mid WHERE product = 'flexiblesticky')
)
```

**Translation**: "Show me MIDs that appear in the standardbanner list AND don't appear in the flexiblesticky list"

## ✨ UI Improvements

### Before
```
┌────────────────────────────────────────┐
│ Filter Mode                            │
│ ┌────────────────┬─────────────────┐  │
│ │   INCLUDE      │    EXCLUDE      │  │  ← Large, visually heavy
│ │   (selected)   │                 │  │
│ └────────────────┴─────────────────┘  │
└────────────────────────────────────────┘
```

### After
```
┌────────────────────────────────────────┐
│ Mode: [Include ▼]  ← Compact, colored │
└────────────────────────────────────────┘
```

Same improvement for AND/OR toggle - now a compact colored dropdown.

## 🎯 Tips for Best Results

1. **Start Simple**: Try single-condition filters first
2. **Use Preview**: Always check the preview before saving
3. **Name Clearly**: Use descriptive names like "High-value MIDs without legacy products"
4. **Test Small**: Apply to small date range first to verify results
5. **Combine Logically**: Use AND when all conditions must be true, OR when any condition is sufficient

## 🐛 Troubleshooting

### Filter returns no results?
- Check that conditions aren't contradictory
- Verify value spelling matches exactly (case-sensitive)
- Try broader date range

### Filter returns too many results?
- Add more conditions with AND logic
- Use more specific operators (e.g., "only has" instead of "has")

### Unsure which operator to use?
- "has this value" - Most common, includes entities with this value
- "does not have this value" - Excludes entities with this value
- When in doubt, start with these two

## 📝 Quick Reference

| Want to... | Use Operator | Logic |
|-----------|--------------|-------|
| Include MIDs with X | has this value | - |
| Exclude MIDs with X | does not have this value | - |
| MIDs with X but not Y | has X (AND) does not have Y | AND |
| MIDs with X or Y | has any of these [X, Y] | - |
| MIDs with both X and Y | has all of these [X, Y] | - |
| MIDs with ONLY X and Y | only has these [X, Y] | - |

---

**Need Help?** Check the preview - it shows in plain English what your filter does!
