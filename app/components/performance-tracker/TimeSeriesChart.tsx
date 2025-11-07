'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { composedStyles, typography, chartSizes } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'
import { withExport } from './withExport'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import { formatChartTooltip, formatChartAxis } from '../../../lib/utils/formatters'

interface TimeSeriesChartProps {
  title: string
  data: any[]
  lines: Array<{
    dataKey: string
    name: string
    color: string
  }>
  height?: number
  enableCrossFilter?: boolean
  dateKey?: string
  customYAxisFormatter?: (value: any) => string
  customTooltipFormatter?: (value: any, name: string) => [string, string]
}

function TimeSeriesChartBase({
  title,
  data,
  lines,
  height = chartSizes.heights.standard,
  enableCrossFilter = false,
  dateKey = 'date',
  customYAxisFormatter,
  customTooltipFormatter: customTooltipFormatterProp
}: TimeSeriesChartProps) {
  const { addCrossFilter, autoEnable, crossFilters } = useCrossFilter()
  const isEnabled = enableCrossFilter || autoEnable
  const [isCtrlPressed, setIsCtrlPressed] = React.useState(false)

  // Track Ctrl/Cmd key state for multi-select
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true)
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        setIsCtrlPressed(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  const handlePointClick = (clickData: any) => {
    if (!isEnabled) return

    const payload = clickData.activePayload?.[0]?.payload
    if (!payload) return

    // Try to get rawDate first (ISO format), fall back to dateKey
    const rawDateValue = payload.rawDate || payload[dateKey]
    const displayValue = payload[dateKey]

    if (rawDateValue) {
      addCrossFilter({
        field: 'date',
        value: String(rawDateValue), // Use ISO format for backend
        label: `date: ${displayValue}`, // Use formatted date for display
      }, isCtrlPressed)
    }
  }

  // Custom tooltip formatter with metric type detection
  const customTooltipFormatter = (value: any, name: string) => {
    if (customTooltipFormatterProp) {
      return customTooltipFormatterProp(value, name)
    }
    return formatChartTooltip(value, name)
  }

  // Custom Y-axis formatter - use custom formatter if provided, otherwise detect metric type
  const yAxisFormatter = (value: any) => {
    if (customYAxisFormatter) {
      return customYAxisFormatter(value)
    }
    const primaryMetric = lines[0]?.dataKey || ''
    return formatChartAxis(value, primaryMetric)
  }

  // Custom axis style - 12px font from design tokens
  const axisStyle = {
    fontSize: typography.sizes.dataPoint,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: colors.neutralDark
  }

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        minHeight: '380px', // Prevent collapse (header + chart height + padding)
      }}
    >
      <CardHeader className="pb-3">
        <h3
          className={composedStyles.sectionTitle}
          style={{
            fontSize: typography.sizes.sectionTitle,
            color: colors.main
          }}
        >
          {title}
        </h3>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            onClick={isEnabled ? handlePointClick : undefined}
            style={{ cursor: isEnabled ? 'pointer' : 'default' }}
            margin={chartSizes.margins.default}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.neutralLight} opacity={0.3} />
            <XAxis dataKey={dateKey} tick={axisStyle} />
            <YAxis tick={axisStyle} tickFormatter={yAxisFormatter} />
            <Tooltip formatter={customTooltipFormatter} contentStyle={{ fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {lines.map((line) => {
              // Check if there are date filters active
              const hasDateFilters = crossFilters.some(f => f.field === 'date')

              return (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={2}
                  dot={(props: any) => {
                    if (!isEnabled) return null
                    const { cx, cy, payload, index } = props
                    const rawDateValue = payload.rawDate || payload[dateKey]
                    const isSelected = crossFilters.some(f => f.field === 'date' && f.value === String(rawDateValue))
                    const key = `${line.dataKey}-${index}-${rawDateValue}`

                    if (hasDateFilters && isSelected) {
                      // Selected point: larger, filled
                      return <circle key={key} cx={cx} cy={cy} r={5} fill={line.color} stroke="#fff" strokeWidth={2} />
                    } else if (hasDateFilters) {
                      // Non-selected: smaller, semi-transparent
                      return <circle key={key} cx={cx} cy={cy} r={3} fill={line.color} opacity={0.4} />
                    } else {
                      // No filters: normal dots
                      return <circle key={key} cx={cx} cy={cy} r={3} fill={line.color} />
                    }
                  }}
                  activeDot={isEnabled ? { r: 6 } : false}
                />
              )
            })}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Apply export functionality
export const TimeSeriesChart = withExport(TimeSeriesChartBase)
