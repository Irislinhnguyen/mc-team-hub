# New Sales BigQuery Tables - Schema & Data Analysis Report

**Date:** October 31, 2025
**Author:** Claude Code
**Purpose:** Research New Sales BigQuery tables to understand data schema, date storage, and design practical date filtering UX

---

## Executive Summary

The New Sales page uses **3 BigQuery tables** with **MIXED date storage formats**:
- **Tables 1 & 3** use `DATE` type columns (start_date, end_date)
- **Table 2** uses separate `INTEGER` columns (year, month)

This mixed format creates complexity for date filtering. Current implementation uses **date range overlap filtering** for start_date/end_date and **year/month range filtering** for the monthly summary table.

---

## Table 1: `new_sales_master`

### Purpose
All new sales over time - shows individual publishers with their contract dates and revenue metrics.

### Schema
```
team: STRING (NULLABLE)
pid: INTEGER (NULLABLE)
pubname: STRING (NULLABLE)
pic: STRING (NULLABLE)
start_date: DATE (NULLABLE)          <-- DATE TYPE
end_date: DATE (NULLABLE)            <-- DATE TYPE
rev_last_month: FLOAT (NULLABLE)
rev_this_month: FLOAT (NULLABLE)
profit_last_month: FLOAT (NULLABLE)
profit_this_month: FLOAT (NULLABLE)
```

### Key Date Fields
- **start_date**: DATE type - Contract start date
- **end_date**: DATE type - Contract end date
- **Format**: Returns as object with `.value` property containing string like "2025-03-18"

### Data Coverage
- **Rows**: 127 total records
- **Size**: 12,101 bytes
- **Date Range**:
  - start_date: 2024-11-01 to 2025-10-29
  - end_date: 2024-12-16 to 2026-01-27 (extends into future)

### Sample Data
```json
{
  "team": "UNKNOWN",
  "pid": 38201,
  "pubname": "Tugu Media Group",
  "pic": null,
  "start_date": { "value": "2025-03-18" },
  "end_date": { "value": "2025-06-16" },
  "rev_last_month": 0.3929,
  "rev_this_month": 0,
  "profit_last_month": 0.07858,
  "profit_this_month": 0
}
```

### Current Filtering Logic
From `analyticsQueries.ts` lines 650-654:
```typescript
// Filter where the contract period overlaps with the selected date range
if (filters.startDate && filters.endDate) {
  conditions.push(`(start_date <= '${filters.endDate}' AND end_date >= '${filters.startDate}')`)
}
```

**Logic**: Shows contracts that overlap with selected date range (not exact match).

---

## Table 2: `final_sales_monthly`

### Purpose
Summary charts and tables - aggregated monthly revenue/profit by team and PIC.

### Schema
```
team: STRING
pic: STRING
year: INTEGER                        <-- INTEGER TYPE
month: INTEGER                       <-- INTEGER TYPE
total_revenue: FLOAT
total_profit: FLOAT
```

### Key Date Fields
- **year**: INTEGER (e.g., 2024, 2025)
- **month**: INTEGER (1-12)
- **NO DATE column** - uses separate year/month integers instead

### Data Coverage
- **Rows**: 121 total records
- **Size**: 6,063 bytes
- **Date Range**:
  - year: 2024 to 2025
  - month: 1 to 12
- **Recent months available**: 2025-10, 2025-09, 2025-08, 2025-07, 2025-06, 2025-05, 2025-04, 2025-03, 2025-02, 2025-01, 2024-12, 2024-11

### Sample Data
```json
{
  "team": "APP",
  "pic": "VN_anhtn",
  "year": 2024,
  "month": 11,
  "total_revenue": 363.43020000000007,
  "total_profit": 55.773445
}
```

### Current Filtering Logic
From `analyticsQueries.ts` lines 688-701:
```typescript
if (filters.startDate && filters.endDate) {
  const startDate = new Date(filters.startDate)
  const endDate = new Date(filters.endDate)
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth() + 1
  const endYear = endDate.getFullYear()
  const endMonth = endDate.getMonth() + 1

  // Filter: (year > startYear OR (year = startYear AND month >= startMonth))
  //     AND (year < endYear OR (year = endYear AND month <= endMonth))
  monthlySummaryConditions.push(
    `((year > ${startYear} OR (year = ${startYear} AND month >= ${startMonth})) AND (year < ${endYear} OR (year = ${endYear} AND month <= ${endMonth})))`
  )
}
```

