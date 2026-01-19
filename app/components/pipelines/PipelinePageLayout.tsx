'use client'

import { ReactNode, useRef } from 'react'
import { PipelinePageHeader } from './PipelinePageHeader'

interface PipelinePageLayoutProps {
  title: ReactNode
  subtitle?: string
  children: ReactNode
  headerActions?: ReactNode
  showBackButton?: boolean
  onBackButtonClick?: () => void
  showRefresh?: boolean
  onRefresh?: () => void
  className?: string
  contentClassName?: string
}

/**
 * PipelinePageLayout - Standard layout wrapper for Pipelines pages
 *
 * Provides consistent structure with:
 * - Sticky header with title and actions
 * - Content area with proper spacing and styling
 * - Light gray background
 *
 * @example
 * <PipelinePageLayout
 *   title="Focus of the Month"
 *   subtitle="Monthly pipeline suggestions and progress tracking"
 *   showRefresh
 *   onRefresh={handleRefresh}
 *   headerActions={<Button>Create New Focus</Button>}
 * >
 *   <FilterPanel />
 *   <Content />
 * </PipelinePageLayout>
 *
 * @example With Badge in title
 * <PipelinePageLayout
 *   title={<>{focusTitle} <Badge>{status}</Badge></>}
 *   showBackButton
 *   onBackButtonClick={() => router.back()}
 * >
 *   <Content />
 * </PipelinePageLayout>
 */
export function PipelinePageLayout({
  title,
  subtitle,
  children,
  headerActions,
  showBackButton = false,
  onBackButtonClick,
  showRefresh = false,
  onRefresh,
  className = '',
  contentClassName = '',
}: PipelinePageLayoutProps) {
  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: colors.neutralLight,
      }}
    >
      {/* Sticky Header */}
      <PipelinePageHeader
        title={title}
        subtitle={subtitle}
        showBackButton={showBackButton}
        onBackButtonClick={onBackButtonClick}
        showRefresh={showRefresh}
      >
        {headerActions}
      </PipelinePageHeader>

      {/* Content Area */}
      <div className={`p-4 md:p-6 lg:p-8 space-y-6 ${contentClassName}`}>
        {children}
      </div>
    </div>
  )
}

// Import colors for background
import { colors } from '@/lib/colors'
