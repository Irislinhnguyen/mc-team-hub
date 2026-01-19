'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '../../../src/components/ui/card'
import { Button } from '../../../src/components/ui/button'
import { Badge } from '../../../src/components/ui/badge'
import { Input } from '../../../src/components/ui/input'
import {
  Plus,
  X,
  ChevronDown,
  Play,
} from 'lucide-react'
import { colors } from '../../../lib/colors'
import type { MetricFilters, MetricFilterClause, MetricField, MetricOperator } from '../../../lib/types/performanceTracker'

interface MetricFilterPanelProps {
  metricFilters: MetricFilters  // Applied filters (used for API calls)
  onMetricFiltersChange: (filters: MetricFilters) => void  // Called when Apply is clicked
  disabled?: boolean
}

// Metric options for the dropdown
const METRIC_OPTIONS: Array<{ value: MetricField; label: string; unit?: string }> = [
  { value: 'revenue', label: 'Revenue', unit: '$' },
  { value: 'profit', label: 'Profit', unit: '$' },
  { value: 'requests', label: 'Requests', unit: '' },
  { value: 'paid', label: 'Paid', unit: '' },
  { value: 'ecpm', label: 'eCPM', unit: '$' },
  { value: 'fill_rate', label: 'Fill Rate', unit: '%' },
  { value: 'profit_rate', label: 'Profit Rate', unit: '%' },
]

// Operator options
const OPERATOR_OPTIONS: Array<{ value: MetricOperator; label: string }> = [
  { value: 'greater_than', label: '>' },
  { value: 'greater_than_or_equal', label: '>=' },
  { value: 'less_than', label: '<' },
  { value: 'less_than_or_equal', label: '<=' },
  { value: 'between', label: 'Between' },
]

const generateId = () => Math.random().toString(36).substring(2, 9)

/**
 * Single metric filter clause component
 */
interface MetricFilterClauseProps {
  clause: MetricFilterClause
  onChange: (clause: MetricFilterClause) => void
  onDelete: () => void
  metricOptions: typeof METRIC_OPTIONS
  operatorOptions: typeof OPERATOR_OPTIONS
}