**Logic**: Converts date range to year/month range and filters accordingly.

---

## Table 3: `newsales_by_pid`

### Purpose
Sales-CS breakdown - detailed breakdown by publisher and month showing sales vs CS revenue/profit.

### Schema
```
pid: INTEGER
pubname: STRING
pic: STRING
team: STRING
start_date: DATE                     <-- DATE TYPE
end_date: DATE                       <-- DATE TYPE
year: INTEGER                        <-- INTEGER TYPE
month: INTEGER                       <-- INTEGER TYPE
sales_rev: FLOAT
sales_profit: FLOAT
cs_rev: FLOAT
cs_profit: FLOAT
total_pub_rev: FLOAT
total_pub_profit: FLOAT
```

### Key Date Fields
- **start_date**: DATE type - Contract start date
- **end_date**: DATE type - Contract end date
- **year**: INTEGER - Year of the data point
- **month**: INTEGER - Month of the data point (1-12)
- **HYBRID**: Has BOTH date fields AND year/month integers

### Data Coverage
- **Rows**: 335 total records
- **Size**: 42,577 bytes
- **Date Range**:
  - start_date: 2024-11-01 to 2025-10-29
  - end_date: 2024-12-16 to 2026-01-27
  - year: 2024 to 2025
  - month: 1 to 12

### Sample Data
```json
{
  "pid": 1590,
  "pubname": "Cedric Thomas Collemine",
  "pic": "VN_linhnt",
  "team": "WEB_GI",
  "start_date": { "value": "2025-07-17" },
  "end_date": { "value": "2025-10-15" },
  "year": 2025,
  "month": 10,
  "sales_rev": 4.1,
  "sales_profit": 1.16,
  "cs_rev": 4.1,
  "cs_profit": 1.16,
  "total_pub_rev": 8.19,
  "total_pub_profit": 2.32
}
```

### Current Filtering Logic
From `analyticsQueries.ts` lines 724-787:
```typescript
// Uses same overlap logic as new_sales_master
if (filters.startDate && filters.endDate) {
  breakdownConditions.push(`(start_date <= '${filters.endDate}' AND end_date >= '${filters.startDate}')`)
}

// Also supports direct month/year filtering
if (filters.month) {
  breakdownConditions.push(`month = ${filters.month}`)
}
if (filters.year) {
  breakdownConditions.push(`year = ${filters.year}`)
}
```

**Logic**: Date range uses overlap filtering, but also supports direct month/year filters for cross-filtering.

---

## Data Type Details

### How BigQuery Returns Dates

When querying DATE columns, BigQuery Node.js client returns them as:
```javascript
{
  "start_date": {
    "value": "2025-03-18"  // String in YYYY-MM-DD format
  }
}
```

NOT as JavaScript Date objects, but as objects with a `.value` property containing the date string.

### Type Summary by Table

| Table | Date Storage | Format |
|-------|--------------|--------|
| new_sales_master | DATE columns | start_date, end_date (DATE type) |
| final_sales_monthly | INTEGER columns | year, month (separate integers) |
| newsales_by_pid | HYBRID | Both DATE (start_date, end_date) AND INTEGER (year, month) |

---

## Current Filtering Implementation Analysis

### Date Range Filtering Strategy

The current implementation uses **TWO different strategies**:

#### Strategy 1: Overlap Filtering (for DATE columns)
Used in `new_sales_master` and `newsales_by_pid`:
```sql
WHERE start_date <= '2025-10-31' AND end_date >= '2025-01-01'
```
This shows contracts that have **any overlap** with the selected date range.

**Pros:**
- Captures active contracts during the period
- User-friendly for contract-based data
- Shows "everything that was active during this time"

**Cons:**
- Not exact date matching
- May show contracts that started before or ended after the range
- Can be confusing for users expecting exact matches

#### Strategy 2: Year/Month Range Filtering (for INTEGER columns)
Used in `final_sales_monthly`:
```sql
WHERE (year > 2025 OR (year = 2025 AND month >= 1))
  AND (year < 2025 OR (year = 2025 AND month <= 10))
```

**Pros:**
- Exact month-level filtering
- Clear and predictable
- Efficient for monthly aggregated data

**Cons:**
- Complex SQL logic
- Can't filter by specific days within a month
- Loses day-level granularity

