'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { TimeSeriesChart } from './TimeSeriesChart'
import { ChartBreadcrumb } from './ChartBreadcrumb'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { colors } from '../../../lib/colors'
import { typography, composedStyles } from '../../../lib/design-tokens'
import { createEntityColorMap } from '../../../lib/config/partnerColors'
import {
  aggregateTEAMTimeSeriesData,
  aggregatePICTimeSeriesData,
  filterPIDsByPIC,
  filterMIDsByPID,
  filterZIDsByMID,
  transformForBreakdown,
  filterToTopN
} from '../../../lib/utils/chartDataTransformers'
import type { TeamConfiguration, TeamPicMapping } from '../../../lib/supabase/database.types'

interface DrillableTimeSeriesChartProps {
  // Total mode data
  totalTimeSeries: any[]
  // Raw data for drill-down
  pidByDateData: any[]
  midByDateData: any[]
  zoneTimeSeriesData: any[]
  // Team configurations
  teamConfigs: TeamConfiguration[]
  picMappings: TeamPicMapping[]
  // Filters
  currentFilters?: Record<string, any>
  // NEW: Pre-aggregated breakdown data (optional, for performance)
  teamBreakdownData?: Array<{
    date: string
    rawDate: string
    team_id: string
    team_name: string
    revenue: number
    profit: number
    requests: number
    paid: number
  }>
  picBreakdownData?: Array<{
    date: string
    rawDate: string
    pic_name: string
    revenue: number
    profit: number
    requests: number
    paid: number
  }>
  // NEW: Callbacks for on-demand loading
  onDrillToPIC?: (teamId: string) => void
  // PERFORMANCE: Loading state to prevent expensive fallback aggregation
  isLoading?: boolean
  // Chart config
  title?: string
  height?: number
  topN?: number
}

type DrillLevel = 'total' | 'team' | 'pic' | 'pid' | 'mid' | 'zid'
type ChartMode = 'total' | 'breakdown'
type MetricType = 'revenue' | 'profit'

interface BreadcrumbLevel {
  level: string
  id: string
  name: string
}

interface DrillState {
  mode: ChartMode
  metric: MetricType
  level: DrillLevel
  path: BreadcrumbLevel[]
}

/**
 * Determines initial drill level and path based on active filters
 * Priority: ZONE > MID/product > PID/pubname > PIC > TEAM (most specific to least specific)
 * Skips irrelevant upper hierarchy levels when filters are active
 */
