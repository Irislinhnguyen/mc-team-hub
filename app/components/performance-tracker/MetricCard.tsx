import { Card, CardContent } from '@/components/ui/card'
import { composedStyles, typography } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'
import { formatMetricCardValue, safeToFixed } from '../../../lib/utils/formatters'

interface MetricCardProps {
  label: string
  value: string | number
  unit?: string
  icon?: React.ReactNode
  trend?: {
    value: number
    direction: 'up' | 'down'
  }
  change?: number // Percentage change
  comparisonValue?: number // Previous period value for comparison
}

export function MetricCard({ label, value, unit = '', icon, trend, change, comparisonValue }: MetricCardProps) {
  // Use compact formatting for metric cards
  const formattedValue = typeof value === 'number'
    ? formatMetricCardValue(value, label)
    : value

  const formattedComparison = comparisonValue !== undefined
    ? formatMetricCardValue(comparisonValue, label)
    : null

  const getChangeColor = (changeValue: number) => {
    // Minimal color usage - only red for negative
    if (changeValue < 0) return colors.status.danger
    return colors.text.secondary
  }

  return (
    <Card
      className="transition-all duration-200"
      style={{
        backgroundColor: '#fafafa', // Very subtle background
        border: 'none', // Borderless design
        borderRadius: '6px',
        boxShadow: 'none' // No shadows - minimal
      }}
    >
      <CardContent className="px-5 pb-5 pt-4">
        <div className="flex flex-col items-center text-center">
          <p
            className="font-medium uppercase tracking-wider"
            style={{
              fontSize: '10px',
              color: colors.text.secondary,
              letterSpacing: '0.5px',
              marginBottom: '8px',
              minHeight: '24px',
              lineHeight: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {label}
          </p>
          <p
            className="font-bold tabular-nums"
            style={{
              fontSize: typography.sizes.metricValue,
              lineHeight: typography.sizes.metricValue,
              color: colors.data.primary,
              height: typography.sizes.metricValue,
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'center'
            }}
          >
            {formattedValue}
            {unit && (
              <span
                style={{
                  fontSize: '14px',
                  color: colors.text.secondary,
                  marginLeft: '2px'
                }}
              >
                {unit}
              </span>
            )}
          </p>
          {change !== undefined && (
            <p
              className="font-medium"
              style={{
                fontSize: typography.sizes.dataPoint,
                color: getChangeColor(change),
                marginTop: '4px'
              }}
            >
              {change > 0 ? '+' : ''}{safeToFixed(change, 1)}% vs P1
            </p>
          )}
          {formattedComparison && !change && (
            <p
              className="text-xs"
              style={{
                color: colors.text.tertiary,
                marginTop: '4px'
              }}
            >
              vs {formattedComparison}
            </p>
          )}
          {trend && !change && (
            <p
              className="font-medium"
              style={{
                fontSize: typography.sizes.dataPoint,
                color: trend.direction === 'up' ? colors.status.success : colors.status.danger,
                marginTop: '4px'
              }}
            >
              {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
