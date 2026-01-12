import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Pipeline } from '@/lib/types/pipeline'
import { CheckCircle2, Circle } from 'lucide-react'

interface TimelineCardProps {
  pipeline: Pipeline
}

const formatDate = (date: string | null | undefined): string => {
  if (!date) return ''
  try {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return date
  }
}

interface TimelineItem {
  label: string
  date: string | null | undefined
  filled: boolean
}

export function TimelineCard({ pipeline }: TimelineCardProps) {
  // CS-specific timeline milestones
  const milestones: TimelineItem[] = [
    {
      label: 'Proposal Date',
      date: pipeline.proposal_date,
      filled: !!pipeline.proposal_date
    },
    {
      label: 'Interested Date',
      date: pipeline.interested_date,
      filled: !!pipeline.interested_date
    },
    {
      label: 'Acceptance Date',
      date: pipeline.acceptance_date,
      filled: !!pipeline.acceptance_date
    },
    {
      label: 'Ready to Deliver',
      date: pipeline.ready_to_deliver_date,
      filled: !!pipeline.ready_to_deliver_date
    },
    {
      label: 'Starting Date',
      date: pipeline.starting_date,
      filled: !!pipeline.starting_date
    },
    {
      label: 'Closed Date',
      date: pipeline.closed_date,
      filled: !!pipeline.closed_date
    }
  ]

  // Filter to only show milestones with dates
  const activeMilestones = milestones.filter(m => m.filled)

  if (activeMilestones.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No timeline data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activeMilestones.map((milestone, index) => (
            <div key={index} className="flex gap-3">
              {/* Timeline Dot */}
              <div className="flex flex-col items-center">
                <CheckCircle2 className="h-5 w-5 text-[#1565C0]" />
                {index < activeMilestones.length - 1 && (
                  <div className="w-0.5 h-full min-h-[20px] bg-border mt-1" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-2">
                <div className="font-medium text-sm">{milestone.label}</div>
                <div className="text-xs text-muted-foreground">{formatDate(milestone.date)}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
