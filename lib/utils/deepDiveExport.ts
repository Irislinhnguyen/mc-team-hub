/**
 * Deep Dive Export Utilities
 *
 * Handles CSV export for deep dive tables and summary data
 */

import { exportToCSV, getExportFilename } from './export'

/**
 * Export tier section data to CSV
 */
export function exportTierToCSV(
  items: any[],
  tier: 'A' | 'B' | 'C' | 'NEW' | 'LOST',
  perspective: string
): void {
  if (!items || items.length === 0) {
    console.error('No items to export')
    return
  }

  // Transform items to CSV-friendly format
  const csvData = items.map(item => {
    const baseData: Record<string, any> = {
      Name: item.name || '',
      Tier: item.display_tier || tier
    }

    // Add perspective-specific info
    if (perspective === 'pic' && item.publisher_count) {
      baseData['Publishers'] = item.publisher_count
    } else if (perspective === 'pid' && item.media_count) {
      baseData['Media'] = item.media_count
    } else if (perspective === 'mid' && item.zone_count) {
      baseData['Zones'] = item.zone_count
    } else if (perspective === 'product') {
      if (item.publisher_count) baseData['Publishers'] = item.publisher_count
      if (item.zone_count) baseData['Zones'] = item.zone_count
    }

    // Common metrics for A/B/C tiers
    if (tier !== 'LOST' && tier !== 'NEW') {
      baseData['Revenue P2'] = item.rev_p2 || 0
      baseData['Revenue P1'] = item.rev_p1 || 0
      baseData['Revenue Change'] = item.rev_p2 - item.rev_p1
      baseData['Revenue Change %'] = item.rev_change_pct ? `${item.rev_change_pct.toFixed(1)}%` : '0.0%'
      baseData['Requests P2'] = item.req_p2 || 0
      baseData['Requests P1'] = item.req_p1 || 0
      baseData['Requests Change %'] = item.req_change_pct ? `${item.req_change_pct.toFixed(1)}%` : '0.0%'

      // Calculate eCPM
      const ecpm1 = (item.req_p1 || 0) > 0 ? ((item.rev_p1 || 0) / item.req_p1) * 1000 : 0
      const ecpm2 = (item.req_p2 || 0) > 0 ? ((item.rev_p2 || 0) / item.req_p2) * 1000 : 0
      const ecpmChange = ecpm1 > 0 ? ((ecpm2 - ecpm1) / ecpm1) * 100 : 0

      baseData['eCPM P2'] = ecpm2.toFixed(2)
      baseData['eCPM P1'] = ecpm1.toFixed(2)
      baseData['eCPM Change %'] = `${ecpmChange.toFixed(1)}%`
      baseData['% of Total'] = item.total_revenue ? ((item.rev_p2 / item.total_revenue) * 100).toFixed(1) + '%' : '0.0%'

      if (item.cumulative_revenue_pct != null) {
        baseData['Cumulative %'] = `${item.cumulative_revenue_pct.toFixed(1)}%`
      }

      if (item.transition_warning) {
        baseData['Warning'] = item.transition_warning
        baseData['Warning Type'] = item.transition_type || ''
      }
    }

    // NEW tier specific
    if (tier === 'NEW') {
      baseData['Revenue P2'] = item.rev_p2 || 0
      baseData['Requests P2'] = item.req_p2 || 0
      const ecpm2 = (item.req_p2 || 0) > 0 ? ((item.rev_p2 || 0) / item.req_p2) * 1000 : 0
      baseData['eCPM P2'] = ecpm2.toFixed(2)
      baseData['Group'] = item.tier_group || ''
      baseData['% of Total'] = item.total_revenue ? ((item.rev_p2 / item.total_revenue) * 100).toFixed(1) + '%' : '0.0%'
    }

    // LOST tier specific
    if (tier === 'LOST') {
      baseData['Revenue P1'] = item.rev_p1 || 0
      baseData['Lost Revenue'] = item.lost_revenue || 0
      baseData['Impact % of P1'] = item.impact_pct ? `${item.impact_pct.toFixed(2)}%` : '0.00%'
      baseData['Group'] = item.tier_group || ''
      baseData['% of Total'] = item.total_revenue ? ((item.rev_p1 / item.total_revenue) * 100).toFixed(1) + '%' : '0.0%'
    }

    return baseData
  })

  const filename = getExportFilename(`deep-dive-${perspective}-tier-${tier}`)
  exportToCSV(csvData, filename)
}

/**
 * Export summary data to CSV
 */
