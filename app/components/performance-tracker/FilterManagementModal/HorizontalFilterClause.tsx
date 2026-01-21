'use client'

/**
 * HorizontalFilterClause Component - REDESIGNED
 *
 * Dynamic branching system:
 * - Branch 1 (Entity): field + operator + attributeField + condition + value
 * - Branch 2 (Direct): field + operator + value
 *
 * Example Branch 1: zid has product equals video
 * Example Branch 2: pid equals 1234
 */

import { Button } from '@/components/ui/button'
import { Eye, EyeOff, Trash2 } from 'lucide-react'
import { colors } from '../../../../lib/colors'
import type { AdvancedFilterClause, FilterField, FilterOperator } from '../../../../lib/types/performanceTracker'
import { FIELD_OPERATORS, FIELD_DATA_TYPES, OPERATOR_LABELS, isEntityOperator } from '../../../../lib/types/performanceTracker'
import { MultiSelectFilter } from '../MultiSelectFilter'

interface HorizontalFilterClauseProps {
  clause: AdvancedFilterClause
  metadata: any
  onChange: (clause: AdvancedFilterClause) => void
  onDelete: () => void
}

export function HorizontalFilterClause({ clause, metadata, onChange, onDelete }: HorizontalFilterClauseProps) {
  const availableOperators = FIELD_OPERATORS[clause.field] || []
  const isEntity = isEntityOperator(clause.operator)

  // Get options for a field from metadata
  const getFieldOptions = (field: FilterField): string[] => {
    const optionMap: Record<string, any> = {
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
    return rawOptions
      .filter((opt: any) => opt !== null && opt !== undefined)
      .map((opt: any) => {
        // Handle objects with value/label properties
        if (typeof opt === 'object' && opt !== null) {
          return opt.value || opt.label || opt.name || String(opt)
        }
        return typeof opt === 'string' ? opt : String(opt)
      })
  }

  // Get available attribute fields for entity operators
  const getAttributeFields = (): FilterField[] => {
    // All fields can be attributes
    return ['team', 'pic', 'product', 'h5', 'pid', 'mid', 'zid', 'pubname', 'medianame', 'zonename', 'revenue_tier', 'rev_flag']
  }

  // Get available conditions for attribute field
  const getAttributeConditions = (attributeField?: FilterField): FilterOperator[] => {
    if (!attributeField) return ['equals', 'in']
    return FIELD_OPERATORS[attributeField]?.filter(op => !isEntityOperator(op)) || ['equals', 'in']
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
      attributeField: undefined,
      attributeDataType: undefined,
      condition: undefined,
      value: ''
    })
  }

  const handleOperatorChange = (newOperator: FilterOperator) => {
    const isNewOpEntity = isEntityOperator(newOperator)

    onChange({
      ...clause,
      operator: newOperator,
      // If switching to entity operator, set default attribute
      attributeField: isNewOpEntity ? 'product' : undefined,
      attributeDataType: isNewOpEntity ? 'string' : undefined,
      condition: isNewOpEntity ? 'equals' : undefined,
      value: ''
    })
  }

  const handleAttributeFieldChange = (newAttributeField: FilterField) => {
    const newAttributeDataType = FIELD_DATA_TYPES[newAttributeField]
    const availableConditions = getAttributeConditions(newAttributeField)

    onChange({
      ...clause,
      attributeField: newAttributeField,
      attributeDataType: newAttributeDataType,
      condition: availableConditions[0] || 'equals',
      value: ''
    })
  }

  const handleConditionChange = (newCondition: FilterOperator) => {
    onChange({
      ...clause,
      condition: newCondition,
      value: ''
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

  // Determine which condition/operator to use for value input logic
  const effectiveOperator = isEntity ? (clause.condition || 'equals') : clause.operator
  const effectiveDataType = isEntity ? (clause.attributeDataType || 'string') : clause.dataType
  const effectiveField = isEntity ? (clause.attributeField || clause.field) : clause.field

  const fieldOptions = getFieldOptions(effectiveField)
  const fieldOptionsForMultiSelect = fieldOptions.map(opt => ({ label: opt, value: opt }))

  // For entity operators (has_all, has_any, only_has), check both the operator AND condition
  // For direct operators (in), just check the operator
  const needsMultipleValues =
    (isEntity && ['has_all', 'has_any', 'only_has'].includes(clause.operator)) ||
    ['in', 'only_has', 'has_all', 'has_any'].includes(effectiveOperator)

  const needsTwoValues = effectiveOperator === 'between'
  const needsNoValue = ['is_null', 'is_not_null'].includes(effectiveOperator)

  return (
    <div
      className="flex items-center gap-1.5 px-2 py-1.5 rounded transition-all"
      style={{
        backgroundColor: clause.enabled ? '#fff' : colors.surface.muted,
        border: `1px solid ${clause.enabled ? colors.border.default : colors.border.muted}`,
        minHeight: '32px',
        fontSize: '13px'
      }}
    >
      {/* Field Selector */}
      <select
        value={clause.field}
        onChange={(e) => handleFieldChange(e.target.value as FilterField)}
        disabled={!clause.enabled}
        className="w-20 px-1.5 py-1 text-xs rounded font-medium"
        style={{
          border: `1px solid ${colors.border.default}`,
          backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
        }}
      >
        <option value="pid">PID</option>
        <option value="mid">MID</option>
        <option value="zid">ZID</option>
        <option value="team">Team</option>
        <option value="pic">PIC</option>
        <option value="product">Product</option>
        <option value="pubname">Publisher</option>
        <option value="medianame">Media</option>
        <option value="zonename">Zone Name</option>
        <option value="rev_flag">Rev Flag</option>
        <option value="revenue_tier">Tier</option>
        <option value="month">Month</option>
        <option value="year">Year</option>
      </select>

      {/* Operator Selector */}
      <select
        value={clause.operator}
        onChange={(e) => handleOperatorChange(e.target.value as FilterOperator)}
        disabled={!clause.enabled}
        className="w-32 px-2 py-1.5 text-sm rounded font-medium"
        style={{
          border: `1px solid ${colors.border.default}`,
          backgroundColor: clause.enabled ? (isEntity ? colors.status.infoBg : '#fff') : colors.surface.muted,
          color: isEntity ? colors.interactive.primary : 'inherit'
        }}
      >
        {availableOperators.map(op => (
          <option key={op} value={op}>
            {OPERATOR_LABELS[op]}
          </option>
        ))}
      </select>

      {/* Branch 1: Entity operator - show attributeField + condition */}
      {isEntity && (
        <>
          <select
            value={clause.attributeField || 'product'}
            onChange={(e) => handleAttributeFieldChange(e.target.value as FilterField)}
            disabled={!clause.enabled}
            className="w-24 px-2 py-1.5 text-sm rounded"
            style={{
              border: `1px solid ${colors.border.default}`,
              backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
            }}
          >
            {getAttributeFields().map(field => (
              <option key={field} value={field}>
                {field}
              </option>
            ))}
          </select>

          <select
            value={clause.condition || 'equals'}
            onChange={(e) => handleConditionChange(e.target.value as FilterOperator)}
            disabled={!clause.enabled}
            className="w-28 px-2 py-1.5 text-sm rounded"
            style={{
              border: `1px solid ${colors.border.default}`,
              backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
            }}
          >
            {getAttributeConditions(clause.attributeField).map(cond => (
              <option key={cond} value={cond}>
                {OPERATOR_LABELS[cond]}
              </option>
            ))}
          </select>
        </>
      )}

      {/* Value Input */}
      {!needsNoValue && (
        <div className="flex-1 min-w-[180px]">
          {needsMultipleValues && fieldOptions.length > 0 ? (
            <MultiSelectFilter
              label=""
              options={fieldOptionsForMultiSelect}
              value={Array.isArray(clause.value) ? clause.value : clause.value ? [clause.value] : []}
              onChange={handleValueChange}
              compact={true}
              disabled={!clause.enabled}
            />
          ) : needsTwoValues ? (
            <div className="flex gap-1 items-center">
              <input
                type={effectiveDataType === 'number' ? 'number' : 'text'}
                value={Array.isArray(clause.value) ? clause.value[0] || '' : ''}
                onChange={(e) => {
                  const newVal = Array.isArray(clause.value) ? [...clause.value] : ['', '']
                  newVal[0] = effectiveDataType === 'number' ? Number(e.target.value) : e.target.value
                  handleValueChange(newVal)
                }}
                disabled={!clause.enabled}
                placeholder="Min"
                className="flex-1 px-2 py-1.5 text-sm rounded"
                style={{
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
                }}
              />
              <span className="text-xs" style={{ color: colors.text.tertiary }}>-</span>
              <input
                type={effectiveDataType === 'number' ? 'number' : 'text'}
                value={Array.isArray(clause.value) ? clause.value[1] || '' : ''}
                onChange={(e) => {
                  const newVal = Array.isArray(clause.value) ? [...clause.value] : ['', '']
                  newVal[1] = effectiveDataType === 'number' ? Number(e.target.value) : e.target.value
                  handleValueChange(newVal)
                }}
                disabled={!clause.enabled}
                placeholder="Max"
                className="flex-1 px-2 py-1.5 text-sm rounded"
                style={{
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
                }}
              />
            </div>
          ) : fieldOptions.length > 0 && ['equals'].includes(effectiveOperator) ? (
            <select
              value={typeof clause.value === 'string' || typeof clause.value === 'number' ? clause.value : ''}
              onChange={(e) => handleValueChange(e.target.value)}
              disabled={!clause.enabled}
              className="w-full px-2 py-1.5 text-sm rounded"
              style={{
                border: `1px solid ${colors.border.default}`,
                backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
              }}
            >
              <option value="">Select...</option>
              {fieldOptions.map((opt, idx) => (
                <option key={`${opt}-${idx}`} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          ) : (
            <input
              type={effectiveDataType === 'number' ? 'number' : effectiveDataType === 'date' ? 'date' : 'text'}
              value={typeof clause.value === 'string' || typeof clause.value === 'number' ? clause.value : ''}
              onChange={(e) => handleValueChange(effectiveDataType === 'number' ? Number(e.target.value) : e.target.value)}
              disabled={!clause.enabled}
              placeholder="Enter value..."
              className="w-full px-2 py-1.5 text-sm rounded"
              style={{
                border: `1px solid ${colors.border.default}`,
                backgroundColor: clause.enabled ? '#fff' : colors.surface.muted
              }}
            />
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleEnabled}
          className="h-8 w-8 p-0"
          title={clause.enabled ? 'Disable' : 'Enable'}
        >
          {clause.enabled ? (
            <Eye className="h-3.5 w-3.5" style={{ color: colors.text.secondary }} />
          ) : (
            <EyeOff className="h-3.5 w-3.5" style={{ color: colors.text.tertiary }} />
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0 hover:bg-red-50"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5 text-red-600" />
        </Button>
      </div>
    </div>
  )
}
