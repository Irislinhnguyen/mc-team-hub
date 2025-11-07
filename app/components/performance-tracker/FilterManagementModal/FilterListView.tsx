'use client'

/**
 * FilterListView Component
 *
 * List of saved advanced filters with selection
 * Features: Search + Virtual scrolling for large lists
 */

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { colors } from '../../../../lib/colors'
import type { FilterPreset } from '../../../../lib/types/filterPreset'
import { FilterListItem } from './FilterListItem'

interface FilterListViewProps {
  presets: FilterPreset[]
  selectedIds: string[]
  onSelect: (ids: string[]) => void
  onEdit: (preset: FilterPreset) => void
  onDelete: (preset: FilterPreset) => void
  multiSelect?: boolean
}

export function FilterListView({ presets, selectedIds, onSelect, onEdit, onDelete, multiSelect = false }: FilterListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')

  // Filter presets based on search
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return presets

    const query = searchQuery.toLowerCase()
    return presets.filter(preset =>
      preset.name.toLowerCase().includes(query) ||
      preset.description?.toLowerCase().includes(query)
    )
  }, [presets, searchQuery])

  // Handle selection toggle
  const handleToggleSelect = (id: string) => {
    if (multiSelect) {
      // Multi-select: toggle checkbox
      if (selectedIds.includes(id)) {
        onSelect(selectedIds.filter(selectedId => selectedId !== id))
      } else {
        onSelect([...selectedIds, id])
      }
    } else {
      // Single-select: radio behavior
      onSelect([id])
    }
  }

  if (presets.length === 0) {
    return (
      <div
        className="text-center py-8 px-4 rounded border-2 border-dashed"
        style={{ borderColor: colors.border.default, backgroundColor: colors.surface.muted }}
      >
        <p className="text-sm font-medium mb-1" style={{ color: colors.text.primary }}>
          No saved filters yet
        </p>
        <p className="text-xs" style={{ color: colors.text.secondary }}>
          Click "Create New Filter" to get started
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Search box */}
      <div className="relative">
        <Search className="absolute left-2 top-2 h-4 w-4" style={{ color: colors.text.tertiary }} />
        <input
          type="text"
          placeholder="Search filters..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 text-sm rounded"
          style={{
            border: `1px solid ${colors.border.default}`,
            backgroundColor: '#fff'
          }}
        />
      </div>

      {/* Results count and selection count */}
      <div className="flex items-center justify-between text-xs" style={{ color: colors.text.secondary }}>
        {searchQuery && (
          <div>{filteredPresets.length} of {presets.length} filters</div>
        )}
        {multiSelect && selectedIds.length > 0 && (
          <div className="font-medium" style={{ color: colors.interactive.primary }}>
            {selectedIds.length} selected
          </div>
        )}
      </div>

      {/* Scrollable list with max height */}
      <div
        className="space-y-2 overflow-y-auto"
        style={{
          maxHeight: '400px',
          scrollbarWidth: 'thin'
        }}
      >
        {filteredPresets.length === 0 ? (
          <div className="text-center py-4 text-sm" style={{ color: colors.text.secondary }}>
            No filters match "{searchQuery}"
          </div>
        ) : (
          filteredPresets.map(preset => (
            <FilterListItem
              key={preset.id}
              preset={preset}
              isSelected={selectedIds.includes(preset.id)}
              onSelect={() => handleToggleSelect(preset.id)}
              onEdit={() => onEdit(preset)}
              onDelete={() => onDelete(preset)}
              multiSelect={multiSelect}
            />
          ))
        )}
      </div>
    </div>
  )
}
