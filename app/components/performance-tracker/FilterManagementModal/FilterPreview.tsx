'use client'

/**
 * FilterPreview Component
 *
 * Displays a natural language preview of what the filter does
 * Updates in real-time as user edits filter conditions
 */

import { useMemo } from 'react'
import { colors } from '../../../../lib/colors'
import type { SimplifiedFilter } from '../../../../lib/types/performanceTracker'
import { generateFilterPreview } from '../../../../lib/utils/filterPreviewGenerator'

interface FilterPreviewProps {
  filter: SimplifiedFilter
}

export function FilterPreview({ filter }: FilterPreviewProps) {
  const previewText = useMemo(() => {
    return generateFilterPreview(filter)
  }, [filter])

  return (
    <div
      className="px-4 py-3 rounded text-sm whitespace-pre-line"
      style={{
        backgroundColor: colors.surface.muted,
        border: `1px solid ${colors.border.default}`,
        color: colors.text.secondary
      }}
    >
      {previewText}
    </div>
  )
}
