'use client'

/**
 * FilterManagementModal Component
 *
 * Main modal for managing advanced filters
 * Features: List saved filters, create new, edit, delete, load selected
 */

import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../../src/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../../../src/components/ui/alert-dialog'
import { Button } from '../../../../src/components/ui/button'
import { Plus } from 'lucide-react'
import { colors } from '../../../../lib/colors'
import { useFilterPresets } from '../../../../lib/hooks/useFilterPresets'
import type { FilterPreset } from '../../../../lib/types/filterPreset'
import type { SimplifiedFilter } from '../../../../lib/types/performanceTracker'
import type { AnalyticsPage } from '../../../../lib/types/filterPreset'
import { FilterListView } from './FilterListView'
import { FilterFormModal } from './FilterFormModal'
import { useToast } from '../../../../hooks/use-toast'

/**
 * Merge multiple SimplifiedFilters into one with AND logic
 * All clauses from all filters are combined
 */
function mergeFilters(filters: SimplifiedFilter[]): SimplifiedFilter {
  if (filters.length === 0) {
    return {
      includeExclude: 'INCLUDE',
      clauses: [],
      clauseLogic: 'AND'
    }
  }

  if (filters.length === 1) {
    return filters[0]
  }

  // Combine all clauses from all filters
  const allClauses = filters.flatMap(filter => filter.clauses)

  // Use AND logic to combine (user selected this)
  // Use INCLUDE as default (if filters have mixed INCLUDE/EXCLUDE, we wrap them properly)
  return {
    includeExclude: 'INCLUDE',
    clauses: allClauses,
    clauseLogic: 'AND'
  }
}

interface FilterManagementModalProps {
  isOpen: boolean
  onClose: () => void
  onLoadFilter: (filter: SimplifiedFilter, filterNames?: string[]) => void
  page: AnalyticsPage
  metadata: any
  currentLoadedFilterNames?: string[]  // Currently loaded filters (to show as selected)
}

