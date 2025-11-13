'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { FilterPanel } from './FilterPanel'
import { FilterPresetManager } from './FilterPresetManager'
import { MetadataErrorUI } from './MetadataErrorUI'
import FilterPanelSkeleton from './skeletons/FilterPanelSkeleton'
import { useAnalyticsMetadata } from '../../../lib/hooks/useAnalyticsMetadata'
import { usePersistedFilters } from '../../../lib/hooks/usePersistedFilters'
import { buildFilterConfig } from '../../../lib/config/filterConfigs'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import type { FilterField } from '../../../lib/types/performanceTracker'
import type { AnalyticsPage } from '../../../lib/types/filterPreset'

/**
 * MetadataFilterPanel - Integrated filter panel with automatic metadata handling
 *
 * ✨ NOW INCLUDES: FilterPresetManager for saving/loading filter configurations!
 *
 * Combines metadata fetching, error handling, loading states, and filter presets
 * into a single component that wraps FilterPanel with all necessary logic.
 *
 * @example
 * <MetadataFilterPanel
 *   page="daily-ops"
 *   filterFields={['daterange', 'team', 'pic', 'product']}
 *   onFilterChange={setCurrentFilters}
 *   isLoading={dataLoading}
 * />
 */

interface MetadataFilterPanelProps {
  page: AnalyticsPage  // ✨ NEW: Required for filter presets
  filterFields: FilterField[]
  onFilterChange: (filters: Record<string, any>) => void
  onFilterChipsChange?: (chips: Array<{
    filterName: string
    filterLabel: string
    values: string[]
    valueLabels: string[]
  }>) => void
  isLoading?: boolean
  includeDateInFilters?: boolean
  allowMultiSelect?: boolean
  compact?: boolean
  defaultDateRange?: { startDate: string; endDate: string }
  presetIdFromUrl?: string  // ✨ NEW: Preset ID from URL parameter
  metadataEndpoint?: string  // Optional custom metadata endpoint
}

export function MetadataFilterPanel({
  page,
  filterFields,
  onFilterChange,
  onFilterChipsChange,
  isLoading = false,
  includeDateInFilters,
  allowMultiSelect,
  compact,
  defaultDateRange,
  presetIdFromUrl,
  metadataEndpoint
}: MetadataFilterPanelProps) {
  const { metadata, loading: metadataLoading, error: metadataError, refetch } = useAnalyticsMetadata(metadataEndpoint)

  // ✨ NEW: Cross-filter integration for filter presets
  const { exportCrossFilters, importCrossFilters } = useCrossFilter()

  // ✨ NEW: Use persisted filters hook to remember last filters per tab
  const [persistedFilters, setPersistedFilters] = usePersistedFilters(page, {})

  // ✨ NEW: Track current filter state internally for preset manager
  const [internalFilters, setInternalFilters] = useState<Record<string, any>>(persistedFilters)

  // ✨ NEW: Persist filters to localStorage whenever they change
  useEffect(() => {
    console.log('[MetadataFilterPanel] 📝 Internal filters changed:', internalFilters)
    setPersistedFilters(internalFilters)
  }, [internalFilters, setPersistedFilters])

  // ✨ NEW: Sync internal filters with parent
  useEffect(() => {
    // Always propagate filter changes to parent
    // Let React Query handle deduplication via queryKey comparison
    console.log('[MetadataFilterPanel] 📤 Propagating filters to parent:', internalFilters)
    onFilterChange(internalFilters)
    // Intentionally omit onFilterChange from deps - we use stable callback from parent
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [internalFilters])

  // ✨ NEW: Handler for loading a filter preset
  const handleLoadPreset = useCallback(
    (filters: Record<string, any>, crossFilters: any[]) => {
      // Update filter panel state
      setInternalFilters(filters)

      // Update cross-filters
      importCrossFilters(crossFilters)
    },
    [importCrossFilters]
  )

  // Show error UI if metadata failed to load
  if (metadataError && !metadataLoading) {
    return <MetadataErrorUI error={metadataError} onRetry={refetch} />
  }

  // Build filter configuration from metadata (or empty if still loading)
  const { filters } = metadataLoading ? { filters: [] } : buildFilterConfig(metadata, filterFields)

  // Auto-detect: if no daterange in filterFields, don't include dates
  const shouldIncludeDates = includeDateInFilters ?? filterFields.includes('daterange')

  return (
    <div className="space-y-4">
      {/* 🚧 TEMPORARILY DISABLED FilterPresetManager for debugging */}
      {/* <FilterPresetManager
        page={page}
        currentFilters={internalFilters}
        currentCrossFilters={exportCrossFilters()}
        onLoadPreset={handleLoadPreset}
        presetIdFromUrl={presetIdFromUrl}
      /> */}

      {/* Original Filter Panel - Shows skeleton while metadata loads */}
      {metadataLoading ? (
        <FilterPanelSkeleton filterCount={filterFields.length} />
      ) : (
        <FilterPanel
          filters={filters}
          onFilterChange={setInternalFilters}
          onFilterChipsChange={onFilterChipsChange}
          isLoading={isLoading}
          includeDateInFilters={shouldIncludeDates}
          defaultDateRange={defaultDateRange}
          initialFilters={internalFilters}
        />
      )}
    </div>
  )
}

// Add displayName for reliable component detection in AnalyticsPageLayout
MetadataFilterPanel.displayName = 'MetadataFilterPanel'
