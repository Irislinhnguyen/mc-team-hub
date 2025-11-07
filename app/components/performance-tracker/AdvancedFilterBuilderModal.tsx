'use client'

/**
 * Advanced Filter Builder Modal - Looker Studio Style
 *
 * Opens as a popup/modal for building complex filters
 * Filters can be saved and reused later
 */

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../src/components/ui/dialog'
import { Button } from '../../../src/components/ui/button'
import { Badge } from '../../../src/components/ui/badge'
import { Input } from '../../../src/components/ui/input'
import { Label } from '../../../src/components/ui/label'
import { Textarea } from '../../../src/components/ui/textarea'
import {
  Plus, Save, FolderOpen, X, Trash2, Sparkles
} from 'lucide-react'
import { colors } from '../../../lib/colors'
import type { AdvancedFilters, AdvancedFilterGroup, FilterField } from '../../../lib/types/performanceTracker'
import { FilterGroup } from './FilterGroup'
import { useToast } from '../../../hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../src/components/ui/select'

interface AdvancedFilterBuilderModalProps {
  isOpen: boolean
  onClose: () => void
  advancedFilters: AdvancedFilters
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void
  onApply: () => void
  metadata: any
}

// Type for saved advanced filters (stored in localStorage for now)
interface SavedAdvancedFilter {
  id: string
  name: string
  description?: string
  filters: AdvancedFilters
  createdAt: string
}

const STORAGE_KEY = 'saved_advanced_filters'

