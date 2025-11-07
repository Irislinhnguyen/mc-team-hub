/**
 * SummaryMetrics Component
 * Displays summary metrics in a compact horizontal layout (used in card headers)
 */

import { colors } from '../../../lib/colors'
import { safeToFixed, safeNumber, formatCompactNumber } from '../../../lib/utils/formatters'

export interface SummaryMetricItem {
  label: string
  value: string | number
  changeValue?: number
  changePercent?: number
  formatter?: (val: any) => string
  prefix?: string
  suffix?: string
  showChange?: boolean
  compact?: boolean // Use compact number format (K, M, B)
}

export interface SummaryMetricsProps {
  metrics: SummaryMetricItem[]
  className?: string
}

/**
 * SummaryMetrics - Display metrics horizontally with optional change indicators
 * Used in expandable card headers for quick overview
 */
export default function SummaryMetrics({
  metrics,
  className = ''
}: SummaryMetricsProps) {
  return (
    <div className={`flex items-center gap-6 text-sm ${className}`}>
      {metrics.map((metric, idx) => {
        const hasChange = metric.showChange !== false && metric.changePercent !== undefined
        const changeValue = safeNumber(metric.changePercent)
        const changeColor = changeValue > 0
          ? colors.status.success
          : changeValue < 0
          ? colors.status.danger
          : colors.text.secondary

        // Format value
        let displayValue: string
        if (metric.formatter) {
          displayValue = metric.formatter(metric.value)
        } else if (typeof metric.value === 'number') {
          if (metric.compact) {
            displayValue = formatCompactNumber(metric.value, 1)
          } else {
            displayValue = safeToFixed(metric.value, 0)
          }
        } else {
          displayValue = String(metric.value)
        }

        return (
          <div key={idx}>
            <div className="text-xs" style={{ color: colors.text.secondary }}>
              {metric.label}
            </div>
            <div className="text-base font-semibold" style={{ color: colors.text.primary }}>
              {metric.prefix}
              {displayValue}
              {metric.suffix}

              {hasChange && (
                <span className="text-xs font-normal ml-1" style={{ color: changeColor }}>
                  ({changeValue > 0 ? '+' : ''}
                  {safeToFixed(metric.changePercent, 1)}%)
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
