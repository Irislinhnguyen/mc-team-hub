import { Card } from '@/components/ui/card'
import { KanbanCardSkeleton } from './KanbanCardSkeleton'

const KANBAN_STAGES = [
  { code: '【E】', name: 'Exploring', color: '#94A3B8' },
  { code: '【D】', name: 'Qualified', color: '#1565C0' },
  { code: '【C-】', name: 'Demo', color: '#34D399' },
  { code: '【C】', name: 'Proposal', color: '#FBBF24' },
  { code: '【C+】', name: 'Negotiation', color: '#FB923C' },
  { code: '【B】', name: 'Contract', color: '#F472B6' },
  { code: '【A】', name: 'Closing', color: '#A78BFA' },
  { code: '【S-】', name: 'Won - Partial', color: '#10B981' },
  { code: '【S】', name: 'Won - Full', color: '#059669' },
  { code: '【Z】', name: 'Closed/Lost', color: '#6B7280' },
]

export function KanbanBoardSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-4">
      {KANBAN_STAGES.map(stage => (
        <div key={stage.code} className="flex-shrink-0 w-60">
          <Card className="p-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="space-y-2 px-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <KanbanCardSkeleton />
                </div>
              ))}
            </div>
          </Card>
        </div>
      ))}
    </div>
  )
}
