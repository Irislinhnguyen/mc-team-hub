'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getScenarioColor, getScenarioEmoji } from '../../../lib/config/partnerColors'

interface ScenarioBadgeProps {
  scenario: string
  actionGuidance?: string
  showEmoji?: boolean
  className?: string
  tooltip?: string
}

export function ScenarioBadge({
  scenario,
  actionGuidance,
  showEmoji = true,
  className,
  tooltip
}: ScenarioBadgeProps) {
  const color = getScenarioColor(scenario)
  const emoji = getScenarioEmoji(scenario)

  const badgeElement = (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      {showEmoji && <span className="text-lg">{emoji}</span>}
      <Badge
        variant="outline"
        style={{
          borderColor: color,
          color: color,
          backgroundColor: `${color}10`
        }}
      >
        {scenario}
      </Badge>
      {actionGuidance && (
        <span className="text-xs text-gray-600">{actionGuidance}</span>
      )}
    </div>
  )

  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {badgeElement}
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-sm">{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return badgeElement
}