function MetricFilterClauseRow({
  clause,
  onChange,
  onDelete,
  metricOptions,
  operatorOptions,
}: MetricFilterClauseProps) {
  const [isOpen, setIsOpen] = useState(false)

  const selectedMetric = metricOptions.find(m => m.value === clause.metric)
  const selectedOperator = operatorOptions.find(o => o.value === clause.operator)
  const isBetween = clause.operator === 'between'

  const handleMetricChange = (value: string) => {
    onChange({ ...clause, metric: value as MetricField })
    setIsOpen(false)
  }

  const handleOperatorChange = (value: string) => {
    // Reset value when switching between between and non-between operators
    const newValue = value === 'between' ? [0, 100] : 0
    onChange({ ...clause, operator: value as MetricOperator, value: newValue })
  }

  const handleValueChange = (index: number, value: string) => {
    if (isBetween) {
      const newValues = [...(Array.isArray(clause.value) ? clause.value : [clause.value, clause.value])]
      newValues[index] = parseFloat(value) || 0
      onChange({ ...clause, value: newValues })
    } else {
      onChange({ ...clause, value: parseFloat(value) || 0 })
    }
  }

  return (
    <div className="flex items-center gap-1.5 p-2 rounded-lg border bg-white" style={{ borderColor: colors.border.default }}>
      {/* Enabled Toggle */}
      <button
        onClick={() => onChange({ ...clause, enabled: !clause.enabled })}
        className={`w-4 h-4 rounded border flex items-center justify-center ${
          clause.enabled ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-300'
        }`}
        title={clause.enabled ? 'Disable' : 'Enable'}
      >
        {clause.enabled && <span className="text-white text-xs">✓</span>}
      </button>

      {/* Metric Dropdown */}
      <div className="relative min-w-[110px]">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={!clause.enabled}
          className="w-full px-2 py-1.5 text-left text-sm rounded border flex items-center justify-between"
          style={{
            borderColor: colors.border.default,
            opacity: clause.enabled ? 1 : 0.5
          }}
        >
          <span className="truncate">{selectedMetric?.label || 'Select'}</span>
          <ChevronDown size={14} />
        </button>

        {isOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-auto">
            {metricOptions.map(option => (
              <button
                key={option.value}
                onClick={() => handleMetricChange(option.value)}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
              >
                <span>{option.label}</span>
                {option.unit && <span className="text-gray-400 text-xs">({option.unit})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Operator Dropdown */}
      <div className="relative">
        <select
          value={clause.operator}
          onChange={(e) => handleOperatorChange(e.target.value)}
          disabled={!clause.enabled}
          className="px-2 py-1.5 text-sm rounded border pr-6"
          style={{
            borderColor: colors.border.default,
            opacity: clause.enabled ? 1 : 0.5
          }}
        >
          {operatorOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Value Input(s) */}
      {selectedMetric && (
        <div className="flex items-center gap-1">
          {selectedMetric.unit && (
            <span className="text-xs text-gray-500">{selectedMetric.unit}</span>
          )}
          {isBetween ? (
            <>
              <Input
                type="number"
                value={Array.isArray(clause.value) ? clause.value[0] : ''}
                onChange={(e) => handleValueChange(0, e.target.value)}
                disabled={!clause.enabled}
                className="w-20 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                placeholder="Min"
              />
              <span className="text-xs text-gray-500">and</span>
              <Input
                type="number"
                value={Array.isArray(clause.value) ? clause.value[1] : ''}
                onChange={(e) => handleValueChange(1, e.target.value)}
                disabled={!clause.enabled}
                className="w-20 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
                placeholder="Max"
              />
            </>
          ) : (
            <Input
              type="number"
              value={clause.value || ''}
              onChange={(e) => onChange({ ...clause, value: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              disabled={!clause.enabled}
              className="w-24 h-8 [appearance:textfield] [&::-webkit-outer-spin-button]:hidden [&::-webkit-inner-spin-button]:hidden"
              placeholder="Value"
            />
          )}
        </div>
      )}

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
        title="Remove"
      >
        <X size={14} />
      </button>
    </div>
  )
}

/**
 * Check if two MetricFilters are deeply equal
 */
function areFiltersEqual(a: MetricFilters, b: MetricFilters): boolean {
  if (a.logic !== b.logic) return false
  if (a.clauses.length !== b.clauses.length) return false

  for (let i = 0; i < a.clauses.length; i++) {
    const ac = a.clauses[i]
    const bc = b.clauses[i]
    if (
      ac.id !== bc.id ||
      ac.metric !== bc.metric ||
      ac.operator !== bc.operator ||
      ac.enabled !== bc.enabled ||
      JSON.stringify(ac.value) !== JSON.stringify(bc.value)
    ) {
      return false
    }
  }
  return true
}

/**
 * Metric Filter Panel Component
 *
 * Provides a compact inline interface for adding metric filters
 * Filters are only applied when the user clicks "Apply"
 */
export function MetricFilterPanel({
  metricFilters,
  onMetricFiltersChange,
  disabled = false,
}: MetricFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // Local state for pending filters (what user is editing but hasn't applied yet)
  const [pendingFilters, setPendingFilters] = useState<MetricFilters>(metricFilters)

  // Sync pending filters when applied filters change from outside
  useEffect(() => {
    setPendingFilters(metricFilters)
  }, [metricFilters])

  // Count applied filters (what was actually sent to API)
  const appliedActiveCount = metricFilters.clauses.filter(c => c.enabled).length

  // Count pending filters (what user is currently editing)
  const pendingActiveCount = pendingFilters.clauses.filter(c => c.enabled).length
  const totalCount = pendingFilters.clauses.length

  // Check if there are pending changes
  const hasPendingChanges = !areFiltersEqual(pendingFilters, metricFilters)

  const handleAddClause = () => {
    const newClause: MetricFilterClause = {
      id: generateId(),
      metric: 'revenue',
      operator: 'greater_than',
      value: 0,
      enabled: true,
    }

    setPendingFilters({
      ...pendingFilters,
      clauses: [...pendingFilters.clauses, newClause],
    })

    // Auto-expand when adding first filter
    if (totalCount === 0) {
      setIsExpanded(true)
    }
  }

  const handleClauseChange = (index: number, updatedClause: MetricFilterClause) => {
    const newClauses = [...pendingFilters.clauses]
    newClauses[index] = updatedClause
    setPendingFilters({ ...pendingFilters, clauses: newClauses })
  }

  const handleClauseDelete = (index: number) => {
    const newClauses = pendingFilters.clauses.filter((_, i) => i !== index)
    setPendingFilters({ ...pendingFilters, clauses: newClauses })
  }

  const handleClearAll = () => {
    setPendingFilters({ clauses: [], logic: 'AND' })
  }

  const handleApply = () => {
    onMetricFiltersChange(pendingFilters)
  }

  const toggleLogic = () => {
    setPendingFilters({
      ...pendingFilters,
      logic: pendingFilters.logic === 'AND' ? 'OR' : 'AND',
    })
  }

  return (
    <Card
      style={{
        backgroundColor: 'rgb(249, 250, 251)',
        border: `1px solid ${colors.border.default}`,
      }}
    >
      <CardContent className="py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">Metric Filters</span>
            {appliedActiveCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {appliedActiveCount}
              </Badge>
            )}
            {hasPendingChanges && pendingActiveCount > appliedActiveCount && (
              <Badge variant="outline" className="text-xs" style={{ borderColor: colors.interactive.primary, color: colors.interactive.primary }}>
                +{pendingActiveCount - appliedActiveCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            {pendingFilters.clauses.length > 0 && (
              <>
                {/* Logic Toggle */}
                <button
                  onClick={toggleLogic}
                  disabled={disabled}
                  className="px-2 py-1 text-xs font-medium rounded border text-gray-600 hover:bg-gray-50"
                  style={{
                    borderColor: colors.border.default,
                    opacity: disabled ? 0.5 : 1,
                  }}
                  title="Toggle AND/OR"
                >
                  {pendingFilters.logic}
                </button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearAll}
                  disabled={disabled}
                  className="h-7 text-xs px-2"
                >
                  Clear
                </Button>
              </>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              disabled={disabled}
              className="h-7 gap-1 px-2"
            >
              {isExpanded ? 'Hide' : 'Show'}
              <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Expandable Content */}
        {isExpanded && (
          <div className="space-y-2">
            {/* Filter Clauses */}
            {pendingFilters.clauses.length === 0 ? (
              <div className="text-center py-3 text-sm text-gray-400 border border-dashed rounded-lg">
                No filters
              </div>
            ) : (
              <div className="space-y-2">
                {pendingFilters.clauses.map((clause, index) => (
                  <MetricFilterClauseRow
                    key={clause.id}
                    clause={clause}
                    onChange={(updated) => handleClauseChange(index, updated)}
                    onDelete={() => handleClauseDelete(index)}
                    metricOptions={METRIC_OPTIONS}
                    operatorOptions={OPERATOR_OPTIONS}
                  />
                ))}
              </div>
            )}

            {/* Add Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddClause}
              disabled={disabled}
              className="h-8 gap-1"
            >
              <Plus size={14} />
              Add
            </Button>

            {/* Apply Button - Only show when there are pending changes */}
            {hasPendingChanges && (
              <Button
                onClick={handleApply}
                disabled={disabled}
                className="h-8 gap-1"
                style={{
                  backgroundColor: colors.interactive.primary,
                  color: 'white'
                }}
              >
                <Play size={14} />
                Apply
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
