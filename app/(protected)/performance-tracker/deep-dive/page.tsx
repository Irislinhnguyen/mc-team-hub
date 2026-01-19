'use client'

/**
 * Deep Dive V2 - Unified A/B/C Tier Analysis
 *
 * Single page that handles all 6 perspectives with simplified A/B/C tier system
 *
 * ✨ NOW WITH FILTER PRESETS SUPPORT ✨
 */

import React, { useState, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import UnifiedDeepDiveView from '../../../components/performance-tracker/UnifiedDeepDiveView'
import SegmentedDeepDiveView from '../../../components/performance-tracker/SegmentedDeepDiveView'
// QueryLabView and TabNavigation removed - Query Lab is now at /performance-tracker/query
import { CompactFilterPanel } from '../../../components/performance-tracker/CompactFilterPanel'
import { TierClassificationHelp } from '../../../components/performance-tracker/TierClassificationHelp'
import { FilterPresetManager } from '../../../components/performance-tracker/FilterPresetManager'
import type { Period } from '../../../components/performance-tracker/UnifiedDeepDiveView'
import type { CrossFilter } from '../../../contexts/CrossFilterContext'
import type { SimplifiedFilter } from '../../../../lib/types/performanceTracker'
import { generateDeepDivePresetDescription, generateDeepDivePresetName } from '../../../../lib/utils/deepDivePresetHelpers'

type Perspective = 'team' | 'pic' | 'pid' | 'mid' | 'product' | 'zone'
type TierType = 'A' | 'B' | 'C' | 'NEW' | 'LOST' | 'ALL'

// Preset calculation helper
function calculatePresetDates(presetId: string): { period1: Period; period2: Period } {
  const today = new Date()
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  switch (presetId) {
    case 'yesterdayVs30DayAvg': {
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31)
      return {
        period1: { start: formatDate(thirtyDaysAgo), end: formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)) },
        period2: { start: formatDate(yesterday), end: formatDate(yesterday) }
      }
    }
    case 'last7vs7': {
      const endP2 = new Date(today)
      endP2.setDate(endP2.getDate() - 1)
      const startP2 = new Date(endP2)
      startP2.setDate(startP2.getDate() - 6)
      const endP1 = new Date(startP2)
      endP1.setDate(endP1.getDate() - 1)
      const startP1 = new Date(endP1)
      startP1.setDate(startP1.getDate() - 6)
      return {
        period1: { start: formatDate(startP1), end: formatDate(endP1) },
        period2: { start: formatDate(startP2), end: formatDate(endP2) }
      }
    }
    case 'last28vs28': {
      const endP2 = new Date(today)
      endP2.setDate(endP2.getDate() - 1)
      const startP2 = new Date(endP2)
      startP2.setDate(startP2.getDate() - 27)
      const endP1 = new Date(startP2)
      endP1.setDate(endP1.getDate() - 1)
      const startP1 = new Date(endP1)
      startP1.setDate(startP1.getDate() - 27)
      return {
        period1: { start: formatDate(startP1), end: formatDate(endP1) },
        period2: { start: formatDate(startP2), end: formatDate(endP2) }
      }
    }
    case 'last30vs30': {
      const endP2 = new Date(today)
      endP2.setDate(endP2.getDate() - 1)
      const startP2 = new Date(endP2)
      startP2.setDate(startP2.getDate() - 29)
      const endP1 = new Date(startP2)
      endP1.setDate(endP1.getDate() - 1)
      const startP1 = new Date(endP1)
      startP1.setDate(startP1.getDate() - 29)
      return {
        period1: { start: formatDate(startP1), end: formatDate(endP1) },
        period2: { start: formatDate(startP2), end: formatDate(endP2) }
      }
    }
    default:
      return {
        period1: { start: '2025-10-01', end: '2025-10-15' },
        period2: { start: '2025-10-16', end: '2025-10-31' }
      }
  }
}

