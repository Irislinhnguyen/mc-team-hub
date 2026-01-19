'use client'

import { ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RefreshButton } from '../shared/RefreshButton'
import { colors } from '@/lib/colors'

interface PipelinePageHeaderProps {
  title: ReactNode
  subtitle?: string
  children?: ReactNode
  showBackButton?: boolean
  onBackButtonClick?: () => void
  showRefresh?: boolean
  onRefresh?: () => void
  className?: string
}

/**
 * PipelinePageHeader - Standard header component for Pipelines pages
 *
 * Provides consistent header structure with:
 * - Optional back button
 * - Title (string or ReactNode with Badge, etc.) and optional subtitle
 * - Action buttons (passed as children)
 * - Optional refresh button
 *
 * @example
 * <PipelinePageHeader
 *   title="Focus of the Month"
 *   subtitle="Monthly pipeline suggestions and progress tracking"
 *   showRefresh
 * >
 *   <Button onClick={handleCreate}>
 *     <Plus className="mr-2 h-4 w-4" />
 *     Create New Focus
 *   </Button>
 * </PipelinePageHeader>
 *
 * @example With Badge in title
 * <PipelinePageHeader
 *   title={<>{focusTitle} <Badge>{status}</Badge></>}
 *   showBackButton
 *   onBackButtonClick={() => router.back()}
 * />
 */
export function PipelinePageHeader({
  title,
  subtitle,
  children,
  showBackButton = false,
  onBackButtonClick,
  showRefresh = false,
  className = '',
}: PipelinePageHeaderProps) {
  return (
    <div
      className={`bg-white border-b border-gray-200 sticky top-0 ${className}`}
      style={{
        padding: '16px 24px',
        zIndex: 60
      }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3 flex-1">
          {showBackButton && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBackButtonClick}
              className="hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4 text-[#1565C0]" />
            </Button>
          )}
          <div>
            <div className="flex items-center gap-3">
              <h1
                className="text-2xl font-bold"
                style={{
                  color: colors.main
                }}
              >
                {typeof title === 'string' ? title : null}
              </h1>
              {typeof title !== 'string' && title}
            </div>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Section - Action Buttons */}
        <div className="flex items-center gap-3">
          {children}
          {showRefresh && <RefreshButton variant="outline" size="sm" />}
        </div>
      </div>
    </div>
  )
}
