'use client'

/**
 * FilterFormModal Component
 *
 * Modal for creating or editing advanced filters
 * Features horizontal inline layout like Looker Studio
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Plus } from 'lucide-react'
import { colors } from '../../../../lib/colors'
import type { SimplifiedFilter, AdvancedFilterClause, FilterField } from '../../../../lib/types/performanceTracker'
import { HorizontalFilterClause } from './HorizontalFilterClause'
import { FilterPreview } from './FilterPreview'

interface FilterFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string, filter: SimplifiedFilter) => void
  initialName?: string
  initialFilter?: SimplifiedFilter
  metadata: any
  mode: 'create' | 'edit'
}

export function FilterFormModal({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialFilter,
  metadata,
  mode
}: FilterFormModalProps) {
  const [name, setName] = useState(initialName)
  const [workingFilter, setWorkingFilter] = useState<SimplifiedFilter>(
    initialFilter || {
      includeExclude: 'INCLUDE',
      clauses: [],
      clauseLogic: 'AND'
    }
  )

  // Sync with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(initialName)
      setWorkingFilter(initialFilter || {
        includeExclude: 'INCLUDE',
        clauses: [],
        clauseLogic: 'AND'
      })
    }
  }, [isOpen, initialName, initialFilter])

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

  const handleSave = () => {
    if (!name.trim()) {
      alert('Please enter a filter name')
      return
    }

    onSave(name.trim(), workingFilter)
  }

  const showLogicToggle = workingFilter.clauses.length >= 2

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: colors.border.default }}>
          <DialogTitle className="text-lg font-semibold" style={{ color: colors.text.primary }}>
            {mode === 'create' ? 'Create Advanced Filter' : 'Edit Advanced Filter'}
          </DialogTitle>
          <DialogDescription className="text-sm" style={{ color: colors.text.secondary }}>
            Build filter conditions with horizontal layout
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
          <div className="space-y-4">
            {/* Filter Name */}
            <div>
              <Label className="text-sm font-semibold mb-2 block" style={{ color: colors.text.primary }}>
                Filter Name
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Value PIDs"
                className="w-full"
              />
            </div>

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
            </div>

            {/* Conditions */}
            <div>
              <Label className="text-sm font-semibold mb-2 block" style={{ color: colors.text.primary }}>
                Conditions
              </Label>

              {workingFilter.clauses.length === 0 ? (
                <div
                  className="text-center py-6 px-4 rounded border-2 border-dashed"
                  style={{ borderColor: colors.border.default, backgroundColor: colors.surface.muted }}
                >
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
                    No conditions yet
                  </p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                    Click "Add Condition" below
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {workingFilter.clauses.map((clause, index) => (
                    <div key={clause.id}>
                      <HorizontalFilterClause
                        clause={clause}
                        metadata={metadata}
                        onChange={(updatedClause) => handleClauseChange(clause.id, updatedClause)}
                        onDelete={() => handleClauseDelete(clause.id)}
                      />

                      {/* Logic separator */}
                      {showLogicToggle && index < workingFilter.clauses.length - 1 && (
                        <div className="flex justify-center my-2">
                          <span
                            className="text-xs font-bold px-3 py-1 rounded-full text-white"
                            style={{ backgroundColor: colors.interactive.primary }}
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

            {/* Preview */}
            <div>
              <Label className="text-sm font-semibold mb-2 block" style={{ color: colors.text.primary }}>
                Preview
              </Label>
              <FilterPreview filter={workingFilter} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-2" style={{ borderColor: colors.border.default }}>
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
            onClick={handleSave}
            disabled={!name.trim() || workingFilter.clauses.length === 0}
            className="px-4 h-9 text-white"
            style={{ backgroundColor: colors.interactive.primary }}
          >
            {mode === 'create' ? 'Save Filter' : 'Update Filter'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