export function exportSummaryToCSV(
  summary: any,
  perspective: string,
  periodLabels: { period1: string; period2: string }
): void {
  if (!summary) {
    console.error('No summary data to export')
    return
  }

  const csvData = [
    {
      Metric: 'Total Revenue',
      'Period 1': `$${summary.total_revenue_p1.toLocaleString()}`,
      'Period 2': `$${summary.total_revenue_p2.toLocaleString()}`,
      Change: `$${(summary.total_revenue_p2 - summary.total_revenue_p1).toLocaleString()}`,
      'Change %': `${summary.revenue_change_pct.toFixed(1)}%`
    },
    {
      Metric: 'Total Requests',
      'Period 1': summary.total_requests_p1.toLocaleString(),
      'Period 2': summary.total_requests_p2.toLocaleString(),
      Change: (summary.total_requests_p2 - summary.total_requests_p1).toLocaleString(),
      'Change %': `${summary.requests_change_pct.toFixed(1)}%`
    },
    {
      Metric: 'eCPM',
      'Period 1': `$${summary.total_ecpm_p1.toFixed(2)}`,
      'Period 2': `$${summary.total_ecpm_p2.toFixed(2)}`,
      Change: `$${(summary.total_ecpm_p2 - summary.total_ecpm_p1).toFixed(2)}`,
      'Change %': `${summary.ecpm_change_pct.toFixed(1)}%`
    },
    {
      Metric: 'Total Items',
      'Period 1': '',
      'Period 2': summary.total_items.toString(),
      Change: '',
      'Change %': ''
    },
    {
      Metric: 'Tier A Count',
      'Period 1': '',
      'Period 2': summary.tier_counts.A?.toString() || '0',
      Change: '',
      'Change %': ''
    },
    {
      Metric: 'Tier B Count',
      'Period 1': '',
      'Period 2': summary.tier_counts.B?.toString() || '0',
      Change: '',
      'Change %': ''
    },
    {
      Metric: 'Tier C Count',
      'Period 1': '',
      'Period 2': summary.tier_counts.C?.toString() || '0',
      Change: '',
      'Change %': ''
    },
    {
      Metric: 'New Items',
      'Period 1': '',
      'Period 2': summary.tier_counts.NEW?.toString() || '0',
      Change: '',
      'Change %': ''
    },
    {
      Metric: 'Lost Items',
      'Period 1': '',
      'Period 2': summary.tier_counts.LOST?.toString() || '0',
      Change: '',
      'Change %': ''
    },
    {
      Metric: 'Tier A Revenue',
      'Period 1': '',
      'Period 2': `$${summary.tier_revenue.A?.toLocaleString() || '0'}`,
      Change: '',
      'Change %': `${((summary.tier_revenue.A / summary.total_revenue_p2) * 100).toFixed(1)}%`
    },
    {
      Metric: 'Tier B Revenue',
      'Period 1': '',
      'Period 2': `$${summary.tier_revenue.B?.toLocaleString() || '0'}`,
      Change: '',
      'Change %': `${((summary.tier_revenue.B / summary.total_revenue_p2) * 100).toFixed(1)}%`
    },
    {
      Metric: 'Tier C Revenue',
      'Period 1': '',
      'Period 2': `$${summary.tier_revenue.C?.toLocaleString() || '0'}`,
      Change: '',
      'Change %': `${((summary.tier_revenue.C / summary.total_revenue_p2) * 100).toFixed(1)}%`
    }
  ]

  const filename = getExportFilename(`deep-dive-${perspective}-summary`)
  exportToCSV(csvData, filename)
}

/**
 * Export all tiers to separate CSV files
 */
export function exportAllTiersToCSV(
  data: any,
  perspective: string
): void {
  if (!data || !data.data) {
    console.error('No data to export')
    return
  }

  // Group items by tier
  const tierA = data.data.filter((item: any) => item.display_tier === 'A')
  const tierB = data.data.filter((item: any) => item.display_tier === 'B')
  const tierC = data.data.filter((item: any) => item.display_tier === 'C')
  const tierNew = data.data.filter((item: any) => item.display_tier === 'NEW')
  const tierLost = data.data.filter((item: any) => item.display_tier === 'LOST')

  // Export each tier
  if (tierA.length > 0) exportTierToCSV(tierA, 'A', perspective)
  if (tierB.length > 0) exportTierToCSV(tierB, 'B', perspective)
  if (tierC.length > 0) exportTierToCSV(tierC, 'C', perspective)
  if (tierNew.length > 0) exportTierToCSV(tierNew, 'NEW', perspective)
  if (tierLost.length > 0) exportTierToCSV(tierLost, 'LOST', perspective)
}
