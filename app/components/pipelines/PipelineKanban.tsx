'use client'

import { useState, useMemo, useEffect } from 'react'
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { KanbanColumn } from './KanbanColumn'
import { KanbanCard } from './KanbanCard'
import { KanbanBoardSkeleton } from './skeletons/KanbanBoardSkeleton'
import type { Pipeline } from '@/lib/types/pipeline'

interface PipelineKanbanProps {
  pipelines: Pipeline[]
  onPipelineUpdate: (pipelineId: string, updates: Partial<Pipeline>) => Promise<void>
  onPipelineClick: (pipeline: Pipeline) => void
  loading?: boolean
}

// Progressive blue gradient color system (light → dark as deals progress)
const KANBAN_STAGES = [
  { code: '【E】', name: 'Exploring', color: '#93C5FD' },      // blue-300 (lightest)
  { code: '【D】', name: 'Qualified', color: '#60A5FA' },      // blue-400
  { code: '【C-】', name: 'Demo', color: '#3B82F6' },          // blue-500
  { code: '【C】', name: 'Proposal', color: '#2563EB' },       // blue-600
  { code: '【C+】', name: 'Negotiation', color: '#1D4ED8' },   // blue-700
  { code: '【B】', name: 'Contract', color: '#1E40AF' },       // blue-800
  { code: '【A】', name: 'Closing', color: '#1565C0' },        // Brand blue (darkest active)
  { code: '【S-】', name: 'Won - Partial', color: '#10B981' }, // green-500 (won)
  { code: '【S】', name: 'Won - Full', color: '#059669' },     // green-600 (won darker)
  { code: '【Z】', name: 'Closed/Lost', color: '#6B7280' },    // gray-500 (lost)
]

export function PipelineKanban({ pipelines, onPipelineUpdate, onPipelineClick, loading }: PipelineKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draggedPipeline, setDraggedPipeline] = useState<Pipeline | null>(null)
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  )

  // Helper to get stage color from status code
  const getStatusColor = (status: string) => {
    const stage = KANBAN_STAGES.find(s => s.code === status)
    return stage?.color || '#94A3B8' // Default to gray
  }

  // Group pipelines by status
  const pipelinesByStatus = useMemo(() => {
    const grouped: Record<string, Pipeline[]> = {}
    KANBAN_STAGES.forEach(stage => {
      grouped[stage.code] = pipelines.filter(pipeline => pipeline.status === stage.code)
    })
    return grouped
  }, [pipelines])

  // Calculate column totals
  const columnTotals = useMemo(() => {
    const totals: Record<string, { count: number; value: number }> = {}
    KANBAN_STAGES.forEach(stage => {
      const stagePipelines = pipelinesByStatus[stage.code] || []
      totals[stage.code] = {
        count: stagePipelines.length,
        value: stagePipelines.reduce((sum, pipeline) => sum + (pipeline.q_gross || 0), 0)
      }
    })
    return totals
  }, [pipelinesByStatus])

  const handleDragStart = (event: any) => {
    const { active } = event
    setActiveId(active.id)

    // Find the dragged pipeline
    const pipeline = pipelines.find(p => p.id === active.id)
    setDraggedPipeline(pipeline || null)
  }

  const handleDragEnd = async (event: any) => {
    const { active, over } = event

    if (!over) {
      setActiveId(null)
      setDraggedPipeline(null)
      return
    }

    const pipelineId = active.id
    const newStatus = over.id // Column ID is the status code

    // Find the pipeline being moved
    const pipeline = pipelines.find(p => p.id === pipelineId)
    if (!pipeline || pipeline.status === newStatus) {
      setActiveId(null)
      setDraggedPipeline(null)
      return
    }

    // Update pipeline status via API
    try {
      await onPipelineUpdate(pipelineId, { status: newStatus })
      const stageName = KANBAN_STAGES.find(s => s.code === newStatus)?.name
      setAnnouncement(`Pipeline moved to ${stageName}`)
    } catch (error) {
      console.error('Failed to update pipeline status:', error)
      setAnnouncement('Failed to move pipeline')
    }

    setActiveId(null)
    setDraggedPipeline(null)
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setDraggedPipeline(null)
  }

  const handleQuickEdit = (pipelineId: string) => {
    // TODO: Show status edit dropdown
    console.log('Quick edit:', pipelineId)
  }

  const handleAddNote = (pipelineId: string) => {
    // TODO: Show add note dialog
    console.log('Add note:', pipelineId)
  }

  // Keyboard shortcuts for moving cards
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!focusedCardId) return

      // Ctrl+Left/Right to move between columns
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault()

        const pipeline = pipelines.find(p => p.id === focusedCardId)
        if (!pipeline) return

        const currentIndex = KANBAN_STAGES.findIndex(s => s.code === pipeline.status)
        const newIndex = e.key === 'ArrowRight'
          ? Math.min(currentIndex + 1, KANBAN_STAGES.length - 1)
          : Math.max(currentIndex - 1, 0)

        const newStatus = KANBAN_STAGES[newIndex].code
        if (newStatus !== pipeline.status) {
          onPipelineUpdate(focusedCardId, { status: newStatus })
            .then(() => {
              const stageName = KANBAN_STAGES.find(s => s.code === newStatus)?.name
              setAnnouncement(`Pipeline moved to ${stageName}`)
            })
            .catch(() => {
              setAnnouncement('Failed to move pipeline')
            })
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [focusedCardId, pipelines, onPipelineUpdate])

  if (loading) {
    return <KanbanBoardSkeleton />
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-280px)] animate-in fade-in duration-300">
        {KANBAN_STAGES.map(stage => (
          <KanbanColumn
            key={stage.code}
            id={stage.code}
            title={stage.name}
            color={stage.color}
            count={columnTotals[stage.code]?.count || 0}
            totalValue={columnTotals[stage.code]?.value || 0}
          >
            <SortableContext
              items={pipelinesByStatus[stage.code]?.map(p => p.id) || []}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {pipelinesByStatus[stage.code]?.map(pipeline => (
                  <KanbanCard
                    key={pipeline.id}
                    pipeline={pipeline}
                    onClick={() => onPipelineClick(pipeline)}
                    onQuickEdit={() => handleQuickEdit(pipeline.id)}
                    onAddNote={() => handleAddNote(pipeline.id)}
                    onFocusChange={setFocusedCardId}
                  />
                ))}
              </div>
            </SortableContext>
          </KanbanColumn>
        ))}
      </div>

      <DragOverlay>
        {activeId && draggedPipeline ? (
          <div className="rotate-3">
            <KanbanCard
              pipeline={draggedPipeline}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>

      {/* ARIA live region for screen reader announcements */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </DndContext>
  )
}
