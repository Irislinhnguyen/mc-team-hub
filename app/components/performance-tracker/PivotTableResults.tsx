'use client'

/**
 * Pivot Table Results Component
 *
 * Displays query results with drag-and-drop pivot table configuration
 */

import React, { useState, useMemo } from 'react'
import { DndContext, DragOverlay, useDraggable, useDroppable, DragEndEvent } from '@dnd-kit/core'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Download, X } from 'lucide-react'
import { calculatePivotTable, formatNumber } from '../../../lib/utils/pivotCalculator'
import type { QueryLabResponse, PivotConfig, PivotValue, ColumnMetadata, AggregationFunction } from '../../../lib/types/queryLab'

interface PivotTableResultsProps {
  results: QueryLabResponse | null
  isLoading?: boolean
}

interface FieldConfig {
  name: string
  label: string
  type: 'dimension' | 'metric' | 'calculated'
}

// Draggable field chip
function DraggableField({ field }: { field: FieldConfig }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: field.name,
    data: { field }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1
  } : {}

  return (
    <Badge
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="cursor-grab active:cursor-grabbing"
      style={style}
      variant="outline"
    >
      {field.label}
    </Badge>
  )
}

// Droppable zone
function DropZone({
  zone,
  fields,
  onRemove,
  title,
  allowAggregation = false,
  onAggregationChange
}: {
  zone: string
  fields: Array<{ name: string; label: string; aggregation?: AggregationFunction }>
  onRemove: (fieldName: string) => void
  title: string
  allowAggregation?: boolean
  onAggregationChange?: (fieldName: string, aggregation: AggregationFunction) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: zone
  })

  return (
    <div>
      <label className="block text-xs font-medium mb-2" style={{ color: '#6b7280' }}>
        {title}
      </label>
      <div
        ref={setNodeRef}
        className={`
          border-2 border-dashed rounded-lg p-3 min-h-[60px]
          transition-colors flex flex-wrap gap-2 items-center
          ${isOver ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-slate-50'}
        `}
      >
        {fields.length === 0 ? (
          <span className="text-xs text-slate-400">Drop fields here</span>
        ) : (
          fields.map(field => (
            <div key={field.name} className="flex items-center gap-1">
              <Badge variant="default" style={{ backgroundColor: '#1565C0' }}>
                {field.label}
                {allowAggregation && field.aggregation && ` (${field.aggregation})`}
              </Badge>
              {allowAggregation && onAggregationChange && (
                <Select
                  value={field.aggregation || 'SUM'}
                  onValueChange={(value) => onAggregationChange(field.name, value as AggregationFunction)}
                >
                  <SelectTrigger className="h-6 w-20 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="agg-sum" value="SUM">SUM</SelectItem>
                    <SelectItem key="agg-avg" value="AVG">AVG</SelectItem>
                    <SelectItem key="agg-count" value="COUNT">COUNT</SelectItem>
                    <SelectItem key="agg-min" value="MIN">MIN</SelectItem>
                    <SelectItem key="agg-max" value="MAX">MAX</SelectItem>
                  </SelectContent>
                </Select>
              )}
              <button
                onClick={() => onRemove(field.name)}
                className="text-slate-500 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function PivotTableResults({ results, isLoading }: PivotTableResultsProps) {
  // Pivot configuration state
  const [rowFields, setRowFields] = useState<string[]>([])
  const [columnFields, setColumnFields] = useState<string[]>([])
  const [valueFields, setValueFields] = useState<PivotValue[]>([])
  const [activeField, setActiveField] = useState<FieldConfig | null>(null)

  // Available fields from results
  const availableFields = useMemo<FieldConfig[]>(() => {
    if (!results?.columns) return []

    return results.columns.map(col => ({
      name: col.name,
      label: col.label,
      type: col.category
    }))
  }, [results])

  // Dimension fields (for rows/columns)
  const dimensionFields = useMemo(
    () => availableFields.filter(f => f.type === 'dimension'),
    [availableFields]
  )

  // Metric fields (for values)
  const metricFields = useMemo(
    () => availableFields.filter(f => f.type === 'metric' || f.type === 'calculated'),
    [availableFields]
  )

  // Available fields to drag (not yet used)
  const unusedDimensionFields = useMemo(
    () => dimensionFields.filter(f => !rowFields.includes(f.name) && !columnFields.includes(f.name)),
    [dimensionFields, rowFields, columnFields]
  )

  const unusedMetricFields = useMemo(
    () => metricFields.filter(f => !valueFields.some(v => v.field === f.name)),
    [metricFields, valueFields]
  )

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) {
      setActiveField(null)
      return
    }

    const field = active.data.current?.field as FieldConfig
    const targetZone = over.id as string

    if (field.type === 'dimension') {
      if (targetZone === 'rows' && !rowFields.includes(field.name)) {
        setRowFields([...rowFields, field.name])
      } else if (targetZone === 'columns' && !columnFields.includes(field.name)) {
        setColumnFields([...columnFields, field.name])
      }
    } else {
      if (targetZone === 'values' && !valueFields.some(v => v.field === field.name)) {
        setValueFields([...valueFields, { field: field.name, aggregation: 'SUM', label: field.label }])
      }
    }

    setActiveField(null)
  }

  // Remove field from zone
  const removeFromRows = (fieldName: string) => {
    setRowFields(rowFields.filter(f => f !== fieldName))
  }

  const removeFromColumns = (fieldName: string) => {
    setColumnFields(columnFields.filter(f => f !== fieldName))
  }

  const removeFromValues = (fieldName: string) => {
    setValueFields(valueFields.filter(v => v.field !== fieldName))
  }

  // Update aggregation
  const updateAggregation = (fieldName: string, aggregation: AggregationFunction) => {
    setValueFields(valueFields.map(v =>
      v.field === fieldName ? { ...v, aggregation } : v
    ))
  }

  // Calculate pivot table
  const pivotData = useMemo(() => {
    if (!results?.data || results.data.length === 0) return null

    const config: PivotConfig = {
      rows: rowFields,
      columns: columnFields,
      values: valueFields
    }

    return calculatePivotTable(results.data, config)
  }, [results, rowFields, columnFields, valueFields])

  // Export to CSV
  const handleExportCSV = () => {
    if (!pivotData) return

    // Build CSV content
    let csv = ''

    // Header row
    const headerRow = [''] // First column for row labels
    if (pivotData.headers.length > 0) {
      headerRow.push(...pivotData.headers)
    }
    csv += headerRow.join(',') + '\n'

    // Data rows
    pivotData.rows.forEach(row => {
      const rowData = [row.label]
      pivotData.headers.forEach(header => {
        const value = row.values[header]
        rowData.push(typeof value === 'number' ? value.toString() : String(value))
      })
      csv += rowData.join(',') + '\n'
    })

    // Totals row
    if (pivotData.totals && Object.keys(pivotData.totals).length > 0) {
      const totalsRow = ['TOTAL']
      pivotData.headers.forEach(header => {
        const value = pivotData.totals?.[header] || 0
        totalsRow.push(typeof value === 'number' ? value.toString() : String(value))
      })
      csv += totalsRow.join(',') + '\n'
    }

    // Download
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query-results-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-slate-500">Loading results...</div>
        </CardContent>
      </Card>
    )
  }

  if (!results) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-slate-500">
            Run a query to see results
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        {/* Results Header */}
        <Card>
          <CardHeader className="p-4">
            <div className="flex items-center justify-between">
              <CardTitle style={{ fontSize: '14px', fontWeight: 600 }}>
                Results: {results.rowCount} rows
              </CardTitle>
              <Button
                onClick={handleExportCSV}
                disabled={!pivotData || pivotData.rows.length === 0}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Field Bank */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle style={{ fontSize: '14px', fontWeight: 600 }}>
              Available Fields
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            {/* Dimension fields */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#6b7280' }}>
                Dimensions (for Rows/Columns)
              </label>
              <div className="flex flex-wrap gap-2">
                {unusedDimensionFields.map(field => (
                  <DraggableField key={field.name} field={field} />
                ))}
                {unusedDimensionFields.length === 0 && (
                  <span className="text-xs text-slate-400">All dimensions in use</span>
                )}
              </div>
            </div>

            {/* Metric fields */}
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: '#6b7280' }}>
                Metrics (for Values)
              </label>
              <div className="flex flex-wrap gap-2">
                {unusedMetricFields.map(field => (
                  <DraggableField key={field.name} field={field} />
                ))}
                {unusedMetricFields.length === 0 && (
                  <span className="text-xs text-slate-400">All metrics in use</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Drop Zones */}
        <Card>
          <CardHeader className="p-4">
            <CardTitle style={{ fontSize: '14px', fontWeight: 600 }}>
              Pivot Configuration
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-3">
            <DropZone
              zone="rows"
              fields={rowFields.map(name => ({
                name,
                label: dimensionFields.find(f => f.name === name)?.label || name
              }))}
              onRemove={removeFromRows}
              title="Rows"
            />

            <DropZone
              zone="columns"
              fields={columnFields.map(name => ({
                name,
                label: dimensionFields.find(f => f.name === name)?.label || name
              }))}
              onRemove={removeFromColumns}
              title="Columns"
            />

            <DropZone
              zone="values"
              fields={valueFields.map(v => ({
                name: v.field,
                label: v.label || v.field,
                aggregation: v.aggregation
              }))}
              onRemove={removeFromValues}
              title="Values"
              allowAggregation
              onAggregationChange={updateAggregation}
            />
          </CardContent>
        </Card>

        {/* Pivot Table */}
        {pivotData && pivotData.rows.length > 0 && (
          <Card>
            <CardHeader className="p-4">
              <CardTitle style={{ fontSize: '14px', fontWeight: 600 }}>
                Pivot Table
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="font-semibold bg-slate-50">
                        {rowFields.join(' / ') || 'Row'}
                      </TableHead>
                      {pivotData.headers.map(header => (
                        <TableHead key={header} className="text-right font-semibold bg-slate-50">
                          {header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pivotData.rows.slice(0, 100).map(row => (
                      <TableRow key={row.key}>
                        <TableCell className="font-medium">{row.label}</TableCell>
                        {pivotData.headers.map(header => (
                          <TableCell key={header} className="text-right">
                            {formatNumber(row.values[header] as number)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                    {pivotData.rows.length > 100 && (
                      <TableRow>
                        <TableCell colSpan={pivotData.headers.length + 1} className="text-center text-slate-500 text-sm">
                          Showing 100 of {pivotData.rows.length} rows
                        </TableCell>
                      </TableRow>
                    )}
                    {pivotData.totals && Object.keys(pivotData.totals).length > 0 && (
                      <TableRow className="bg-slate-100 font-bold">
                        <TableCell>TOTAL</TableCell>
                        {pivotData.headers.map(header => (
                          <TableCell key={header} className="text-right">
                            {formatNumber(pivotData.totals?.[header] as number)}
                          </TableCell>
                        ))}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {(!pivotData || pivotData.rows.length === 0) && (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-slate-500">
                <p className="mb-2">Configure your pivot table</p>
                <p className="text-sm">Drag dimensions to Rows/Columns and metrics to Values</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <DragOverlay>
        {activeField && (
          <Badge variant="outline" style={{ cursor: 'grabbing' }}>
            {activeField.label}
          </Badge>
        )}
      </DragOverlay>
    </DndContext>
  )
}
