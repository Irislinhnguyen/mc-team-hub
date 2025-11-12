import { useState, useEffect, useRef, useCallback } from 'react'
import { useCrossFilter } from '../../app/contexts/CrossFilterContext'

/**
 * Deep equality check for filter objects
 * Compares objects and arrays by value, not reference
 */
function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true
  if (typeof obj1 !== 'object' || obj1 === null ||
      typeof obj2 !== 'object' || obj2 === null) {
    return false
  }

  const keys1 = Object.keys(obj1)
  const keys2 = Object.keys(obj2)

  if (keys1.length !== keys2.length) return false

  for (const key of keys1) {
    if (!keys2.includes(key)) return false
    if (Array.isArray(obj1[key]) && Array.isArray(obj2[key])) {
      if (obj1[key].length !== obj2[key].length) return false
      if (!obj1[key].every((val: any, i: number) => val === obj2[key][i])) {
        return false
      }
    } else if (obj1[key] !== obj2[key]) {
      return false
    }
  }

  return true
}

interface UseGCPPFiltersReturn {
  filters: Record<string, any>
  setMetadataFilters: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void
  setDateFilters: (filters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void
}

/**
 * Shared hook for GCPP Check pages to manage filters + cross-filters
 *
 * This hook provides consistent filter behavior across all GCPP Check pages:
 * - Handles metadata filters (from MetadataFilterPanel) - team, partner, market
 * - Handles date filters (from DateSelector) - date, startDate, endDate
 * - Handles cross-filters (from clicking charts/tables)
 * - Automatically merges them with proper cleanup when cross-filters are removed
 *
 * Resolves the state conflict between DateSelector and MetadataFilterPanel by:
 * - Tracking them separately internally
 * - Merging them only in the final filters output
 * - Each setter only updates its own domain
 *
 * @param initialFilters - Initial filter values (e.g., { date: '2024-01-01' })
 * @param metadataFields - Fields managed by MetadataFilterPanel (e.g., ['team', 'partner', 'market'])
 * @returns { filters, setMetadataFilters, setDateFilters }
 *
 * @example
 * ```typescript
 * const { filters, setMetadataFilters, setDateFilters } = useGCPPFilters({})
 *
 * // In DateSelector
 * const handleDateChange = (date) => {
 *   setDateFilters({ date })
 * }
 *
 * // In MetadataFilterPanel
 * <MetadataFilterPanel
 *   onFilterChange={setMetadataFilters}
 *   filterFields={['team', 'partner', 'market']}
 * />
 *
 * // In data fetching
 * const { data } = useQuery({
 *   queryKey: ['gcpp-data', filters],
 *   queryFn: () => fetchData(filters)  // filters = dateFilters + metadataFilters + crossFilters
 * })
 * ```
 */
export function useGCPPFilters(initialFilters: Record<string, any> = {}): UseGCPPFiltersReturn {
  // Separate state for date filters (from DateSelector)
  const [dateFilters, setDateFiltersState] = useState<Record<string, any>>({})

  // Separate state for metadata filters (from MetadataFilterPanel)
  const [metadataFilters, setMetadataFiltersState] = useState<Record<string, any>>({})

  // Final merged filters (date + metadata + cross-filters)
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters)

  // Cross-filter integration
  const { crossFilters } = useCrossFilter()
  const prevCrossFilterFieldsRef = useRef<string[]>([])

  // Wrapper for setDateFilters - supports both functional and direct updates
  const setDateFilters = useCallback((newFilters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
    if (typeof newFilters === 'function') {
      setDateFiltersState(newFilters)
    } else {
      setDateFiltersState(newFilters)
    }
  }, [])

  // Wrapper for setMetadataFilters - replaces metadata filters entirely
  const setMetadataFilters = useCallback((newFilters: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => {
    if (typeof newFilters === 'function') {
      setMetadataFiltersState(newFilters)
    } else {
      // MetadataFilterPanel always sends complete state
      // When user removes a filter, the field is deleted from the object
      setMetadataFiltersState(newFilters)
    }
  }, [])

  // Merge date + metadata + cross-filters
  // This effect runs whenever any of the filter sources change
  useEffect(() => {
    console.log('[useGCPPFilters] 🔄 Merging filters:')
    console.log('  - Date filters:', dateFilters)
    console.log('  - Metadata filters:', metadataFilters)
    console.log('  - Cross filters:', crossFilters)

    // Start with date filters (from DateSelector)
    // Then add metadata filters (from MetadataFilterPanel)
    const merged = { ...dateFilters, ...metadataFilters }

    // Remove old cross-filter fields first
    // This ensures when a cross-filter is removed, it doesn't persist
    prevCrossFilterFieldsRef.current.forEach(field => {
      delete merged[field]
    })

    // Apply new cross-filters - group by field to support multiple values
    // ✅ FIX: Always store as arrays for consistency (even single values)
    const newCrossFilterValues = crossFilters.reduce((acc, filter) => {
      if (acc[filter.field]) {
        // Field already exists - append to array
        if (Array.isArray(acc[filter.field])) {
          acc[filter.field].push(filter.value)
        } else {
          // Convert single value to array (shouldn't happen with fix, but keep for safety)
          acc[filter.field] = [acc[filter.field], filter.value]
        }
      } else {
        // First value for this field - store as array for consistency
        acc[filter.field] = [filter.value]
      }
      return acc
    }, {} as Record<string, any>)

    // Track current cross-filter fields for next cleanup cycle
    prevCrossFilterFieldsRef.current = crossFilters.map(f => f.field)

    const finalFilters = { ...merged, ...newCrossFilterValues }

    // ✅ FIX: Only update state if filters actually changed (prevents infinite loop)
    setFilters(prev => {
      if (deepEqual(prev, finalFilters)) {
        console.log('[useGCPPFilters] ⏭️  Filters unchanged, skipping update')
        return prev  // Return same reference if content is identical
      }
      console.log('[useGCPPFilters] ✅ Final merged filters:', finalFilters)
      return finalFilters
    })
  }, [dateFilters, metadataFilters, crossFilters])

  return {
    filters,              // Use this for API calls
    setMetadataFilters,   // Pass this to MetadataFilterPanel
    setDateFilters        // Use this in date change handlers
  }
}
