'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, Cell } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import { composedStyles, chartSizes, typography } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'
import { withExport } from './withExport'
import { formatChartTooltip, formatChartAxis } from '../../../lib/utils/formatters'
import { CustomYAxisTick } from './CustomYAxisTick'

interface BarChartProps {
  title: string
  data: any[]
  barDataKey: string
  barName: string
  barColor: string
  xAxisDataKey: string
  height?: number
  enableCrossFilter?: boolean
  onDataClick?: (value: any) => void
}

// Separate component that uses the hook
function BarChartWithCrossFilter({
  title,
  data,
  barDataKey,
  barName,
  barColor,
  xAxisDataKey,
  height = chartSizes.heights.standard,
  enableCrossFilter = false,
  onDataClick,
}: BarChartProps) {
  const crossFilterContext = useCrossFilter()
  const isEnabled = enableCrossFilter || crossFilterContext.autoEnable
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

  const handleBarClick = (clickData: any) => {
    if (onDataClick) {
      onDataClick(clickData)
    }
    if (isEnabled && crossFilterContext) {
      const label = `${xAxisDataKey}: ${clickData[xAxisDataKey]}`
      crossFilterContext.addCrossFilter({
        field: xAxisDataKey,
        value: String(clickData[xAxisDataKey]),
        label,
      }, isCtrlPressed)
    }
  }

  // Format number based on metric type (revenue, count, etc.)
  const formatNumber = (value: any, name?: string): string => {
    return formatChartTooltip(value, name || barDataKey)
  }

  // Custom axis style - 12px font
  const axisStyle = {
    fontSize: '12px',
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
        <h3 className={composedStyles.sectionTitle} style={{ fontSize: typography.sizes.sectionTitle, color: colors.main }}>{title}</h3>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={chartSizes.margins.barChart}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.neutralLight} opacity={0.3} horizontal={true} vertical={false} />
            <XAxis type="number" tick={axisStyle} />
            <YAxis
              dataKey={xAxisDataKey}
              type="category"
              tick={<CustomYAxisTick maxLength={15} />}
              width={chartSizes.yAxisWidth.barChart}
              interval={0}
            />
            <Tooltip formatter={(value: any) => formatNumber(value)} contentStyle={{ fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
            <Bar
              dataKey={barDataKey}
              name={barName}
              fill={barColor}
              onClick={(data) => handleBarClick(data)}
              cursor={isEnabled ? 'pointer' : 'default'}
              barSize={12}
            >
              {data.map((entry, index) => {
                const isSelected = crossFilterContext.crossFilters.some(
                  f => f.field === xAxisDataKey && f.value === String(entry[xAxisDataKey])
                )
                const hasCrossFilters = crossFilterContext.crossFilters.length > 0
                let fillColor = barColor

                if (hasCrossFilters) {
                  fillColor = isSelected ? barColor : `${barColor}66` // 40% opacity for non-selected
                }

                return <Cell key={`cell-${index}`} fill={fillColor} />
              })}
              <LabelList dataKey={barDataKey} position="right" formatter={formatNumber} style={{ fontSize: '11px', fill: colors.neutralDark }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Main component without hook - used when cross-filter is disabled
function BarChartSimple({
  title,
  data,
  barDataKey,
  barName,
  barColor,
  xAxisDataKey,
  height = chartSizes.heights.standard,
  onDataClick,
}: BarChartProps) {
  const handleBarClick = (clickData: any) => {
    if (onDataClick) {
      onDataClick(clickData)
    }
  }

  // Format number based on metric type (revenue, count, etc.)
  const formatNumber = (value: any, name?: string): string => {
    return formatChartTooltip(value, name || barDataKey)
  }

  // Custom axis style - 12px font
  const axisStyle = {
    fontSize: '12px',
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
        <h3 className={composedStyles.sectionTitle} style={{ fontSize: typography.sizes.sectionTitle, color: colors.main }}>{title}</h3>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            layout="vertical"
            margin={chartSizes.margins.barChart}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={colors.neutralLight} opacity={0.3} horizontal={true} vertical={false} />
            <XAxis type="number" tick={axisStyle} />
            <YAxis
              dataKey={xAxisDataKey}
              type="category"
              tick={<CustomYAxisTick maxLength={15} />}
              width={chartSizes.yAxisWidth.barChart}
              interval={0}
            />
            <Tooltip formatter={(value: any) => formatNumber(value)} contentStyle={{ fontSize: '12px' }} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
            <Bar
              dataKey={barDataKey}
              name={barName}
              fill={barColor}
              onClick={(data) => handleBarClick(data)}
              barSize={12}
            >
              <LabelList dataKey={barDataKey} position="right" formatter={formatNumber} style={{ fontSize: '11px', fill: colors.neutralDark }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// Export wrapper that chooses the right variant
function BarChartBase(props: BarChartProps) {
  // Always use the cross-filter version since it checks autoEnable internally
  return <BarChartWithCrossFilter {...props} />
}

// Apply export functionality
export const BarChartComponent = withExport(BarChartBase)
