'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Filter } from 'lucide-react'
import { composedStyles, typography } from '../../../../lib/design-tokens'
import { colors } from '../../../../lib/colors'
import { getSkeletonColumnWidth, getRandomSkeletonWidth } from '../../../../lib/utils/skeletonHelpers'
import type { ColumnConfig } from '../../../../lib/types/performanceTracker'

interface DataTableSkeletonProps {
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
   * Show grand total footer skeleton
   * @default false
   */
  showGrandTotal?: boolean

  /**
   * Enable varied row widths for more natural appearance
   * @default true
   */
  variedWidths?: boolean
}

/**
 * DataTable-specific skeleton component
 *
 * Matches the exact structure of DataTable including:
 * - Filter buttons in headers
 * - Grand total footer (optional)
 * - Dynamic height based on row count
 * - Sticky header and footer
 *
 * @example
 * ```tsx
 * import { getColumns, COLUMN_SETS } from '@/lib/config/tableColumns'
 *
 * const columns = getColumns(COLUMN_SETS.PUBLISHER)
 *
 * <DataTableSkeleton
 *   columns={columns}
 *   rows={5}
 *   showGrandTotal={true}
 * />
 * ```
 */
export function DataTableSkeleton({
  columns,
  rows = 5,
  titleWidth = '200px',
  showGrandTotal = false,
  variedWidths = true
}: DataTableSkeletonProps) {
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
              {/* Skeleton Header - Sticky with Filter Buttons */}
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
                        className="px-2 py-2 text-left font-semibold leading-tight"
                        style={{
                          minWidth: width,
                          fontSize: typography.sizes.filterHeader,
                          color: colors.text.inverse,
                        }}
                      >
                        <div className="flex items-center gap-1 justify-between">
                          <Skeleton
                            className="h-4"
                            style={{
                              width: '60%',
                              backgroundColor: 'rgba(255, 255, 255, 0.3)'
                            }}
                          />
                          {/* Filter button skeleton (show for filterable columns) */}
                          {col.filterable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 opacity-50 cursor-default"
                              style={{
                                color: colors.text.inverse
                              }}
                              disabled
                            >
                              <Filter size={14} />
                            </Button>
                          )}
                        </div>
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

              {/* Grand Total Footer Skeleton - Sticky at Bottom */}
              {showGrandTotal && (
                <tfoot className="sticky" style={{ bottom: 0, zIndex: 10 }}>
                  <tr
                    className="border-t-2"
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderTopColor: colors.main,
                      boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {columns.map((col, idx) => {
                      const width = getSkeletonColumnWidth(col)
                      return (
                        <td
                          key={idx}
                          className="px-3 py-3"
                          style={{
                            width: width,
                            fontWeight: 600,
                            backgroundColor: 'inherit'
                          }}
                        >
                          <Skeleton
                            className="h-3"
                            style={{ width: '70%' }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Pagination Skeleton */}
        <div className="flex items-center justify-between mt-4">
          <Skeleton style={{ width: '120px', height: '14px' }} />
          <div className="flex gap-2 items-center">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
