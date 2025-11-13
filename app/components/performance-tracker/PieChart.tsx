'use client'

import React from 'react'
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, Sector } from 'recharts'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { composedStyles, typography, chartSizes } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'
import { withExport } from './withExport'
import { formatChartTooltip } from '../../../lib/utils/formatters'
import { useCrossFilter } from '../../contexts/CrossFilterContext'

interface PieChartProps {
  title: string
  data: any[]
  dataKey: string // The numeric value key (e.g., 'impressions', 'count')
  nameKey: string // The label key (e.g., 'market', 'partner')
  colorMap?: Record<string, string> // Optional color mapping
  height?: number
  showLegend?: boolean
  showLabels?: boolean
  enableCrossFilter?: boolean
  crossFilterField?: string // Field name for cross-filtering (defaults to nameKey)
  highlightValues?: string[] // Values to highlight (others will be dimmed)
}

function PieChartBase({
  title,
  data,
  dataKey,
  nameKey,
  colorMap,
  height = chartSizes.heights.standard,
  showLegend = true,
  showLabels = true,
  enableCrossFilter = false,
  crossFilterField,
  highlightValues
}: PieChartProps) {
  const { addCrossFilter, autoEnable, crossFilters } = useCrossFilter()
  const isEnabled = enableCrossFilter || autoEnable
  const filterField = crossFilterField || nameKey
  const [isCtrlPressed, setIsCtrlPressed] = React.useState(false)

  // Track Ctrl/Cmd key state for multi-select in legend clicks
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

  // Check for active cross-filters on this field OR if highlightValues prop is provided
  const hasCrossFilters = crossFilters.some(f => f.field === filterField) || (highlightValues && highlightValues.length > 0)

  // Default colors if no colorMap provided
  const defaultColors = [
    '#EC4899', // Pink
    '#8B5CF6', // Purple
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#6B7280', // Gray
    '#14B8A6', // Teal
    '#F97316', // Orange
    '#06B6D4', // Cyan
  ]

  const handleCellClick = (entry: any, event: React.MouseEvent) => {
    if (!isEnabled) return

    const value = String(entry[nameKey])
    const label = `${nameKey}: ${value}`

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is pressed for multi-select
    const append = event.ctrlKey || event.metaKey

    addCrossFilter({
      field: filterField,
      value: value,
      label: label,
    }, append)
  }

  const handleLegendClick = (legendItem: any) => {
    if (!isEnabled) return

    const categoryValue = legendItem.value
    if (!categoryValue) return

    addCrossFilter({
      field: filterField,
      value: String(categoryValue),
      label: `${nameKey}: ${categoryValue}`,
    }, isCtrlPressed)
  }

  const getColor = (name: string, index: number): string => {
    if (colorMap && colorMap[name]) {
      return colorMap[name]
    }
    // Case-insensitive lookup for colorMap
    if (colorMap) {
      const upperName = name.toUpperCase()
      const foundKey = Object.keys(colorMap).find(k => k.toUpperCase() === upperName)
      if (foundKey) return colorMap[foundKey]
    }
    return defaultColors[index % defaultColors.length]
  }

  // Custom label renderer with percentage
  const renderLabel = (entry: any) => {
    if (!showLabels) return null
    // If data has 'percent' field, use it directly (already in percentage format)
    // Otherwise, calculate from Recharts' auto-calculated percent
    const percent = entry.payload?.percent !== undefined
      ? entry.payload.percent
      : entry.percent * 100

    // Only show label if segment is >= 5% (to avoid overlapping labels)
    if (percent < 5) return null

    return `${percent.toFixed(1)}%`
  }

  // Custom tooltip formatter
  const customTooltipFormatter = (value: any, name: string, entry: any) => {
    const payload = entry.payload
    // If data has both percent and impressions, show both
    if (payload?.percent !== undefined && payload?.impressions !== undefined) {
      return [
        `${payload.percent.toFixed(1)}% (${formatChartTooltip(payload.impressions, 'impressions')})`,
        name
      ]
    }
    return formatChartTooltip(value, dataKey)
  }

  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        height: '480px',
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
          <RechartsPieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={showLabels}
              label={renderLabel}
              outerRadius={height * 0.35}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
              style={{ cursor: isEnabled ? 'pointer' : 'default' }}
              onClick={isEnabled ? (data, index, event) => handleCellClick(data.payload, event) : undefined}
            >
              {data.map((entry, index) => {
                // Check if this entry is selected via cross-filter OR highlightValues prop
                const isSelectedByCrossFilter = crossFilters.some(f => f.field === filterField && f.value === String(entry[nameKey]))
                const isSelectedByHighlight = highlightValues && highlightValues.includes(String(entry[nameKey]))
                const isSelected = isSelectedByCrossFilter || isSelectedByHighlight
                const opacity = hasCrossFilters && !isSelected ? 0.3 : 1

                return (
                  <Cell
                    key={`cell-${index}`}
                    fill={getColor(entry[nameKey], index)}
                    opacity={opacity}
                  />
                )
              })}
            </Pie>
            <Tooltip formatter={customTooltipFormatter} contentStyle={{ fontSize: '12px' }} />
            {showLegend && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                wrapperStyle={{
                  fontSize: '12px',
                  paddingTop: '16px',
                  cursor: isEnabled ? 'pointer' : 'default'
                }}
                onClick={isEnabled ? handleLegendClick : undefined}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export const PieChart = withExport(PieChartBase)
