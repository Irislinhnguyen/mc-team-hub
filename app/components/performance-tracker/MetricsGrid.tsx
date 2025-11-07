/**
 * MetricsGrid Component
 * Reusable grid component for displaying metrics with change indicators
 */

import { colors } from '../../../lib/colors'
import { safeToFixed, safeNumber } from '../../../lib/utils/formatters'

export interface MetricItem {
  label: string
  value: string | number
  changeValue?: number
  changePercent?: number
  formatter?: (val: any) => string
  prefix?: string
  suffix?: string
}

export interface MetricsGridProps {
  metrics: MetricItem[]
  columns?: 2 | 3 | 4
  backgroundColor?: string
  className?: string
}

/**
 * MetricsGrid - Display metrics in a grid layout with change indicators
 */
export default function MetricsGrid({
  metrics,
  columns = 3,
  backgroundColor = '#fafafa',
  className = ''
}: MetricsGridProps) {
  const gridClass = `grid grid-cols-${columns} gap-4 py-3 px-4 rounded ${className}`

  return (
    <div className={gridClass} style={{ backgroundColor }}>
      {metrics.map((metric, idx) => {
        const hasChange = metric.changePercent !== undefined
        const changeColor = hasChange && safeNumber(metric.changePercent) > 0
          ? colors.status.success
          : colors.status.danger

        // Format value
        let displayValue = metric.value
        if (metric.formatter) {
          displayValue = metric.formatter(metric.value)
        } else if (typeof metric.value === 'number') {
          displayValue = safeToFixed(metric.value, 2)
        }

        return (
          <div key={idx}>
            <div className="text-xs" style={{ color: colors.text.secondary }}>
              {metric.label}
            </div>
            <div className="text-lg font-semibold" style={{ color: colors.text.primary }}>
              {metric.prefix}
              {displayValue}
              {metric.suffix}

              {hasChange && (
                <span className="text-xs ml-1" style={{ color: changeColor }}>
                  ({safeNumber(metric.changePercent) > 0 ? '+' : ''}
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
