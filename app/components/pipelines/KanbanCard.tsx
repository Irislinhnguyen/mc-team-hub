'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import type { Pipeline } from '@/lib/types/pipeline'

// Drag Handle Component
function DragHandle({ listeners, attributes }: any) {
  return (
    <div
      {...listeners}
      {...attributes}
      className="absolute left-1 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover:opacity-100 transition-opacity"
    >
      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" className="text-gray-400">
        <circle cx="3" cy="4" r="1.5"/>
        <circle cx="3" cy="8" r="1.5"/>
        <circle cx="3" cy="12" r="1.5"/>
        <circle cx="9" cy="4" r="1.5"/>
        <circle cx="9" cy="8" r="1.5"/>
        <circle cx="9" cy="12" r="1.5"/>
      </svg>
    </div>
  )
}

// Quick Actions Component
function QuickActions({ onEdit, onAddNote }: { onEdit: () => void, onAddNote: () => void }) {
  return (
    <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="p-1 rounded hover:bg-gray-100">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="8" cy="3" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="8" cy="13" r="1.5"/>
            </svg>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>Edit Status</DropdownMenuItem>
          <DropdownMenuItem onClick={onAddNote}>Add Note</DropdownMenuItem>
          <DropdownMenuItem>View Details</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface KanbanCardProps {
  pipeline: Pipeline
  onClick?: () => void
  isDragging?: boolean
  onQuickEdit?: () => void
  onAddNote?: () => void
  onFocusChange?: (pipelineId: string | null) => void
}

export function KanbanCard({ pipeline, onClick, isDragging = false, onQuickEdit, onAddNote, onFocusChange }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: pipeline.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  }

  const formatValue = (value: number | null) => {
    if (value === null || value === undefined) return '$0'
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const formatLastActivity = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return `${Math.floor(diffDays / 30)}mo ago`
  }

  const isOverdue = pipeline.action_date && new Date(pipeline.action_date) < new Date()

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group relative cursor-pointer hover:shadow-md transition-all duration-200 border border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 ${
        isDragging ? 'shadow-lg' : ''
      }`}
      onClick={(e) => {
        // Only trigger onClick if not dragging
        if (!isSortableDragging && onClick) {
          onClick()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Pipeline: ${pipeline.publisher || 'Unnamed'}`}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isSortableDragging && onClick) {
          e.preventDefault()
          onClick()
        }
      }}
      onFocus={() => onFocusChange?.(pipeline.id)}
      onBlur={() => onFocusChange?.(null)}
    >
      {/* Add drag handle */}
      <DragHandle listeners={listeners} attributes={attributes} />

      {/* Add quick actions */}
      {onQuickEdit && onAddNote && (
        <QuickActions onEdit={onQuickEdit} onAddNote={onAddNote} />
      )}

      <CardContent className="px-2 py-1.5 space-y-0.5 pl-5 pr-1">
        {/* Line 1: POC - Domain (full width) */}
        <div className="text-[11px] leading-tight">
          {pipeline.poc && <span className="font-semibold text-gray-700">{pipeline.poc}</span>}
          {pipeline.poc && pipeline.domain && <span className="text-gray-400"> - </span>}
          <span className="text-gray-900">{pipeline.domain || pipeline.publisher || 'Unnamed'}</span>
        </div>

        {/* Line 2: Product */}
        {pipeline.product && (
          <div className="text-[10px] text-gray-600 truncate">
            {pipeline.product}
          </div>
        )}

        {/* Line 3: Revenue + Date */}
        <div className="flex items-center justify-between gap-1 text-[10px]">
          <span className="font-bold text-gray-900">
            {formatValue(pipeline.q_gross)}
          </span>
          {pipeline.action_date && (
            <span className={`font-medium ${
              isOverdue ? 'text-red-600' : 'text-gray-600'
            }`}>
              {formatDate(pipeline.action_date)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
