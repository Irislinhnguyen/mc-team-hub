'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { CompactZoneCard } from './CompactZoneCard'
import { DataTable } from './DataTable'
import { safeToFixed, safeNumber } from '../../../lib/utils/formatters'
import { colors } from '../../../lib/colors'

interface SummaryMetrics {
  total_req_p1: number
  total_req_p2: number
  req_change_pct: number
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number
  avg_ecpm_p1: number
  avg_ecpm_p2: number
  ecpm_change_pct: number
  avg_fill_rate_p1: number
  avg_fill_rate_p2: number
  fill_rate_change_pct: number
}

interface ProductData {
  product: string
  zones: any[]
  metrics: SummaryMetrics
}

interface ProductSegmentedViewProps {
  allProductsSummary: SummaryMetrics
  productBreakdowns: ProductData[]
  columns: any[]
  useCardView?: boolean // Force card view for sparse data
}

export function ProductSegmentedView({
  allProductsSummary,
  productBreakdowns,
  columns,
  useCardView = false
}: ProductSegmentedViewProps) {

  const formatNumber = (num: number) => num.toLocaleString()
  const formatCurrency = (num: number) => `$${safeToFixed(num, 2)}`
  const formatPercent = (num: number) => {
    const sign = num > 0 ? '+' : ''
    return `${sign}${safeToFixed(num, 1)}%`
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return '#2E7D32' // Green
    if (change < 0) return '#C62828' // Red
    return '#757575' // Gray
  }

  return (
    <div className="space-y-4">
      {/* Overall Summary - All Products Combined */}
      <Card style={{ backgroundColor: colors.surface.page, border: `2px solid ${colors.data.primary}` }}>
        <CardHeader>
          <CardTitle className="text-base font-semibold" style={{ color: colors.text.primary }}>
            All Products Combined
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Requests */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Requests</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatNumber(allProductsSummary.total_req_p2)}
              </div>
              <div className="text-xs mt-1" style={{ color: getChangeColor(allProductsSummary.req_change_pct) }}>
                {formatPercent(allProductsSummary.req_change_pct)} vs P1
              </div>
            </div>

            {/* Total Revenue */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Total Revenue</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(allProductsSummary.total_rev_p2)}
              </div>
              <div className="text-xs mt-1" style={{ color: getChangeColor(allProductsSummary.rev_change_pct) }}>
                {formatPercent(allProductsSummary.rev_change_pct)} vs P1
              </div>
            </div>

            {/* Avg eCPM */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Avg eCPM</div>
              <div className="text-lg font-semibold text-gray-900">
                {formatCurrency(allProductsSummary.avg_ecpm_p2)}
              </div>
              <div className="text-xs mt-1" style={{ color: getChangeColor(allProductsSummary.ecpm_change_pct) }}>
                {formatPercent(allProductsSummary.ecpm_change_pct)} vs P1
              </div>
            </div>

            {/* Avg Fill Rate */}
            <div>
              <div className="text-xs text-gray-500 mb-1">Avg Fill Rate</div>
              <div className="text-lg font-semibold text-gray-900">
                {safeToFixed(allProductsSummary.avg_fill_rate_p2, 1)}%
              </div>
              <div className="text-xs mt-1" style={{ color: getChangeColor(allProductsSummary.fill_rate_change_pct) }}>
                {formatPercent(allProductsSummary.fill_rate_change_pct)} vs P1
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Breakdowns - Collapsible Sections */}
      {productBreakdowns.map((productData, idx) => (
        <ProductSection
          key={productData.product}
          product={productData.product}
          zones={productData.zones}
          metrics={productData.metrics}
          columns={columns}
          useCardView={useCardView || productData.zones.length < 5}
          defaultOpen={idx === 0} // First product open by default
        />
      ))}
    </div>
  )
}

interface ProductSectionProps {
  product: string
  zones: any[]
  metrics: SummaryMetrics
  columns: any[]
  useCardView: boolean
  defaultOpen: boolean
}

function ProductSection({
  product,
  zones,
  metrics,
  columns,
  useCardView,
  defaultOpen
}: ProductSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const formatNumber = (num: number) => num.toLocaleString()
  const formatCurrency = (num: number) => `$${safeToFixed(num, 2)}`
  const formatPercent = (num: number) => {
    const sign = num > 0 ? '+' : ''
    return `${sign}${safeToFixed(num, 1)}%`
  }

  const getChangeColor = (change: number) => {
    if (change > 0) return '#2E7D32'
    if (change < 0) return '#C62828'
    return '#757575'
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card style={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0' }}>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOpen ? (
                  <ChevronDown size={20} className="text-gray-600" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600" />
                )}
                <CardTitle className="text-base font-semibold text-gray-900">
                  {product}
                </CardTitle>
                <span className="text-xs text-gray-500">
                  ({zones.length} {zones.length === 1 ? 'zone' : 'zones'})
                </span>
              </div>

              {/* Product Metrics Summary */}
              <div className="flex gap-6 text-sm">
                <div className="text-right">
                  <div className="text-xs text-gray-500">Requests</div>
                  <div className="font-semibold text-gray-900">
                    {formatNumber(metrics.total_req_p2)}
                  </div>
                  <div className="text-xs" style={{ color: getChangeColor(metrics.req_change_pct) }}>
                    {formatPercent(metrics.req_change_pct)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Revenue</div>
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(metrics.total_rev_p2)}
                  </div>
                  <div className="text-xs" style={{ color: getChangeColor(metrics.rev_change_pct) }}>
                    {formatPercent(metrics.rev_change_pct)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">eCPM</div>
                  <div className="font-semibold text-gray-900">
                    {formatCurrency(metrics.avg_ecpm_p2)}
                  </div>
                  <div className="text-xs" style={{ color: getChangeColor(metrics.ecpm_change_pct) }}>
                    {formatPercent(metrics.ecpm_change_pct)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Fill Rate</div>
                  <div className="font-semibold text-gray-900">
                    {safeToFixed(metrics.avg_fill_rate_p2, 1)}%
                  </div>
                  <div className="text-xs" style={{ color: getChangeColor(metrics.fill_rate_change_pct) }}>
                    {formatPercent(metrics.fill_rate_change_pct)}
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0">
            {useCardView ? (
              // Compact Card View for sparse data
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {zones.map((zone, idx) => (
                  <CompactZoneCard key={idx} {...zone} />
                ))}
              </div>
            ) : (
              // Standard Table View for more data
              <DataTable
                title=""
                columns={columns}
                data={zones}
                pageSize={50}
              />
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