export function FilterManagementModal({
  isOpen,
  onClose,
  onLoadFilter,
  page,
  metadata,
  currentLoadedFilterNames
}: FilterManagementModalProps) {
  const { toast } = useToast()
  const {
    ownPresets,
    isLoading,
    createPreset,
    updatePreset,
    deletePreset,
    refetch
  } = useFilterPresets({ page })

  // Filter to only show advanced filters
  const advancedFilters = useMemo(
    () => ownPresets.filter(p => p.filter_type === 'advanced'),
    [ownPresets]
  )

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showFormModal, setShowFormModal] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [editingPreset, setEditingPreset] = useState<FilterPreset | null>(null)
  const [deleteConfirmPreset, setDeleteConfirmPreset] = useState<FilterPreset | null>(null)

  // Sync selection with currently loaded filters
  useEffect(() => {
    if (isOpen && currentLoadedFilterNames && currentLoadedFilterNames.length > 0) {
      // Find filter IDs by names
      const loadedIds = advancedFilters
        .filter(p => currentLoadedFilterNames.includes(p.name))
        .map(p => p.id)
      setSelectedIds(loadedIds)
    } else if (isOpen) {
      // No loaded filters - clear selection
      setSelectedIds([])
    }
  }, [isOpen, currentLoadedFilterNames, advancedFilters])

  const handleCreateNew = () => {
    setFormMode('create')
    setEditingPreset(null)
    setShowFormModal(true)
  }

  const handleEdit = (preset: FilterPreset) => {
    setFormMode('edit')
    setEditingPreset(preset)
    setShowFormModal(true)
  }

  const handleDeleteClick = (preset: FilterPreset) => {
    setDeleteConfirmPreset(preset)
  }

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmPreset) return

    try {
      await deletePreset(deleteConfirmPreset.id)

      // Clear selection if deleted filter was selected
      if (selectedIds.includes(deleteConfirmPreset.id)) {
        setSelectedIds(selectedIds.filter(id => id !== deleteConfirmPreset.id))
      }

      setDeleteConfirmPreset(null)

      // Refetch to ensure UI is in sync
      await refetch()

      toast({
        title: 'Filter deleted',
        description: `"${deleteConfirmPreset.name}" has been deleted`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete filter',
        variant: 'destructive'
      })
    }
  }

  const handleSaveFilter = async (name: string, filter: SimplifiedFilter) => {
    try {
      if (formMode === 'create') {
        await createPreset({
          name,
          page,
          filters: {},
          cross_filters: [],
          simplified_filter: filter,
          filter_type: 'advanced'
        })
      } else if (editingPreset) {
        await updatePreset(editingPreset.id, {
          name,
          simplified_filter: filter
        })
      }

      setShowFormModal(false)

      // Refetch to ensure UI is in sync
      await refetch()

      toast({
        title: formMode === 'create' ? 'Filter created' : 'Filter updated',
        description: formMode === 'create' ? `"${name}" has been saved` : `"${name}" has been updated`
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${formMode} filter`,
        variant: 'destructive'
      })
    }
  }

  const handleLoadSelected = useCallback(() => {
    if (selectedIds.length === 0) return

    // Get all selected presets
    const selectedPresets = advancedFilters.filter(p => selectedIds.includes(p.id))
    const validFilters = selectedPresets
      .map(p => p.simplified_filter)
      .filter((f): f is SimplifiedFilter => f !== null && f !== undefined)

    if (validFilters.length === 0) return

    // Merge filters with AND logic
    const mergedFilter = mergeFilters(validFilters)

    // Pass filter names to parent
    const filterNames = selectedPresets.map(p => p.name)
    onLoadFilter(mergedFilter, filterNames)
    onClose()

    toast({
      title: selectedIds.length === 1 ? 'Filter loaded' : 'Filters merged and loaded',
      description: selectedIds.length === 1
        ? `"${selectedPresets[0].name}" has been loaded. Click "Analyze" to apply.`
        : `${selectedIds.length} filters merged with AND logic. Click "Analyze" to apply.`
    })
  }, [selectedIds, advancedFilters, onLoadFilter, onClose, toast])

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b" style={{ borderColor: colors.border.default }}>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-semibold" style={{ color: colors.text.primary }}>
                  Advanced Filter Management
                </DialogTitle>
                <DialogDescription className="text-sm" style={{ color: colors.text.secondary }}>
                  Create, edit, and manage your advanced filters
                </DialogDescription>
              </div>

              <Button
                size="sm"
                onClick={handleCreateNew}
                className="h-9 px-4 text-white"
                style={{ backgroundColor: colors.interactive.primary }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Filter
              </Button>
            </div>
          </DialogHeader>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 180px)' }}>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-sm" style={{ color: colors.text.secondary }}>
                  Loading filters...
                </p>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <p className="text-sm font-semibold" style={{ color: colors.text.primary }}>
                    Saved Filters ({advancedFilters.length})
                  </p>
                </div>

                <FilterListView
                  presets={advancedFilters}
                  selectedIds={selectedIds}
                  onSelect={setSelectedIds}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  multiSelect={true}
                />
              </div>
            )}
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
              onClick={handleLoadSelected}
              disabled={selectedIds.length === 0}
              className="px-4 h-9 text-white"
              style={{ backgroundColor: colors.interactive.primary }}
            >
              {selectedIds.length === 0
                ? 'Load Selected'
                : `Load Selected (${selectedIds.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filter Form Modal */}
      <FilterFormModal
        isOpen={showFormModal}
        onClose={() => setShowFormModal(false)}
        onSave={handleSaveFilter}
        initialName={editingPreset?.name || ''}
        initialFilter={editingPreset?.simplified_filter}
        metadata={metadata}
        mode={formMode}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmPreset} onOpenChange={(open) => !open && setDeleteConfirmPreset(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Filter?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmPreset?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
