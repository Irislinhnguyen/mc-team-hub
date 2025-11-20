'use client'

/**
 * UnifiedDeepDiveView Component
 *
 * Single component that handles all 6 perspectives with A/B/C tier layout
 * Replaces 6 separate view components
 */

import React, { useState, useEffect } from 'react'
import TierSection from './TierSection'
import DeepDiveSummary from './DeepDiveSummary'
import TabNavigation from './TabNavigation'
import {
  revenueColumn,
  changeColumn,
  requestsColumn,
  fillRateColumn,
  ecpmColumn,
  warningsColumn,
  groupColumn,
  lostImpactColumn,
  notesColumn
} from '../../../lib/utils/deepDiveColumnHelpers'
import type { ColumnConfig } from './TierSection'
import { colors } from '../../../lib/colors'
import { Download } from 'lucide-react'
import { exportAllTiersToCSV, exportSummaryToCSV } from '../../../lib/utils/deepDiveExport'
import type { SimplifiedFilter } from '../../../lib/types/performanceTracker'

export interface Period {
  start: string
  end: string
}

export type TierType = 'A' | 'B' | 'C' | 'NEW' | 'LOST' | 'ALL'

export interface UnifiedDeepDiveViewProps {
  perspective: 'team' | 'pic' | 'pid' | 'mid' | 'product' | 'zone'
  period1: Period
  period2: Period
  filters: Record<string, any>
  simplifiedFilter?: SimplifiedFilter // NEW: Simplified filters support (Looker Studio-style)
  activeTier?: TierType
  onTierChange?: (tier: TierType) => void
  parentId?: string | number
  onDrillDown?: (perspective: string, id: string | number) => void
  shouldFetch?: boolean // Control when to fetch data
  onDataLoaded?: (data: any, summary: any) => void // Callback after data is loaded
  cachedData?: { data: any; summary: any } | null // Pre-loaded cached data
}

