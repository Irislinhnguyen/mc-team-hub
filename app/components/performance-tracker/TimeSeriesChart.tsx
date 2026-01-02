'use client'

import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { BaseResponsiveChart, useResponsiveChart } from './BaseResponsiveChart'
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

/**
 * Inner chart content component that uses responsive configuration
 */
function TimeSeriesChartContent({
  data,
  lines,
  enableCrossFilter = false,
  dateKey = 'date',
  crossFilterField,
  customYAxisFormatter,
  customTooltipFormatter: customTooltipFormatterProp,
  onEntityClick
}: Omit<TimeSeriesChartProps, 'title' | 'height' | 'hideTitle'>) {
  // Get responsive configuration from context
  const { chartHeight, chartMargins, fontSize, isMobile } = useResponsiveChart()

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

  // Custom axis style - responsive font size
  const axisStyle = {
    fontSize: fontSize.axis,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: colors.neutralDark
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <LineChart
        data={data}
        onClick={isEnabled ? handlePointClick : undefined}
        style={{ cursor: isEnabled ? 'pointer' : 'default' }}
        margin={chartMargins}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={colors.neutralLight}
          opacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey={dateKey}
          tick={{ ...axisStyle, fontSize: fontSize.axis }}
          tickLine={false}
          axisLine={{ stroke: colors.neutralLight }}
        />
        <YAxis
          tick={{ ...axisStyle, fontSize: fontSize.axis }}
          tickLine={false}
          axisLine={{ stroke: colors.neutralLight }}
          tickFormatter={yAxisFormatter}
          tickCount={10}
          interval={0}
          scale="linear"
          domain={[0, 'dataMax']}
        />
        <Tooltip
          formatter={customTooltipFormatter}
          contentStyle={{
            fontSize: fontSize.tooltip,
            backgroundColor: 'rgba(255, 255, 255, 0.98)',
            border: `1px solid ${colors.neutralLight}`,
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: fontSize.legend, cursor: (isEnabled || onEntityClick) ? 'pointer' : 'default' }}
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
                  strokeWidth={hasLineFilters && !isLineSelected ? 2 : 3}
                  opacity={hasLineFilters && !isLineSelected ? 0.3 : 1}
                  animationDuration={800}
                  animationEasing="ease-in-out"
                  dot={(props: any) => {
                    const { cx, cy, payload, index } = props
                    const rawDateValue = payload.rawDate || payload[dateKey]
                    const isDateSelected = crossFilters.some(f => f.field === 'date' && f.value === String(rawDateValue))
                    const key = `${line.dataKey}-${index}-${rawDateValue}`

                    if (!isEnabled) {
                      // No cross-filter: show nice dots
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={line.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      )
                    }

                    if (hasDateFilters && isDateSelected) {
                      // Selected point: larger, filled
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={6}
                          fill={line.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      )
                    } else if (hasDateFilters) {
                      // Non-selected: smaller, semi-transparent
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill={line.color}
                          opacity={0.4}
                        />
                      )
                    } else {
                      // No filters: normal dots
                      return (
                        <circle
                          key={key}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill={line.color}
                          stroke="#fff"
                          strokeWidth={2}
                        />
                      )
                    }
                  }}
                  activeDot={isEnabled ? { r: 8, strokeWidth: 2 } : { r: 7, strokeWidth: 2 }}
                />
              )
            })}
      </LineChart>
    </ResponsiveContainer>
  )
}

/**
 * Wrapper component that provides responsive chart wrapper
 */
function TimeSeriesChartBase({
  title,
  data,
  lines,
  height,
  enableCrossFilter = false,
  dateKey = 'date',
  crossFilterField,
  customYAxisFormatter,
  customTooltipFormatter,
  hideTitle = false,
  onEntityClick
}: TimeSeriesChartProps) {
  return (
    <BaseResponsiveChart title={title} hideTitle={hideTitle} minHeight={height}>
      <TimeSeriesChartContent
        data={data}
        lines={lines}
        enableCrossFilter={enableCrossFilter}
        dateKey={dateKey}
        crossFilterField={crossFilterField}
        customYAxisFormatter={customYAxisFormatter}
        customTooltipFormatter={customTooltipFormatter}
        onEntityClick={onEntityClick}
      />
    </BaseResponsiveChart>
  )
}

// Apply export functionality
export const TimeSeriesChart = withExport(TimeSeriesChartBase)
