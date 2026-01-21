'use client'

/**
 * FilterListItem Component
 *
 * Individual filter item in the management list
 * Shows name, preview, metadata, and edit/delete actions
 */

import { Button } from '@/components/ui/button'
import { Edit, Trash2 } from 'lucide-react'
import { colors } from '../../../../lib/colors'
import type { FilterPreset } from '../../../../lib/types/filterPreset'
import { generateCompactPreview, getClauseCountSummary } from '../../../../lib/utils/filterPreviewGenerator'

interface FilterListItemProps {
  preset: FilterPreset
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
  multiSelect?: boolean  // If true, show checkbox; if false, show radio
}

export function FilterListItem({ preset, isSelected, onSelect, onEdit, onDelete, multiSelect = false }: FilterListItemProps) {
  const previewText = preset.simplified_filter
    ? generateCompactPreview(preset.simplified_filter)
    : 'No conditions'

  const clauseSummary = preset.simplified_filter
    ? getClauseCountSummary(preset.simplified_filter)
    : 'No conditions'

  const createdDate = new Date(preset.created_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div
      className="px-3 py-2 rounded cursor-pointer transition-all hover:bg-gray-50"
      style={{
        backgroundColor: isSelected ? colors.status.infoBg : '#fff',
        border: `1px solid ${isSelected ? colors.interactive.primary : colors.border.default}`,
      }}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Checkbox/Radio + Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {multiSelect ? (
            /* Checkbox for multi-select */
            <div
              className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: isSelected ? colors.interactive.primary : colors.border.default,
                backgroundColor: isSelected ? colors.interactive.primary : '#fff'
              }}
            >
              {isSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ) : (
            /* Radio for single-select */
            <div
              className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{
                borderColor: isSelected ? colors.interactive.primary : colors.border.default
              }}
            >
              {isSelected && (
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: colors.interactive.primary }}
                />
              )}
            </div>
          )}

          {/* Name only - compact */}
          <div className="text-sm truncate" style={{ color: colors.text.primary }}>
            {preset.name}
          </div>
        </div>

        {/* Actions - compact */}
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="h-7 w-7 p-0"
            title="Edit"
          >
            <Edit className="h-3 w-3" style={{ color: colors.text.secondary }} />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="h-7 w-7 p-0 hover:bg-red-50"
            title="Delete"
          >
            <Trash2 className="h-3 w-3 text-red-600" />
          </Button>
        </div>
      </div>
    </div>
  )
}
