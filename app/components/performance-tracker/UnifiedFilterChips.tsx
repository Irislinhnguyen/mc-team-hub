'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'

/**
 * Helper: Extract string value from filter value (handles both string and { value: string } formats)
 * Prevents React Error #31: "Objects are not valid as a React child"
 */
function normalizeFilterValue(value: any): string {
  if (value === null || value === undefined) return ''

  // If it's an object with a 'value' property, extract it
  if (typeof value === 'object' && !Array.isArray(value) && value.value !== undefined) {
    return String(value.value)
  }

  return String(value)
}

interface FilterChip {
  filterName: string
  filterLabel: string
  values: string[]
  valueLabels: string[]
  type: 'cross' | 'applied'
}

interface UnifiedFilterChipsProps {
  appliedFilterChips: Array<{
    filterName: string
    filterLabel: string
    values: string[]
    valueLabels: string[]
  }>
  onRemoveAppliedFilter: (filterName: string) => void
  onClearAllAppliedFilters: () => void
  sidebarWidth?: number
}

export function UnifiedFilterChips({
  appliedFilterChips,
  onRemoveAppliedFilter,
  onClearAllAppliedFilters,
  sidebarWidth = 256
}: UnifiedFilterChipsProps) {
  const { crossFilters, removeCrossFilter, clearAllCrossFilters } = useCrossFilter()
  const [isFixed, setIsFixed] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const chipsRef = useRef<HTMLDivElement>(null)
  const [scrollContainer, setScrollContainer] = useState<Element | null>(null)
  const { open: sidebarOpen } = useSidebar()

  // Calculate actual sidebar width based on open state
  const actualSidebarWidth = sidebarOpen ? sidebarWidth : 0

  // Ensure we only create portal on client side
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Find the scroll container
  useEffect(() => {
    const protectedLayout = document.querySelector('main.overflow-y-auto')
    if (protectedLayout) {
      setScrollContainer(protectedLayout)
    } else {
      setScrollContainer(document.documentElement)
    }
  }, [])

  // Scroll listener for sticky behavior
  useEffect(() => {
    if (!chipsRef.current) return

    const handleScroll = () => {
      if (!chipsRef.current) return

      const rect = chipsRef.current.getBoundingClientRect()
      const shouldBeFixed = rect.top <= 0

      setIsFixed(shouldBeFixed)
    }

    // Initial check
    handleScroll()

    // Listen to scroll events
    if (scrollContainer === document.documentElement) {
      window.addEventListener('scroll', handleScroll)
      return () => window.removeEventListener('scroll', handleScroll)
    } else if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll)
      return () => scrollContainer.removeEventListener('scroll', handleScroll)
    }
  }, [scrollContainer, crossFilters.length, appliedFilterChips.length])

  // Get pending filters from context
  const { pendingFilters } = useCrossFilter()

  // Group cross-filters by field and mark as 'cross' type (including pending)
  const crossFilterChips = useMemo(() => {
    const grouped = new Map<string, FilterChip>()

    // Add confirmed cross-filters
    for (const filter of crossFilters) {
      if (!grouped.has(filter.field)) {
        grouped.set(filter.field, {
          filterName: filter.field,
          filterLabel: filter.field,
          values: [],
          valueLabels: [],
          type: 'cross'
        })
      }
      const chip = grouped.get(filter.field)!
      chip.values.push(filter.value)
      chip.valueLabels.push(normalizeFilterValue(filter.value))
    }

    // Add pending cross-filters (shown immediately for UX feedback)
    for (const filter of pendingFilters) {
      if (!grouped.has(filter.field)) {
        grouped.set(filter.field, {
          filterName: filter.field,
          filterLabel: filter.field,
          values: [],
          valueLabels: [],
          type: 'cross'
        })
      }
      const chip = grouped.get(filter.field)!
      // Only add if not already in values
      if (!chip.values.includes(filter.value)) {
        chip.values.push(filter.value)
        chip.valueLabels.push(normalizeFilterValue(filter.value))
      }
    }

    return Array.from(grouped.values())
  }, [crossFilters, pendingFilters])

  // Mark applied filter chips as 'applied' type
  const appliedChips = useMemo(() => {
    const result = appliedFilterChips.map(chip => ({
      ...chip,
      type: 'applied' as const
    }))
    return result
  }, [appliedFilterChips])

  // Combine all chips: cross-filters first, then applied filters
  const allChips = useMemo(() => {
    const result = [...crossFilterChips, ...appliedChips]
    return result
  }, [crossFilterChips, appliedChips])

  const hasCrossFilters = crossFilterChips.length > 0
  const hasAppliedFilters = appliedChips.length > 0
  const hasAnyFilters = allChips.length > 0

  if (!hasAnyFilters) {
    return null
  }

  // Render chip items (reusable)
  const renderChips = () => (
    <>
      <span className="text-sm font-medium text-gray-600">
        Active filters:
      </span>
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {allChips.map((chip) => {
          const displayValue = chip.valueLabels.length <= 2
            ? chip.valueLabels.join(', ')
            : `${chip.valueLabels.length} selected`

          // Different styling for cross-filter vs applied filter
          const chipClasses = chip.type === 'cross'
            ? 'bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200'
            : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'

          const removeButtonHoverClass = chip.type === 'cross'
            ? 'hover:bg-blue-300'
            : 'hover:bg-gray-300'

          return (
            <div
              key={`${chip.type}-${chip.filterName}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${chipClasses}`}
            >
              <span className="font-medium">{chip.filterLabel}:</span>
              <span>{displayValue}</span>
              <button
                onClick={() =>
                  chip.type === 'cross'
                    ? removeCrossFilter(chip.filterName)
                    : onRemoveAppliedFilter(chip.filterName)
                }
                className={`ml-1 rounded-full p-0.5 transition-colors ${removeButtonHoverClass}`}
                aria-label={`Remove ${chip.filterLabel} filter`}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* Clear buttons */}
      <div className="flex items-center gap-2">
        {hasCrossFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllCrossFilters}
            className="text-xs border-blue-300 text-blue-700 hover:bg-blue-50 transition-colors"
          >
            Clear cross-filters
          </Button>
        )}
        {hasAppliedFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClearAllAppliedFilters}
            className="text-xs border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Clear applied filters
          </Button>
        )}
        {hasCrossFilters && hasAppliedFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              clearAllCrossFilters()
              onClearAllAppliedFilters()
            }}
            className="text-xs border-gray-400 text-gray-900 hover:bg-gray-200 font-medium transition-colors"
          >
            Clear all
          </Button>
        )}
      </div>
    </>
  )

  // Fixed chips content (rendered via portal)
  const fixedChipsContent = (
    <div
      className="flex items-center gap-2 flex-wrap px-4 py-3 bg-white border-b border-gray-200 transition-all duration-200 ease-out"
      style={{
        position: 'fixed',
        top: 0,
        left: actualSidebarWidth,
        right: 0,
        zIndex: 50,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }}
    >
      {renderChips()}
    </div>
  )

  return (
    <>
      {/* Portal: Render chips at body level when fixed */}
      {isFixed && isMounted && createPortal(fixedChipsContent, document.body)}

      {/* Spacer to prevent content jump when chips become fixed */}
      {isFixed && <div style={{ height: '57px' }} />}

      {/* Inline chips when not fixed - this is what we track */}
      {!isFixed && (
        <div
          ref={chipsRef}
          className="flex items-center gap-2 flex-wrap px-4 py-3 bg-white border-b border-gray-200"
        >
          {renderChips()}
        </div>
      )}
    </>
  )
}
