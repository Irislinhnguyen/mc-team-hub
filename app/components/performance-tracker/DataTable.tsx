'use client'

import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Checkbox } from '@/components/ui/checkbox'
import { Filter, X } from 'lucide-react'
import { composedStyles, typography } from '../../../lib/design-tokens'
import { colors } from '../../../lib/colors'
import { withExport } from './withExport'
import { useCrossFilter } from '../../contexts/CrossFilterContext'
import { formatTableCell, formatDate } from '../../../lib/utils/formatters'
import { hideRepeatedValues, hideRepeatedValuesInGroups, getOriginalValue } from '../../../lib/utils/tableHelpers'
import { normalizeFilterValue } from '../../../lib/utils/filterHelpers'

interface Column {
  key: string
  label: string
  width?: string
  format?: (value: any) => string | React.ReactNode
  filterable?: boolean // Only show filter dropdown for entity columns
}

interface DataTableProps {
  title: string
  columns: Column[]
  data: any[]
  pageSize?: number
  enableCrossFilter?: boolean
  crossFilterColumns?: string[]
  hideRepeatedColumns?: string[]
  groupByColumns?: string[]
}

function DataTableBase({
  title,
  columns,
  data,
  pageSize = 100,
  enableCrossFilter = false,
  crossFilterColumns = [],
  hideRepeatedColumns = [],
  groupByColumns = []
}: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [columnFilters, setColumnFilters] = useState<Record<string, string[]>>({})
  const [isCtrlPressed, setIsCtrlPressed] = useState(false)
  const { addCrossFilter, autoEnable, crossFilters, flushPendingFilters } = useCrossFilter()
  const isEnabled = enableCrossFilter || autoEnable

  // Listen to Ctrl key events for batch mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        setIsCtrlPressed(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) {
        if (isCtrlPressed) {
          // Ctrl was released → flush pending filters
          flushPendingFilters()
          setIsCtrlPressed(false)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [isCtrlPressed, flushPendingFilters])

  const handleCellClick = (columnKey: string, value: any, label: string, event: React.MouseEvent) => {
    if (!isEnabled) return
    if (crossFilterColumns.length > 0 && !crossFilterColumns.includes(columnKey)) return

    // Use original value for cross-filtering (in case it's hidden)
    const originalValue = getOriginalValue(value)
    const rawValue = originalValue?.value || originalValue
    const filterLabel = `${label}: ${rawValue}`

    console.log('[DEBUG] Cell clicked:', {
      columnKey,
      value,
      originalValue,
      rawValue,
      label,
      filterLabel
    })

    // Check if Ctrl (Windows/Linux) or Cmd (Mac) key is pressed for multi-select
    const append = event.ctrlKey || event.metaKey
    const useBatchMode = append // Use batch mode when appending (Ctrl+click)

    addCrossFilter({
      field: columnKey,
      value: String(rawValue),
      label: filterLabel,
    }, append, useBatchMode)
  }

  // Format cell values with metric-aware formatting
  const formatCellValue = (value: any, formatter?: (value: any) => string | React.ReactNode, columnKey?: string) => {
    // Handle hidden values - return empty string
    if (value?._hidden) {
      return ''
    }

    // If custom formatter is provided, use it
    if (formatter) {
      return formatter(value)
    }

    // Auto-detect and format dates (columns named 'date' or containing date values)
    if (columnKey === 'date' || columnKey?.toLowerCase().includes('date')) {
      return formatDate(value)
    }

    return formatTableCell(value, columnKey, formatter)
  }

  // Separate grand total from regular data
  const { regularData, grandTotalRow } = useMemo(() => {
    const grandTotal = data.find(row => row.isGrandTotal === true)
    const regular = data.filter(row => row.isGrandTotal !== true)
    return { regularData: regular, grandTotalRow: grandTotal }
  }, [data])

  // Apply hide repeated values transformation
  const processedData = useMemo(() => {
    if (hideRepeatedColumns.length === 0) return regularData

    if (groupByColumns.length > 0) {
      return hideRepeatedValuesInGroups(
        regularData,
        groupByColumns,
        hideRepeatedColumns
      )
    } else {
      return hideRepeatedValues(regularData, hideRepeatedColumns)
    }
  }, [regularData, hideRepeatedColumns, groupByColumns])

  // Get unique values for each column (for filter dropdowns)
  const columnUniqueValues = useMemo(() => {
    const uniquesByColumn: Record<string, Set<string>> = {}

    columns.forEach(col => {
      uniquesByColumn[col.key] = new Set()
    })

    processedData.forEach(row => {
      columns.forEach(col => {
        const value = getOriginalValue(row[col.key])
        const stringValue = String(value || '')
        if (stringValue) {
          uniquesByColumn[col.key].add(stringValue)
        }
      })
    })

    // Convert Sets to sorted arrays
    const result: Record<string, string[]> = {}
    Object.entries(uniquesByColumn).forEach(([key, set]) => {
      result[key] = Array.from(set).sort()
    })

    return result
  }, [processedData, columns])

  // Filter data based on column filters
  const filteredData = useMemo(() => {
    let filtered = processedData

    // Apply column filters
    Object.entries(columnFilters).forEach(([columnKey, selectedValues]) => {
      if (selectedValues.length > 0) {
        filtered = filtered.filter(row => {
          const value = getOriginalValue(row[columnKey])
          const stringValue = String(value || '')
          return selectedValues.includes(stringValue)
        })
      }
    })

    // Also apply search term if present
    if (searchTerm.trim()) {
      filtered = filtered.filter((row) =>
        Object.entries(row).some(([key, value]) => {
          const searchValue = getOriginalValue(value)
          return String(searchValue).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    return filtered
  }, [processedData, columnFilters, searchTerm])

  // Paginate data (exclude grand total from pagination)
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize
    return filteredData.slice(startIndex, startIndex + pageSize)
  }, [filteredData, currentPage, pageSize])

  const totalPages = Math.ceil(filteredData.length / pageSize)

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  // Column filter handlers
  const handleColumnFilterChange = (columnKey: string, value: string, checked: boolean) => {
    setColumnFilters(prev => {
      const currentFilters = prev[columnKey] || []
      if (checked) {
        return { ...prev, [columnKey]: [...currentFilters, value] }
      } else {
        return { ...prev, [columnKey]: currentFilters.filter(v => v !== value) }
      }
    })
    setCurrentPage(0) // Reset to first page when filter changes
  }

  const clearColumnFilter = (columnKey: string) => {
    setColumnFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[columnKey]
      return newFilters
    })
    setCurrentPage(0)
  }

  const clearAllFilters = () => {
    setColumnFilters({})
    setCurrentPage(0)
  }

  const activeFilterCount = Object.keys(columnFilters).length

  // Calculate dynamic table height based on data
  const rowHeight = 48 // Approximate height per row
  const headerHeight = 60
  const paginationHeight = 50
  const minVisibleRows = 3
  const maxVisibleRows = 7 // Reduced from 8 to 7 to fit pagination

  const visibleRows = Math.min(
    Math.max(minVisibleRows, paginatedData.length),
    maxVisibleRows
  )

  const dynamicTableHeight = (visibleRows * rowHeight) + headerHeight

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
        minHeight: '480px',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-4 flex-wrap">
          <h3
            className={`${composedStyles.sectionTitle} whitespace-nowrap`}
            style={{
              fontSize: typography.sizes.sectionTitle,
              color: colors.main
            }}
          >
            {title}
          </h3>
          <Input
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(0) // Reset to first page when searching
            }}
            className="w-[150px] h-8"
            style={{ fontSize: '13px', padding: '4px 8px' }}
          />
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs gap-1 ml-auto"
              style={{ color: colors.status.danger }}
            >
              <X size={14} />
              Clear {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Single table with horizontal and vertical scroll - Dynamic height */}
          <div className="overflow-x-auto overflow-y-auto" style={{ height: `${dynamicTableHeight}px`, minWidth: 0, width: '100%' }}>
            <table className="w-full border-collapse">
              <thead className="sticky top-0 shadow-sm" style={{ zIndex: 20, backgroundColor: colors.main }}>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {columns.map((col) => {
                    const hasFilter = columnFilters[col.key] && columnFilters[col.key].length > 0
                    const uniqueValues = columnUniqueValues[col.key] || []

                    return (
                      <th
                        key={col.key}
                        className="px-2 py-2 text-left font-semibold leading-tight"
                        style={{
                          minWidth: col.width,
                          fontSize: typography.sizes.filterHeader,
                          color: colors.text.inverse,
                        }}
                      >
                        <div className="flex items-center gap-1 justify-between" style={{ color: colors.text.inverse }}>
                          <span className="whitespace-nowrap">{col.label}</span>
                          {col.filterable && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-white/20"
                                  style={{
                                    color: colors.text.inverse
                                  }}
                                >
                                  <Filter size={14} />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-64 p-3" align="start">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-semibold">Filter by {col.label}</span>
                                    {hasFilter && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => clearColumnFilter(col.key)}
                                        className="h-6 text-xs px-2"
                                      >
                                        Clear
                                      </Button>
                                    )}
                                  </div>
                                  <div className="max-h-64 overflow-y-auto space-y-1.5">
                                    {uniqueValues.map((value) => {
                                      const isChecked = columnFilters[col.key]?.includes(value) || false
                                      return (
                                        <div key={value} className="flex items-center gap-2">
                                          <Checkbox
                                            id={`${col.key}-${value}`}
                                            checked={isChecked}
                                            onCheckedChange={(checked) =>
                                              handleColumnFilterChange(col.key, value, checked as boolean)
                                            }
                                          />
                                          <label
                                            htmlFor={`${col.key}-${value}`}
                                            className="text-sm cursor-pointer flex-1"
                                          >
                                            {normalizeFilterValue(value)}
                                          </label>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
                          )}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {/* Data Rows */}
                {paginatedData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-slate-200 transition-colors"
                    style={{
                      backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f0f0f0'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                    }}
                  >
                    {columns.map((col) => {
                      const cellValue = row[col.key]
                      const isHidden = cellValue?._hidden === true
                      const originalValue = getOriginalValue(cellValue)
                      const rawValue = originalValue?.value || originalValue

                      const isClickable = isEnabled && (crossFilterColumns.length === 0 || crossFilterColumns.includes(col.key))
                      const isSelected = crossFilters.some(f => f.field === col.key && f.value === String(rawValue))
                      const hasCrossFilters = crossFilters.length > 0

                      return (
                        <td
                          key={col.key}
                          className={`px-2 py-2 ${composedStyles.tableData} leading-tight ${
                            isClickable ? 'cursor-pointer' : ''
                          } ${isSelected ? 'font-semibold' : ''} ${
                            hasCrossFilters && !isSelected ? 'opacity-50' : ''
                          } ${isHidden ? 'text-slate-300' : ''}`}
                          style={{
                            fontSize: typography.sizes.dataPoint,
                            maxWidth: '300px',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            whiteSpace: 'normal',
                            backgroundColor: isSelected ? colors.status.infoBg : 'transparent',
                            color: isSelected ? colors.data.primary : colors.text.primary
                          }}
                          onClick={(e) => isClickable && handleCellClick(col.key, cellValue, col.label, e)}
                          onMouseEnter={(e) => {
                            if (isClickable) {
                              e.currentTarget.style.backgroundColor = isSelected ? colors.status.infoBg : colors.surface.muted
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (isClickable) {
                              e.currentTarget.style.backgroundColor = isSelected ? colors.status.infoBg : 'transparent'
                            }
                          }}
                          title={isHidden ? String(rawValue) : undefined}
                        >
                          {formatCellValue(cellValue, col.format, col.key)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
              {/* Grand Total Footer - Sticky at Bottom */}
              {grandTotalRow && (
                <tfoot className="sticky" style={{ bottom: 0, zIndex: 10 }}>
                  <tr
                    className="border-t-2"
                    style={{
                      backgroundColor: '#f8f9fa',
                      borderTopColor: colors.main,
                      boxShadow: '0 -2px 4px rgba(0, 0, 0, 0.08)'
                    }}
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-3 ${composedStyles.tableData} leading-tight`}
                        style={{
                          fontSize: typography.sizes.dataPoint,
                          width: col.width,
                          fontWeight: 600,
                          backgroundColor: 'inherit'
                        }}
                      >
                        {formatCellValue(grandTotalRow[col.key], col.format, col.key)}
                      </td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div style={{ fontSize: '13px', color: colors.neutralDark }}>
            Showing {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, filteredData.length)} of {filteredData.length}
          </div>
          <div className="flex gap-1 items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              disabled={currentPage === 0}
              className="h-7 w-7 p-0 text-sm"
              style={{ color: currentPage === 0 ? colors.neutralLight : colors.neutralDark }}
            >
              &lt;
            </Button>

            {/* Page Numbers */}
            {(() => {
              const maxPagesToShow = 3
              let startPage = Math.max(0, currentPage - Math.floor(maxPagesToShow / 2))
              let endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1)

              // Adjust start if we're near the end
              if (endPage - startPage < maxPagesToShow - 1) {
                startPage = Math.max(0, endPage - maxPagesToShow + 1)
              }

              const pages = []

              // First page
              if (startPage > 0) {
                pages.push(
                  <Button
                    key={0}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(0)}
                    className="h-7 w-7 p-0 text-xs"
                    style={{
                      backgroundColor: 0 === currentPage ? colors.main : 'transparent',
                      color: 0 === currentPage ? colors.text.inverse : colors.neutralDark
                    }}
                  >
                    1
                  </Button>
                )
                if (startPage > 1) {
                  pages.push(<span key="ellipsis1" className="px-0.5 text-xs">...</span>)
                }
              }

              // Middle pages
              for (let i = startPage; i <= endPage; i++) {
                pages.push(
                  <Button
                    key={i}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(i)}
                    className="h-7 w-7 p-0 text-xs"
                    style={{
                      backgroundColor: i === currentPage ? colors.main : 'transparent',
                      color: i === currentPage ? colors.text.inverse : colors.neutralDark
                    }}
                  >
                    {i + 1}
                  </Button>
                )
              }

              // Last page
              if (endPage < totalPages - 1) {
                if (endPage < totalPages - 2) {
                  pages.push(<span key="ellipsis2" className="px-0.5 text-xs">...</span>)
                }
                pages.push(
                  <Button
                    key={totalPages - 1}
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages - 1)}
                    className="h-7 w-7 p-0 text-xs"
                    style={{
                      backgroundColor: totalPages - 1 === currentPage ? colors.main : 'transparent',
                      color: totalPages - 1 === currentPage ? colors.text.inverse : colors.neutralDark
                    }}
                  >
                    {totalPages}
                  </Button>
                )
              }

              return pages
            })()}

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={currentPage >= totalPages - 1}
              className="h-7 w-7 p-0 text-sm"
              style={{ color: currentPage >= totalPages - 1 ? colors.neutralLight : colors.neutralDark }}
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
export const DataTable = withExport(DataTableBase)
