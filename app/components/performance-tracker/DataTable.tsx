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
import { formatTableCell } from '../../../lib/utils/formatters'
import { hideRepeatedValues, hideRepeatedValuesInGroups, getOriginalValue } from '../../../lib/utils/tableHelpers'

interface Column {
  key: string
  label: string
  width?: string
  format?: (value: any) => string
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
  const formatCellValue = (value: any, formatter?: (value: any) => string, columnKey?: string) => {
    // Handle hidden values - return empty string
    if (value?._hidden) {
      return ''
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
  const maxVisibleRows = 8

  const visibleRows = Math.min(
    Math.max(minVisibleRows, paginatedData.length),
    maxVisibleRows
  )

  const dynamicTableHeight = (visibleRows * rowHeight) + headerHeight

  return (
    <Card
      style={{
        backgroundColor: '#ffffff',
        border: 'none', // Borderless design
        borderRadius: '6px',
        boxShadow: 'none', // No shadow
        minWidth: 0,
        width: '100%',
        maxWidth: '100%',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <h3
            className={composedStyles.sectionTitle}
            style={{
              fontSize: typography.sizes.sectionTitle,
              color: colors.text.primary
            }}
          >
            {title}
          </h3>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 text-xs gap-1"
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
              <thead className="sticky top-0" style={{ zIndex: 20, backgroundColor: '#fafafa' }}>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  {columns.map((col) => {
                    const hasFilter = columnFilters[col.key] && columnFilters[col.key].length > 0
                    const uniqueValues = columnUniqueValues[col.key] || []

                    return (
                      <th
                        key={col.key}
                        className="px-2 py-2 text-left font-semibold text-slate-600 leading-tight"
                        style={{
                          minWidth: col.width,
                          fontSize: typography.sizes.filterHeader,
                        }}
                      >
                        <div className="flex items-center gap-1 justify-between">
                          <span className="whitespace-nowrap">{col.label}</span>
                          {col.filterable && (
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 hover:bg-gray-200"
                                  style={{
                                    color: hasFilter ? colors.data.primary : colors.text.secondary
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
                                            {value}
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
                    className="transition-colors"
                    style={{
                      borderBottom: '1px solid #f1f5f9', // Very light horizontal border only
                      backgroundColor: '#ffffff'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fafafa'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff'
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
          <div style={{ fontSize: '14px', color: colors.neutralDark }}>
            {currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, filteredData.length)} / {filteredData.length}
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
export const DataTable = withExport(DataTableBase)
