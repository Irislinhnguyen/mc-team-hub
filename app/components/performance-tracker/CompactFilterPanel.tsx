'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '../../../src/components/ui/card'
import { Button } from '../../../src/components/ui/button'
import { Badge } from '../../../src/components/ui/badge'
import { Label } from '../../../src/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '../../../src/components/ui/popover'
import { Calendar, ChevronDown, SlidersHorizontal, Play } from 'lucide-react'
import { colors } from '../../../lib/colors'
import { useAnalyticsMetadata } from '../../../lib/hooks/useAnalyticsMetadata'
import { MultiSelectFilter } from './MultiSelectFilter'
import { FilterManagementModal } from './FilterManagementModal'
import { formatDate } from '../../../lib/utils/formatters'
import { normalizeFilterValue } from '../../../lib/utils/filterHelpers'
import type { SimplifiedFilter } from '../../../lib/types/performanceTracker'
import type { AnalyticsPage } from '../../../lib/types/filterPreset'

interface CompactFilterPanelProps {
  // Date range
  period1Start: string
  period1End: string
  period2Start: string
  period2End: string
  onPeriod1StartChange: (date: string) => void
  onPeriod1EndChange: (date: string) => void
  onPeriod2StartChange: (date: string) => void
  onPeriod2EndChange: (date: string) => void

  // Preset
  activePreset: string
  onPresetChange: (preset: string) => void

  // Filters
  currentFilters: Record<string, any>
  onFilterChange: (filters: Record<string, any>) => void

  // Simplified Filters (Looker Studio-style)
  simplifiedFilter?: SimplifiedFilter
  onSimplifiedFilterChange?: (filter: SimplifiedFilter, filterNames?: string[]) => void
  loadedFilterNames?: string[]  // Names of loaded filter presets

  // Page identifier for filter management
  page?: AnalyticsPage

  // Analysis
  canAnalyze: boolean
  loading: boolean
  onAnalyze: () => void

  // Optional children (e.g., MethodologyDialog button)
  children?: React.ReactNode
}

const PRESETS = [
  { id: 'yesterdayVs30DayAvg', label: 'Yesterday vs 30-day Avg', fullLabel: 'Yesterday vs 30-day Average', highlight: true },
  { id: 'last7vs7', label: 'Last 7 Days', fullLabel: 'Last 7 Days vs Previous 7 Days' },
  { id: 'last28vs28', label: 'Last 28 Days', fullLabel: 'Last 28 Days vs Previous 28 Days', recommended: true },
  { id: 'last30vs30', label: 'Last 30 Days', fullLabel: 'Last 30 Days vs Previous 30 Days' },
  { id: 'thisWeekVsLastWeek', label: 'This Week', fullLabel: 'This Week vs Last Week' },
  { id: 'thisMonthVsLastMonth', label: 'This Month vs Last Month', fullLabel: 'This Month vs Last Month' },
  { id: 'yoySamePeriod', label: 'Year-over-Year', fullLabel: 'This Year vs Last Year (Same Period)' },
]

