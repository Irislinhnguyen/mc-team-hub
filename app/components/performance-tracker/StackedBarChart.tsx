'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { BaseResponsiveChart, useResponsiveChart } from './BaseResponsiveChart'
import { colors } from '../../../lib/colors'
import { withExport } from './withExport'
import { formatChartTooltip, formatChartAxis } from '../../../lib/utils/formatters'
import { useCrossFilter } from '../../contexts/CrossFilterContext'

interface StackedBarChartProps {
  title: string
  data: any[]
  categories: Array<{
    dataKey: string
    name: string
    color?: string
  }>
  xAxisDataKey: string
  height?: number
  layout?: 'horizontal' | 'vertical'
  colorMap?: Record<string, string>
  enableCrossFilter?: boolean
  crossFilterField?: string // Field name for x-axis cross-filtering (defaults to xAxisDataKey)
}

interface ClickableTickProps {
  x?: number
  y?: number
  payload?: any
  onClick: (value: string, event: React.MouseEvent) => void
  isEnabled: boolean
  axisStyle: any
}

const ClickableYAxisTick = ({ x = 0, y = 0, payload, onClick, isEnabled, axisStyle }: ClickableTickProps) => {
  return (
    <g
      transform={`translate(${x},${y})`}
      onClick={(e) => {
        if (isEnabled && payload?.value) {
          onClick(payload.value, e)
        }
      }}
      style={{ cursor: isEnabled ? 'pointer' : 'default' }}
    >
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill={axisStyle.fill}
        fontSize={axisStyle.fontSize}
        fontFamily={axisStyle.fontFamily}
      >
        {payload?.value}
      </text>
    </g>
  )
}

/**
 * Inner chart content component that uses responsive configuration
 */
function StackedBarChartContent({
  data,
  categories,
  xAxisDataKey,
  layout = 'horizontal',
  colorMap,
  enableCrossFilter = false,
  crossFilterField
}: Omit<StackedBarChartProps, 'title' | 'height'>) {
  // Get responsive configuration from context
  const { chartHeight, chartMargins, fontSize, breakpoint, isMobile } = useResponsiveChart()
  const { addCrossFilter, autoEnable, crossFilters } = useCrossFilter()
  const isEnabled = enableCrossFilter || autoEnable
  const filterField = crossFilterField || xAxisDataKey

  // Check for active cross-filters on this field
  const hasCrossFilters = crossFilters.some(f => f.field === filterField)

  // Default colors
  const defaultColors = [
    '#8B5CF6', // Purple - ANYMIND
    '#EC4899', // Pink - GENIEE
    '#3B82F6', // Blue - NETLINK
    '#F97316', // Orange - ACQUA
    '#F59E0B', // Amber - OPTAD360
    '#6B7280', // Gray - ADOPX
  ]

  const handleBarClick = (entry: any, event: React.MouseEvent) => {
    if (!isEnabled) return

    const value = String(entry[xAxisDataKey])
    const label = `${xAxisDataKey}: ${value}`

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is pressed for multi-select
    const append = event.ctrlKey || event.metaKey

    addCrossFilter({
      field: filterField,
      value: value,
      label: label,
    }, append)
  }

  const handleAxisLabelClick = (value: string, event: React.MouseEvent) => {
    if (!isEnabled) return

    const label = `${filterField}: ${value}`
    const append = event.ctrlKey || event.metaKey

    addCrossFilter({
      field: filterField,
      value: value,
      label: label,
    }, append)
  }

  const getColor = (dataKey: string, index: number): string => {
    // Check if color is explicitly provided in categories
    const category = categories.find(c => c.dataKey === dataKey)
    if (category?.color) return category.color

    // Check colorMap (case-insensitive by converting to Title Case)
    if (colorMap) {
      // First try exact match
      if (colorMap[dataKey]) return colorMap[dataKey]

      // Then try case-insensitive match by converting to Title Case
      const titleCaseKey = dataKey.charAt(0).toUpperCase() + dataKey.slice(1).toLowerCase()
      if (colorMap[titleCaseKey]) return colorMap[titleCaseKey]

      // Finally try UPPERCASE match (backward compatibility)
      const upperKey = dataKey.toUpperCase()
      const foundKey = Object.keys(colorMap).find(k => k.toUpperCase() === upperKey)
      if (foundKey) return colorMap[foundKey]
    }

    return defaultColors[index % defaultColors.length]
  }

  // Debug logging
  console.log('[StackedBarChart] Props:', {
    dataLength: data.length,
    categoriesLength: categories.length,
    layout,
    xAxisDataKey,
    sampleData: data[0],
    categories: categories
  })

  console.log('[StackedBarChart] Categories dataKeys:', categories.filter(c => c).map(c => c.dataKey))

  // Custom axis style - responsive font size
  const axisStyle = {
    fontSize: fontSize.axis,
    fontFamily: 'system-ui, -apple-system, sans-serif',
    fill: colors.neutralDark
  }

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string) => {
    return formatChartTooltip(value, name)
  }

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={data}
        layout={layout}
        margin={chartMargins}
        style={{ cursor: isEnabled ? 'pointer' : 'default' }}
        onClick={isEnabled ? (data) => handleBarClick(data.activePayload?.[0]?.payload, data as any) : undefined}
      >
        <CartesianGrid strokeDasharray="3 3" stroke={colors.neutralLight} />
        <XAxis
          type={layout === 'vertical' ? 'number' : 'category'}
          dataKey={layout === 'vertical' ? undefined : xAxisDataKey}
          tick={axisStyle}
        />
        <YAxis
          type={layout === 'vertical' ? 'category' : 'number'}
          dataKey={layout === 'vertical' ? xAxisDataKey : undefined}
          tick={layout === 'vertical' ?
            <ClickableYAxisTick
              onClick={handleAxisLabelClick}
              isEnabled={isEnabled}
              axisStyle={axisStyle}
            /> :
            axisStyle
          }
        />
        <Tooltip
          formatter={customTooltipFormatter}
          contentStyle={{ fontSize: fontSize.tooltip }}
        />
        <Legend
          layout={breakpoint === 'xs' ? 'vertical' : 'horizontal'}
          wrapperStyle={{
            fontSize: fontSize.legend,
            paddingTop: isMobile ? '8px' : '16px'
          }}
          iconType="rect"
        />
        {categories.filter(c => c && c.dataKey && c.dataKey.trim() !== '').map((category, index) => (
          <Bar
            key={category.dataKey}
            dataKey={category.dataKey}
            name={category.name}
            stackId="a"
            fill={getColor(category.dataKey, index)}
            barSize={isMobile ? 16 : 20}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * Wrapper component that provides responsive chart wrapper
 */
function StackedBarChartBase({
  title,
  data,
  categories,
  xAxisDataKey,
  height,
  layout = 'horizontal',
  colorMap,
  enableCrossFilter = false,
  crossFilterField
}: StackedBarChartProps) {
  return (
    <BaseResponsiveChart title={title} minHeight={height}>
      <StackedBarChartContent
        data={data}
        categories={categories}
        xAxisDataKey={xAxisDataKey}
        layout={layout}
        colorMap={colorMap}
        enableCrossFilter={enableCrossFilter}
        crossFilterField={crossFilterField}
      />
    </BaseResponsiveChart>
  )
}

export const StackedBarChart = withExport(StackedBarChartBase)
