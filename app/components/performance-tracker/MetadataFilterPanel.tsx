'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { FilterPanel } from './FilterPanel'
import { FilterPresetManager } from './FilterPresetManager'
import { MetadataErrorUI } from './MetadataErrorUI'
import FilterPanelSkeleton from './skeletons/FilterPanelSkeleton'
import { useAnalyticsMetadata } from '../../../lib/hooks/useAnalyticsMetadata'
import { usePersistedFilters } from '../../../lib/hooks/usePersistedFilters'
import { useCascadingFilters } from '../../../lib/hooks/useCascadingFilters'
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
  enableCascading?: boolean  // ✨ NEW: Enable cascading filters (default: true)
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
  metadataEndpoint,
  enableCascading = true
}: MetadataFilterPanelProps) {
  const { metadata, loading: metadataLoading, error: metadataError, refetch } = useAnalyticsMetadata(metadataEndpoint)

  // ✨ NEW: Cross-filter integration for filter presets
  const { exportCrossFilters, importCrossFilters } = useCrossFilter()

  // ✨ NEW: Use persisted filters hook to remember last filters per tab
  const [persistedFilters, setPersistedFilters] = usePersistedFilters(page, {})

  // ✨ NEW: Track current filter state internally for preset manager
  const [internalFilters, setInternalFilters] = useState<Record<string, any>>(persistedFilters)

  // ✨ CASCADING FILTERS: Extract selected values for cascading logic
  const selectedTeams = useMemo(
    () => (Array.isArray(internalFilters.team) ? internalFilters.team : []),
    [internalFilters.team]
  )
  const selectedPics = useMemo(
    () => (Array.isArray(internalFilters.pic) ? internalFilters.pic : []),
    [internalFilters.pic]
  )
  const selectedPids = useMemo(
    () => (Array.isArray(internalFilters.pid) ? internalFilters.pid : []),
    [internalFilters.pid]
  )
  const selectedMids = useMemo(
    () => (Array.isArray(internalFilters.mid) ? internalFilters.mid : []),
    [internalFilters.mid]
  )
  const selectedZids = useMemo(
    () => (Array.isArray(internalFilters.zid) ? internalFilters.zid : []),
    [internalFilters.zid]
  )

  // ✨ CASCADING FILTERS: Use multi-level cascading hook
  const {
    availablePics,
    availablePids,
    availablePubnames,
    availableMids,
    availableMedianames,
    availableZids,
    availableZonenames,
    loadingStates,
    filterModes,
  } = useCascadingFilters({
    metadata,
    selectedTeams,
    selectedPics,
    selectedPids,
    selectedMids,
    selectedZids,
    enableCascading,
  })

  // ✨ NEW: Persist filters to localStorage whenever they change
  useEffect(() => {
    console.log('[MetadataFilterPanel] 📝 Internal filters changed:', internalFilters)
    setPersistedFilters(internalFilters)
  }, [internalFilters, setPersistedFilters])

  // ✨ NEW: Sync internal filters with parent
  useEffect(() => {
    // Filter out empty arrays and empty strings before sending to parent
    const cleanedFilters = Object.fromEntries(
      Object.entries(internalFilters).filter(([key, value]) => {
        // Remove empty arrays (e.g., pic: [])
        if (Array.isArray(value) && value.length === 0) return false
        // Remove empty strings
        if (value === '') return false
        return true
      })
    )

    // Always propagate filter changes to parent
    // Let React Query handle deduplication via queryKey comparison
    console.log('[MetadataFilterPanel] 📤 Propagating filters to parent:', cleanedFilters)
    onFilterChange(cleanedFilters)
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

  // ✨ CASCADING FILTERS: Auto-cleanup invalid filter values when options change
  useEffect(() => {
    if (!enableCascading) return

    const currentPics = Array.isArray(internalFilters.pic) ? internalFilters.pic : []
    const currentPids = Array.isArray(internalFilters.pid) ? internalFilters.pid : []
    const currentMids = Array.isArray(internalFilters.mid) ? internalFilters.mid : []
    const currentZids = Array.isArray(internalFilters.zid) ? internalFilters.zid : []

    let needsUpdate = false
    const updatedFilters = { ...internalFilters }

    // Cleanup PICs not in available options
    if (currentPics.length > 0) {
      const validPics = currentPics.filter((pic) => availablePics.some((opt) => opt.value === pic))
      if (validPics.length !== currentPics.length) {
        updatedFilters.pic = validPics
        needsUpdate = true
        console.log('[MetadataFilterPanel] 🧹 Cleaned up PICs:', currentPics.length, '→', validPics.length)
      }
    }

    // Cleanup PIDs not in available options (only when not loading)
    if (currentPids.length > 0 && !loadingStates.pids) {
      const validPids = currentPids.filter((pid) => availablePids.some((opt) => opt.value === pid))
      if (validPids.length !== currentPids.length) {
        updatedFilters.pid = validPids
        needsUpdate = true
        console.log('[MetadataFilterPanel] 🧹 Cleaned up PIDs:', currentPids.length, '→', validPids.length)
      }
    }

    // Cleanup MIDs not in available options (only when not loading)
    if (currentMids.length > 0 && !loadingStates.mids) {
      const validMids = currentMids.filter((mid) => availableMids.some((opt) => opt.value === mid))
      if (validMids.length !== currentMids.length) {
        updatedFilters.mid = validMids
        needsUpdate = true
        console.log('[MetadataFilterPanel] 🧹 Cleaned up MIDs:', currentMids.length, '→', validMids.length)
      }
    }

    // Cleanup ZIDs not in available options (only when not loading)
    if (currentZids.length > 0 && !loadingStates.zids) {
      const validZids = currentZids.filter((zid) => availableZids.some((opt) => opt.value === zid))
      if (validZids.length !== currentZids.length) {
        updatedFilters.zid = validZids
        needsUpdate = true
        console.log('[MetadataFilterPanel] 🧹 Cleaned up ZIDs:', currentZids.length, '→', validZids.length)
      }
    }

    if (needsUpdate) {
      console.log('[MetadataFilterPanel] 🧹 Applying filter cleanup...')
      setInternalFilters(updatedFilters)
    }
  }, [
    enableCascading,
    availablePics,
    availablePids,
    availableMids,
    availableZids,
    loadingStates.pids,
    loadingStates.mids,
    loadingStates.zids,
    internalFilters,
  ])

  // Show error UI if metadata failed to load
  if (metadataError && !metadataLoading) {
    return <MetadataErrorUI error={metadataError} onRetry={refetch} />
  }

  // Build filter configuration from metadata (or empty if still loading)
  // ✨ CASCADING FILTERS: Pass dynamic options to buildFilterConfig
  const { filters } = metadataLoading
    ? { filters: [] }
    : buildFilterConfig(
        metadata,
        filterFields,
        enableCascading
          ? {
              pics: availablePics,
              pids: availablePids,
              pubnames: availablePubnames,
              mids: availableMids,
              medianames: availableMedianames,
              zids: availableZids,
              zonenames: availableZonenames,
            }
          : undefined
      )

  // 🐛 DEBUG: Log available PICs when team changes
  useEffect(() => {
    if (enableCascading && selectedTeams.length > 0) {
      console.log('[MetadataFilterPanel] 🐛 DEBUG - Team filter active:')
      console.log('   Selected teams:', selectedTeams)
      console.log('   Available PICs:', availablePics.length, '/', metadata?.pics?.length ?? 0)
      console.log('   PIC values:', availablePics.slice(0, 5).map(p => p.value).join(', '))
      console.log('   Loading states:', loadingStates)
    }
  }, [selectedTeams, availablePics, enableCascading, metadata?.pics, loadingStates])

  // Auto-detect: if no daterange in filterFields, don't include dates
  const shouldIncludeDates = includeDateInFilters ?? filterFields.includes('daterange')

  return (
    <div className="space-y-4">
      {/* ✨ Filter Preset Manager - Renders immediately (no blocking) */}
      <FilterPresetManager
        page={page}
        currentFilters={internalFilters}
        currentCrossFilters={exportCrossFilters()}
        onLoadPreset={handleLoadPreset}
        presetIdFromUrl={presetIdFromUrl}
      />

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
          filterLoadingStates={{
            pic: loadingStates.pics,
            pid: loadingStates.pids,
            mid: loadingStates.mids,
            zid: loadingStates.zids,
          }}
        />
      )}
    </div>
  )
}

// Add displayName for reliable component detection in AnalyticsPageLayout
MetadataFilterPanel.displayName = 'MetadataFilterPanel'
