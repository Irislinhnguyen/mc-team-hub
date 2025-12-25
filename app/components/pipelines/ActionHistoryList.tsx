'use client'

import { useActionHistory } from '@/lib/hooks/queries/useActionHistory'
import { ActionHistoryItem } from './ActionHistoryItem'

interface ActionHistoryListProps {
  pipelineId: string
}

export function ActionHistoryList({ pipelineId }: ActionHistoryListProps) {
  const { data: history, isLoading } = useActionHistory(pipelineId)

  if (isLoading) {
    return (
      <div className="text-xs text-muted-foreground">
        Loading action history...
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-xs text-muted-foreground">
        No previous actions yet
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-muted-foreground">
        Previous Actions
      </h4>

      <div className="space-y-3">
        {history.map((action, index) => (
          <ActionHistoryItem key={index} action={action} />
        ))}
      </div>
    </div>
  )
}