function getInitialDrillLevelFromFilters(
  filters: Record<string, any> | undefined,
  teamConfigs: TeamConfiguration[],
  picMappings: TeamPicMapping[]
): { level: DrillLevel; path: BreadcrumbLevel[] } {
  if (!filters) {
    return { level: 'team', path: [] }
  }

  // Normalize filters (array → string, take first element)
  const normalizeFilter = (value: any): string | null => {
    if (Array.isArray(value) && value.length > 0) return String(value[0])
    if (typeof value === 'string' && value !== 'all') return value
    return null
  }

  const teamFilter = normalizeFilter(filters.team)
  const picFilter = normalizeFilter(filters.pic)
  // NEW: Support for all hierarchy levels
  const pidFilter = normalizeFilter(filters.pid) || normalizeFilter(filters.pubname)
  const midFilter = normalizeFilter(filters.mid) || normalizeFilter(filters.medianame)
  const productFilter = normalizeFilter(filters.product)
  const zoneFilter = normalizeFilter(filters.zone) || normalizeFilter(filters.zonename)

  // Priority 1: Zone/zonename filter → Start at ZID level (show zone details)
  if (zoneFilter) {
    return {
      level: 'zid',
      path: [{
        level: 'zid',
        id: zoneFilter,
        name: zoneFilter
      }]
    }
  }

  // Priority 2: MID/medianame/product filter → Start at ZID breakdown (zones within MID)
  if (midFilter || productFilter) {
    const isMidFilter = normalizeFilter(filters.mid) !== null
    const isProductFilter = normalizeFilter(filters.product) !== null

    const filterId = midFilter || productFilter
    const filterName = isMidFilter ? `MID ${filterId}`
                      : isProductFilter ? `Product ${filterId}`
                      : filterId  // medianame, show as-is

    return {
      level: 'zid',
      path: [{
        level: 'mid',
        id: filterId,
        name: filterName
      }]
    }
  }

  // Priority 3: PID/pubname filter → Start at MID breakdown (MIDs within PID)
  if (pidFilter) {
    const isPidFilter = normalizeFilter(filters.pid) !== null
    const filterName = isPidFilter ? `PID ${pidFilter}` : pidFilter

    return {
      level: 'mid',
      path: [{
        level: 'pid',
        id: pidFilter,
        name: filterName
      }]
    }
  }

  // Priority 4: PIC filter → Start at PID level (team → pic → pid)
  if (picFilter) {
    // Find team for this PIC
    const picMapping = picMappings.find(m => m.pic_name === picFilter)
    const teamId = picMapping?.team_id || null

    const path: BreadcrumbLevel[] = []

    if (teamId) {
      const teamConfig = teamConfigs.find(t => t.team_id === teamId)
      path.push({
        level: 'team',
        id: teamId,
        name: teamConfig?.team_name || teamId
      })
    }

    path.push({
      level: 'pic',
      id: picFilter,
      name: picFilter
    })

    return { level: 'pid', path }
  }

  // Priority 5: TEAM filter → Start at PIC level (team → pic)
  if (teamFilter) {
    const teamConfig = teamConfigs.find(t => t.team_id === teamFilter)

    return {
      level: 'pic',
      path: [{
        level: 'team',
        id: teamFilter,
        name: teamConfig?.team_name || teamFilter
      }]
    }
  }

  // Priority 6: No relevant filters → Start at TEAM level
  return { level: 'team', path: [] }
}

