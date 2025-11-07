'use client'

import { useState } from 'react'
import { Button } from '../../../src/components/ui/button'
import { Label } from '../../../src/components/ui/label'
import { Trash2, Eye, EyeOff } from 'lucide-react'
import { colors } from '../../../lib/colors'
import type { AdvancedFilterClause, FilterField, FilterOperator } from '../../../lib/types/performanceTracker'
import { FIELD_OPERATORS, FIELD_DATA_TYPES, OPERATOR_LABELS } from '../../../lib/types/performanceTracker'
import { MultiSelectFilter } from './MultiSelectFilter'

interface FilterClauseProps {
  clause: AdvancedFilterClause
  metadata: any
  onChange: (clause: AdvancedFilterClause) => void
  onDelete: () => void
}

export function FilterClause({ clause, metadata, onChange, onDelete }: FilterClauseProps) {
  const availableOperators = FIELD_OPERATORS[clause.field] || []

  // Validate clause value
  const validateValue = (): { isValid: boolean; errorMessage?: string } => {
    if (!clause.enabled) return { isValid: true }

    // No validation needed for null checks
    if (['is_null', 'is_not_null'].includes(clause.operator)) {
      return { isValid: true }
    }

    // Check for empty value
    if (clause.value === '' || clause.value === null || clause.value === undefined) {
      return { isValid: false, errorMessage: 'Value required' }
    }

    // Validate multi-value operators
    if (['in', 'not_in'].includes(clause.operator)) {
      if (!Array.isArray(clause.value) || clause.value.length === 0) {
        return { isValid: false, errorMessage: 'At least one value required' }
      }
    }

    // Validate between operator
    if (clause.operator === 'between') {
      if (!Array.isArray(clause.value) || clause.value.length !== 2) {
        return { isValid: false, errorMessage: 'Two values required' }
      }
      if (clause.value[0] === '' || clause.value[1] === '') {
        return { isValid: false, errorMessage: 'Both min and max required' }
      }
      if (clause.dataType === 'number') {
        const min = Number(clause.value[0])
        const max = Number(clause.value[1])
        if (min > max) {
          return { isValid: false, errorMessage: 'Min must be less than max' }
        }
      }
    }

    return { isValid: true }
  }

  const validation = validateValue()

  // Get options for the selected field from metadata
  const getFieldOptions = (field: FilterField): string[] => {
    const optionMap: Record<string, string[]> = {
      team: metadata?.teams || [],
      pic: metadata?.pics || [],
      product: metadata?.products || [],
      pid: metadata?.pids || [],
      mid: metadata?.mids || [],
      zid: metadata?.zids || [],
      pubname: metadata?.pubnames || [],
      medianame: metadata?.medianames || [],
      zonename: metadata?.zonenames || [],
      rev_flag: metadata?.rev_flags || [],
      revenue_tier: metadata?.revenue_tiers || [],
      month: metadata?.months || [],
      year: metadata?.years || []
    }

    const rawOptions = optionMap[field] || []

    // Filter out non-string values and convert to strings
    return rawOptions
      .filter(opt => opt !== null && opt !== undefined)
      .map(opt => typeof opt === 'string' ? opt : String(opt))
  }

  const handleFieldChange = (newField: FilterField) => {
    const newDataType = FIELD_DATA_TYPES[newField]
    const newOperators = FIELD_OPERATORS[newField]
    const defaultOperator = newOperators[0] || 'equals'

    onChange({
      ...clause,
      field: newField,
      dataType: newDataType,
      operator: defaultOperator,
      value: ''
    })
  }

  const handleOperatorChange = (newOperator: FilterOperator) => {
    // Reset value when changing operator
    let newValue = clause.value

    // If switching to/from multi-value operators, adjust value type
    if (['in', 'not_in', 'between'].includes(newOperator)) {
      if (!Array.isArray(newValue)) {
        newValue = newValue ? [newValue] : []
      }
    } else if (Array.isArray(newValue)) {
      newValue = newValue[0] || ''
    }

    onChange({
      ...clause,
      operator: newOperator,
      value: newValue
    })
  }

  const handleValueChange = (newValue: any) => {
    onChange({
      ...clause,
      value: newValue
    })
  }

  const toggleEnabled = () => {
    onChange({
      ...clause,
      enabled: !clause.enabled
    })
  }

  const needsMultipleValues = ['in', 'not_in'].includes(clause.operator)
  const needsTwoValues = clause.operator === 'between'
  const needsNoValue = ['is_null', 'is_not_null'].includes(clause.operator)
  const fieldOptions = getFieldOptions(clause.field)

  return (
    <div>
      <div
        className={`space-y-4 p-5 rounded-lg ${clause.enabled ? '' : 'opacity-50'}`}
        style={{
          backgroundColor: clause.enabled ? 'white' : colors.surface.muted,
          border: `1px solid ${
            clause.enabled && !validation.isValid
              ? '#ef4444'  // Red border for validation errors
              : clause.enabled
              ? colors.border.default
              : colors.border.muted
          }`
        }}
      >
      {/* Field Selector */}
      <div>
        <Label className="text-sm font-medium mb-2 block" style={{ color: clause.enabled ? colors.text.primary : colors.text.tertiary }}>
          Field
        </Label>
        <select
          value={clause.field}
          onChange={(e) => handleFieldChange(e.target.value as FilterField)}
          disabled={!clause.enabled}
          className="w-full px-3 py-2.5 text-base rounded"
          style={{
            border: `1px solid ${colors.border.default}`,
            backgroundColor: clause.enabled ? 'white' : colors.surface.muted
          }}
        >
          <option value="team">Team</option>
          <option value="pic">PIC</option>
          <option value="product">Product</option>
          <option value="pid">PID</option>
          <option value="mid">MID</option>
          <option value="zid">Zone ID</option>
          <option value="pubname">Publisher Name</option>
          <option value="medianame">Media Name</option>
          <option value="zonename">Zone Name</option>
          <option value="rev_flag">Rev Flag</option>
          <option value="revenue_tier">Revenue Tier</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </select>
      </div>

      {/* Operator Selector */}
      <div>
        <Label className="text-sm font-medium mb-2 block" style={{ color: clause.enabled ? colors.text.primary : colors.text.tertiary }}>
          Operator
        </Label>
        <select
          value={clause.operator}
          onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
          disabled={!clause.enabled}
          className="w-full px-3 py-2.5 text-base rounded"
          style={{
            border: `1px solid ${colors.border.default}`,
            backgroundColor: clause.enabled ? 'white' : colors.surface.muted
          }}
        >
          {availableOperators.map(op => (
            <option key={op} value={op}>
              {OPERATOR_LABELS[op]}
            </option>
          ))}
        </select>
      </div>

      {/* Value Input */}
      {!needsNoValue && (
        <div>
          <Label className="text-sm font-medium mb-2 block" style={{ color: clause.enabled ? colors.text.primary : colors.text.tertiary }}>
            Value
          </Label>
          {needsMultipleValues && fieldOptions.length > 0 ? (
            // Multi-select dropdown for fields with options
            <MultiSelectFilter
              label=""
              options={fieldOptions.map(opt => ({ label: opt, value: opt }))}
              value={Array.isArray(clause.value) ? clause.value : clause.value ? [clause.value] : []}
              onChange={handleValueChange}
              compact={false}
              disabled={!clause.enabled}
            />
          ) : needsTwoValues ? (
            // Two inputs for "between" operator
            <div className="flex gap-2 items-center">
              <input
                type={clause.dataType === 'number' ? 'number' : 'text'}
                value={Array.isArray(clause.value) ? clause.value[0] || '' : ''}
                onChange={(e) => {
                  const newVal = Array.isArray(clause.value) ? [...clause.value] : ['', '']
                  newVal[0] = clause.dataType === 'number' ? Number(e.target.value) : e.target.value
                  handleValueChange(newVal)
                }}
                disabled={!clause.enabled}
                placeholder="Min"
                className="flex-1 px-3 py-2.5 text-base rounded"
                style={{
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: clause.enabled ? 'white' : colors.surface.muted
                }}
              />
              <span className="text-sm font-medium" style={{ color: colors.text.secondary }}>and</span>
              <input
                type={clause.dataType === 'number' ? 'number' : 'text'}
                value={Array.isArray(clause.value) ? clause.value[1] || '' : ''}
                onChange={(e) => {
                  const newVal = Array.isArray(clause.value) ? [...clause.value] : ['', '']
                  newVal[1] = clause.dataType === 'number' ? Number(e.target.value) : e.target.value
                  handleValueChange(newVal)
                }}
                disabled={!clause.enabled}
                placeholder="Max"
                className="flex-1 px-3 py-2.5 text-base rounded"
                style={{
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: clause.enabled ? 'white' : colors.surface.muted
                }}
              />
            </div>
          ) : fieldOptions.length > 0 && ['equals', 'not_equals'].includes(clause.operator) ? (
            // Dropdown for fields with options
            <select
              value={typeof clause.value === 'string' || typeof clause.value === 'number' ? clause.value : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              disabled={!clause.enabled}
              className="w-full px-3 py-2.5 text-base rounded"
              style={{
                border: `1px solid ${colors.border.default}`,
                backgroundColor: clause.enabled ? 'white' : colors.surface.muted
              }}
            >
              <option value="">Select value...</option>
              {fieldOptions.map((opt, idx) => (
                <option key={`${opt}-${idx}`} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            // Text/number input for other cases
            <input
              type={clause.dataType === 'number' ? 'number' : clause.dataType === 'date' ? 'date' : 'text'}
              value={typeof clause.value === 'string' || typeof clause.value === 'number' ? clause.value : ''}
              onChange={(e) => handleValueChange(clause.dataType === 'number' ? Number(e.target.value) : e.target.value)}
              disabled={!clause.enabled}
              placeholder="Enter value..."
              className="w-full px-3 py-2.5 text-base rounded"
              style={{
                border: `1px solid ${colors.border.default}`,
                backgroundColor: clause.enabled ? 'white' : colors.surface.muted
              }}
            />
          )}
        </div>
      )}

      {/* Actions Row */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: colors.border.default }}>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleEnabled}
          className="text-sm"
        >
          {clause.enabled ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
          {clause.enabled ? 'Enabled' : 'Disabled'}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="text-sm text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Delete
        </Button>
      </div>
    </div>

    {/* Validation Error Message */}
    {clause.enabled && !validation.isValid && (
      <div className="mt-2 text-sm px-4 py-2 rounded" style={{
        color: '#ef4444',
        backgroundColor: '#fef2f2'
      }}>
        {validation.errorMessage}
      </div>
    )}
    </div>
  )
}
