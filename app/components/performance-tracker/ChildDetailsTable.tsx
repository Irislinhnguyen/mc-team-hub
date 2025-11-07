'use client'

import React, { useMemo } from 'react'
import { getTierInfo, TierType } from '../../../lib/utils/tierClassification'
import { formatCurrency, formatNumber, formatPercent } from '../../../lib/utils/formatters'

export type ChildLevel = 'zone' | 'mid' | 'pid' | 'pic'

export interface ChildMetric {
  // Identifiers
  id: number | string
  name?: string

  // Period 1 metrics
  req_p1: number
  rev_p1: number
  paid_p1: number

  // Period 2 metrics
  req_p2: number
  rev_p2: number
  paid_p2: number

  // Calculated metrics
  fill_rate_p1: number
  fill_rate_p2: number
  ecpm_p1: number
  ecpm_p2: number
  rev_change_pct: number
  req_change_pct: number
  fill_rate_change_pct: number
  ecpm_change_pct: number

  // Classification (new 5-tier system includes new/lost as tiers)
  tier: TierType
}

interface ChildDetailsTableProps {
  level: ChildLevel
  data: ChildMetric[]
  tier?: TierType | null
  loading?: boolean
  className?: string
}

export default function ChildDetailsTable({
  level,
  data,
  tier,
  loading = false,
  className = ''
}: ChildDetailsTableProps) {
  const levelLabels: Record<ChildLevel, { singular: string; plural: string; idLabel: string }> = {
    zone: { singular: 'Zone', plural: 'Zones', idLabel: 'Zone ID' },
    mid: { singular: 'Media', plural: 'Media', idLabel: 'Media ID' },
    pid: { singular: 'Publisher', plural: 'Publishers', idLabel: 'Publisher ID' },
    pic: { singular: 'PIC', plural: 'PICs', idLabel: 'PIC' }
  }

  const filteredData = useMemo(() => {
    if (!tier) return data
    return data.filter(item => item.tier === tier)
  }, [data, tier])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading {levelLabels[level].plural}...</span>
      </div>
    )
  }

  if (filteredData.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No {levelLabels[level].plural.toLowerCase()} found</p>
        {tier && <p className="text-sm mt-2">Try selecting a different tier filter</p>}
      </div>
    )
  }

  const getDeltaColor = (value: number) => {
    if (value > 5) return 'text-green-600'
    if (value < -5) return 'text-red-600'
    return 'text-gray-600'
  }

  return (
    <div className={`overflow-x-auto ${className}`}>
      <div className="mb-4 text-sm text-gray-600">
        Showing {filteredData.length} {filteredData.length === 1 ? levelLabels[level].singular : levelLabels[level].plural}
        {tier && ` in ${getTierInfo(tier).category} tier`}
      </div>

      <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              {levelLabels[level].idLabel}
            </th>
            {level !== 'pic' && (
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                Name
              </th>
            )}

            {/* Period 2 Current Values */}
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
              Revenue (P2)
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
              Requests (P2)
            </th>

            {/* Period-over-Period Changes (Focus) */}
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-green-50">
              Rev Δ%
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-blue-50">
              Req Δ%
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-purple-50">
              Fill Rate Δ%
            </th>
            <th className="px-3 py-2 text-right text-xs font-medium text-gray-700 uppercase tracking-wider bg-amber-50">
              eCPM Δ%
            </th>

            {/* Classification */}
            <th className="px-3 py-2 text-center text-xs font-medium text-gray-700 uppercase tracking-wider">
              Tier
            </th>
          </tr>
        </thead>

        <tbody className="bg-white divide-y divide-gray-200">
          {filteredData.map((item, index) => {
            const tierInfo = getTierInfo(item.tier)

            return (
              <tr key={`${item.id}-${index}`} className="hover:bg-gray-50 transition-colors">
                {/* ID */}
                <td className="px-3 py-2 text-sm font-medium text-gray-900 sticky left-0 bg-white">
                  {item.id}
                </td>

                {/* Name */}
                {level !== 'pic' && (
                  <td className="px-3 py-2 text-sm text-gray-700 max-w-xs truncate" title={item.name}>
                    {item.name || '-'}
                  </td>
                )}

                {/* Period 2 Current Values */}
                <td className="px-3 py-2 text-sm text-right text-gray-900 font-medium">
                  {formatCurrency(item.rev_p2)}
                </td>
                <td className="px-3 py-2 text-sm text-right text-gray-700">
                  {formatNumber(item.req_p2)}
                </td>

                {/* Period-over-Period Changes */}
                <td className={`px-3 py-2 text-sm text-right font-semibold ${getDeltaColor(item.rev_change_pct)}`}>
                  {formatPercent(item.rev_change_pct)}
                </td>
                <td className={`px-3 py-2 text-sm text-right font-medium ${getDeltaColor(item.req_change_pct)}`}>
                  {formatPercent(item.req_change_pct)}
                </td>
                <td className={`px-3 py-2 text-sm text-right font-medium ${getDeltaColor(item.fill_rate_change_pct)}`}>
                  {formatPercent(item.fill_rate_change_pct)}
                </td>
                <td className={`px-3 py-2 text-sm text-right font-medium ${getDeltaColor(item.ecpm_change_pct)}`}>
                  {formatPercent(item.ecpm_change_pct)}
                </td>

                {/* Tier Badge - Compact with icon */}
                <td className="px-3 py-2 text-center">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded"
                    style={{
                      backgroundColor: tierInfo.bgColor,
                      color: tierInfo.color
                    }}
                    title={tierInfo.description}
                  >
                    <span>{tierInfo.label}</span>
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
