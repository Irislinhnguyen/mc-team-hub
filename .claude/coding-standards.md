# Coding Standards & Best Practices

## Table Loading Skeletons

### ⚠️ IMPORTANT: Always Use Dynamic Skeletons

**DO NOT** use the old generic `TableSkeleton` component. Instead, **ALWAYS** use the dynamic skeleton components that match the actual table structure.

### Available Skeleton Components

1. **DataTableSkeleton** - For `DataTable` components
2. **LazyDataTableSkeleton** - For `LazyDataTable` components
3. **DynamicTableSkeleton** - Base component (rarely used directly)

### Import Location

```tsx
import { DataTableSkeleton, LazyDataTableSkeleton } from '@/app/components/performance-tracker/skeletons'
```

### Usage Pattern

#### Step 1: Define Column Configuration Once

```tsx
// Define columns at component level (NOT inside render)
const columns = [
  { key: 'date', label: 'date', width: '18%', format: (v) => new Date(v.value || v).toLocaleDateString() },
  { key: 'pid', label: 'pid', width: '12%' },
  { key: 'pubname', label: 'pubname', width: '40%' },
  { key: 'rev', label: 'rev', width: '15%' },
  { key: 'profit', label: 'profit', width: '15%' },
]
```

#### Step 2: Use Same Columns for Skeleton and Table

```tsx
{loading ? (
  // ✅ CORRECT: Pass columns to skeleton
  <DataTableSkeleton columns={columns} rows={10} />
) : (
  // Use same columns for actual table
  <DataTable
    title="Publisher Summary"
    columns={columns}
    data={data}
  />
)}
```

#### ❌ WRONG - Do Not Do This

```tsx
{loading ? (
  // ❌ WRONG: Generic skeleton without columns
  <TableSkeleton rows={10} />
) : (
  <DataTable
    columns={[...]}  // Columns defined here only
    data={data}
  />
)}
```

### DataTableSkeleton Props

```tsx
<DataTableSkeleton
  columns={columns}        // REQUIRED: Column configuration
  rows={10}                // Optional: Number of rows (default: 5)
  showGrandTotal={true}    // Optional: Show grand total footer (default: false)
  titleWidth="200px"       // Optional: Title skeleton width (default: "200px")
  variedWidths={true}      // Optional: Varied cell widths (default: true)
/>
```

### LazyDataTableSkeleton Props

```tsx
<LazyDataTableSkeleton
  columns={columns}        // REQUIRED: Column configuration
  rows={10}                // Optional: Number of rows (default: 7)
  showLoadingMore={false}  // Optional: Show "Loading more..." indicator (default: false)
  titleWidth="200px"       // Optional: Title skeleton width (default: "200px")
  variedWidths={true}      // Optional: Varied cell widths (default: true)
/>
```

### Smart Width Calculation

If you don't specify column widths, the skeleton will automatically calculate appropriate widths based on column types:

- **Date columns** (`date`, `time`): 18%
- **ID columns** (`pid`, `mid`, `zid`, `*id`): 10%
- **Name columns** (`*name`, `product`, `team`): 30%
- **Metric columns** (`rev`, `profit`, `req`, `paid`, `cpm`, `rate`): 12%
- **Default**: 15%

```tsx
// Even without widths, skeleton will look good
const columns = [
  { key: 'pid', label: 'pid' },          // Auto: 10%
  { key: 'pubname', label: 'pubname' },  // Auto: 30%
  { key: 'revenue', label: 'revenue' },  // Auto: 12%
]
```

### Examples from Real Pages

#### Business Health Page

```tsx
const listOfPidColumns = [
  { key: 'pid', label: 'pid', width: '15%' },
  { key: 'pubname', label: 'pubname', width: '45%' },
  { key: 'rev', label: 'rev', width: '20%' },
  { key: 'profit', label: 'profit', width: '20%' },
]

{loading ? (
  <LazyDataTableSkeleton columns={listOfPidColumns} rows={10} />
) : (
  <LazyDataTable
    title="List of PID"
    columns={listOfPidColumns}
    data={listOfPidData}
    onLoadMore={loadMore}
    hasMore={hasMore}
  />
)}
```

#### Profit Projections Page

```tsx
const pidColumns = useMemo(() => generateColumns('pid', metricType), [metricType])

{loading ? (
  <DataTableSkeleton
    columns={pidColumns}
    rows={10}
    showGrandTotal={true}  // Match actual table with grand total
  />
) : (
  <DataTable
    title="Publisher (PID) Profit Projections"
    columns={pidColumns}
    data={pidDataWithTotal}
  />
)}
```

### Benefits

1. **No Layout Shift**: Skeleton matches exact table structure
2. **Better UX**: Users see realistic loading state
3. **DRY Code**: Column config defined once, reused everywhere
4. **Type-Safe**: Uses same `ColumnConfig` type as tables
5. **Maintainable**: Change columns in one place

### Migration Checklist

When updating existing pages:

- [ ] Import new skeleton components
- [ ] Define column configuration at component level
- [ ] Replace `<TableSkeleton />` with appropriate dynamic skeleton
- [ ] Pass `columns` prop to skeleton
- [ ] Reuse same `columns` in actual table
- [ ] Add `showGrandTotal={true}` if table has grand total footer
- [ ] Test loading state to verify skeleton matches table

### Related Files

- Skeleton components: `app/components/performance-tracker/skeletons/`
- Utilities: `lib/utils/skeletonHelpers.ts`
- Column configs: `lib/config/tableColumns.ts`
- Documentation: `app/components/performance-tracker/skeletons/README.md`

---

## Other Coding Standards

### Component Organization

- Place reusable components in `app/components/`
- Page-specific components can stay in page folders
- Shared utilities in `lib/`

### Type Safety

- Always define TypeScript interfaces for data structures
- Use `ColumnConfig` type from `lib/types/performanceTracker.ts`
- Avoid `any` types when possible

### Performance

- Memoize expensive computations with `useMemo`
- Use React Query for data fetching and caching
- Implement lazy loading for large datasets

### Styling

- Use Tailwind CSS classes
- Use design tokens from `lib/design-tokens.ts`
- Use colors from `lib/colors.ts`
- Follow Shadcn UI patterns for consistency
