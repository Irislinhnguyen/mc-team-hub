import type { CrossFilter } from '../../app/contexts/CrossFilterContext';

/**
 * Extracts base filters (excludes cross-filter fields)
 * Used to create query keys that are stable across cross-filter changes
 *
 * @param allFilters - Complete filter object including cross-filters
 * @param crossFilters - Active cross-filters from context
 * @returns Base filters without cross-filter fields
 */
export function extractBaseFilters(
  allFilters: Record<string, any>,
  crossFilters: CrossFilter[]
): Record<string, any> {
  const crossFilterFields = new Set(crossFilters.map(f => f.field));

  const baseFilters: Record<string, any> = {};
  for (const [key, value] of Object.entries(allFilters)) {
    if (!crossFilterFields.has(key)) {
      baseFilters[key] = value;
    }
  }

  return baseFilters;
}

/**
 * Extracts only cross-filter values as a map
 *
 * @param crossFilters - Active cross-filters from context
 * @returns Object with field -> value mapping
 */
export function extractCrossFilterValues(
  crossFilters: CrossFilter[]
): Record<string, string | string[]> {
  const result: Record<string, string[]> = {};

  for (const filter of crossFilters) {
    if (!result[filter.field]) {
      result[filter.field] = [];
    }
    result[filter.field].push(filter.value);
  }

  // Convert single-value arrays to strings for consistency
  const simplified: Record<string, string | string[]> = {};
  for (const [field, values] of Object.entries(result)) {
    simplified[field] = values.length === 1 ? values[0] : values;
  }

  return simplified;
}

/**
 * Determines if we should fetch all data (for client-side filtering)
 * vs paginated data (for server-side filtering)
 *
 * @param isClientFilterMode - Whether client-side filtering is active
 * @param hasCrossFilters - Whether any cross-filters are applied
 * @returns true if should fetch all data
 */
export function shouldFetchFullData(
  isClientFilterMode: boolean,
  hasCrossFilters: boolean
): boolean {
  // Fetch all data once cross-filters are present
  return isClientFilterMode && hasCrossFilters;
}

/**
 * Extract string value from filter value (handles both string and { value: string } formats)
 * Prevents React Error #31: "Objects are not valid as a React child"
 *
 * @param value - Filter value that could be a string, object, or other type
 * @returns String representation safe for rendering in JSX
 *
 * @example
 * normalizeFilterValue('JP') // => 'JP'
 * normalizeFilterValue({value: 'JP'}) // => 'JP'
 * normalizeFilterValue(null) // => ''
 * normalizeFilterValue(['A', 'B']) // => 'A,B'
 */
export function normalizeFilterValue(value: any): string {
  if (value === null || value === undefined) return ''

  // If it's an array, join the values
  if (Array.isArray(value)) {
    return value.map(v => normalizeFilterValue(v)).join(', ')
  }

  // If it's an object with a 'value' property, extract it
  if (typeof value === 'object' && value.value !== undefined) {
    return String(value.value)
  }

  // For all other types, convert to string
  return String(value)
}
