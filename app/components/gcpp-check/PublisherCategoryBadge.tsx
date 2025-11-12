'use client'

import React from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { getCategoryColor } from '../../../lib/config/partnerColors'

interface PublisherCategoryBadgeProps {
  category: string
  count?: number
  className?: string
  tooltip?: string
}

export function PublisherCategoryBadge({
  category,
  count,
  className,
  tooltip
}: PublisherCategoryBadgeProps) {
  const color = getCategoryColor(category)

  const badgeElement = (
    <Badge
      variant="outline"
      className={className}
      style={{
        borderColor: color,
        color: color,
        backgroundColor: `${color}15`,
        fontWeight: 600
      }}
    >
      {category}
      {count !== undefined && ` (${count})`}
    </Badge>
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