export function AdvancedFilterBuilderModal({
  isOpen,
  onClose,
  advancedFilters,
  onAdvancedFiltersChange,
  onApply,
  metadata
}: AdvancedFilterBuilderModalProps) {
  const [workingFilters, setWorkingFilters] = useState<AdvancedFilters>(advancedFilters)
  const [savedFilters, setSavedFilters] = useState<SavedAdvancedFilter[]>([])
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [filterName, setFilterName] = useState('')
  const [filterDescription, setFilterDescription] = useState('')
  const [selectedSavedFilter, setSelectedSavedFilter] = useState<string>('')
  const { toast } = useToast()

  // Load saved filters from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setSavedFilters(JSON.parse(stored))
      } catch (e) {
        console.error('Failed to load saved filters:', e)
      }
    }
  }, [])

  // Sync working filters with prop when dialog opens
  useEffect(() => {
    if (isOpen) {
      setWorkingFilters(advancedFilters)
    }
  }, [isOpen, advancedFilters])

  const generateId = () => Math.random().toString(36).substring(2, 9)

  const handleAddGroup = () => {
    const newGroup: AdvancedFilterGroup = {
      id: generateId(),
      logic: 'AND',
      clauses: []
    }

    setWorkingFilters({
      ...workingFilters,
      groups: [...workingFilters.groups, newGroup]
    })
  }

  const handleGroupChange = (groupId: string, updatedGroup: AdvancedFilterGroup) => {
    const newGroups = workingFilters.groups.map(g =>
      g.id === groupId ? updatedGroup : g
    )

    setWorkingFilters({
      ...workingFilters,
      groups: newGroups
    })
  }

  const handleGroupDelete = (groupId: string) => {
    const newGroups = workingFilters.groups.filter(g => g.id !== groupId)

    setWorkingFilters({
      ...workingFilters,
      groups: newGroups
    })
  }

  const toggleGroupLogic = () => {
    setWorkingFilters({
      ...workingFilters,
      groupLogic: workingFilters.groupLogic === 'AND' ? 'OR' : 'AND'
    })
  }

  const handleSaveFilter = () => {
    if (!filterName.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for this filter',
        variant: 'destructive'
      })
      return
    }

    const newSavedFilter: SavedAdvancedFilter = {
      id: generateId(),
      name: filterName.trim(),
      description: filterDescription.trim() || undefined,
      filters: workingFilters,
      createdAt: new Date().toISOString()
    }

    const updated = [...savedFilters, newSavedFilter]
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    toast({
      title: 'Filter saved',
      description: `"${filterName}" has been saved and can be reused later.`
    })

    setFilterName('')
    setFilterDescription('')
    setShowSaveDialog(false)
  }

  const handleLoadFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId)
    if (filter) {
      setWorkingFilters(filter.filters)
      setSelectedSavedFilter(filterId)

      toast({
        title: 'Filter loaded',
        description: `Loaded "${filter.name}"`
      })
    }
  }

  const handleDeleteSavedFilter = (filterId: string) => {
    const filter = savedFilters.find(f => f.id === filterId)
    const updated = savedFilters.filter(f => f.id !== filterId)
    setSavedFilters(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))

    toast({
      title: 'Filter deleted',
      description: `"${filter?.name}" has been deleted.`
    })

    if (selectedSavedFilter === filterId) {
      setSelectedSavedFilter('')
    }
  }

  const handleClearAll = () => {
    setWorkingFilters({
      groups: [],
      groupLogic: 'AND'
    })
    setSelectedSavedFilter('')
  }

  const handleApply = () => {
    onAdvancedFiltersChange(workingFilters)
    onApply()
    onClose()

    toast({
      title: 'Filters applied',
      description: 'Advanced filters have been applied to your analysis.'
    })
  }

  const handleCancel = () => {
    // Reset to original filters
    setWorkingFilters(advancedFilters)
    setSelectedSavedFilter('')
    onClose()
  }

  const activeClauseCount = workingFilters.groups.reduce(
    (count, group) => count + group.clauses.filter(c => c.enabled).length,
    0
  )

  // Template loaders
  const loadTemplate = (templateId: string) => {
    let newFilters: AdvancedFilters

    switch (templateId) {
      case 'high_revenue':
        newFilters = {
          groups: [{
            id: generateId(),
            name: 'High Revenue',
            logic: 'AND',
            clauses: [{
              id: generateId(),
              field: 'pid' as FilterField,
              dataType: 'number',
              operator: 'greater_than',
              value: 20000,
              enabled: true
            }]
          }],
          groupLogic: 'AND'
        }
        break

      case 'product_exclusion':
        newFilters = {
          groups: [{
            id: generateId(),
            name: 'Using Product A',
            logic: 'AND',
            clauses: [{
              id: generateId(),
              field: 'product' as FilterField,
              dataType: 'string',
              operator: 'equals',
              value: 'Native',
              enabled: true
            }]
          }, {
            id: generateId(),
            name: 'Not using Product B',
            logic: 'AND',
            clauses: [{
              id: generateId(),
              field: 'product' as FilterField,
              dataType: 'string',
              operator: 'not_equals',
              value: 'FB',
              enabled: true
            }]
          }],
          groupLogic: 'AND'
        }
        break

      default:
        return
    }

    setWorkingFilters(newFilters)
    setSelectedSavedFilter('')
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={20} style={{ color: colors.interactive.primary }} />
            Advanced Filter Builder
            {activeClauseCount > 0 && (
              <Badge variant="secondary">
                {activeClauseCount} condition{activeClauseCount > 1 ? 's' : ''}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Build complex filters with AND/OR logic. Save filters to reuse them later.
          </DialogDescription>
        </DialogHeader>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b">
          {/* Load Saved Filter */}
          <div className="flex items-center gap-2">
            <Label className="text-xs whitespace-nowrap">Saved Filters:</Label>
            <Select value={selectedSavedFilter} onValueChange={handleLoadFilter}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Load a saved filter..." />
              </SelectTrigger>
              <SelectContent>
                {savedFilters.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground text-center">
                    No saved filters yet
                  </div>
                ) : (
                  savedFilters.map(filter => (
                    <SelectItem key={filter.id} value={filter.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{filter.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSavedFilter(filter.id)
                          }}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(!showSaveDialog)}
              disabled={workingFilters.groups.length === 0}
            >
              <Save size={14} className="mr-1" />
              Save Filter
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={workingFilters.groups.length === 0}
            >
              <X size={14} className="mr-1" />
              Clear All
            </Button>
          </div>
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-4 rounded-lg border space-y-3" style={{ backgroundColor: colors.surface.card }}>
            <Label>Save this filter for later use</Label>
            <div className="space-y-2">
              <Input
                placeholder="Filter name (e.g., 'High Value Publishers')"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              />
              <Textarea
                placeholder="Description (optional)"
                value={filterDescription}
                onChange={(e) => setFilterDescription(e.target.value)}
                rows={2}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveFilter}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSaveDialog(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Templates (show only when empty) */}
        {workingFilters.groups.length === 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Quick Templates:</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTemplate('high_revenue')}
              >
                High Revenue (&gt; $20k)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadTemplate('product_exclusion')}
              >
                Product Exclusion
              </Button>
            </div>
          </div>
        )}

        {/* Filter Groups */}
        <div className="space-y-4">
          {workingFilters.groups.map((group, index) => (
            <div key={group.id}>
              <FilterGroup
                group={group}
                metadata={metadata}
                onChange={(updatedGroup) => handleGroupChange(group.id, updatedGroup)}
                onDelete={() => handleGroupDelete(group.id)}
              />

              {/* Group Logic Toggle (between groups) */}
              {index < workingFilters.groups.length - 1 && (
                <div className="flex justify-center my-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleGroupLogic}
                    className="px-6 font-semibold"
                    style={{
                      backgroundColor: colors.surface.muted,
                      borderColor: colors.border.default
                    }}
                  >
                    {workingFilters.groupLogic}
                  </Button>
                </div>
              )}
            </div>
          ))}

          {/* Add Group Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddGroup}
            className="w-full gap-2"
          >
            <Plus size={16} />
            Add Filter Group
          </Button>
        </div>

        {/* Help Text */}
        {workingFilters.groups.length > 0 && (
          <div className="text-xs p-3 rounded" style={{
            backgroundColor: colors.surface.muted,
            color: colors.text.secondary
          }}>
            <strong>How it works:</strong> Within each group, conditions are combined with AND/OR logic.
            Groups are combined with {workingFilters.groupLogic} logic.
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={workingFilters.groups.length === 0 || activeClauseCount === 0}
          >
            Apply Filters
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
