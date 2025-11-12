'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar'
import { normalizeFilterValue } from '../../../lib/utils/filterHelpers'

interface CrossFilterChip {
  filterName: string
  filterLabel: string
  values: string[]
  valueLabels: string[]
}

export function CrossFilterChips({ sidebarWidth = 256 }: { sidebarWidth?: number }) {
  const { crossFilters, removeCrossFilter, clearAllCrossFilters, hasCrossFilters } = useCrossFilter()
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
  }, [scrollContainer, crossFilters.length])

  // Group cross-filters by field
  const filterChips = useMemo(() => {
    const grouped = new Map<string, CrossFilterChip>()

    for (const filter of crossFilters) {
      if (!grouped.has(filter.field)) {
        grouped.set(filter.field, {
          filterName: filter.field,
          filterLabel: filter.field,
          values: [],
          valueLabels: []
        })
      }
      const chip = grouped.get(filter.field)!
      chip.values.push(filter.value)
      chip.valueLabels.push(normalizeFilterValue(filter.value))
    }

    return Array.from(grouped.values())
  }, [crossFilters])

  if (!hasCrossFilters) {
    return null
  }

  // Render chip items (reusable)
  const renderChips = () => (
    <>
      <span className="text-sm font-medium text-gray-600">
        Cross-filters:
      </span>
      <div className="flex items-center gap-2 flex-wrap flex-1">
        {filterChips.map((chip) => {
          const displayValue = chip.valueLabels.length <= 2
            ? chip.valueLabels.join(', ')
            : `${chip.valueLabels.length} selected`

          return (
            <div
              key={chip.filterName}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              <span className="font-medium">{chip.filterLabel}:</span>
              <span>{displayValue}</span>
              <button
                onClick={() => removeCrossFilter(chip.filterName)}
                className="ml-1 hover:bg-gray-300 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${chip.filterLabel} filter`}
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={clearAllCrossFilters}
        className="text-xs border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
      >
        Clear all filters
      </Button>
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
