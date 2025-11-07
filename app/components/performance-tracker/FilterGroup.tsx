'use client'

import { Button } from '../../../src/components/ui/button'
import { Badge } from '../../../src/components/ui/badge'
import { Plus, Trash2, GripVertical } from 'lucide-react'
import { colors } from '../../../lib/colors'
import type { AdvancedFilterGroup, AdvancedFilterClause, FilterField } from '../../../lib/types/performanceTracker'
import { FIELD_DATA_TYPES } from '../../../lib/types/performanceTracker'
import { FilterClause } from './FilterClause'

interface FilterGroupProps {
  group: AdvancedFilterGroup
  metadata: any
  onChange: (group: AdvancedFilterGroup) => void
  onDelete: () => void
}

export function FilterGroup({ group, metadata, onChange, onDelete }: FilterGroupProps) {
  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleAddClause = () => {
    const newClause: AdvancedFilterClause = {
      id: generateId(),
      field: 'pid' as FilterField,  // Default field
      dataType: 'number',
      operator: 'equals',
      value: '',
      enabled: true
    }

    onChange({
      ...group,
      clauses: [...group.clauses, newClause]
    })
  }

  const handleClauseChange = (clauseId: string, updatedClause: AdvancedFilterClause) => {
    const newClauses = group.clauses.map(c =>
      c.id === clauseId ? updatedClause : c
    )

    onChange({
      ...group,
      clauses: newClauses
    })
  }

  const handleClauseDelete = (clauseId: string) => {
    const newClauses = group.clauses.filter(c => c.id !== clauseId)

    onChange({
      ...group,
      clauses: newClauses
    })
  }

  const toggleGroupLogic = () => {
    onChange({
      ...group,
      logic: group.logic === 'AND' ? 'OR' : 'AND'
    })
  }

  const enabledClauseCount = group.clauses.filter(c => c.enabled).length

  return (
    <div
      className="p-4 rounded-lg space-y-3"
      style={{
        backgroundColor: colors.surface.card,
        border: `1px solid ${colors.border.default}`
      }}
    >
      {/* Group Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical size={16} style={{ color: colors.text.tertiary }} />
          <span className="text-sm font-semibold" style={{ color: colors.text.primary }}>
            {group.name || 'Filter Group'}
          </span>
          <Badge
            variant="outline"
            className="cursor-pointer"
            onClick={toggleGroupLogic}
            style={{
              backgroundColor: group.logic === 'AND' ? colors.interactive.primary : colors.data.secondary,
              color: 'white',
              borderColor: 'transparent'
            }}
          >
            {group.logic}
          </Badge>
          {enabledClauseCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {enabledClauseCount} active
            </Badge>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onDelete}
          className="h-8 w-8 p-0"
        >
          <Trash2 size={14} />
        </Button>
      </div>

      {/* Clauses */}
      {group.clauses.length > 0 ? (
        <div className="space-y-2">
          {group.clauses.map((clause, index) => (
            <div key={clause.id}>
              <FilterClause
                clause={clause}
                metadata={metadata}
                onChange={(updatedClause) => handleClauseChange(clause.id, updatedClause)}
                onDelete={() => handleClauseDelete(clause.id)}
              />

              {/* Logic separator between clauses */}
              {index < group.clauses.length - 1 && (
                <div className="flex justify-start ml-4 my-1">
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{
                      backgroundColor: colors.surface.muted,
                      color: colors.text.secondary
                    }}
                  >
                    {group.logic}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-center py-4" style={{ color: colors.text.tertiary }}>
          No conditions yet. Click "Add Condition" to start.
        </div>
      )}

      {/* Add Clause Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAddClause}
        className="w-full gap-2"
      >
        <Plus size={14} />
        Add Condition
      </Button>
    </div>
  )
}
