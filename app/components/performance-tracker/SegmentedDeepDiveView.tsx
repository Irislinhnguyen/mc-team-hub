'use client'

/**
 * SegmentedDeepDiveView Component
 *
 * Displays multiple items (products, PICs, teams, etc.) in separate collapsible sections
 * Each section shows A/B/C tier breakdown for that specific item
 * Used when user selects multiple items in filters
 */

import React, { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { ChevronDown, ChevronRight } from 'lucide-react'
import UnifiedDeepDiveView from './UnifiedDeepDiveView'
import type { Period, TierType } from './UnifiedDeepDiveView'
import { colors } from '../../../lib/colors'

export interface SegmentedDeepDiveViewProps {
  perspective: 'team' | 'pic' | 'pid' | 'mid' | 'product' | 'zone'
  selectedItems: Array<{ id: string; name: string }>
  period1: Period
  period2: Period
  baseFilters: Record<string, any>
  onDrillDown?: (perspective: string, id: string | number) => void
  shouldFetch?: boolean // Control when to fetch data
}

export default function SegmentedDeepDiveView({
  perspective,
  selectedItems,
  period1,
  period2,
  baseFilters,
  onDrillDown,
  shouldFetch = false
}: SegmentedDeepDiveViewProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    [selectedItems[0]?.id]: true // First item expanded by default
  })
  const [activeTiers, setActiveTiers] = useState<Record<string, TierType>>({})

  const toggleSection = (itemId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const handleTierChange = (itemId: string, tier: TierType) => {
    setActiveTiers(prev => ({
      ...prev,
      [itemId]: tier
    }))
  }

  // Get filter key based on perspective
  const getFilterKey = () => {
    return perspective // e.g., 'product', 'pic', 'team', etc.
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div
        className="rounded-lg p-6"
        style={{
          backgroundColor: colors.surface.card,
          border: `1px solid ${colors.border.default}`
        }}
      >
        <h3 className="text-lg font-semibold mb-2" style={{ color: colors.text.primary }}>
          Comparing {selectedItems.length} {getPerspectiveLabel(perspective)}s
        </h3>
        <p className="text-sm" style={{ color: colors.text.secondary }}>
          Each section below shows the A/B/C tier breakdown for the selected item.
          Click to expand/collapse sections.
        </p>
        <div className="flex flex-wrap gap-2 mt-3">
          {selectedItems.map(item => (
            <span
              key={item.id}
              className="px-3 py-1 rounded-full text-sm font-medium"
              style={{
                backgroundColor: colors.status.infoBg,
                color: colors.status.info
              }}
            >
              {item.name}
            </span>
          ))}
        </div>
      </div>

      {/* Segmented Sections */}
      {selectedItems.map((item, index) => {
        const isExpanded = expandedSections[item.id] ?? false
        const activeTier = activeTiers[item.id] ?? 'A'
        const filterKey = getFilterKey()

        // Create filters for this specific item
        const itemFilters = {
          ...baseFilters,
          [filterKey]: item.id
        }

        return (
          <Collapsible
            key={item.id}
            open={isExpanded}
            onOpenChange={() => toggleSection(item.id)}
          >
            <div
              className="rounded-lg border overflow-hidden"
              style={{
                backgroundColor: colors.surface.card,
                borderColor: isExpanded ? colors.interactive.primary : colors.border.default,
                borderWidth: isExpanded ? '2px' : '1px'
              }}
            >
              {/* Section Header */}
              <CollapsibleTrigger asChild>
                <button
                  className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  style={{
                    backgroundColor: isExpanded ? colors.surface.muted : 'transparent'
                  }}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown size={20} style={{ color: colors.interactive.primary }} />
                    ) : (
                      <ChevronRight size={20} style={{ color: colors.text.secondary }} />
                    )}
                    <div className="text-left">
                      <h3 className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                        {item.name}
                      </h3>
                      <p className="text-sm" style={{ color: colors.text.secondary }}>
                        {getPerspectiveLabel(perspective)} deep dive analysis
                      </p>
                    </div>
                  </div>
                  <div className="text-sm font-medium" style={{ color: colors.text.secondary }}>
                    {isExpanded ? 'Click to collapse' : 'Click to expand'}
                  </div>
                </button>
              </CollapsibleTrigger>

              {/* Section Content */}
              <CollapsibleContent>
                <div className="px-6 pb-6 pt-2">
                  <UnifiedDeepDiveView
                    perspective={perspective}
                    period1={period1}
                    period2={period2}
                    filters={itemFilters}
                    activeTier={activeTier}
                    onTierChange={(tier) => handleTierChange(item.id, tier)}
                    onDrillDown={onDrillDown}
                    shouldFetch={shouldFetch}
                  />
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )
      })}

      {/* Expand/Collapse All */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => {
            const allExpanded: Record<string, boolean> = {}
            selectedItems.forEach(item => {
              allExpanded[item.id] = true
            })
            setExpandedSections(allExpanded)
          }}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{
            borderColor: colors.border.default,
            color: colors.text.primary,
            backgroundColor: colors.surface.card
          }}
        >
          Expand All
        </button>
        <button
          onClick={() => setExpandedSections({})}
          className="px-4 py-2 rounded-lg text-sm font-medium border transition-colors"
          style={{
            borderColor: colors.border.default,
            color: colors.text.primary,
            backgroundColor: colors.surface.card
          }}
        >
          Collapse All
        </button>
      </div>
    </div>
  )
}

// Helper functions

function getPerspectiveLabel(perspective: string): string {
  const labels: Record<string, string> = {
    team: 'Team',
    pic: 'PIC',
    pid: 'Publisher',
    mid: 'Media',
    product: 'Product',
    zone: 'Zone'
  }
  return labels[perspective] || perspective
}
