'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { composedStyles, typography } from '../../../../lib/design-tokens'
import { colors } from '../../../../lib/colors'
import { getSkeletonColumnWidth, getRandomSkeletonWidth } from '../../../../lib/utils/skeletonHelpers'
import type { ColumnConfig } from '../../../../lib/types/performanceTracker'

interface DynamicTableSkeletonProps {
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
   * Show pagination skeleton
   * @default true
   */
  showPagination?: boolean

  /**
   * Enable varied row widths for more natural appearance
   * @default true
   */
  variedWidths?: boolean
}

/**
 * Base dynamic table skeleton component
 *
 * Automatically generates skeleton structure matching the actual table
 * based on column configuration.
 *
 * Features:
 * - Column count matches actual table
 * - Column widths match configuration
 * - Varied cell widths for natural appearance
 * - Sticky header skeleton
 * - Optional pagination skeleton
 *
 * @example
 * ```tsx
 * import { STANDARD_COLUMNS } from '@/lib/config/tableColumns'
 *
 * const columns = [
 *   STANDARD_COLUMNS.date,
 *   STANDARD_COLUMNS.pid,
 *   STANDARD_COLUMNS.pubname,
 *   STANDARD_COLUMNS.rev,
 *   STANDARD_COLUMNS.profit
 * ]
 *
 * <DynamicTableSkeleton columns={columns} rows={5} />
 * ```
 */
export function DynamicTableSkeleton({
  columns,
  rows = 5,
  titleWidth = '200px',
  showPagination = true,
  variedWidths = true
}: DynamicTableSkeletonProps) {
  // Calculate dynamic table height (same logic as DataTable)
  const rowHeight = 48
  const headerHeight = 60
  const minVisibleRows = 3
  const maxVisibleRows = 8

  const visibleRows = Math.min(
    Math.max(minVisibleRows, rows),
    maxVisibleRows
  )

  const dynamicTableHeight = (visibleRows * rowHeight) + headerHeight

  return (
    <Card
      style={{
        backgroundColor: '#ffffff',
        border: 'none',
        borderRadius: '6px',
        boxShadow: 'none',
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
        minHeight: '480px',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <Skeleton
            style={{
              width: titleWidth,
              height: typography.sizes.sectionTitle
            }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Table with skeleton structure */}
          <div
            className="overflow-x-auto overflow-y-auto"
            style={{
              height: `${dynamicTableHeight}px`,
              minWidth: 0,
              width: '100%'
            }}
          >
            <table className="w-full border-collapse">
              {/* Skeleton Header - Sticky */}
              <thead
                className="sticky top-0"
                style={{
                  zIndex: 20,
                  backgroundColor: colors.main
                }}
              >
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {columns.map((col, idx) => {
                    const width = getSkeletonColumnWidth(col)
                    return (
                      <th
                        key={idx}
                        className="px-2 py-2 text-left"
                        style={{
                          minWidth: width,
                        }}
                      >
                        <Skeleton
                          className="h-4"
                          style={{
                            width: '60%',
                            backgroundColor: 'rgba(255, 255, 255, 0.3)'
                          }}
                        />
                      </th>
                    )
                  })}
                </tr>
              </thead>

              {/* Skeleton Body */}
              <tbody>
                {Array.from({ length: rows }).map((_, rowIdx) => (
                  <tr
                    key={rowIdx}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: '#ffffff'
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
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Skeleton */}
        {showPagination && (
          <div className="flex items-center justify-between mt-4">
            <Skeleton style={{ width: '120px', height: '14px' }} />
            <div className="flex gap-2 items-center">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
