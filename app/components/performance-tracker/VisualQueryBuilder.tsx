'use client'

/**
 * Visual Query Builder Component
 *
 * Allows users to build queries visually without SQL knowledge
 */

import React, { useState } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../src/components/ui/card'
import { Button } from '../../../src/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../src/components/ui/select'
import { Input } from '../../../src/components/ui/input'
import { Badge } from '../../../src/components/ui/badge'
import { Separator } from '../../../src/components/ui/separator'
import type {
  QueryConfig,
  QueryCondition,
  MetricFilter,
  QueryEntity,
  ConditionType,
  FieldOperator,
  MetricOperator,
  CalculatedMetric
} from '../../../lib/types/queryLab'

interface VisualQueryBuilderProps {
  queryConfig: QueryConfig
  onQueryConfigChange: (config: QueryConfig) => void
  onRunQuery: () => void
  isLoading?: boolean
}

// Entity definitions with labels
const ENTITIES: Array<{ id: QueryEntity; label: string; description: string }> = [
  { id: 'pid', label: 'Publishers', description: 'Analyze at publisher level' },
  { id: 'mid', label: 'Media Properties', description: 'Analyze at media property level' },
  { id: 'zid', label: 'Zones', description: 'Analyze at zone level' },
  { id: 'team', label: 'Teams', description: 'Analyze at team level' },
  { id: 'pic', label: 'PICs', description: 'Analyze at person in charge level' },
  { id: 'product', label: 'Products', description: 'Analyze at product level' }
]

// Condition types
const CONDITION_TYPES: Array<{ id: ConditionType; label: string }> = [
  { id: 'has', label: 'Has at least one' },
  { id: 'does_not_have', label: 'Does not have any' },
  { id: 'only_has', label: 'Only has' },
  { id: 'has_all', label: 'Has all of' }
]

// Field operators
const FIELD_OPERATORS: Array<{ id: FieldOperator; label: string }> = [
  { id: 'equals', label: 'equals' },
  { id: 'not_equals', label: 'does not equal' },
  { id: 'in', label: 'is one of' },
  { id: 'greater_than', label: 'greater than' },
  { id: 'less_than', label: 'less than' },
  { id: 'contains', label: 'contains' }
]

// Metric operators
const METRIC_OPERATORS: Array<{ id: MetricOperator; label: string }> = [
  { id: 'greater_than', label: '>' },
  { id: 'greater_than_or_equal', label: '>=' },
  { id: 'less_than', label: '<' },
  { id: 'less_than_or_equal', label: '<=' },
  { id: 'equals', label: '=' }
]

// Available metrics
const METRICS: Array<{ id: CalculatedMetric; label: string; unit?: string }> = [
  // Change metrics (period-over-period)
  { id: 'revenue_change_pct', label: 'Revenue Change', unit: '%' },
  { id: 'req_change_pct', label: 'Request Change', unit: '%' },
  { id: 'ecpm_change_pct', label: 'eCPM Change', unit: '%' },
  { id: 'fill_rate_change_pct', label: 'Fill Rate Change', unit: '%' },

  // Period 1 metrics
  { id: 'revenue_p1', label: 'Revenue (P1)', unit: '$' },
  { id: 'requests_p1', label: 'Requests (P1)' },
  { id: 'ecpm_p1', label: 'eCPM (P1)', unit: '$' },
  { id: 'fill_rate_p1', label: 'Fill Rate (P1)', unit: '%' },
  { id: 'paid_p1', label: 'Paid Impressions (P1)' },

  // Period 2 metrics
  { id: 'revenue_p2', label: 'Revenue (P2)', unit: '$' },
  { id: 'requests_p2', label: 'Requests (P2)' },
  { id: 'ecpm_p2', label: 'eCPM (P2)', unit: '$' },
  { id: 'fill_rate_p2', label: 'Fill Rate (P2)', unit: '%' },
  { id: 'paid_p2', label: 'Paid Impressions (P2)' }
]

// Common field names based on entity
const ENTITY_FIELDS: Record<QueryEntity, string[]> = {
  pid: ['product', 'team', 'pic'],
  mid: ['product', 'pid', 'team'],
  zid: ['product', 'mid', 'pid'],
  team: ['pic', 'pid'],
  pic: ['pid', 'team'],
  product: ['pid', 'mid', 'zid']
}

