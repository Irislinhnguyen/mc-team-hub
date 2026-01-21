'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { colors } from '../../../lib/colors'
import type { SimplifiedFilter, AdvancedFilterClause, FilterField } from '../../../lib/types/performanceTracker'
import { HorizontalFilterClause } from './FilterManagementModal/HorizontalFilterClause'

interface SimplifiedFilterModalProps {
  open: boolean
  onClose: () => void
  filter: SimplifiedFilter
  onFilterChange: (filter: SimplifiedFilter) => void
  onApply: () => void
  metadata: any
}

export function SimplifiedFilterModal({
  open,
  onClose,
  filter,
  onFilterChange,
  onApply,
  metadata
}: SimplifiedFilterModalProps) {
  const [workingFilter, setWorkingFilter] = useState<SimplifiedFilter>(filter)

  // Sync with parent when filter changes
  useEffect(() => {
    setWorkingFilter(filter)
  }, [filter])

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleAddClause = () => {
    const newClause: AdvancedFilterClause = {
      id: generateId(),
      field: 'pid' as FilterField,
      dataType: 'number',
      operator: 'equals',
      value: '',
      enabled: true
    }

    setWorkingFilter({
      ...workingFilter,
      clauses: [...workingFilter.clauses, newClause]
    })
  }

  const handleClauseChange = (clauseId: string, updatedClause: AdvancedFilterClause) => {
    const newClauses = workingFilter.clauses.map(c =>
      c.id === clauseId ? updatedClause : c
    )

    setWorkingFilter({
      ...workingFilter,
      clauses: newClauses
    })
  }

  const handleClauseDelete = (clauseId: string) => {
    const newClauses = workingFilter.clauses.filter(c => c.id !== clauseId)

    setWorkingFilter({
      ...workingFilter,
      clauses: newClauses
    })
  }

  const handleIncludeExcludeChange = (value: string) => {
    if (value === 'INCLUDE' || value === 'EXCLUDE') {
      setWorkingFilter({
        ...workingFilter,
        includeExclude: value
      })
    }
  }

  const handleLogicChange = (value: string) => {
    if (value === 'AND' || value === 'OR') {
      setWorkingFilter({
        ...workingFilter,
        clauseLogic: value
      })
    }
  }

  const handleClearAll = () => {
    setWorkingFilter({
      ...workingFilter,
      clauses: []
    })
  }

  const handleApply = () => {
    onFilterChange(workingFilter)
    onApply()
    onClose()
  }

  const enabledClauseCount = workingFilter.clauses.filter(c => c.enabled).length
  const showLogicToggle = workingFilter.clauses.length >= 2

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: colors.border.default }}>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                Advanced Filters
              </DialogTitle>
              <DialogDescription className="text-sm" style={{ color: colors.text.secondary }}>
                Build filter conditions with horizontal layout
              </DialogDescription>
            </div>

            {enabledClauseCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {enabledClauseCount} active
              </Badge>
            )}
          </div>
        </DialogHeader>

        {/* Content - with scroll */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="space-y-4">
            {/* Include/Exclude Dropdown - Compact version */}
            <div className="flex items-center gap-3">
              <Label className="text-sm font-medium" style={{ color: colors.text.primary }}>
                Mode:
              </Label>
              <select
                value={workingFilter.includeExclude}
                onChange={(e) => handleIncludeExcludeChange(e.target.value)}
                className="px-3 py-1.5 text-sm rounded font-medium"
                style={{
                  border: `1px solid ${colors.border.default}`,
                  backgroundColor: workingFilter.includeExclude === 'INCLUDE' ? colors.interactive.primary : '#ef4444',
                  color: 'white'
                }}
              >
                <option value="INCLUDE">Include</option>
                <option value="EXCLUDE">Exclude</option>
              </select>
              <span className="text-xs" style={{ color: colors.text.secondary }}>
                {workingFilter.includeExclude === 'INCLUDE'
                  ? 'Show records that match conditions'
                  : 'Hide records that match conditions'}
              </span>
            </div>

            {/* Conditions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                  Conditions
                </Label>
                {workingFilter.clauses.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAll}
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-3 w-3 mr-1" />
                    Clear All
                  </Button>
                )}
              </div>

              {workingFilter.clauses.length === 0 ? (
                /* Empty State */
                <div
                  className="text-center py-6 px-4 rounded border-2 border-dashed"
                  style={{ borderColor: colors.border.default, backgroundColor: colors.surface.muted }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
                    No conditions yet
                  </p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                    Click "Add Condition" to start
                  </p>
                </div>
              ) : (
                /* Clause List - Horizontal layout */
                <div className="space-y-2">
                  {workingFilter.clauses.map((clause, index) => (
                    <div key={clause.id}>
                      <HorizontalFilterClause
                        clause={clause}
                        metadata={metadata}
                        onChange={(updatedClause) => handleClauseChange(clause.id, updatedClause)}
                        onDelete={() => handleClauseDelete(clause.id)}
                      />

                      {/* Logic separator between clauses - only show if 2+ clauses */}
                      {showLogicToggle && index < workingFilter.clauses.length - 1 && (
                        <div className="flex justify-center my-2">
                          <span
                            className="text-xs font-bold px-3 py-1 rounded-full text-white"
                            style={{
                              backgroundColor: workingFilter.clauseLogic === 'AND' ? colors.interactive.primary : '#a855f7'
                            }}
                          >
                            {workingFilter.clauseLogic}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Add Condition Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddClause}
                className="w-full mt-3 h-9 text-sm border-dashed hover:border-solid"
                style={{ borderColor: colors.border.default }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Condition
              </Button>
            </div>

            {/* AND/OR Dropdown - Only show if 2+ clauses */}
            {showLogicToggle && (
              <div className="flex items-center gap-3">
                <Label className="text-sm font-medium" style={{ color: colors.text.primary }}>
                  Combine conditions with:
                </Label>
                <select
                  value={workingFilter.clauseLogic}
                  onChange={(e) => handleLogicChange(e.target.value)}
                  className="px-3 py-1.5 text-sm rounded font-medium"
                  style={{
                    border: `1px solid ${colors.border.default}`,
                    backgroundColor: workingFilter.clauseLogic === 'AND' ? colors.interactive.primary : '#9333ea',
                    color: 'white'
                  }}
                >
                  <option value="AND">AND</option>
                  <option value="OR">OR</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: colors.border.default }}>
          {/* Left: Status */}
          <div className="text-sm mr-auto" style={{ color: colors.text.secondary }}>
            {workingFilter.clauses.length} condition{workingFilter.clauses.length !== 1 ? 's' : ''}
            {enabledClauseCount !== workingFilter.clauses.length && (
              <span> ({enabledClauseCount} active)</span>
            )}
          </div>

          {/* Right: Actions */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="px-4 h-9"
          >
            Cancel
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={workingFilter.clauses.length === 0}
            className="px-4 h-9 text-white"
            style={{ backgroundColor: colors.interactive.primary }}
          >
            Apply
            {enabledClauseCount > 0 && ` (${enabledClauseCount})`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
