/**
 * ExpandableCard Component
 * Reusable expandable card with header, badges, summary metrics, and collapsible content
 */

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader } from '../../../src/components/ui/card'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { colors } from '../../../lib/colors'
import { TierInfo } from '../../../lib/utils/tierClassification'

export interface ExpandableCardProps {
  // Identity
  id: string
  isExpanded: boolean
  onToggle: () => void

  // Header content
  title: string
  subtitle?: string
  tierInfo: TierInfo

  // Optional header sections
  additionalBadges?: ReactNode
  summaryMetrics?: ReactNode

  // Expanded content
  children?: ReactNode

  // Styling
  className?: string
  borderColor?: string
}

/**
 * ExpandableCard - Consistent card layout for entity views
 *
 * Structure:
 * - Header (clickable to expand/collapse)
 *   - Left: Chevron + Title + Subtitle + Tier Badge + Additional Badges
 *   - Right: Summary Metrics
 * - Body (shown when expanded)
 *   - Custom content via children
 */
export default function ExpandableCard({
  id,
  isExpanded,
  onToggle,
  title,
  subtitle,
  tierInfo,
  additionalBadges,
  summaryMetrics,
  children,
  className = '',
  borderColor = colors.border.default
}: ExpandableCardProps) {
  return (
    <Card
      key={id}
      className={className}
      style={{ border: `1px solid ${borderColor}` }}
    >
      {/* Header - Clickable to expand/collapse */}
      <CardHeader className="pb-3">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={onToggle}
        >
          {/* Left Section: Icon + Title + Badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Expand/Collapse Chevron */}
              {isExpanded ? (
                <ChevronDown size={20} style={{ color: colors.text.secondary }} />
              ) : (
                <ChevronRight size={20} style={{ color: colors.text.secondary }} />
              )}

              {/* Title & Subtitle */}
              <div>
                <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs" style={{ color: colors.text.tertiary }}>
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {/* Tier Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium"
              style={{
                backgroundColor: tierInfo.bgColor,
                color: tierInfo.color,
                border: `1px solid ${tierInfo.color}`
              }}
              title={tierInfo.description}
            >
              <span>{tierInfo.label}</span>
            </div>

            {/* Additional Badges (optional) */}
            {additionalBadges}
          </div>

          {/* Right Section: Summary Metrics */}
          {summaryMetrics}
        </div>
      </CardHeader>

      {/* Expanded Content */}
      {isExpanded && children && (
        <CardContent className="pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}