function DeepDiveV2PageContent() {
  const searchParams = useSearchParams()

  // State
  const [perspective, setPerspective] = useState<Perspective>(
    (searchParams.get('perspective') as Perspective) || 'pid'
  )
  const [activeTier, setActiveTier] = useState<TierType>('A')
  const [activePreset, setActivePreset] = useState<string>('last28vs28')

  // Initialize with preset
  const initialDates = calculatePresetDates('last28vs28')
  const [period1, setPeriod1] = useState<Period>(initialDates.period1)
  const [period2, setPeriod2] = useState<Period>(initialDates.period2)

  const [filters, setFilters] = useState<Record<string, any>>({})
  const [shouldAnalyze, setShouldAnalyze] = useState(false)

  // ✨ NEW: Cross-filters state for preset compatibility (not used in deep-dive but required by FilterPresetManager)
  const [crossFilters, setCrossFilters] = useState<CrossFilter[]>([])

  // ✨ NEW: Simplified filters state (Looker Studio-style)
  const [simplifiedFilter, setSimplifiedFilter] = useState<SimplifiedFilter>({
    includeExclude: 'INCLUDE',
    clauses: [],
    clauseLogic: 'AND'
  })
  const [loadedFilterNames, setLoadedFilterNames] = useState<string[]>([])

  // Track last analyzed state to detect unapplied changes
  const [lastAnalyzedState, setLastAnalyzedState] = useState<{
    perspective: Perspective
    period1: Period
    period2: Period
    filters: Record<string, any>
    simplifiedFilter: SimplifiedFilter
  } | null>(null)

  // Drill-down cache to enable instant back navigation
  const [drillDownCache, setDrillDownCache] = useState<Record<string, {
    data: any
    summary: any
    timestamp: number
  }>>({})

  // Current cached data to display (set by back button)
  const [currentCachedData, setCurrentCachedData] = useState<{ data: any; summary: any } | null>(null)

  // Flag to track when data fetch completes (fixes closure issue in onDataLoaded)
  const [dataLoadCompleted, setDataLoadCompleted] = useState(false)

  // Calculate if there are unapplied changes
  const hasUnappliedChanges = useMemo(() => {
    // First load - no analysis done yet
    if (!lastAnalyzedState) return true

    // Normalize filter comparison (handle array vs string differences)
    const normalizeFilters = (f: Record<string, any>) => {
      const normalized: Record<string, any> = {}
      Object.keys(f).forEach(key => {
        const value = f[key]
        // Convert single-item arrays to strings for comparison
        normalized[key] = Array.isArray(value) && value.length === 1 ? value[0] : value
      })
      return normalized
    }

    const currentFiltersNormalized = normalizeFilters(filters)
    const lastFiltersNormalized = normalizeFilters(lastAnalyzedState.filters)

    // Check if any filter/perspective/period changed
    return (
      perspective !== lastAnalyzedState.perspective ||
      period1.start !== lastAnalyzedState.period1.start ||
      period1.end !== lastAnalyzedState.period1.end ||
      period2.start !== lastAnalyzedState.period2.start ||
      period2.end !== lastAnalyzedState.period2.end ||
      JSON.stringify(currentFiltersNormalized) !== JSON.stringify(lastFiltersNormalized) ||
      JSON.stringify(simplifiedFilter) !== JSON.stringify(lastAnalyzedState.simplifiedFilter)
    )
  }, [perspective, period1, period2, filters, simplifiedFilter, lastAnalyzedState])

  // Reset shouldAnalyze after it's been used
  React.useEffect(() => {
    if (shouldAnalyze) {
      // After a brief moment, reset to false for next change detection
      const timer = setTimeout(() => setShouldAnalyze(false), 100)
      return () => clearTimeout(timer)
    }
  }, [shouldAnalyze])

  // Sync lastAnalyzedState after data load completes
  // This fixes the closure issue where onDataLoaded captures stale state
  React.useEffect(() => {
    if (dataLoadCompleted) {
      console.log('[Deep-Dive] Data load completed, syncing lastAnalyzedState with current state')
      setLastAnalyzedState({
        perspective,
        period1: { ...period1 },
        period2: { ...period2 },
        filters: { ...filters },
        simplifiedFilter: { ...simplifiedFilter }
      })
      // Reset flag for next fetch
      setDataLoadCompleted(false)
    }
  }, [dataLoadCompleted, perspective, period1, period2, filters, simplifiedFilter])

  const handlePresetChange = (presetId: string) => {
    setActivePreset(presetId)
    // Only recalculate dates if a valid preset is selected
    // If preset is cleared (empty string), keep current dates
    if (presetId) {
      const dates = calculatePresetDates(presetId)
      setPeriod1(dates.period1)
      setPeriod2(dates.period2)
    }
  }

  // ✨ NEW: Create comprehensive filter state for preset manager
  // This includes ALL state that should be saved in a preset
  const presetFilters = useMemo(() => ({
    // UI STATE - Deep-dive specific
    perspective,           // ⭐ CRITICAL: Analysis perspective
    activeTier,           // Tier filter (A/B/C/NEW/LOST/ALL)
    activePreset,         // Date range preset ID

    // TIME PERIODS - For comparison
    period1,
    period2,

    // DIMENSION FILTERS - Standard filters
    ...filters
  }), [perspective, activeTier, activePreset, period1, period2, filters])

  // ✨ NEW: Generate smart preset name and description
  const suggestedPresetName = useMemo(() => {
    return generateDeepDivePresetName({
      perspective,
      period1,
      period2,
      filters,
      activeTier,
      activePreset
    })
  }, [perspective, period1, period2, filters, activeTier, activePreset])

  const suggestedPresetDescription = useMemo(() => {
    return generateDeepDivePresetDescription({
      perspective,
      period1,
      period2,
      filters,
      activeTier,
      activePreset
    })
  }, [perspective, period1, period2, filters, activeTier, activePreset])

  // ✨ NEW: Handler to load preset and restore ALL state (including simplified filters)
  const handleLoadPreset = useCallback((loadedFilters: Record<string, any>, loadedCrossFilters: CrossFilter[], loadedSimplifiedFilter?: SimplifiedFilter, loadedAdvancedFilterNames?: string[]) => {
    console.log('[Deep-Dive] Loading preset:', loadedFilters, loadedSimplifiedFilter, loadedAdvancedFilterNames)

    // Extract deep-dive specific state
    const {
      perspective: savedPerspective,
      activeTier: savedTier,
      activePreset: savedPreset,
      period1: savedPeriod1,
      period2: savedPeriod2,
      ...dimensionFilters
    } = loadedFilters

    // ⭐ RESTORE PERSPECTIVE (most important!)
    if (savedPerspective) {
      console.log('[Deep-Dive] Restoring perspective:', savedPerspective)
      setPerspective(savedPerspective as Perspective)
    }

    // Restore tier filter
    if (savedTier) {
      setActiveTier(savedTier as TierType)
    }

    // Restore date range preset
    if (savedPreset) {
      setActivePreset(savedPreset)
      // Recalculate dates if preset ID exists (for relative dates like "last 28 days")
      const dates = calculatePresetDates(savedPreset)
      setPeriod1(dates.period1)
      setPeriod2(dates.period2)
    } else if (savedPeriod1 && savedPeriod2) {
      // Use absolute dates if no preset ID
      setPeriod1(savedPeriod1)
      setPeriod2(savedPeriod2)
    }

    // Restore dimension filters (team, pic, pid, mid, product, zone)
    setFilters(dimensionFilters)

    // Restore cross-filters (if any)
    setCrossFilters(loadedCrossFilters)

    // Restore simplified filters (if any)
    if (loadedSimplifiedFilter) {
      setSimplifiedFilter(loadedSimplifiedFilter)
    } else {
      // Reset to empty if no simplified filters in preset
      setSimplifiedFilter({ includeExclude: 'INCLUDE', clauses: [], clauseLogic: 'AND' })
    }

    // Restore advanced filter names (if any)
    if (loadedAdvancedFilterNames && loadedAdvancedFilterNames.length > 0) {
      setLoadedFilterNames(loadedAdvancedFilterNames)
    } else {
      setLoadedFilterNames([])
    }

    // ⭐ TRIGGER ANALYSIS with loaded preset
    setLastAnalyzedState({
      perspective: savedPerspective || perspective,
      period1: savedPeriod1 || period1,
      period2: savedPeriod2 || period2,
      filters: dimensionFilters,
      simplifiedFilter: loadedSimplifiedFilter || { includeExclude: 'INCLUDE', clauses: [], clauseLogic: 'AND' }
    })
    setShouldAnalyze(true)

    console.log('[Deep-Dive] Preset loaded successfully!')
  }, [perspective, period1, period2])

  // Helper: Generate cache key for current state
  const generateCacheKey = (persp: Perspective, filt: Record<string, any>, p1: Period, p2: Period) => {
    return `${persp}_${JSON.stringify(filt)}_${p1.start}_${p1.end}_${p2.start}_${p2.end}`
  }

  // Helper: Detect drill-down state and parent perspective
  const getDrillDownState = useMemo(() => {
    const hierarchy: Record<Perspective, { parent: Perspective | null; filterKey: string | null }> = {
      team: { parent: null, filterKey: null },
      pic: { parent: 'team', filterKey: 'team' },
      pid: { parent: 'pic', filterKey: 'pic' },
      mid: { parent: 'pid', filterKey: 'pid' },
      zone: { parent: 'mid', filterKey: 'mid' },
      product: { parent: null, filterKey: null }
    }

    const state = hierarchy[perspective]

    // Check if we're in a drill-down state (has parent filter)
    if (state.parent && state.filterKey && filters[state.filterKey]) {
      return {
        canGoBack: true,
        parentPerspective: state.parent,
        filterKey: state.filterKey,
        filteredValue: filters[state.filterKey]
      }
    }

    return { canGoBack: false, parentPerspective: null, filterKey: null, filteredValue: null }
  }, [perspective, filters])

  // Helper: Get perspective label for display
  const getPerspectiveLabel = (persp: Perspective) => {
    const labels = {
      team: 'Teams',
      pic: 'PICs',
      pid: 'Publishers',
      mid: 'Media',
      product: 'Products',
      zone: 'Zones'
    }
    return labels[persp] || persp
  }

  // Handler: Back button - restore from cache or fetch
  const handleBackButton = () => {
    if (!getDrillDownState.canGoBack) return

    const { parentPerspective, filterKey } = getDrillDownState

    console.log('[handleBackButton] Current filters:', filters)
    console.log('[handleBackButton] Removing filter key:', filterKey)

    // Defensive: Explicitly preserve all non-drill-down filters
    const newFilters = Object.keys(filters).reduce((acc, key) => {
      if (key !== filterKey) {
        acc[key] = filters[key]
      }
      return acc
    }, {} as Record<string, any>)

    console.log('[handleBackButton] New filters after removal:', newFilters)

    // Check if we have cached data for parent state
    const cacheKey = generateCacheKey(parentPerspective!, newFilters, period1, period2)
    const cached = drillDownCache[cacheKey]

    setPerspective(parentPerspective!)
    setFilters(newFilters)

    // If cache exists and is fresh (< 5 minutes), restore it
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      console.log('[Deep-Dive] Restoring from cache:', cacheKey)
      // Pass cached data to UnifiedDeepDiveView
      setCurrentCachedData({ data: cached.data, summary: cached.summary })
      // Set lastAnalyzedState when using cache (no need to fetch)
      setLastAnalyzedState({
        perspective: parentPerspective!,
        period1: { ...period1 },
        period2: { ...period2 },
        filters: newFilters,
        simplifiedFilter: { ...simplifiedFilter }
      })
      // Don't trigger fetch - use cache
    } else {
      console.log('[Deep-Dive] Cache miss or expired, fetching:', cacheKey)
      // Clear cached data so component fetches fresh
      setCurrentCachedData(null)
      // Trigger fresh fetch (lastAnalyzedState will be set in onDataLoaded)
      setShouldAnalyze(true)
    }
  }

  const handleDrillDown = (childPerspective: string, id: string | number) => {
    // Set parent filter and switch to child perspective
    const parentFilterKey = getParentFilterKey(childPerspective)
    // Normalize ID to string for consistency
    const normalizedId = String(id)
    const newFilters = { ...filters, [parentFilterKey]: normalizedId }

    setPerspective(childPerspective as Perspective)
    setFilters(newFilters)

    // Clear cached data so component fetches fresh
    setCurrentCachedData(null)

    // Trigger data fetch - lastAnalyzedState will be set when data loads
    setShouldAnalyze(true)
  }

  // Detect multi-select: check if the current perspective's filter has multiple items
  const multiSelectInfo = useMemo(() => {
    const perspectiveFilter = filters[perspective]

    if (!perspectiveFilter) return null

    // Check if it's an array with multiple items
    const items = Array.isArray(perspectiveFilter)
      ? perspectiveFilter
      : [perspectiveFilter]

    if (items.length <= 1) return null

    // Convert to array of {id, name} objects
    const selectedItems = items.map(id => ({
      id: String(id),
      name: String(id) // Will use ID as name for now, can be enhanced with metadata lookup
    }))

    return {
      count: items.length,
      items: selectedItems
    }
  }, [filters, perspective])

  const perspectives: Array<{ id: Perspective; label: string }> = [
    { id: 'team', label: 'Team' },
    { id: 'pic', label: 'PIC' },
    { id: 'pid', label: 'Publisher' },
    { id: 'mid', label: 'Media' },
    { id: 'product', label: 'Product' },
    { id: 'zone', label: 'Zone' }
  ]

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'rgb(249, 250, 251)' }}>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Page Title */}
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: '#1565C0' }}>
            Deep Dive Analytics
          </h1>
          <p className="text-sm" style={{ color: '#6b7280' }}>
            A/B/C tier analysis with revenue-based prioritization
          </p>
        </div>

        {/* ✨ NEW: Filter Preset Manager */}
        <div className="rounded-lg p-4 space-y-4" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                Filter Presets
              </h3>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Save and load your analysis configurations (perspective, filters, time periods)
              </p>
            </div>
          </div>
          <FilterPresetManager
            page="deep-dive"
            currentFilters={presetFilters}
            currentCrossFilters={crossFilters}
            currentSimplifiedFilter={simplifiedFilter}
            advancedFilterNames={loadedFilterNames}
            onLoadPreset={handleLoadPreset}
            presetIdFromUrl={searchParams.get('preset') || undefined}
            suggestedName={suggestedPresetName}
            suggestedDescription={suggestedPresetDescription}
          />
        </div>

        {/* Unified Filter Card - Perspective + Time Periods + Filters + Analyze */}
        <div className="rounded-lg p-6 space-y-6" style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' }}>
          {/* Analysis Perspective Section */}
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-1" style={{ color: '#111827' }}>
                Analysis Perspective
              </h3>
              <p className="text-xs" style={{ color: '#6b7280' }}>
                Choose how to analyze your data - each perspective shows A/B/C tier breakdown
              </p>
            </div>

            <div className="grid grid-cols-6 gap-3">
              {perspectives.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setPerspective(p.id)
                    // Keep filters when switching perspective
                  }}
                  className="p-4 rounded-lg border-2 text-left transition-all"
                  style={{
                    borderColor: perspective === p.id ? '#3b82f6' : '#e5e7eb',
                    backgroundColor: perspective === p.id ? '#eff6ff' : 'transparent'
                  }}
                >
                  <div className="font-semibold text-sm mb-1" style={{
                    color: perspective === p.id ? '#2563eb' : '#111827'
                  }}>
                    {p.label}
                  </div>
                  <div className="text-xs" style={{ color: '#6b7280' }}>
                    {getPerspectiveDescription(p.id)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Compact Filter Panel */}
          <CompactFilterPanel
          period1Start={period1.start}
          period1End={period1.end}
          period2Start={period2.start}
          period2End={period2.end}
          onPeriod1StartChange={(date) => setPeriod1({ ...period1, start: date })}
          onPeriod1EndChange={(date) => setPeriod1({ ...period1, end: date })}
          onPeriod2StartChange={(date) => setPeriod2({ ...period2, start: date })}
          onPeriod2EndChange={(date) => setPeriod2({ ...period2, end: date })}
          activePreset={activePreset}
          onPresetChange={handlePresetChange}
          currentFilters={filters}
          onFilterChange={setFilters}
          simplifiedFilter={simplifiedFilter}
          onSimplifiedFilterChange={(filter, filterNames) => {
            setSimplifiedFilter(filter)
            if (filterNames) {
              setLoadedFilterNames(filterNames)
            } else {
              // Clear filter names when manually clearing filter
              setLoadedFilterNames([])
            }
          }}
          loadedFilterNames={loadedFilterNames}
          page="deep-dive"
          canAnalyze={hasUnappliedChanges}
          loading={false}
          onAnalyze={() => {
            // Save current state as "last analyzed"
            setLastAnalyzedState({
              perspective,
              period1: { ...period1 },
              period2: { ...period2 },
              filters: { ...filters },
              simplifiedFilter: { ...simplifiedFilter }
            })
            // Trigger data fetch
            setShouldAnalyze(true)
          }}
        >
          <TierClassificationHelp />
        </CompactFilterPanel>
        </div>

        {/* Back Button (if drilled down) */}
        {getDrillDownState.canGoBack && (
          <div className="mb-4">
          <button
            onClick={handleBackButton}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              backgroundColor: '#f3f4f6',
              color: '#2563eb',
              border: '1px solid #e5e7eb'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
          >
            <span>←</span>
            <span>Back to {getPerspectiveLabel(getDrillDownState.parentPerspective!)}</span>
          </button>
        </div>
        )}

        {/* Main Content */}
        <div>
        {multiSelectInfo ? (
          // Multi-select view: Show segmented comparison
          <SegmentedDeepDiveView
            perspective={perspective}
            selectedItems={multiSelectInfo.items}
            period1={period1}
            period2={period2}
            baseFilters={filters}
            onDrillDown={handleDrillDown}
            shouldFetch={shouldAnalyze}
          />
        ) : (
          // Single-select view: Show unified tier view
          <UnifiedDeepDiveView
            perspective={perspective}
            period1={period1}
            period2={period2}
            filters={filters}
            simplifiedFilter={simplifiedFilter}
            activeTier={activeTier}
            onTierChange={setActiveTier}
            onDrillDown={handleDrillDown}
            shouldFetch={shouldAnalyze}
            cachedData={currentCachedData}
            onDataLoaded={(data, summary) => {
              // Save to cache when data is loaded
              const cacheKey = generateCacheKey(perspective, filters, period1, period2)
              setDrillDownCache(prev => ({
                ...prev,
                [cacheKey]: {
                  data,
                  summary,
                  timestamp: Date.now()
                }
              }))

              // Trigger flag to sync lastAnalyzedState with current state
              // This fixes closure issue - useEffect will capture current state values
              setDataLoadCompleted(true)

              console.log('[Deep-Dive] Saved to cache and triggered state sync:', cacheKey)
            }}
          />
        )}
        </div>

      </div>
    </div>
  )
}

// Helper to get parent filter key for drill-down
function getParentFilterKey(childPerspective: string): string {
  const mapping: Record<string, string> = {
    pic: 'team',
    pid: 'pic',
    mid: 'pid',
    zone: 'mid' // or 'product' depending on hierarchy
  }
  return mapping[childPerspective] || 'parent_id'
}

// Helper to get perspective descriptions
function getPerspectiveDescription(perspective: string): string {
  const descriptions: Record<string, string> = {
    team: 'Team performance & A/B/C breakdown',
    pic: 'Person in charge portfolio health',
    pid: 'Publisher revenue tiers',
    mid: 'Media property analysis',
    product: 'Product portfolio tiers',
    zone: 'Zone-level tier breakdown'
  }
  return descriptions[perspective] || ''
}

export const dynamic = 'force-dynamic'

export default function DeepDiveV2Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DeepDiveV2PageContent />
    </Suspense>
  )
}
