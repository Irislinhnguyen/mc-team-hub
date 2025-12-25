'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/colors'
import { typography } from '@/lib/design-tokens'
import type { Pipeline } from '@/lib/types/pipeline'

interface RevenueForecastTableProps {
  pipelines: Pipeline[]
}

export function RevenueForecastTable({ pipelines }: RevenueForecastTableProps) {
  // Calculate forecast for current quarter's 3 months using quarterly_breakdown from metadata
  const forecast = useMemo(() => {
    const today = new Date()
    const currentMonth = today.getMonth() + 1 // 1-12 (January = 1)
    const currentYear = today.getFullYear()

    // Determine current fiscal quarter
    // FY2025: Q1=Apr-Jun (4-6), Q2=Jul-Sep (7-9), Q3=Oct-Dec (10-12), Q4=Jan-Mar (1-3)
    let fiscalMonth = currentMonth >= 4 ? currentMonth : currentMonth + 12
    let quarterStartMonth = Math.floor((fiscalMonth - 4) / 3) * 3 + 4 // 4, 7, 10, or 13(=1)

    // Generate 3 months of current quarter
    const months = []
    for (let i = 0; i < 3; i++) {
      let targetMonth = quarterStartMonth + i
      let targetYear = currentYear

      // Handle quarter that crosses year boundary (Q4: Jan-Mar)
      if (targetMonth > 12) {
        targetMonth -= 12
        targetYear += 1
      }

      const targetDate = new Date(targetYear, targetMonth - 1, 1)
      const monthName = targetDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

      let totalGrossRevenue = 0
      let totalNetRevenue = 0
      let pipelineCount = 0

      // Map to first_month, middle_month, last_month
      let monthKey: 'first_month' | 'middle_month' | 'last_month'
      if (i === 0) monthKey = 'first_month'
      else if (i === 1) monthKey = 'middle_month'
      else monthKey = 'last_month'

      pipelines.forEach(pipeline => {
        // Skip closed/lost pipelines
        if (pipeline.status === '【Z】') return

        // Extract quarterly breakdown from metadata
        const quarterlyBreakdown = pipeline.metadata?.quarterly_breakdown
        if (!quarterlyBreakdown) return

        // Get revenue for this month
        const grossRevenue = quarterlyBreakdown.gross?.[monthKey] || 0
        const netRevenue = quarterlyBreakdown.net?.[monthKey] || 0

        if (grossRevenue > 0 || netRevenue > 0) {
          totalGrossRevenue += grossRevenue
          totalNetRevenue += netRevenue
          pipelineCount++
        }
      })

      months.push({
        month: monthName,
        monthIndex: i + 1,
        grossRevenue: totalGrossRevenue,
        netRevenue: totalNetRevenue,
        pipelineCount
      })
    }

    return months
  }, [pipelines])

  const formatCurrency = (value: number) => {
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }

  const totalGross = forecast.reduce((sum, m) => sum + m.grossRevenue, 0)
  const totalNet = forecast.reduce((sum, m) => sum + m.netRevenue, 0)

  return (
    <div className="w-1/2">
      <Card
        style={{
          backgroundColor: '#FFFFFF',
          border: `1px solid ${colors.neutralLight}`,
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent className="p-3">
          <h3
            className="font-semibold text-xs mb-2"
            style={{
              color: colors.main
            }}
          >
            Revenue Forecast (Current Quarter)
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
            <thead style={{ backgroundColor: colors.main }}>
              <tr>
                <th
                  className="px-2 py-1.5 text-left font-semibold text-white"
                  style={{ fontSize: '11px' }}
                >

                </th>
                {forecast.map((month) => (
                  <th
                    key={month.monthIndex}
                    className="px-2 py-1.5 text-right font-semibold text-white"
                    style={{ fontSize: '11px' }}
                  >
                    {month.month}
                  </th>
                ))}
                <th
                  className="px-2 py-1.5 text-right font-semibold text-white"
                  style={{ fontSize: '11px' }}
                >
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Gross Revenue Row */}
              <tr className="border-b border-slate-200">
                <td className="px-2 py-1.5 font-medium text-gray-700">
                  Gross Revenue
                </td>
                {forecast.map((month) => (
                  <td
                    key={month.monthIndex}
                    className="px-2 py-1.5 text-right font-semibold"
                    style={{ color: colors.main }}
                  >
                    {formatCurrency(month.grossRevenue)}
                  </td>
                ))}
                <td
                  className="px-2 py-1.5 text-right font-bold"
                  style={{ color: colors.main }}
                >
                  {formatCurrency(totalGross)}
                </td>
              </tr>

              {/* Net Revenue Row */}
              <tr className="border-b border-slate-200">
                <td className="px-2 py-1.5 font-medium text-gray-700">
                  Net Revenue
                </td>
                {forecast.map((month) => (
                  <td
                    key={month.monthIndex}
                    className="px-2 py-1.5 text-right font-semibold text-green-600"
                  >
                    {formatCurrency(month.netRevenue)}
                  </td>
                ))}
                <td className="px-2 py-1.5 text-right font-bold text-green-600">
                  {formatCurrency(totalNet)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
    </div>
  )
}