export default function UnifiedDeepDiveView({
  perspective,
  period1,
  period2,
  filters,
  simplifiedFilter,
  activeTier = 'ALL',
  onTierChange,
  parentId,
  onDrillDown,
  shouldFetch = false,
  onDataLoaded,
  cachedData
}: UnifiedDeepDiveViewProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)

  // Clear data when perspective/filters/periods change
  // Or use cached data if available
  useEffect(() => {
    if (cachedData) {
      console.log('[UnifiedDeepDiveView] Using cached data')
      setData({ status: 'ok', data: cachedData.data, summary: cachedData.summary })
      setError(null)
    } else {
      setData(null)
      setError(null)
    }
  }, [perspective, filters, period1, period2, cachedData])

  // Fetch data from unified API only when shouldFetch becomes true (user clicks Analyze)
  useEffect(() => {
    if (shouldFetch) {
      fetchData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetch])

  const fetchData = async () => {
    setLoading(true)
    setError(null)

    const requestBody = {
      perspective,
      period1,
      period2,
      filters,
      simplifiedFilter,
      parentId
    }

    console.log('[UnifiedDeepDiveView] 🚀 Sending request to deep-dive API:', requestBody)

    try {
      const response = await fetch('/api/performance-tracker/deep-dive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const result = await response.json()

      console.log('[UnifiedDeepDiveView] ✅ Received response from API:')
      console.log('  Total items:', result.summary?.total_items)
      console.log('  Total revenue P2:', result.summary?.total_revenue_p2)
      console.log('  Total requests P2:', result.summary?.total_requests_p2)
      console.log('  First 3 items:', result.data?.slice(0, 3))

      if (result.status !== 'ok') {
        throw new Error(result.error || 'Unknown error')
      }

      setData(result)

      // Call onDataLoaded callback if provided
      if (onDataLoaded && result.data && result.summary) {
        onDataLoaded(result.data, result.summary)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Show placeholder when no data yet
  if (!data && !loading && !error) {
    return (
      <div className="text-center py-12" style={{ color: colors.text.secondary }}>
        <p className="text-lg font-medium">Ready to analyze</p>
        <p className="text-sm mt-2">Click "Analyze" button to fetch data</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
            style={{ borderColor: colors.interactive.primary }}
          ></div>
          <p style={{ color: colors.text.secondary }}>Loading {perspective} data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="border rounded-lg p-6"
        style={{
          backgroundColor: colors.status.dangerBg,
          borderColor: colors.status.danger
        }}
      >
        <h3 className="font-semibold mb-2" style={{ color: colors.status.danger }}>
          Error Loading Data
        </h3>
        <p style={{ color: colors.status.danger }}>{error}</p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 rounded"
          style={{
            backgroundColor: colors.status.danger,
            color: '#fff'
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  if (!data || !data.data) {
    return (
      <div className="text-center py-12" style={{ color: colors.text.secondary }}>
        No data available
      </div>
    )
  }

  // Group items by display tier
  const tierA = data.data.filter((item: any) => item.display_tier === 'A')
  const tierB = data.data.filter((item: any) => item.display_tier === 'B')
  const tierC = data.data.filter((item: any) => item.display_tier === 'C')
  const tierNew = data.data.filter((item: any) => item.display_tier === 'NEW')
  const tierLost = data.data.filter((item: any) => item.display_tier === 'LOST')

  // Get ID field based on perspective
  const idField = getIdField(perspective)
  const nameField = 'name'

  // Define columns based on perspective
  const baseColumns: ColumnConfig[] = [
    {
      key: 'id',
      label: 'ID',
      width: '10%',
      render: (item) => (
        <div className="font-mono text-xs" style={{ color: colors.text.secondary }}>
          {item[idField]}
        </div>
      )
    },
    {
      key: 'name',
      label: getPerspectiveLabel(perspective),
      width: '18%',
      render: (item) => (
        <div className="max-w-full" title={item[nameField]}>
          <div className="truncate" style={{ color: colors.text.primary }}>{item[nameField]}</div>
          <div className="text-xs truncate" style={{ color: colors.text.secondary }}>
            {getSubInfo(item, perspective)}
          </div>
        </div>
      )
    },
    revenueColumn('A'),
    changeColumn(),
    requestsColumn(),
    fillRateColumn(),
    ecpmColumn(),
    warningsColumn()
  ]

  const newColumns: ColumnConfig[] = [
    {
      key: 'id',
      label: 'ID',
      width: '10%',
      render: (item) => (
        <div className="font-mono text-xs" style={{ color: colors.text.secondary }}>
          {item[idField]}
        </div>
      )
    },
    {
      key: 'name',
      label: getPerspectiveLabel(perspective),
      width: '22%',
      render: (item) => (
        <div className="max-w-full" title={item[nameField]}>
          <div className="truncate" style={{ color: colors.text.primary }}>{item[nameField]}</div>
          <div className="text-xs truncate" style={{ color: colors.text.secondary }}>
            {getSubInfo(item, perspective)}
          </div>
        </div>
      )
    },
    revenueColumn('NEW'),
    requestsColumn(),
    fillRateColumn(),
    ecpmColumn(),
    groupColumn(),
    notesColumn()
  ]

  const lostColumns: ColumnConfig[] = [
    {
      key: 'id',
      label: 'ID',
      width: '10%',
      render: (item) => (
        <div className="font-mono text-xs" style={{ color: colors.text.secondary }}>
          {item[idField]}
        </div>
      )
    },
    {
      key: 'name',
      label: getPerspectiveLabel(perspective),
      width: '25%',
      render: (item) => (
        <div className="max-w-full" title={item[nameField]}>
          <div className="truncate" style={{ color: colors.text.primary }}>{item[nameField]}</div>
          <div className="text-xs truncate" style={{ color: colors.text.secondary }}>
            {getSubInfo(item, perspective)}
          </div>
        </div>
      )
    },
    revenueColumn('LOST'),
    lostImpactColumn(),
    groupColumn()
  ]

  const handleDrillDown = (item: any) => {
    if (onDrillDown) {
      const childPerspective = getChildPerspective(perspective)
      if (childPerspective) {
        onDrillDown(childPerspective, item[idField])
      }
    }
  }

  const periodLabels = {
    period1: `${period1.start} to ${period1.end}`,
    period2: `${period2.start} to ${period2.end}`
  }

  const canDrillDown = getChildPerspective(perspective) !== null

  // Build tabs array with counts and colors
  const tabs = [
    { id: 'A', label: 'A', count: tierA.length, color: colors.status.success },
    { id: 'B', label: 'B', count: tierB.length, color: colors.status.warning },
    { id: 'C', label: 'C', count: tierC.length, color: colors.status.danger },
    { id: 'NEW', label: 'New', count: tierNew.length, color: colors.status.info },
    { id: 'LOST', label: 'Lost', count: tierLost.length, color: colors.status.danger }
  ]

  // Handle export all
  const handleExportAll = () => {
    // Export summary
    exportSummaryToCSV(data.summary, perspective, periodLabels)
    // Export all tiers
    exportAllTiersToCSV(data, perspective)
  }

  // Render the active tier section
  const renderActiveTier = () => {
    switch (activeTier) {
      case 'A':
        return (
          <TierSection
            tier="A"
            title={`TIER A - Top 80% Revenue Contributors`}
            description={`${tierA.length} items = $${data.summary.tier_revenue.A.toLocaleString()} (${((data.summary.tier_revenue.A / data.summary.total_revenue_p2) * 100).toFixed(1)}%)`}
            items={tierA}
            perspective={perspective}
            columns={baseColumns}
            onDrillDown={canDrillDown ? handleDrillDown : undefined}
          />
        )
      case 'B':
        return (
          <TierSection
            tier="B"
            title={`TIER B - Next 15% Revenue (80-95%)`}
            description={`${tierB.length} items = $${data.summary.tier_revenue.B.toLocaleString()} (${((data.summary.tier_revenue.B / data.summary.total_revenue_p2) * 100).toFixed(1)}%)`}
            items={tierB}
            perspective={perspective}
            columns={baseColumns}
            onDrillDown={canDrillDown ? handleDrillDown : undefined}
          />
        )
      case 'C':
        return (
          <TierSection
            tier="C"
            title={`TIER C - Bottom 5% Revenue (95-100%)`}
            description={`${tierC.length} items = $${data.summary.tier_revenue.C.toLocaleString()} (${((data.summary.tier_revenue.C / data.summary.total_revenue_p2) * 100).toFixed(1)}%)`}
            items={tierC}
            perspective={perspective}
            columns={baseColumns}
            onDrillDown={canDrillDown ? handleDrillDown : undefined}
          />
        )
      case 'NEW':
        return tierNew.length > 0 ? (
          <TierSection
            tier="NEW"
            title={`NEW - New Items`}
            description={`${tierNew.length} new items added in Period 2`}
            items={tierNew}
            perspective={perspective}
            columns={newColumns}
            onDrillDown={canDrillDown ? handleDrillDown : undefined}
          />
        ) : (
          <div className="text-center py-12" style={{ color: colors.text.secondary }}>
            No new items in this period
          </div>
        )
      case 'LOST':
        return tierLost.length > 0 ? (
          <TierSection
            tier="LOST"
            title={`LOST - Lost Items`}
            description={`${tierLost.length} items lost in Period 2`}
            items={tierLost}
            perspective={perspective}
            columns={lostColumns}
            onDrillDown={undefined}
          />
        ) : (
          <div className="text-center py-12" style={{ color: colors.text.secondary }}>
            No lost items in this period
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Export All Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors hover:opacity-80"
          style={{
            borderColor: colors.border.default,
            color: colors.interactive.primary,
            backgroundColor: colors.surface.card
          }}
        >
          <Download size={16} />
          Export All Data (Summary + All Tiers)
        </button>
      </div>

      {/* Summary */}
      <DeepDiveSummary
        summary={data.summary}
        perspective={perspective}
        periodLabels={periodLabels}
        filters={filters}
      />

      {/* Tier Tabs */}
      {onTierChange && (
        <TabNavigation
          tabs={tabs}
          activeTab={activeTier}
          onTabChange={(tabId) => onTierChange(tabId as TierType)}
        />
      )}

      {/* Active Tier Section */}
      {renderActiveTier()}
    </div>
  )
}

// Helper functions

function getIdField(perspective: string): string {
  const mapping: Record<string, string> = {
    team: 'team',
    pic: 'pic',
    pid: 'pid',
    mid: 'mid',
    product: 'product',
    zone: 'zid'
  }
  return mapping[perspective] || 'id'
}

function getPerspectiveLabel(perspective: string): string {
  const labels: Record<string, string> = {
    team: 'Team',
    pic: 'PIC',
    pid: 'Publisher',
    mid: 'Media Property',
    product: 'Product',
    zone: 'Zone'
  }
  return labels[perspective] || perspective
}

function getSubInfo(item: any, perspective: string): string {
  if (perspective === 'pic' && item.publisher_count) {
    return `${item.publisher_count} publishers`
  }
  if (perspective === 'pid' && item.media_count) {
    return `${item.media_count} media`
  }
  if (perspective === 'mid' && item.zone_count) {
    return `${item.zone_count} zones`
  }
  if (perspective === 'product' && item.publisher_count) {
    return `${item.publisher_count} pubs, ${item.zone_count} zones`
  }
  return ''
}

function getChildPerspective(perspective: string): string | null {
  const hierarchy: Record<string, string | null> = {
    team: 'pic',
    pic: 'pid',
    pid: 'mid',
    mid: 'zone',
    product: 'zone',
    zone: null
  }
  return hierarchy[perspective] || null
}
