import { useMemo } from 'react';
import type { CrossFilter } from '../../app/contexts/CrossFilterContext';

/**
 * Pure filtering function (no React hooks) for use in custom memoization
 * PERFORMANCE: Use this directly in useMemo to batch multiple filtering operations
 *
 * @param data - The dataset to filter
 * @param crossFilters - Active cross-filters from context
 * @returns Filtered data array
 */
export function filterDataMulti<T extends Record<string, any>>(
  data: T[] | undefined,
  crossFilters: CrossFilter[]
): T[] {
  if (!data || data.length === 0) {
    return [];
  }

  if (!crossFilters || crossFilters.length === 0) {
    return data;
  }

  // Group filters by field
  const filtersByField = crossFilters.reduce((acc, filter) => {
    if (!acc[filter.field]) {
      acc[filter.field] = [];
    }
    acc[filter.field].push(filter.value);
    return acc;
  }, {} as Record<string, string[]>);

  // Apply filters: OR within same field, AND across different fields
  return data.filter((row) => {
    return Object.entries(filtersByField).every(([field, values]) => {
      // Skip filter if field doesn't exist in this dataset
      if (!(field in row)) {
        return true;
      }

      const fieldValue = row[field];

      if (fieldValue == null) {
        return values.some(v => v === '' || v === 'null');
      }

      const rowValue = String(fieldValue).trim();
      return values.some(filterValue =>
        rowValue === String(filterValue).trim()
      );
    });
  });
}

/**
 * Client-side filtering hook for cross-filters
 * Filters data locally without API calls for instant UX
 *
 * @param data - The dataset to filter
 * @param crossFilters - Active cross-filters from context
 * @returns Filtered data based on cross-filters
 */
export function useClientSideFilter<T extends Record<string, any>>(
  data: T[] | undefined,
  crossFilters: CrossFilter[]
): {
  filteredData: T[];
  isClientFiltered: boolean;
  filterCount: number;
} {
  const result = useMemo(() => {
    // No data to filter
    if (!data || data.length === 0) {
      return {
        filteredData: [],
        isClientFiltered: false,
        filterCount: 0,
      };
    }

    // No filters applied
    if (!crossFilters || crossFilters.length === 0) {
      return {
        filteredData: data,
        isClientFiltered: false,
        filterCount: 0,
      };
    }

    // Apply all cross-filters (AND logic)
    const filtered = data.filter((row) => {
      return crossFilters.every((filter) => {
        const fieldValue = row[filter.field];

        // Handle null/undefined
        if (fieldValue == null) {
          return filter.value === '' || filter.value === 'null';
        }

        // Convert both to strings for comparison
        const rowValue = String(fieldValue).trim();
        const filterValue = String(filter.value).trim();

        return rowValue === filterValue;
      });
    });

    return {
      filteredData: filtered,
      isClientFiltered: true,
      filterCount: crossFilters.length,
    };
  }, [data, crossFilters]);

  return result;
}

/**
 * Multi-value filter variant
 * Used when cross-filters for same field should be OR'd together
 *
 * Example:
 * - crossFilters = [{ field: 'pid', value: '123' }, { field: 'pid', value: '456' }]
 * - Result: rows where pid='123' OR pid='456'
 */
export function useClientSideFilterMulti<T extends Record<string, any>>(
  data: T[] | undefined,
  crossFilters: CrossFilter[]
): {
  filteredData: T[];
  isClientFiltered: boolean;
  filterCount: number;
} {
  const result = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        filteredData: [],
        isClientFiltered: false,
        filterCount: 0,
      };
    }

    if (!crossFilters || crossFilters.length === 0) {
      return {
        filteredData: data,
        isClientFiltered: false,
        filterCount: 0,
      };
    }

    // Group filters by field
    const filtersByField = crossFilters.reduce((acc, filter) => {
      if (!acc[filter.field]) {
        acc[filter.field] = [];
      }
      acc[filter.field].push(filter.value);
      return acc;
    }, {} as Record<string, string[]>);

    // Apply filters: OR within same field, AND across different fields
    const filtered = data.filter((row) => {
      return Object.entries(filtersByField).every(([field, values]) => {
        // Skip filter if field doesn't exist in this dataset
        if (!(field in row)) {
          return true;
        }

        const fieldValue = row[field];

        if (fieldValue == null) {
          return values.some(v => v === '' || v === 'null');
        }

        const rowValue = String(fieldValue).trim();
        return values.some(filterValue =>
          rowValue === String(filterValue).trim()
        );
      });
    });

    return {
      filteredData: filtered,
      isClientFiltered: true,
      filterCount: crossFilters.length,
    };
  }, [data, crossFilters]);

  return result;
}
