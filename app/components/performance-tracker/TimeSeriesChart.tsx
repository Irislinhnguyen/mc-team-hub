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
  crossFilterField?: string
  customYAxisFormatter?: (value: any) => string
  customTooltipFormatter?: (value: any, name: string) => [string, string]
  hideTitle?: boolean
  onEntityClick?: (entityName: string) => void
}

function TimeSeriesChartBase({
  title,
  data,
  lines,
  height = chartSizes.heights.standard,
  enableCrossFilter = false,
  dateKey = 'date',
  crossFilterField,
  customYAxisFormatter,
  customTooltipFormatter: customTooltipFormatterProp,
  hideTitle = false,
  onEntityClick
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

    const activePayload = clickData.activePayload
    if (!activePayload || activePayload.length === 0) return

    const payload = activePayload[0]?.payload
    const lineDataKey = activePayload[0]?.dataKey

    // Filter by clicked line (e.g., partner) if crossFilterField is provided
    if (crossFilterField && lineDataKey) {
      addCrossFilter({
        field: crossFilterField,
        value: String(lineDataKey),
        label: `${crossFilterField}: ${lineDataKey}`,
      }, isCtrlPressed)
    } else {
      // Default: filter by date
      const rawDateValue = payload.rawDate || payload[dateKey]
      const displayValue = payload[dateKey]

      if (rawDateValue) {
        addCrossFilter({
          field: 'date',
          value: String(rawDateValue),
          label: `date: ${displayValue}`,
        }, isCtrlPressed)
      }
    }
  }

  const handleLegendClick = (legendItem: any) => {
    const entityName = legendItem.dataKey || legendItem.value
    if (!entityName) return

    // Priority 1: If onEntityClick is provided (drill-down mode), use that
    if (onEntityClick) {
      console.log('[TimeSeriesChart] Legend clicked for drill-down:', entityName)
      onEntityClick(entityName)
      return
    }

    // Priority 2: Otherwise use cross-filter if enabled
    if (isEnabled && crossFilterField) {
      addCrossFilter({
        field: crossFilterField,
        value: String(entityName),
        label: `${crossFilterField}: ${entityName}`,
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
        minHeight: '320px',
      }}
    >
      {!hideTitle && (
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
      )}
      <CardContent style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '240px'
      }}>
        <ResponsiveContainer width="100%" aspect={3}>
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
            <Legend
              wrapperStyle={{ fontSize: '12px', cursor: (isEnabled || onEntityClick) ? 'pointer' : 'default' }}
              onClick={(isEnabled || onEntityClick) ? handleLegendClick : undefined}
            />
            {lines.filter(line => line && line.dataKey && line.dataKey.trim() !== '').map((line) => {
              // Check for active filters on BOTH date and line field
              const hasDateFilters = crossFilters.some(f => f.field === 'date')
              const hasLineFilters = crossFilterField && crossFilters.some(f => f.field === crossFilterField)
              const isLineSelected = crossFilters.some(f => f.field === crossFilterField && f.value === line.dataKey)

              return (
                <Line
                  key={line.dataKey}
                  type="monotone"
                  dataKey={line.dataKey}
                  name={line.name}
                  stroke={line.color}
                  strokeWidth={hasLineFilters && !isLineSelected ? 1 : 2}
                  opacity={hasLineFilters && !isLineSelected ? 0.3 : 1}
                  dot={(props: any) => {
                    if (!isEnabled) return null
                    const { cx, cy, payload, index } = props
                    const rawDateValue = payload.rawDate || payload[dateKey]
                    const isDateSelected = crossFilters.some(f => f.field === 'date' && f.value === String(rawDateValue))
                    const key = `${line.dataKey}-${index}-${rawDateValue}`

                    if (hasDateFilters && isDateSelected) {
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
