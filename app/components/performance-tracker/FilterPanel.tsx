'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { DateRangePicker } from '../forms/DateRangePicker'
import { MultiSelectFilter } from './MultiSelectFilter'
import { FilterChipsPortal } from './FilterChipsPortal'
import { colors } from '../../../lib/colors'

interface FilterConfig {
  name: string
  label: string
  type: 'date' | 'daterange' | 'select'
  options?: Array<{ label: string; value: string }>
  value?: string
}

interface FilterPanelProps {
  filters: FilterConfig[]
  onFilterChange: (filters: Record<string, any>) => void
  onFilterChipsChange?: (chips: Array<{
    filterName: string
    filterLabel: string
    values: string[]
    valueLabels: string[]
  }>) => void
  isLoading?: boolean
  initialStartDate?: Date | null
  initialEndDate?: Date | null
  includeDateInFilters?: boolean
  showDateRangePicker?: boolean
  defaultDateRange?: { startDate: string; endDate: string }
  initialFilters?: Record<string, any>  // ✨ NEW: For loading preset values
}

export function FilterPanel({
  filters,
  onFilterChange,
  onFilterChipsChange,
  isLoading = false,
  initialStartDate = null,
  initialEndDate = null,
  includeDateInFilters = true,
  showDateRangePicker = true,
  defaultDateRange,
  initialFilters
}: FilterPanelProps) {
  const [filterValues, setFilterValues] = useState<Record<string, any>>({})
  const [startDate, setStartDate] = useState<Date | null>(
    defaultDateRange?.startDate ? new Date(defaultDateRange.startDate) : initialStartDate
  )
  const [endDate, setEndDate] = useState<Date | null>(
    defaultDateRange?.endDate ? new Date(defaultDateRange.endDate) : initialEndDate
  )

  // ✨ NEW: Apply initial filters when preset is loaded
  useEffect(() => {
    if (initialFilters && Object.keys(initialFilters).length > 0) {
      console.log('[FilterPanel] Applying initial filters from preset:', initialFilters)

      // Extract date filters
      if (initialFilters.startDate) {
        setStartDate(new Date(initialFilters.startDate))
      }
      if (initialFilters.endDate) {
        setEndDate(new Date(initialFilters.endDate))
      }

      // Extract non-date filters
      const nonDateFilters = { ...initialFilters }
      delete nonDateFilters.startDate
      delete nonDateFilters.endDate

      setFilterValues(nonDateFilters)
    }
  }, [initialFilters])

  // Auto-apply filters with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const allFilters = { ...filterValues }

      // Only include dates if flag is set and dates are available
      if (includeDateInFilters && startDate && endDate) {
        allFilters.startDate = startDate.toISOString().split('T')[0]
        allFilters.endDate = endDate.toISOString().split('T')[0]
      }

      onFilterChange(allFilters)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [filterValues, startDate, endDate, includeDateInFilters, onFilterChange])

  const handleFilterChange = useCallback(
    (name: string, value: any) => {
      setFilterValues((prev) => ({ ...prev, [name]: value }))
    },
    []
  )

  const handleRemoveFilter = useCallback((filterName: string) => {
    setFilterValues((prev) => {
      const newValues = { ...prev }
      delete newValues[filterName]
      return newValues
    })
  }, [])

  const handleResetFilters = useCallback(() => {
    setFilterValues({})
    setStartDate(null)
    setEndDate(null)
  }, [])

  // Generate chips from current filter values
  const filterChips = useMemo(() => {
    const chips = []

    for (const [filterName, value] of Object.entries(filterValues)) {
      // Skip empty arrays or null/undefined values
      if (!value || (Array.isArray(value) && value.length === 0)) {
        continue
      }

      const filterConfig = filters.find(f => f.name === filterName)
      if (!filterConfig || filterConfig.type !== 'select') {
        continue
      }

      // Get the labels for the selected values
      const selectedOptions = filterConfig.options?.filter(opt =>
        value.includes(opt.value)
      ) || []

      if (selectedOptions.length > 0) {
        chips.push({
          filterName,
          filterLabel: filterConfig.label,
          values: value,
          valueLabels: selectedOptions.map(opt => opt.label)
        })
      }
    }

    return chips
  }, [filterValues, filters])

  // Notify parent when filterChips change
  useEffect(() => {
    if (onFilterChipsChange) {
      onFilterChipsChange(filterChips)
    }
  }, [filterChips, onFilterChipsChange])

  // Listen to custom events from UnifiedFilterChips for removing filters
  useEffect(() => {
    const onRemoveFilterEvent = (e: Event) => {
      const customEvent = e as CustomEvent
      const { filterName } = customEvent.detail
      handleRemoveFilter(filterName)
    }

    const onClearAllEvent = () => {
      // Use functional state updates to avoid stale closure issues
      setFilterValues(() => ({}))
      setStartDate(() => null)
      setEndDate(() => null)
    }

    window.addEventListener('removeAppliedFilter', onRemoveFilterEvent as EventListener)
    window.addEventListener('clearAllAppliedFilters', onClearAllEvent)

    return () => {
      window.removeEventListener('removeAppliedFilter', onRemoveFilterEvent as EventListener)
      window.removeEventListener('clearAllAppliedFilters', onClearAllEvent)
    }
  }, [handleRemoveFilter])

  return (
    <div className="mt-4">
      <div className="px-4 py-3 bg-white border-b border-gray-200">
        {/* Filter Controls */}
        <div className="flex flex-wrap gap-3 items-end">
          {filters.map((filter) => {
            if (filter.type === 'daterange' && showDateRangePicker) {
              return (
                <div key={filter.name} className="flex-shrink-0">
                  <DateRangePicker
                    startDate={startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
                    endDate={endDate || new Date()}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    label={filter.label}
                  />
                </div>
              )
            }

            if (filter.type === 'select') {
              return (
                <div key={filter.name} className="flex-1" style={{ minWidth: '180px' }}>
                  <MultiSelectFilter
                    label={filter.label}
                    options={filter.options || []}
                    value={filterValues[filter.name] || []}
                    onChange={(value) => handleFilterChange(filter.name, value)}
                  />
                </div>
              )
            }

            return null
          })}
        </div>
      </div>

      {/* Filter chips now handled by UnifiedFilterChips in AnalyticsPageLayout */}
      {/* FilterChipsPortal removed - chips are exposed via onFilterChipsChange callback */}
    </div>
  )
}

// Export handlers for use by UnifiedFilterChips
export { type FilterConfig }