export function DrillableTimeSeriesChart({
  totalTimeSeries,
  pidByDateData,
  midByDateData,
  zoneTimeSeriesData,
  teamConfigs,
  picMappings,
  currentFilters = {},
  teamBreakdownData,
  picBreakdownData,
  onDrillToPIC,
  isLoading = false,
  title = 'Revenue & Profit Over Time',
  height = 300,
  topN = 20
}: DrillableTimeSeriesChartProps) {
  const [drillState, setDrillState] = useState<DrillState>({
    mode: 'total',
    metric: 'revenue',
    level: 'total',
    path: []
  })

  // PERFORMANCE OPTIMIZATION: Stabilize path reference to prevent unnecessary recalcs
  // drillState.path array gets new reference on every setState, even if content is same
  const pathKey = useMemo(() => {
    return JSON.stringify(drillState.path)
  }, [drillState.path])

  // Respond to filter changes while in breakdown mode
  useEffect(() => {
    if (drillState.mode !== 'breakdown') return

    // Re-evaluate drill level based on current filters
    const { level: expectedLevel, path: expectedPath } = getInitialDrillLevelFromFilters(
      currentFilters,
      teamConfigs,
      picMappings
    )

    // If expected level doesn't match current state, reset
    if (expectedLevel !== drillState.level ||
        JSON.stringify(expectedPath) !== JSON.stringify(drillState.path)) {

      console.log('[DrillableChart] Filter changed - resetting drill state to:', expectedLevel, expectedPath)

      setDrillState({
        ...drillState,
        level: expectedLevel,
        path: expectedPath
      })

      // Trigger PIC data fetch if needed
      if (expectedPath.length > 0 && expectedPath[0].level === 'team' && onDrillToPIC) {
        onDrillToPIC(expectedPath[0].id)
      }
    }
  }, [
    currentFilters?.team,
    currentFilters?.pic,
    currentFilters?.pid,
    currentFilters?.pubname,
    currentFilters?.mid,
    currentFilters?.medianame,
    currentFilters?.product,
    currentFilters?.zone,
    currentFilters?.zonename,
    teamConfigs,
    picMappings,
    onDrillToPIC,
    drillState.mode
  ])

  // Handle mode toggle - FILTER AWARE
  const handleModeChange = (value: string) => {
    if (value === 'total') {
      // Switch to Total mode - reset drill state
      setDrillState({
        mode: 'total',
        metric: drillState.metric,
        level: 'total',
        path: []
      })
    } else if (value === 'breakdown') {
      // Switch to Breakdown mode - initialize from filters using helper
      const { level, path } = getInitialDrillLevelFromFilters(
        currentFilters,
        teamConfigs,
        picMappings
      )

      console.log('[DrillableChart] Mode changed to breakdown →', level, path)

      setDrillState({
        mode: 'breakdown',
        metric: drillState.metric,
        level,
        path
      })

      // Trigger PIC data fetch if team filter is active
      if (path.length > 0 && path[0].level === 'team' && onDrillToPIC) {
        onDrillToPIC(path[0].id)
      }
    }
  }

  // Handle metric toggle
  const handleMetricChange = (value: string) => {
    if (value === 'revenue' || value === 'profit') {
      setDrillState({
        ...drillState,
        metric: value
      })
    }
  }

  // Handle breadcrumb navigation
  const handleBreadcrumbNavigate = (index: number) => {
    if (index === -1) {
      // Navigate to root (all teams)
      setDrillState({
        ...drillState,
        level: 'team',
        path: []
      })
    } else {
      // Navigate to specific level
      const newPath = drillState.path.slice(0, index + 1)
      const targetLevel = drillState.path[index].level

      // Determine next level
      const levelMap: Record<string, DrillLevel> = {
        'team': 'pic',
        'pic': 'pid',
        'pid': 'mid',
        'mid': 'zid'
      }

      setDrillState({
        ...drillState,
        level: levelMap[targetLevel] || 'team',
        path: newPath
      })
    }
  }

  // Handle line click for drill-down
  const handleLineClick = (entityName: string) => {
    console.log('[DrillableChart] handleLineClick called:', entityName, 'at level:', drillState.level)

    const { level, path } = drillState

    // Find entity ID based on level
    let entityId = entityName

    if (level === 'team') {
      // Find team ID from name
      const team = teamConfigs.find(t => t.team_name === entityName)
      entityId = team?.team_id || entityName
    } else if (level === 'pic') {
      // PIC name is the ID
      entityId = entityName
      console.log('[DrillableChart] PIC clicked:', entityName, '→ Will drill to PID level')
    } else if (level === 'pid') {
      // BUGFIX: Need to map entityName → entityId from actual data
      // topNData has { entityId: "12345", entityName: "Publisher Name" }
      const entity = topNData.find(d => d.entityName === entityName)
      entityId = entity?.entityId || entityName
      console.log('[DrillableChart] PID clicked:', entityName, '→ entityId:', entityId)
    } else if (level === 'mid') {
      // BUGFIX: Same for MID level
      const entity = topNData.find(d => d.entityName === entityName)
      entityId = entity?.entityId || entityName
      console.log('[DrillableChart] MID clicked:', entityName, '→ entityId:', entityId)
    } else if (level === 'zid') {
      // Already at lowest level
      return
    }

    // Determine next level
    const nextLevelMap: Record<DrillLevel, DrillLevel | null> = {
      'total': null,
      'team': 'pic',
      'pic': 'pid',
      'pid': 'mid',
      'mid': 'zid',
      'zid': null
    }

    const nextLevel = nextLevelMap[level]
    if (!nextLevel) return

    // NEW: Trigger on-demand data loading when drilling from Team to PIC
    if (level === 'team' && nextLevel === 'pic') {
      console.log('[DrillableChart] Triggering on-demand PIC breakdown fetch for team:', entityId)
      onDrillToPIC?.(entityId)
    }

    // Add to path
    const newPath = [
      ...path,
      {
        level,
        id: entityId,
        name: entityName
      }
    ]

    setDrillState({
      ...drillState,
      level: nextLevel,
      path: newPath
    })
  }

  // PERFORMANCE OPTIMIZATION: Split massive useMemo into smaller, targeted memos
  // This reduces recalculation scope - only affected memos run when dependencies change

  // Step 1: Memoize breakdown data separately by level
  const teamLevelData = useMemo(() => {
    if (teamBreakdownData && teamBreakdownData.length > 0) {
      console.log('[DrillableChart] Using pre-aggregated team data:', teamBreakdownData.length, 'rows')
      return teamBreakdownData.map(row => ({
        date: row.date,
        rawDate: row.rawDate,
        entityId: row.team_id,
        entityName: row.team_name,
        revenue: row.revenue,
        profit: row.profit
      }))
    }

    // Don't run expensive fallback if data is still loading
    if (!teamBreakdownData && isLoading) {
      console.log('[DrillableChart] Skipping team aggregation - data is loading')
      return []
    }

    // FALLBACK: Client-side aggregation from raw data (only if load failed or completed empty)
    console.log('[DrillableChart] FALLBACK: Aggregating teams client-side')
    return aggregateTEAMTimeSeriesData(pidByDateData, picMappings, teamConfigs)
  }, [teamBreakdownData, pidByDateData, picMappings, teamConfigs, isLoading])

  const picLevelData = useMemo(() => {
    if (picBreakdownData && picBreakdownData.length > 0) {
      console.log('[DrillableChart] Using pre-aggregated PIC data:', picBreakdownData.length, 'rows')
      return picBreakdownData.map(row => ({
        date: row.date,
        rawDate: row.rawDate,
        entityId: row.pic_name,
        entityName: row.pic_name,
        revenue: row.revenue,
        profit: row.profit
      }))
    }

    // Don't run expensive fallback if data is still loading
    const teamId = drillState.path[0]?.id || null
    if (!picBreakdownData && isLoading && teamId) {
      console.log('[DrillableChart] Skipping PIC aggregation - data is loading for team:', teamId)
      return []
    }

    // FALLBACK: Client-side aggregation from raw data (only if load failed or completed empty)
    console.log('[DrillableChart] FALLBACK: Aggregating PICs client-side for team:', teamId)
    console.log('[DrillableChart] Raw pidByDateData rows:', pidByDateData?.length || 0)
    console.log('[DrillableChart] PIC mappings:', picMappings?.length || 0)
    const result = aggregatePICTimeSeriesData(pidByDateData, picMappings, teamId)
    console.log('[DrillableChart] Client-side aggregated PICs:', result.length, 'rows')
    return result
  }, [picBreakdownData, pidByDateData, picMappings, pathKey, isLoading])

  // Step 2: Memoize level-specific filtered data
  const currentLevelData = useMemo(() => {
    const { level, path } = drillState

    if (level === 'team') return teamLevelData
    if (level === 'pic') return picLevelData

    if (level === 'pid') {
      const picName = path[1]?.id || path[0]?.id || null
      if (picName) {
        console.log('[DrillableChart] Filtering PIDs from raw data for PIC:', picName)
        console.log('[DrillableChart] Raw pidByDateData available:', pidByDateData?.length || 0, 'rows')

        if (pidByDateData && pidByDateData.length > 0) {
          const dates = pidByDateData.map(r => r.date?.value || r.date).filter(Boolean).sort()
          console.log('[DrillableChart] Raw data date range:', dates[0], 'to', dates[dates.length - 1])
        }

        const result = filterPIDsByPIC(pidByDateData, picName)
        console.log('[DrillableChart] Filtered to', result.length, 'PID rows')

        if (result.length > 0) {
          const filteredDates = result.map(r => r.rawDate || r.date).filter(Boolean).sort()
          console.log('[DrillableChart] Filtered data date range:', filteredDates[0], 'to', filteredDates[filteredDates.length - 1])
        }

        return result
      }
      return []
    }

    if (level === 'mid') {
      const pid = path[2]?.id || path[1]?.id || path[0]?.id || null
      if (pid) {
        // Check if we have pubname filter - if so, data is already filtered server-side
        const hasPubnameFilter = currentFilters.pubname
        if (hasPubnameFilter) {
          console.log('[DrillableChart] Using pre-filtered MID data (pubname filter active)')

          // Transform the already-filtered data without re-filtering
          const transformed = (midByDateData || []).map((row: any) => {
            let dateValue: string
            let rawDateValue: string

            if (row.date && typeof row.date === 'object' && 'value' in row.date) {
              dateValue = row.date.value
              rawDateValue = row.rawDate || row.date.value
            } else {
              dateValue = String(row.date || '')
              rawDateValue = row.rawDate || dateValue
            }

            const isoDate = rawDateValue && rawDateValue.includes('T')
              ? rawDateValue.split('T')[0]
              : rawDateValue

            return {
              date: dateValue,
              rawDate: isoDate,
              entityId: String(row.mid),
              entityName: row.medianame || `MID ${row.mid}`,
              revenue: Number(row.rev || 0),
              profit: Number(row.profit || 0)
            }
          })

          return transformed
        }

        console.log('[DrillableChart] Filtering MIDs from raw data for PID:', pid)
        return filterMIDsByPID(midByDateData, pid)
      }
      return []
    }

    if (level === 'zid') {
      const mid = path[3]?.id || path[2]?.id || path[1]?.id || path[0]?.id || null
      if (mid) {
        // Check if we have medianame/product filter - if so, data is already filtered server-side
        const hasMedianameFilter = currentFilters.medianame || currentFilters.product
        if (hasMedianameFilter) {
          console.log('[DrillableChart] Using pre-filtered zone data (medianame/product filter active)')

          // Transform the already-filtered data without re-filtering
          const transformed = (zoneTimeSeriesData || []).map((row: any) => {
            let dateValue: string
            let rawDateValue: string

            if (row.date && typeof row.date === 'object' && 'value' in row.date) {
              dateValue = row.date.value
              rawDateValue = row.rawDate || row.date.value
            } else {
              dateValue = String(row.date || '')
              rawDateValue = row.rawDate || dateValue
            }

            const isoDate = rawDateValue && rawDateValue.includes('T')
              ? rawDateValue.split('T')[0]
              : rawDateValue

            return {
              date: dateValue,
              rawDate: isoDate,
              entityId: String(row.zid),
              entityName: row.zonename || `ZID ${row.zid}`,
              revenue: Number(row.rev || 0),
              profit: Number(row.profit || 0)
            }
          })

          return transformed
        }

        console.log('[DrillableChart] Filtering ZIDs from raw data for MID:', mid)
        return filterZIDsByMID(zoneTimeSeriesData, mid)
      }
      return []
    }

    return []
  }, [drillState.level, pathKey, teamLevelData, picLevelData, pidByDateData, midByDateData, zoneTimeSeriesData, currentFilters])

  // Step 3: Memoize filtered and sorted data (topN)
  const topNData = useMemo(() => {
    const filtered = filterToTopN(currentLevelData, drillState.metric, topN)

    console.log('[DrillableChart] After filterToTopN:', {
      level: drillState.level,
      originalRows: currentLevelData.length,
      filteredRows: filtered.length,
      topN,
      metric: drillState.metric,
      uniqueEntities: new Set(filtered.map(d => d.entityName)).size
    })

    return filtered
  }, [currentLevelData, drillState.metric, drillState.level, topN])

  // Step 4: Memoize entity names (stable reference prevents cascading recalcs)
  const entityNames = useMemo(() => {
    const names = Array.from(new Set(topNData.map(d => d.entityName)))
    return names.sort((a, b) => {
      const aTotal = topNData.filter(d => d.entityName === a).reduce((sum, d) => sum + d[drillState.metric], 0)
      const bTotal = topNData.filter(d => d.entityName === b).reduce((sum, d) => sum + d[drillState.metric], 0)
      return bTotal - aTotal
    })
  }, [topNData, drillState.metric])

  // Step 5: Memoize color map with stable entity names
  const colorMap = useMemo(() => {
    return createEntityColorMap(entityNames)
  }, [entityNames])

  // Step 6: Final chart data (minimal dependencies)
  const chartData = useMemo(() => {
    const { mode, metric } = drillState

    // Total mode - show original data
    if (mode === 'total') {
      return {
        data: totalTimeSeries,
        lines: [
          { dataKey: 'revenue', name: 'rev', color: colors.main },
          { dataKey: 'profit', name: 'profit', color: colors.accent }
        ]
      }
    }

    // Breakdown mode - use pre-computed data
    const allDates = totalTimeSeries.map(d => d.rawDate)
    const chartTimeSeries = transformForBreakdown(topNData, metric, allDates)

    const lines = entityNames.map(name => ({
      dataKey: name,
      name: name,
      color: colorMap[name]
    }))

    return {
      data: chartTimeSeries,
      lines
    }
  }, [drillState.mode, drillState.metric, topNData, entityNames, colorMap, totalTimeSeries])

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        minHeight: '400px',
      }}
    >
      <CardHeader className="pb-3" style={{ padding: '16px 24px 12px 24px' }}>
        {/* Row 1: Title + Mode Toggle */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: drillState.mode === 'breakdown' ? '16px' : '0'
          }}
        >
          {/* Title */}
          <h3
            className={composedStyles.sectionTitle}
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: colors.main
            }}
          >
            {title}
          </h3>

          {/* Mode Toggle */}
          <ToggleGroup
            type="single"
            value={drillState.mode}
            onValueChange={handleModeChange}
            style={{ flexShrink: 0 }}
          >
            <ToggleGroupItem value="total" aria-label="Total mode">
              Total
            </ToggleGroupItem>
            <ToggleGroupItem value="breakdown" aria-label="Breakdown mode">
              Breakdown
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Row 2: Metric + Breadcrumb (only in breakdown mode) */}
        {drillState.mode === 'breakdown' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: '12px',
              borderTop: `1px solid ${colors.border.muted}`
            }}
          >
            {/* Metric selector - text buttons style */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <button
                onClick={() => handleMetricChange('revenue')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  fontSize: '13px',
                  fontWeight: drillState.metric === 'revenue' ? 600 : 400,
                  color: drillState.metric === 'revenue' ? colors.main : colors.text.secondary,
                  borderBottom: drillState.metric === 'revenue' ? `2px solid ${colors.main}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Revenue
              </button>
              <button
                onClick={() => handleMetricChange('profit')}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '4px 0',
                  fontSize: '13px',
                  fontWeight: drillState.metric === 'profit' ? 600 : 400,
                  color: drillState.metric === 'profit' ? colors.main : colors.text.secondary,
                  borderBottom: drillState.metric === 'profit' ? `2px solid ${colors.main}` : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                Profit
              </button>
            </div>

            {/* Breadcrumb */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <ChartBreadcrumb
                path={drillState.path}
                onNavigate={handleBreadcrumbNavigate}
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent style={{ padding: '0 24px 16px 24px' }}>
        <TimeSeriesChart
          hideTitle={true}
          title=""
          data={chartData.data}
          lines={chartData.lines}
          height={height}
          enableCrossFilter={drillState.mode === 'total'}
          onEntityClick={drillState.mode === 'breakdown' ? handleLineClick : undefined}
        />
      </CardContent>
    </Card>
  )
}
