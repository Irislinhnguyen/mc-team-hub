'use client'

import React from 'react'
import { colors } from '../../../lib/colors'

interface CustomYAxisTickProps {
  x?: number
  y?: number
  payload?: { value: string }
  maxLength?: number
}

/**
 * Custom Y-axis tick component for horizontal bar charts
 * Truncates long labels and shows full text on hover via SVG title tooltip
 */
export const CustomYAxisTick: React.FC<CustomYAxisTickProps> = ({
  x = 0,
  y = 0,
  payload,
  maxLength = 15
}) => {
  // Handle empty/invalid payload
  if (!payload || !payload.value) return null

  const fullText = String(payload.value)
  const isTruncated = fullText.length > maxLength
  const displayText = isTruncated
    ? fullText.substring(0, maxLength) + '...'
    : fullText

  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={4}
        textAnchor="end"
        fill={colors.neutralDark}
        fontSize="12px"
        fontFamily="system-ui, -apple-system, sans-serif"
        style={{ cursor: isTruncated ? 'help' : 'default' }}
      >
        {/* SVG title element creates native browser tooltip on hover */}
        {isTruncated && <title>{fullText}</title>}
        {displayText}
      </text>
    </g>
  )
}