export function CompactFilterPanel({
  period1Start,
  period1End,
  period2Start,
  period2End,
  onPeriod1StartChange,
  onPeriod1EndChange,
  onPeriod2StartChange,
  onPeriod2EndChange,
  activePreset,
  onPresetChange,
  currentFilters,
  onFilterChange,
  simplifiedFilter,
  onSimplifiedFilterChange,
  loadedFilterNames,
  page = 'deep-dive',
  canAnalyze,
  loading,
  onAnalyze,
  children
}: CompactFilterPanelProps) {
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showFilterManagement, setShowFilterManagement] = useState(false)
  const { metadata } = useAnalyticsMetadata()

  // Local filter state - All filters are always visible
  const [teamFilter, setTeamFilter] = useState<string[]>([])
  const [picFilter, setPicFilter] = useState<string[]>([])
  const [pidFilter, setPidFilter] = useState<string[]>([])
  const [midFilter, setMidFilter] = useState<string[]>([])
  const [zidFilter, setZidFilter] = useState<string[]>([])

  // Sync FROM parent filters to local state (e.g., when drill-down sets filters)
  useEffect(() => {
    const normalizeToArray = (value: any): string[] => {
      if (!value) return []
      if (Array.isArray(value)) return value.map(String)
      return [String(value)]
    }

    setTeamFilter(normalizeToArray(currentFilters.team))
    setPicFilter(normalizeToArray(currentFilters.pic))
    setPidFilter(normalizeToArray(currentFilters.pid))
    setMidFilter(normalizeToArray(currentFilters.mid))
    setZidFilter(normalizeToArray(currentFilters.zid))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFilters.team, currentFilters.pic, currentFilters.pid, currentFilters.mid, currentFilters.zid])

  // Sync TO parent when local filters change (user interaction)
  useEffect(() => {
    const newFilters: Record<string, any> = {}

    // Only include non-empty filters
    if (teamFilter.length > 0) newFilters.team = teamFilter.length === 1 ? teamFilter[0] : teamFilter
    if (picFilter.length > 0) newFilters.pic = picFilter.length === 1 ? picFilter[0] : picFilter
    if (pidFilter.length > 0) newFilters.pid = pidFilter.length === 1 ? pidFilter[0] : pidFilter
    if (midFilter.length > 0) newFilters.mid = midFilter.length === 1 ? midFilter[0] : midFilter
    if (zidFilter.length > 0) newFilters.zid = zidFilter.length === 1 ? zidFilter[0] : zidFilter

    // Preserve other filters (like product), but skip empty arrays/strings
    Object.keys(currentFilters).forEach(key => {
      if (!['team', 'pic', 'pid', 'mid', 'zid'].includes(key)) {
        const value = currentFilters[key]
        // Skip empty arrays and empty strings
        if (Array.isArray(value) && value.length === 0) return
        if (value === '') return
        newFilters[key] = value
      }
    })

    // Only update if changed
    const currentStr = JSON.stringify(currentFilters)
    const newStr = JSON.stringify(newFilters)
    if (currentStr !== newStr) {
      onFilterChange(newFilters)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamFilter, picFilter, pidFilter, midFilter, zidFilter])

  const formatDateShort = (date: string) => {
    if (!date) return 'Select'
    return formatDate(date)
  }

  const getDaysDiff = (start: string, end: string) => {
    if (!start || !end) return 0
    const d1 = new Date(start)
    const d2 = new Date(end)
    return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  const period1Days = getDaysDiff(period1Start, period1End)
  const period2Days = getDaysDiff(period2Start, period2End)

  const getSelectedProduct = () => {
    if (!currentFilters.product) return 'Select Product'
    if (Array.isArray(currentFilters.product)) {
      return currentFilters.product.length === 1
        ? currentFilters.product[0]
        : `${currentFilters.product.length} products`
    }
    return currentFilters.product
  }

  const productOptions = metadata?.products || []
  const teamOptions = metadata?.teams || []
  const picOptions = metadata?.pics || []
  const pidOptions = metadata?.pids || []
  const midOptions = metadata?.mids || []
  const zidOptions = metadata?.zids || []

  // Check if metadata is still loading
  const isMetadataLoading = !metadata

  // Debug: Log button visibility conditions
  console.log('[CompactFilterPanel] Button visibility check:', {
    hasSimplifiedFilter: !!simplifiedFilter,
    hasOnChange: !!onSimplifiedFilterChange,
    isMetadataLoading,
    page,
    metadata: !!metadata
  })

  const handleProductChange = (value: string[]) => {
    onFilterChange({
      ...currentFilters,
      product: value.length > 0 ? value : undefined
    })
  }

  return (
    <Card style={{ backgroundColor: 'rgb(249, 250, 251)', border: `1px solid ${colors.border.default}` }}>
      <CardContent className="py-4 space-y-3">
        {/* Row 1: Date Range Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            Compare Time Periods:
          </Label>
          <div className="flex items-center gap-3">
            {/* Preset Selector */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="h-10 px-4 gap-2 min-w-[280px] justify-between"
                  style={{
                    backgroundColor: activePreset ? colors.interactive.primary : colors.surface.card,
                    color: activePreset ? 'white' : colors.text.primary,
                    borderColor: activePreset ? colors.interactive.primary : colors.border.default
                  }}
                >
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal size={16} />
                    {activePreset
                      ? PRESETS.find(p => p.id === activePreset)?.fullLabel || 'Select Time Period'
                      : 'Select Time Period'}
                  </span>
                  <ChevronDown size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-2" align="start">
                <div className="space-y-1">
                  {PRESETS.map(preset => (
                    <Button
                      key={preset.id}
                      variant={activePreset === preset.id ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => onPresetChange(preset.id)}
                      className="w-full justify-start h-9 text-sm"
                    >
                      <span className="flex-1 text-left">{preset.fullLabel}</span>
                      {preset.recommended && (
                        <Badge variant="secondary" className="ml-2 text-[10px] h-4 px-1.5">
                          Recommended
                        </Badge>
                      )}
                    </Button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Custom Date Picker */}
            <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="h-10 px-4 gap-2"
                  style={{
                    backgroundColor: !activePreset ? colors.interactive.primary : colors.surface.card,
                    color: !activePreset ? 'white' : colors.text.primary,
                    borderColor: !activePreset ? colors.interactive.primary : colors.border.default
                  }}
                >
                  <Calendar size={16} />
                  Custom Dates
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-4" align="start">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold" style={{ color: colors.text.primary }}>
                      Period 1 (Baseline) - {period1Days} days
                    </Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={period1Start}
                        onChange={(e) => {
                          onPeriod1StartChange(e.target.value)
                          onPresetChange('')
                        }}
                        className="flex-1 rounded px-2 py-1 text-xs"
                        style={{ border: `1px solid ${colors.border.default}` }}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="date"
                        value={period1End}
                        onChange={(e) => {
                          onPeriod1EndChange(e.target.value)
                          onPresetChange('')
                        }}
                        className="flex-1 rounded px-2 py-1 text-xs"
                        style={{ border: `1px solid ${colors.border.default}` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold" style={{ color: colors.data.primary }}>
                      Period 2 (Current) - {period2Days} days
                    </Label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="date"
                        value={period2Start}
                        onChange={(e) => {
                          onPeriod2StartChange(e.target.value)
                          onPresetChange('')
                        }}
                        className="flex-1 rounded px-2 py-1 text-xs"
                        style={{ border: `1px solid ${colors.border.default}` }}
                      />
                      <span className="text-xs text-muted-foreground">to</span>
                      <input
                        type="date"
                        value={period2End}
                        onChange={(e) => {
                          onPeriod2EndChange(e.target.value)
                          onPresetChange('')
                        }}
                        className="flex-1 rounded px-2 py-1 text-xs"
                        style={{ border: `1px solid ${colors.border.default}` }}
                      />
                    </div>
                  </div>

                  {period1Days !== period2Days && period1Days > 0 && period2Days > 0 && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200">
                      Warning: Comparing different period lengths ({period1Days} vs {period2Days} days)
                    </div>
                  )}

                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowDatePicker(false)}
                    className="w-full"
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Period Summary - More Readable */}
          <div className="text-sm px-3 py-2 rounded" style={{
            backgroundColor: colors.surface.muted,
            color: colors.text.secondary
          }}>
            Comparing: <strong>{formatDateShort(period1Start)}-{formatDateShort(period1End)}</strong> (baseline)
            vs <strong>{formatDateShort(period2Start)}-{formatDateShort(period2End)}</strong> (current)
          </div>
        </div>

        {/* Row 2: All Filters (Always Visible) */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            Filter by:
          </Label>

          {isMetadataLoading ? (
            // Skeleton loaders while metadata is loading
            <div className="flex flex-wrap gap-3">
              {['Product', 'Team', 'PIC', 'PID', 'MID', 'Zone ID'].map((filterName) => (
                <div key={filterName} className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                  <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                    {filterName}
                  </Label>
                  <div className="h-8 bg-gray-100 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            // Actual filters when metadata is loaded
            <div className="flex flex-wrap gap-3">
              <div className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                  Product
                </Label>
                <MultiSelectFilter
                  label=""
                  options={productOptions}
                  value={Array.isArray(currentFilters.product) ? currentFilters.product : currentFilters.product ? [currentFilters.product] : []}
                  onChange={handleProductChange}
                  compact={true}
                />
              </div>

              <div className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                  Team
                </Label>
                <MultiSelectFilter
                  label=""
                  options={teamOptions}
                  value={teamFilter}
                  onChange={setTeamFilter}
                  compact={true}
                />
              </div>

              <div className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                  PIC
                </Label>
                <MultiSelectFilter
                  label=""
                  options={picOptions}
                  value={picFilter}
                  onChange={setPicFilter}
                  compact={true}
                />
              </div>

              <div className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                  PID
                </Label>
                <MultiSelectFilter
                  label=""
                  options={pidOptions}
                  value={pidFilter}
                  onChange={setPidFilter}
                  compact={true}
                />
              </div>

              <div className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                  MID
                </Label>
                <MultiSelectFilter
                  label=""
                  options={midOptions}
                  value={midFilter}
                  onChange={setMidFilter}
                  compact={true}
                />
              </div>

              <div className="min-w-[140px] flex-1" style={{ maxWidth: '180px' }}>
                <Label className="text-xs mb-1.5 block" style={{ color: colors.text.secondary }}>
                  Zone ID
                </Label>
                <MultiSelectFilter
                  label=""
                  options={zidOptions}
                  value={zidFilter}
                  onChange={setZidFilter}
                  compact={true}
                />
              </div>
            </div>
          )}
        </div>

        {/* Advanced Filters Button */}
        {simplifiedFilter && onSimplifiedFilterChange && !isMetadataLoading && (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="default"
              onClick={() => setShowFilterManagement(true)}
              className="gap-2"
              style={{
                borderColor: simplifiedFilter.clauses.length > 0 ? colors.interactive.primary : colors.border.default,
                backgroundColor: simplifiedFilter.clauses.length > 0 ? colors.status.infoBg : 'white'
              }}
            >
              <Play size={16} />
              Advanced Filters
            </Button>

            {/* Loaded Filter Names */}
            {loadedFilterNames && loadedFilterNames.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs" style={{ color: colors.text.secondary }}>
                  Loaded:
                </span>
                {loadedFilterNames.map((name, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="gap-1 pr-1"
                    style={{
                      borderColor: colors.interactive.primary,
                      color: colors.interactive.primary
                    }}
                  >
                    {name}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        // Clear the filter
                        if (onSimplifiedFilterChange) {
                          onSimplifiedFilterChange({
                            includeExclude: 'INCLUDE',
                            clauses: [],
                            clauseLogic: 'AND'
                          })
                        }
                      }}
                      className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                      title="Clear filter"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Show active clauses even without filter names */}
            {simplifiedFilter.clauses.length > 0 && (!loadedFilterNames || loadedFilterNames.length === 0) && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold" style={{ color: colors.text.secondary }}>
                  Active Filters:
                </span>
                {simplifiedFilter.clauses.map((clause: any, index: number) => {
                  const valueDisplay = Array.isArray(clause.value)
                    ? `${clause.value.length} item${clause.value.length !== 1 ? 's' : ''}`
                    : normalizeFilterValue(clause.value)

                  return (
                    <Badge
                      key={clause.id || index}
                      variant="outline"
                      className="gap-1 pr-1"
                      style={{
                        borderColor: simplifiedFilter.includeExclude === 'EXCLUDE' ? colors.status.error : colors.interactive.primary,
                        color: simplifiedFilter.includeExclude === 'EXCLUDE' ? colors.status.error : colors.interactive.primary,
                        backgroundColor: simplifiedFilter.includeExclude === 'EXCLUDE' ? colors.status.errorBg : colors.status.infoBg
                      }}
                    >
                      <span className="font-semibold">{simplifiedFilter.includeExclude}</span> {clause.field}: {valueDisplay}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          if (onSimplifiedFilterChange) {
                            onSimplifiedFilterChange({
                              includeExclude: 'INCLUDE',
                              clauses: [],
                              clauseLogic: 'AND'
                            })
                          }
                        }}
                        className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                        title="Clear all filters"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </Badge>
                  )
                })}
              </div>
            )}

            <FilterManagementModal
              isOpen={showFilterManagement}
              onClose={() => setShowFilterManagement(false)}
              onLoadFilter={onSimplifiedFilterChange}
              page={page}
              metadata={metadata}
              currentLoadedFilterNames={loadedFilterNames}
            />
          </div>
        )}

        {/* Row 3: Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <Button
            onClick={onAnalyze}
            disabled={!canAnalyze || loading || isMetadataLoading}
            size="default"
            className={`px-6 gap-2 transition-all ${
              canAnalyze && !loading && !isMetadataLoading
                ? 'ring-2 ring-blue-500 ring-offset-2 shadow-lg shadow-blue-500/50'
                : ''
            }`}
          >
            <Play size={16} />
            {isMetadataLoading ? 'Loading filters...' : loading ? 'Analyzing...' : canAnalyze ? 'Analyze' : 'Analyzed'}
          </Button>

          <div className="flex-1" />

          {/* Children slot for MethodologyDialog */}
          {children}
        </div>
      </CardContent>
    </Card>
  )
}