### Issues & Inconsistencies

1. **Mixed Date Storage**: Having both DATE and INTEGER formats creates confusion and implementation complexity.

2. **Date Object Handling**: Frontend needs to handle `.value` property when displaying dates (see page.tsx lines 279, 290, 561, 567).

3. **No DATE Column in Table 2**: The `final_sales_monthly` table lacks a DATE column entirely, forcing the year/month integer approach.

4. **Tab-Specific Defaults**:
   - Summary tab: No default date filter (shows all time)
   - Details tab: Defaults to last 6 months
   - This creates inconsistent UX

5. **Filter Application**: Date filtering logic is complex and split across multiple conditions in the query builder.

---

## Date Range Coverage Summary

| Table | Earliest Date | Latest Date | Total Records |
|-------|---------------|-------------|---------------|
| new_sales_master | 2024-11-01 | 2026-01-27 | 127 |
| final_sales_monthly | 2024-11 | 2025-10 | 121 |
| newsales_by_pid | 2024-11-01 | 2026-01-27 | 335 |

**Overall Coverage**: Approximately **12 months** of historical data (Nov 2024 - Oct 2025), with some contracts extending into 2026.

---

## Recommendations for Date Filtering UX

### Option 1: Month/Year Picker (Recommended)
**Best fit** given the data structure:
- Use a month/year picker instead of day-level date picker
- Matches the granularity of `final_sales_monthly` table
- Simplifies filtering logic
- Clearer UX for users (most data is monthly anyway)

### Option 2: Date Range with Clear Overlap Semantics
If keeping date range picker:
- Add tooltip: "Shows contracts active during this period"
- Make it clear this is overlap-based, not exact matching
- Consider adding toggle for "exact match" vs "overlap" mode

### Option 3: Hybrid Approach
- Summary tab: Month/year picker (since it uses `final_sales_monthly`)
- Details tab: Date range picker (since it uses tables with DATE columns)
- Different UX per tab, but matches the underlying data structure

### Option 4: Add Computed DATE Column to Table 2
Backend solution:
- Add a computed DATE column to `final_sales_monthly` (e.g., first day of the month)
- Standardize all filtering to use DATE columns
- Simplifies frontend logic significantly

---

## Technical Notes

### Date Formatting in Frontend
Current approach (from page.tsx):
```typescript
{ key: 'start_date', label: 'start_date', format: (v: any) => v?.value || v }
```

This handles both:
- BigQuery DATE objects: `{ value: "2025-03-18" }`
- Raw strings: `"2025-03-18"`

### Query Execution
All queries execute in parallel via `Promise.all()` for performance (see route.ts lines 17-33).

### Filter Panel Configuration
The `FilterPanel` component receives:
```typescript
includeDateInFilters={false}  // For summary tab - doesn't send date to backend
initialStartDate={null}       // Summary: no default
initialEndDate={null}         // Summary: no default
// Details tab uses last 6 months default
```

---

## Files Analyzed

1. **Query Definitions**: `D:\code-project\query-stream-ai\lib\services\analyticsQueries.ts`
   - Lines 641-897: `getNewSalesQueries()` function
   - Lines 4-129: `buildWhereClause()` helper (not used by New Sales)

2. **Frontend Page**: `D:\code-project\query-stream-ai\app\(protected)\analytics\new-sales\page.tsx`
   - Lines 85-90: Default date range (6 months for details tab)
   - Lines 152-170: Filter configuration
   - Lines 279-298: Date formatting in table columns

3. **API Route**: `D:\code-project\query-stream-ai\app\api\analytics\new-sales\route.ts`
   - Lines 17-33: Parallel query execution

4. **Test Scripts Created**:
   - `test-new-sales-schema.mjs`: Sample data queries
   - `test-new-sales-metadata.mjs`: Schema metadata extraction

---

## Conclusion

The New Sales tables use a **mixed date storage approach**:
- **DATE type** for contract dates (start_date, end_date)
- **INTEGER type** for monthly aggregations (year, month)

Current filtering works but is complex due to this hybrid approach. For the best UX, consider:
1. **Month/year picker** to match data granularity
2. **Standardize date storage** if possible (add DATE column to Table 2)
3. **Clear documentation** of overlap vs exact filtering behavior
4. **Consistent defaults** across tabs

The data covers ~12 months (Nov 2024 - Oct 2025) with 583 total records across all tables.
