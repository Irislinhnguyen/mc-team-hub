'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getPerformanceColor } from '../../../lib/config/partnerColors'

interface PerformanceIndicatorProps {
  performance: string
  value?: number | string
  showIcon?: boolean
  className?: string
  tooltip?: string
}

export function PerformanceIndicator({
  performance,
  value,
  showIcon = true,
  className,
  tooltip
}: PerformanceIndicatorProps) {
  const color = getPerformanceColor(performance)

  const getIcon = () => {
    if (!showIcon) return null

    const lowerPerf = performance.toLowerCase()
    if (lowerPerf.includes('increase')) {
      return <TrendingUp size={14} />
    } else if (lowerPerf.includes('decrease')) {
      return <TrendingDown size={14} />
    } else {
      return <Minus size={14} />
    }
  }

  const indicatorElement = (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {showIcon && <span style={{ color }}>{getIcon()}</span>}
      <Badge
        variant="outline"
        style={{
          borderColor: color,
          color: color,
          backgroundColor: `${color}10`,
          fontWeight: 500
        }}
      >
        {performance}
      </Badge>
      {value !== undefined && (
        <span className="text-xs text-gray-600">
          {typeof value === 'number' ? `${value > 0 ? '+' : ''}${value.toFixed(1)}%` : value}
        </span>
      )}
    </div>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {indicatorElement}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return indicatorElement
}
