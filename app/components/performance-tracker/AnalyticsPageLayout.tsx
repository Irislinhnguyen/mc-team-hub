'use client'

import { useRef, ReactNode, RefObject, useState, useCallback, useMemo, cloneElement, Children, isValidElement, useEffect } from 'react'
import { PageHeader } from './PageHeader'
import { UnifiedFilterChips } from './UnifiedFilterChips'
import { colors } from '../../../lib/colors'

/**
 * AnalyticsPageLayout - Standard layout wrapper for analytics pages
 *
 * Provides consistent structure with:
 * - Page header with optional export
 * - Cross-filter chips
 * - Content area with proper spacing and styling
 *
 * @example
 * <AnalyticsPageLayout title="Business Health" showExport contentRef={contentRef}>
 *   <MetadataFilterPanel ... />
 *   <MetricCards ... />
 *   <Charts ... />
 *   <Tables ... />
 * </AnalyticsPageLayout>
 */

interface AnalyticsPageLayoutProps {
  title: string
  children: ReactNode
  showExport?: boolean
  showCrossFilter?: boolean
  contentRef?: RefObject<HTMLDivElement>
}

export function AnalyticsPageLayout({
  title,
  children,
  showExport = true,
  showCrossFilter = true,
  contentRef: externalContentRef
}: AnalyticsPageLayoutProps) {
  const internalContentRef = useRef<HTMLDivElement>(null)
  const contentRef = externalContentRef || internalContentRef
  const [appliedFilterChips, setAppliedFilterChips] = useState<Array<{
    filterName: string
    filterLabel: string
    values: string[]
    valueLabels: string[]
  }>>([])

  // Stable callback for filter chips change (prevents infinite re-renders)
  const handleFilterChipsChange = useCallback((chips: any) => {
    setAppliedFilterChips(chips)
  }, [])

  // Stable callback for removing applied filter
  const handleRemoveAppliedFilter = useCallback((filterName: string) => {
    const event = new CustomEvent('removeAppliedFilter', { detail: { filterName } })
    window.dispatchEvent(event)
  }, [])

  // Stable callback for clearing all applied filters
  const handleClearAllAppliedFilters = useCallback(() => {
    const event = new CustomEvent('clearAllAppliedFilters')
    window.dispatchEvent(event)
  }, [])

  // Listen for clearAllAppliedFilters event to immediately clear chips
  useEffect(() => {
    const handleClearEvent = () => {
      setAppliedFilterChips([])
    }

    window.addEventListener('clearAllAppliedFilters', handleClearEvent)
    return () => {
      window.removeEventListener('clearAllAppliedFilters', handleClearEvent)
    }
  }, [])

  // Inject onFilterChipsChange callback into MetadataFilterPanel children
  // Use useMemo to prevent recreating children on every render (prevents infinite loop)
  const enhancedChildren = useMemo(() => {
    return Children.map(children, (child) => {
      // Skip null/undefined children from conditional renders
      if (!child) return child

      if (isValidElement(child) && child.type &&
          (child.type as any).displayName === 'MetadataFilterPanel') {
        return cloneElement(child as any, {
          onFilterChipsChange: handleFilterChipsChange
        })
      }
      return child
    })
  }, [children, handleFilterChipsChange])

  return (
    <div
      className="space-y-0"
      style={{
        backgroundColor: colors.neutralLight,
        minHeight: '100vh',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden'
      }}
    >
      {/* Page Header with Export */}
      <PageHeader
        title={title}
        contentRef={showExport ? contentRef : undefined}
        showCrossFilterToggle={showCrossFilter}
      />

      {/* Unified Filter Chips (Cross-filter + Applied filters) */}
      {showCrossFilter && (
        <UnifiedFilterChips
          appliedFilterChips={appliedFilterChips}
          onRemoveAppliedFilter={handleRemoveAppliedFilter}
          onClearAllAppliedFilters={handleClearAllAppliedFilters}
        />
      )}

      {/* Main Content Area */}
      <div
        ref={contentRef}
        className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 lg:px-10 pt-6 pb-8 space-y-4 md:space-y-6 lg:space-y-8"
        style={{ maxWidth: '100%', boxSizing: 'border-box' }}
      >
        {enhancedChildren}
      </div>
    </div>
  )
}
