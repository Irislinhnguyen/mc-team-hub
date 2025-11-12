'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { composedStyles, typography } from '../../../../lib/design-tokens'
import { colors } from '../../../../lib/colors'
import { getSkeletonColumnWidth, getRandomSkeletonWidth } from '../../../../lib/utils/skeletonHelpers'
import type { ColumnConfig } from '../../../../lib/types/performanceTracker'

interface LazyDataTableSkeletonProps {
  /**
   * Column configuration - determines number of columns and their widths
   */
  columns: ColumnConfig[]

  /**
   * Number of skeleton rows to display
   * @default 5
   */
  rows?: number

  /**
   * Title skeleton width
   * @default "200px"
   */
  titleWidth?: string

  /**
   * Show "Loading more..." indicator
   * @default false
   */
  showLoadingMore?: boolean

  /**
   * Enable varied row widths for more natural appearance
   * @default true
   */
  variedWidths?: boolean
}

/**
 * LazyDataTable-specific skeleton component
 *
 * Matches the exact structure of LazyDataTable including:
 * - Search input in header
 * - Fixed height scrollable container
 * - "Loading more..." indicator (optional)
 * - Striped rows (alternating background)
 *
 * @example
 * ```tsx
 * import { getColumns } from '@/lib/config/tableColumns'
 *
 * const columns = getColumns(['zid', 'zonename', 'product', 'rev', 'profit'])
 *
 * <LazyDataTableSkeleton
 *   columns={columns}
 *   rows={7}
 *   showLoadingMore={false}
 * />
 * ```
 */
export function LazyDataTableSkeleton({
  columns,
  rows = 7,
  titleWidth = '200px',
  showLoadingMore = false,
  variedWidths = true
}: LazyDataTableSkeletonProps) {
  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: '420px',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          {/* Title Skeleton */}
          <Skeleton
            style={{
              width: titleWidth,
              height: typography.sizes.sectionTitle
            }}
          />
          {/* Search Input Skeleton */}
          <div className="flex items-center gap-2">
            <Skeleton
              className="h-8"
              style={{ width: '200px' }}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="overflow-x-auto overflow-y-auto max-h-[320px]"
          style={{
            minWidth: 0,
            width: '100%',
            minHeight: '320px'
          }}
        >
          <table className="w-full border-collapse">
            {/* Skeleton Header - Sticky */}
            <thead
              className="sticky top-0 shadow-sm z-10"
              style={{ backgroundColor: colors.main }}
            >
              <tr className="border-b border-slate-200">
                {columns.map((col, idx) => {
                  const width = getSkeletonColumnWidth(col)
                  return (
                    <th
                      key={idx}
                      className="px-2 py-2 text-left font-semibold leading-tight whitespace-nowrap"
                      style={{
                        minWidth: width,
                        fontSize: typography.sizes.filterHeader,
                        color: colors.text.inverse,
                      }}
                    >
                      <Skeleton
                        className="h-4"
                        style={{
                          width: '70%',
                          backgroundColor: 'rgba(255, 255, 255, 0.3)'
                        }}
                      />
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Skeleton Body with Striped Rows */}
            <tbody>
              {Array.from({ length: rows }).map((_, rowIdx) => (
                <tr
                  key={rowIdx}
                  className="border-b border-slate-200 transition-colors"
                  style={{
                    backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  {columns.map((col, colIdx) => {
                    const width = getSkeletonColumnWidth(col)
                    // Vary skeleton width for more natural appearance
                    const cellWidth = variedWidths
                      ? getRandomSkeletonWidth(75, 15)
                      : '80%'

                    return (
                      <td
                        key={colIdx}
                        className="px-2 py-2"
                        style={{
                          width: width,
                        }}
                      >
                        <Skeleton
                          className="h-3"
                          style={{ width: cellWidth }}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* "Loading more..." Row */}
              {showLoadingMore && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      <Skeleton className="h-4 w-4 rounded-full" />
                      <Skeleton style={{ width: '100px', height: '14px' }} />
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between mt-4">
          <Skeleton style={{ width: '150px', height: '14px' }} />
          <div className="flex gap-2 items-center">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
