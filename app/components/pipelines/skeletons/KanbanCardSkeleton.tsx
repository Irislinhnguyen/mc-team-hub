import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export function KanbanCardSkeleton() {
  return (
    <Card className="max-h-[120px] max-w-full">
      <CardContent className="px-3 py-2.5 space-y-2">
        {/* Publisher Name */}
        <Skeleton className="h-4 w-3/4" />

        {/* Revenue + Date */}
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Badges */}
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardContent>
    </Card>
  )
}
