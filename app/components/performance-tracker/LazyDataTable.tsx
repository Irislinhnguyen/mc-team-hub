'use client'

import { useState, useMemo, useCallback, useRef, useEffect, useTransition, useDeferredValue } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { composedStyles, typography } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'
import { withExport } from './withExport'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import { safeToFixed, safeNumber } from '../../../lib/utils/formatters'

interface Column {
  key: string
  label: string
  width?: string
  format?: (value: any) => string
}

interface LazyDataTableProps {
  title: string
  columns: Column[]
  data: any[]
  pageSize?: number
  enableCrossFilter?: boolean
  crossFilterColumns?: string[]
  // Lazy loading props
  onLoadMore?: () => Promise<void>
  hasMore?: boolean
  isLoading?: boolean
  totalCount?: number
}

function LazyDataTableBase({
  title,
  columns,
  data,
  pageSize = 100,
  enableCrossFilter = false,
  crossFilterColumns = [],
  onLoadMore,
  hasMore = false,
  isLoading = false,
  totalCount = 0
}: LazyDataTableProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [isPending, startTransition] = useTransition()
  const deferredSearchTerm = useDeferredValue(searchTerm)
  const { addCrossFilter, autoEnable, crossFilters } = useCrossFilter()
  const isEnabled = enableCrossFilter || autoEnable
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadingRef = useRef(false)

  const handleCellClick = (columnKey: string, value: any, label: string, event: React.MouseEvent) => {
    if (!isEnabled) return
    if (crossFilterColumns.length > 0 && !crossFilterColumns.includes(columnKey)) return

    // Extract raw value for dates (handles BigQuery date objects)
    const rawValue = value?.value || value
    const filterLabel = `${label}: ${rawValue}`

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is pressed for multi-select
    const append = event.ctrlKey || event.metaKey

    addCrossFilter({
      field: columnKey,
      value: String(rawValue),
      label: filterLabel,
    }, append)
  }

  // Auto-format numbers to 2 decimal places (except IDs)
  const formatCellValue = (value: any, formatter?: (value: any) => string, columnKey?: string) => {
    if (formatter) {
      return formatter(value)
    }

    // Don't format ID columns (zid, mid, pid, etc.)
    const idColumns = ['zid', 'mid', 'pid', 'req']
    if (columnKey && idColumns.includes(columnKey)) {
      return value
    }

    // Auto-format numbers to 2 decimals
    if (typeof value === 'number') {
      return safeToFixed(value, 2)
    }

    // Try to parse as number
    const numValue = parseFloat(value)
    if (!isNaN(numValue) && value !== '') {
      return safeToFixed(numValue, 2)
    }

    return value
  }

  // Filter data based on search (using deferred value for non-blocking search)
  const filteredData = useMemo(() => {
    if (!deferredSearchTerm.trim()) return data

    return data.filter((row) =>
      Object.values(row).some((value) =>
        String(value).toLowerCase().includes(deferredSearchTerm.toLowerCase())
      )
    )
  }, [data, deferredSearchTerm])

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize
    return filteredData.slice(startIndex, startIndex + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
      // Scroll to top of table
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
      // Scroll to top of table
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0
      }
    }
  }

  // Auto-load all data in background with throttling to prevent UI blocking
  useEffect(() => {
    if (!onLoadMore || !hasMore || isLoading || loadingRef.current) {
      return
    }

    // Add 200ms delay between loads to let UI breathe
    const timer = setTimeout(() => {
      loadingRef.current = true
      onLoadMore().finally(() => {
        loadingRef.current = false
      })
    }, 200)

    return () => clearTimeout(timer)
  }, [onLoadMore, hasMore, isLoading, data.length])

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
        minHeight: '420px', // Prevent collapse during loading
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3">
          <h3
            className={composedStyles.sectionTitle}
            style={{
              fontSize: typography.sizes.sectionTitle,
              color: colors.main
            }}
          >
            {title}
          </h3>
          <div className="flex items-center gap-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => {
                const newValue = e.target.value
                setSearchTerm(newValue) // Update input immediately (high priority)
                startTransition(() => {
                  setCurrentPage(0) // Page reset is low priority
                })
              }}
              className="max-w-[200px] h-8"
              style={{ fontSize: '14px', padding: '4px 8px' }}
            />
            {isPending && (
              <div className="flex items-center gap-1">
                <div className="animate-spin h-3 w-3 border border-gray-300 border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-400">searching...</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div
          ref={scrollContainerRef}
          className="overflow-x-auto overflow-y-auto max-h-[320px]"
          style={{ minWidth: 0, width: '100%', minHeight: '320px' }}
        >
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-slate-50 shadow-sm z-10">
              <tr className="border-b border-slate-200">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className="px-2 py-2 text-left font-semibold text-slate-600 leading-tight whitespace-nowrap"
                    style={{
                      minWidth: col.width,
                      fontSize: typography.sizes.filterHeader,
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  className={`border-b border-slate-200 hover:bg-blue-50/30 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {columns.map((col) => {
                    const isClickable = isEnabled && (crossFilterColumns.length === 0 || crossFilterColumns.includes(col.key))
                    const rawValue = row[col.key]?.value || row[col.key]
                    const isSelected = crossFilters.some(f => f.field === col.key && f.value === String(rawValue))
                    const hasCrossFilters = crossFilters.length > 0

                    return (
                      <td
                        key={col.key}
                        className={`px-2 py-2 ${composedStyles.tableData} leading-tight ${
                          isClickable ? 'cursor-pointer hover:bg-blue-50 hover:text-blue-700' : ''
                        } ${isSelected ? 'bg-blue-100 font-semibold' : ''} ${
                          hasCrossFilters && !isSelected ? 'opacity-50' : ''
                        }`}
                        style={{
                          fontSize: typography.sizes.dataPoint,
                          maxWidth: '300px',
                          wordWrap: 'break-word',
                          overflowWrap: 'break-word',
                          whiteSpace: 'normal'
                        }}
                        onClick={(e) => isClickable && handleCellClick(col.key, row[col.key], col.label, e)}
                      >
                        {formatCellValue(row[col.key], col.format, col.key)}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {isLoading && (
                <tr>
                  <td colSpan={columns.length} className="text-center py-4">
                    <div className="flex items-center justify-center gap-2">
                      <div className="animate-spin h-4 w-4 border border-gray-300 border-t-transparent rounded-full"></div>
                      <span style={{ fontSize: '14px', color: colors.neutralDark }}>Loading more...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination and Status */}
        <div className="flex items-center justify-between mt-4">
          <div style={{ fontSize: '14px', color: colors.neutralDark }}>
            {searchTerm ? (
              // When searching, show local filtered results
              <>{currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, filteredData.length)} / {filteredData.length} (filtered)</>
            ) : (isLoading || hasMore) ? (
              // While loading, just show "Loading..." without count
              <div className="flex items-center gap-2">
                <div className="animate-spin h-3 w-3 border border-gray-300 border-t-transparent rounded-full"></div>
                <span className="text-xs text-gray-400">Loading...</span>
              </div>
            ) : (
              // Once fully loaded, show pagination info
              <>{currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, data.length)} / {data.length}</>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className="h-8 w-8 p-0 border-none hover:bg-transparent"
            >
              &lt;
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={currentPage >= totalPages - 1}
              className="h-8 w-8 p-0 border-none hover:bg-transparent"
            >
              &gt;
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Apply export functionality
export const LazyDataTable = withExport(LazyDataTableBase)
