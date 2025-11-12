# Dynamic Table Skeleton Components

Skeleton loading components that automatically adapt to match the structure of actual tables.

## Features

- **Column-aware**: Skeleton matches exact column count and widths from table configuration
- **Varied widths**: Natural-looking varied cell widths for realistic loading appearance
- **Type-specific**: Specialized variants for DataTable and LazyDataTable
- **Smart defaults**: Intelligent width calculation based on column types when not specified

## Components

### DynamicTableSkeleton

Base skeleton component with dynamic column structure.

```tsx
import { DynamicTableSkeleton } from '@/app/components/performance-tracker/skeletons'

const columns = [
  { key: 'date', label: 'date', width: '18%' },
  { key: 'pid', label: 'pid', width: '12%' },
  { key: 'pubname', label: 'pubname', width: '40%' },
  { key: 'rev', label: 'rev', width: '15%' },
  { key: 'profit', label: 'profit', width: '15%' },
]

<DynamicTableSkeleton columns={columns} rows={5} />
```

### DataTableSkeleton

Specialized skeleton for DataTable with filter buttons and optional grand total footer.

```tsx
import { DataTableSkeleton } from '@/app/components/performance-tracker/skeletons'
import { getColumns, COLUMN_SETS } from '@/lib/config/tableColumns'

const columns = getColumns(COLUMN_SETS.PUBLISHER)

<DataTableSkeleton
  columns={columns}
  rows={5}
  showGrandTotal={true}
/>
```

### LazyDataTableSkeleton

Specialized skeleton for LazyDataTable with search input and striped rows.

```tsx
import { LazyDataTableSkeleton } from '@/app/components/performance-tracker/skeletons'

const columns = [
  { key: 'zid', label: 'zid', width: '10%' },
  { key: 'zonename', label: 'zonename', width: '30%' },
  { key: 'product', label: 'product', width: '15%' },
  { key: 'rev', label: 'rev', width: '15%' },
]

<LazyDataTableSkeleton
  columns={columns}
  rows={7}
  showLoadingMore={false}
/>
```

## Usage Pattern

### Before (Generic Skeleton)

```tsx
import TableSkeleton from './skeletons/TableSkeleton'

{loading ? (
  <TableSkeleton rows={5} />
) : (
  <DataTable
    title="Publisher Summary"
    columns={[
      { key: 'pid', label: 'pid', width: '15%' },
      { key: 'pubname', label: 'pubname', width: '45%' },
      { key: 'rev', label: 'rev', width: '20%' },
      { key: 'profit', label: 'profit', width: '20%' },
    ]}
    data={data}
  />
)}
```

**Problem**: Skeleton shows generic layout that doesn't match actual table columns.

### After (Dynamic Skeleton)

```tsx
import { DataTableSkeleton } from './skeletons'

const columns = [
  { key: 'pid', label: 'pid', width: '15%' },
  { key: 'pubname', label: 'pubname', width: '45%' },
  { key: 'rev', label: 'rev', width: '20%' },
  { key: 'profit', label: 'profit', width: '20%' },
]

{loading ? (
  <DataTableSkeleton columns={columns} rows={5} />
) : (
  <DataTable
    title="Publisher Summary"
    columns={columns}
    data={data}
  />
)}
```

**Benefits**:
- Skeleton exactly matches table structure
- Shared column configuration (DRY principle)
- Better user experience - no layout shift

## Props

### Common Props (All Variants)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `columns` | `ColumnConfig[]` | **required** | Column configuration from table |
| `rows` | `number` | `5` | Number of skeleton rows to display |
| `titleWidth` | `string` | `"200px"` | Width of title skeleton |
| `variedWidths` | `boolean` | `true` | Enable varied cell widths for natural appearance |

### DataTableSkeleton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showGrandTotal` | `boolean` | `false` | Show grand total footer skeleton |

### LazyDataTableSkeleton

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLoadingMore` | `boolean` | `false` | Show "Loading more..." indicator |

## Smart Width Calculation

When column widths are not specified, the skeleton uses intelligent defaults based on column type:

- **Date columns** (`date`, `time`): 18%
- **ID columns** (`pid`, `mid`, `zid`, `*id`): 10%
- **Name columns** (`*name`, `product`, `team`): 30%
- **Metric columns** (`rev`, `profit`, `req`, `paid`, `cpm`, `rate`): 12%
- **Default**: 15%

Example:

```tsx
const columns = [
  { key: 'pid', label: 'pid' },        // Auto: 10%
  { key: 'pubname', label: 'pubname' }, // Auto: 30%
  { key: 'revenue', label: 'revenue' }, // Auto: 12%
]

<DynamicTableSkeleton columns={columns} />
// Generates proper widths automatically
```

## Migration Guide

1. **Import new skeleton components**:
   ```tsx
   import { DataTableSkeleton, LazyDataTableSkeleton } from '@/app/components/performance-tracker/skeletons'
   ```

2. **Define column configuration once** (if not already):
   ```tsx
   const columns = [
     { key: 'date', label: 'date', width: '18%' },
     { key: 'pid', label: 'pid', width: '12%' },
     // ... other columns
   ]
   ```

3. **Replace old skeleton with new**:
   ```tsx
   // Before
   <TableSkeleton rows={10} />

   // After
   <DataTableSkeleton columns={columns} rows={10} />
   ```

4. **Use shared columns in table**:
   ```tsx
   <DataTable columns={columns} data={data} />
   ```

## Implementation Details

### Structure Matching

The skeletons replicate the exact structure of their corresponding tables:

- **Sticky header** with matching background color
- **Column count and widths** from configuration
- **Filter buttons** (DataTableSkeleton only)
- **Search input** (LazyDataTableSkeleton only)
- **Pagination controls** at bottom
- **Dynamic height** based on row count (same as real tables)
- **Grand total footer** (DataTableSkeleton optional)

### Performance

- Lightweight components with minimal re-renders
- No data fetching or processing
- Pure presentational components
- Memoization-friendly (stable props)

## Files

- `DynamicTableSkeleton.tsx` - Base component
- `DataTableSkeleton.tsx` - DataTable variant
- `LazyDataTableSkeleton.tsx` - LazyDataTable variant
- `index.ts` - Exports
- `/lib/utils/skeletonHelpers.ts` - Utility functions

## Related

- [DataTable Component](../DataTable.tsx)
- [LazyDataTable Component](../LazyDataTable.tsx)
- [Column Configuration](../../../../lib/config/tableColumns.ts)
