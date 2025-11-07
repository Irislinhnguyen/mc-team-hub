'use client'

import { useState, useEffect } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from '../../../src/components/ui/drawer'
import { Button } from '../../../src/components/ui/button'
import { Badge } from '../../../src/components/ui/badge'
import { Label } from '../../../src/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '../../../src/components/ui/toggle-group'
import { Plus, X, Trash2 } from 'lucide-react'
import { colors } from '../../../lib/colors'
import type { SimplifiedFilter, AdvancedFilterClause, FilterField } from '../../../lib/types/performanceTracker'
import { FilterClause } from './FilterClause'

interface SimplifiedFilterModalProps {
  isOpen: boolean
  onClose: () => void
  filter: SimplifiedFilter
  onFilterChange: (filter: SimplifiedFilter) => void
  onApply: () => void
  metadata: any
}

export function SimplifiedFilterModal({
  isOpen,
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
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[85vh] p-0 flex flex-col">
        {/* Header */}
        <DrawerHeader className="px-6 py-4 border-b" style={{ borderColor: colors.border.default }}>
          <div className="flex items-center justify-between">
            <div>
              <DrawerTitle className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                Advanced Filters
              </DrawerTitle>
              <DrawerDescription className="text-sm" style={{ color: colors.text.secondary }}>
                Build conditions with AND/OR logic
              </DrawerDescription>
            </div>

            {enabledClauseCount > 0 && (
              <Badge variant="secondary" className="text-xs px-2 py-0.5">
                {enabledClauseCount} active
              </Badge>
            )}
          </div>
        </DrawerHeader>

        {/* Content */}
        <div className="px-6 py-4">
          <div className="space-y-4">
            {/* Include/Exclude Toggle */}
            <div>
              <Label className="text-sm font-semibold mb-2 block" style={{ color: colors.text.primary }}>
                Filter Mode
              </Label>
              <ToggleGroup type="single" value={workingFilter.includeExclude} onValueChange={handleIncludeExcludeChange} className="grid grid-cols-2 gap-2 p-1 rounded" style={{ backgroundColor: colors.surface.muted }}>
                <ToggleGroupItem
                  value="INCLUDE"
                  className="py-2 text-sm font-medium data-[state=on]:text-white transition-all"
                  style={{ '--state-on-bg': colors.interactive.primary } as any}
                  data-state-on-bg={colors.interactive.primary}
                >
                  Include
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="EXCLUDE"
                  className="py-2 text-sm font-medium data-[state=on]:text-white transition-all"
                  style={{ '--state-on-bg': '#ef4444' } as any}
                >
                  Exclude
                </ToggleGroupItem>
              </ToggleGroup>
              <p className="text-xs mt-1.5" style={{ color: colors.text.secondary }}>
                {workingFilter.includeExclude === 'INCLUDE'
                  ? 'Show records that match conditions'
                  : 'Hide records that match conditions'}
              </p>
            </div>

            {/* AND/OR Toggle - Only show if 2+ clauses */}
            {showLogicToggle && (
              <div>
                <Label className="text-sm font-semibold mb-2 block" style={{ color: colors.text.primary }}>
                  Combine conditions with
                </Label>
                <ToggleGroup type="single" value={workingFilter.clauseLogic} onValueChange={handleLogicChange} className="grid grid-cols-2 gap-2 p-1 rounded" style={{ backgroundColor: colors.surface.muted }}>
                  <ToggleGroupItem
                    value="AND"
                    className="py-2 text-sm font-medium data-[state=on]:text-white transition-all"
                    style={{ '--state-on-bg': colors.interactive.primary } as any}
                  >
                    AND
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="OR"
                    className="py-2 text-sm font-medium data-[state=on]:text-white transition-all"
                    style={{ '--state-on-bg': '#9333ea' } as any}
                  >
                    OR
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

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
                <div className="text-center py-6 px-4 rounded border-2 border-dashed" style={{ borderColor: colors.border.default, backgroundColor: colors.surface.muted }}>
                  <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
                    No conditions yet
                  </p>
                  <p className="text-xs" style={{ color: colors.text.secondary }}>
                    Click "Add Condition" to start
                  </p>
                </div>
              ) : (
                /* Clause List */
                <div className="space-y-4">
                  {workingFilter.clauses.map((clause, index) => (
                    <div key={clause.id}>
                      <FilterClause
                        clause={clause}
                        metadata={metadata}
                        onChange={(updatedClause) => handleClauseChange(clause.id, updatedClause)}
                        onDelete={() => handleClauseDelete(clause.id)}
                      />

                      {/* Logic separator between clauses - only show if 2+ clauses */}
                      {showLogicToggle && index < workingFilter.clauses.length - 1 && (
                        <div className="flex justify-center my-4">
                          <span
                            className="text-sm font-bold px-4 py-2 rounded-full"
                            style={{
                              backgroundColor: workingFilter.clauseLogic === 'AND' ? colors.interactive.primary : '#a855f7',
                              color: 'white'
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
          </div>
        </div>

        {/* Footer */}
        <DrawerFooter className="px-6 py-4 border-t" style={{ borderColor: colors.border.default }}>
          <div className="flex items-center justify-between">
            {/* Left: Status */}
            <div className="text-sm" style={{ color: colors.text.secondary }}>
              {workingFilter.clauses.length} condition{workingFilter.clauses.length !== 1 ? 's' : ''}
              {enabledClauseCount !== workingFilter.clauses.length && (
                <span> ({enabledClauseCount} active)</span>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
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
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  )
}
