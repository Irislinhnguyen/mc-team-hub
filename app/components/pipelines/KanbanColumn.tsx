'use client'

import { useDroppable } from '@dnd-kit/core'
import { Card, CardHeader, CardContent } from '@/components/ui/card'

interface KanbanColumnProps {
  id: string
  title: string
  color: string
  count: number
  totalValue: number
  children: React.ReactNode
}

export function KanbanColumn({ id, title, color, count, totalValue, children }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })

  const formatValue = (value: number) => {
    if (value === 0) return '$0'
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`
    return `$${value.toFixed(0)}`
  }

  return (
    <div
      ref={setNodeRef}
      className="flex-shrink-0 w-72 overflow-hidden"
      role="region"
      aria-label={`${title} stage with ${count} pipelines totaling ${formatValue(totalValue)}`}
    >
      <Card className={`flex flex-col h-full w-full box-border transition-all ${isOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''}`}>
        <CardHeader className="py-2 sticky top-0 bg-[#1565C0] z-10 border-b border-[#0d4a8f]">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-xs text-white">
              {id} {title} ({count})
            </h3>
            <div className="flex items-center text-white" title={`${count} pipelines`}>
              <span className="font-bold text-xs">{formatValue(totalValue)}</span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto overflow-x-hidden max-h-[calc(100vh-360px)] px-2 scroll-smooth">
          {children}
          {count === 0 && (
            <div className="text-center py-8 text-gray-400 text-xs">
              No pipelines yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