// Child entities for multi-level queries
const CHILD_ENTITIES: Record<QueryEntity, QueryEntity[]> = {
  team: ['pic', 'pid', 'mid', 'zid'],
  pic: ['pid', 'mid', 'zid'],
  pid: ['mid', 'zid'],
  mid: ['zid'],
  product: ['zid'],
  zid: []
}

export default function VisualQueryBuilder({
  queryConfig,
  onQueryConfigChange,
  onRunQuery,
  isLoading = false
}: VisualQueryBuilderProps) {
  // Add new condition
  const handleAddCondition = () => {
    const newCondition: QueryCondition = {
      id: `cond_${crypto.randomUUID()}`,
      type: 'has',
      field: 'product',
      operator: 'equals',
      value: '',
      logic: 'AND'
    }

    onQueryConfigChange({
      ...queryConfig,
      conditions: [...queryConfig.conditions, newCondition]
    })
  }

  // Remove condition
  const handleRemoveCondition = (id: string) => {
    onQueryConfigChange({
      ...queryConfig,
      conditions: queryConfig.conditions.filter(c => c.id !== id)
    })
  }

  // Update condition
  const handleUpdateCondition = (id: string, updates: Partial<QueryCondition>) => {
    onQueryConfigChange({
      ...queryConfig,
      conditions: queryConfig.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    })
  }

  // Add metric filter
  const handleAddMetricFilter = () => {
    const newFilter: MetricFilter = {
      id: `metric_${crypto.randomUUID()}`,
      metric: 'revenue_change_pct',
      operator: 'greater_than',
      value: 0,
      logic: 'AND'
    }

    onQueryConfigChange({
      ...queryConfig,
      metricFilters: [...queryConfig.metricFilters, newFilter]
    })
  }

  // Remove metric filter
  const handleRemoveMetricFilter = (id: string) => {
    onQueryConfigChange({
      ...queryConfig,
      metricFilters: queryConfig.metricFilters.filter(f => f.id !== id)
    })
  }

  // Update metric filter
  const handleUpdateMetricFilter = (id: string, updates: Partial<MetricFilter>) => {
    onQueryConfigChange({
      ...queryConfig,
      metricFilters: queryConfig.metricFilters.map(f =>
        f.id === id ? { ...f, ...updates } : f
      )
    })
  }

  // Generate human-readable query preview
  const generateQueryPreview = (): string => {
    const entityLabel = ENTITIES.find(e => e.id === queryConfig.entity)?.label || queryConfig.entity

    let preview = `Find ${entityLabel}`

    if (queryConfig.conditions.length > 0) {
      preview += ' where:'
      queryConfig.conditions.forEach((cond, idx) => {
        if (idx > 0) {
          preview += ` ${cond.logic || 'AND'}`
        }
        preview += `\n  - ${CONDITION_TYPES.find(t => t.id === cond.type)?.label || cond.type}`
        if (cond.childEntity) {
          preview += ` ${ENTITIES.find(e => e.id === cond.childEntity)?.label || cond.childEntity}`
        }
        preview += ` with ${cond.field} ${FIELD_OPERATORS.find(o => o.id === cond.operator)?.label || cond.operator} "${cond.value}"`
      })
    }

    if (queryConfig.metricFilters.length > 0) {
      preview += queryConfig.conditions.length > 0 ? '\n\nAnd metric filters:' : ' with metrics:'
      queryConfig.metricFilters.forEach((filter, idx) => {
        if (idx > 0) {
          preview += ` ${filter.logic || 'AND'}`
        }
        const metricInfo = METRICS.find(m => m.id === filter.metric)
        preview += `\n  - ${metricInfo?.label || filter.metric} ${METRIC_OPERATORS.find(o => o.id === filter.operator)?.label || filter.operator} ${filter.value}${metricInfo?.unit || ''}`
      })
    }

    return preview
  }

  return (
    <div className="space-y-4">
      {/* Entity Selector */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
          I want to find:
        </label>
        <Select
          value={queryConfig.entity}
          onValueChange={(value) => onQueryConfigChange({ ...queryConfig, entity: value as QueryEntity })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ENTITIES.map(entity => (
              <SelectItem key={entity.id} value={entity.id}>
                <div>
                  <div className="font-medium">{entity.label}</div>
                  <div className="text-xs text-slate-500">{entity.description}</div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Time Periods Section */}
      <div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
            Time Periods
          </label>
        </div>

        {/* Display periods array (new multi-period format) */}
        {queryConfig.periods && queryConfig.periods.length > 0 ? (
          <div className="space-y-2">
            {queryConfig.periods.map((period, index) => (
              <div
                key={index}
                className="p-3 border rounded-lg bg-blue-50"
                style={{ borderColor: '#93c5fd' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Period {index + 1}
                    </Badge>
                    {period.label && (
                      <span className="text-sm font-medium text-blue-900">{period.label}</span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    {period.start} to {period.end}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Display legacy period1/period2 format */
          queryConfig.period1 || queryConfig.period2 ? (
            <div className="space-y-2">
              {queryConfig.period1 && (
                <div
                  className="p-3 border rounded-lg bg-blue-50"
                  style={{ borderColor: '#93c5fd' }}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Period 1
                    </Badge>
                    <div className="text-sm text-slate-600">
                      {queryConfig.period1.start} to {queryConfig.period1.end}
                    </div>
                  </div>
                </div>
              )}
              {queryConfig.period2 && (
                <div
                  className="p-3 border rounded-lg bg-blue-50"
                  style={{ borderColor: '#93c5fd' }}
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                      Period 2
                    </Badge>
                    <div className="text-sm text-slate-600">
                      {queryConfig.period2.start} to {queryConfig.period2.end}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No periods specified */
            <div className="text-sm text-slate-500 p-4 border-2 border-dashed rounded-lg" style={{ borderColor: '#e5e7eb' }}>
              No time periods specified. Add time context to your natural language query (e.g., "in October 2024", "last 30 days").
            </div>
          )
        )}
      </div>

      <Separator />

      {/* Conditions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium" style={{ color: '#111827' }}>
            Conditions
          </label>
          <Button
            onClick={handleAddCondition}
            size="sm"
            variant="outline"
            style={{ fontSize: '12px' }}
          >
            + Add Condition
          </Button>
        </div>

        {queryConfig.conditions.length === 0 ? (
          <div className="text-sm text-slate-500 p-4 border-2 border-dashed rounded-lg" style={{ borderColor: '#e5e7eb' }}>
            No conditions yet. Click "Add Condition" to filter your results.
          </div>
        ) : (
          <div className="space-y-3">
            {queryConfig.conditions.map((condition, idx) => (
              <Card key={condition.id} className="p-4">
                <div className="space-y-3">
                  {/* Logic connector (AND/OR) */}
                  {idx > 0 && (
                    <div className="flex gap-2 mb-2">
                      <Button
                        size="sm"
                        variant={condition.logic === 'AND' ? 'default' : 'outline'}
                        onClick={() => handleUpdateCondition(condition.id, { logic: 'AND' })}
                        style={{ fontSize: '11px' }}
                      >
                        AND
                      </Button>
                      <Button
                        size="sm"
                        variant={condition.logic === 'OR' ? 'default' : 'outline'}
                        onClick={() => handleUpdateCondition(condition.id, { logic: 'OR' })}
                        style={{ fontSize: '11px' }}
                      >
                        OR
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Condition type */}
                    <div className="col-span-3">
                      <Select
                        value={condition.type}
                        onValueChange={(value) => handleUpdateCondition(condition.id, { type: value as ConditionType })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONDITION_TYPES.map(type => (
                            <SelectItem key={type.id} value={type.id}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Child entity (for multi-level) */}
                    <div className="col-span-2">
                      <Select
                        value={condition.childEntity || 'none'}
                        onValueChange={(value) => handleUpdateCondition(condition.id, { childEntity: value === 'none' ? undefined : value as QueryEntity })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Entity" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          {CHILD_ENTITIES[queryConfig.entity]?.map(entity => (
                            <SelectItem key={entity} value={entity}>
                              {ENTITIES.find(e => e.id === entity)?.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Field */}
                    <div className="col-span-2">
                      <Select
                        value={condition.field}
                        onValueChange={(value) => handleUpdateCondition(condition.id, { field: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ENTITY_FIELDS[queryConfig.entity]?.map(field => (
                            <SelectItem key={field} value={field}>
                              {field}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator */}
                    <div className="col-span-2">
                      <Select
                        value={condition.operator}
                        onValueChange={(value) => handleUpdateCondition(condition.id, { operator: value as FieldOperator })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPERATORS.map(op => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value */}
                    <div className="col-span-2">
                      <Input
                        value={condition.value as string}
                        onChange={(e) => handleUpdateCondition(condition.id, { value: e.target.value })}
                        placeholder="Value"
                      />
                    </div>

                    {/* Remove button */}
                    <div className="col-span-1">
                      <Button
                        onClick={() => handleRemoveCondition(condition.id)}
                        size="sm"
                        variant="ghost"
                        style={{ color: '#ef4444' }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Metric Filters Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-medium" style={{ color: '#111827' }}>
            Metric Filters
          </label>
          <Button
            onClick={handleAddMetricFilter}
            size="sm"
            variant="outline"
            style={{ fontSize: '12px' }}
          >
            + Add Metric Filter
          </Button>
        </div>

        {queryConfig.metricFilters.length === 0 ? (
          <div className="text-sm text-slate-500 p-4 border-2 border-dashed rounded-lg" style={{ borderColor: '#e5e7eb' }}>
            No metric filters. Add filters to find items with specific performance metrics.
          </div>
        ) : (
          <div className="space-y-3">
            {queryConfig.metricFilters.map((filter, idx) => (
              <Card key={filter.id} className="p-4">
                <div className="space-y-3">
                  {/* Logic connector */}
                  {idx > 0 && (
                    <div className="flex gap-2 mb-2">
                      <Button
                        size="sm"
                        variant={filter.logic === 'AND' ? 'default' : 'outline'}
                        onClick={() => handleUpdateMetricFilter(filter.id, { logic: 'AND' })}
                        style={{ fontSize: '11px' }}
                      >
                        AND
                      </Button>
                      <Button
                        size="sm"
                        variant={filter.logic === 'OR' ? 'default' : 'outline'}
                        onClick={() => handleUpdateMetricFilter(filter.id, { logic: 'OR' })}
                        style={{ fontSize: '11px' }}
                      >
                        OR
                      </Button>
                    </div>
                  )}

                  <div className="grid grid-cols-12 gap-2 items-center">
                    {/* Metric selector */}
                    <div className="col-span-5">
                      <Select
                        value={filter.metric}
                        onValueChange={(value) => handleUpdateMetricFilter(filter.id, { metric: value as CalculatedMetric })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METRICS.map(metric => (
                            <SelectItem key={metric.id} value={metric.id}>
                              {metric.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Operator */}
                    <div className="col-span-2">
                      <Select
                        value={filter.operator}
                        onValueChange={(value) => handleUpdateMetricFilter(filter.id, { operator: value as MetricOperator })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {METRIC_OPERATORS.map(op => (
                            <SelectItem key={op.id} value={op.id}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Value */}
                    <div className="col-span-4">
                      <div className="flex gap-1 items-center">
                        <Input
                          type="number"
                          value={filter.value as number}
                          onChange={(e) => handleUpdateMetricFilter(filter.id, { value: parseFloat(e.target.value) || 0 })}
                          placeholder="Value"
                        />
                        <span className="text-xs text-slate-500 min-w-[20px]">
                          {METRICS.find(m => m.id === filter.metric)?.unit || ''}
                        </span>
                      </div>
                    </div>

                    {/* Remove button */}
                    <div className="col-span-1">
                      <Button
                        onClick={() => handleRemoveMetricFilter(filter.id)}
                        size="sm"
                        variant="ghost"
                        style={{ color: '#ef4444' }}
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Query Preview */}
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: '#111827' }}>
          Query Preview
        </label>
        <div
          className="p-4 rounded-lg text-sm whitespace-pre-line font-mono"
          style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', color: '#334155' }}
        >
          {generateQueryPreview()}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button
          onClick={onRunQuery}
          disabled={isLoading}
          style={{ backgroundColor: '#1565C0', color: '#fff' }}
        >
          {isLoading ? 'Running Query...' : 'Run Query'}
        </Button>
        <Button
          onClick={() => onQueryConfigChange({
            entity: 'pid',
            conditions: [],
            metricFilters: [],
            columns: []
          })}
          variant="outline"
        >
          Reset
        </Button>
      </div>
    </div>
  )
}
