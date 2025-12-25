import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/src/components/ui/card'

export default function PipelineFilterPanelSkeleton() {
  return (
    <Card className="border-gray-200 bg-gray-50">
      <CardContent className="py-4">
        <div className="space-y-4">
          {/* Filter Controls Row */}
          <div className="flex flex-wrap gap-4 items-end">
            {/* Team Filter */}
            <div className="min-w-[180px]">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-9 w-[180px]" />
            </div>

            {/* PIC Filter */}
            <div className="min-w-[180px]">
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-9 w-[180px]" />
            </div>

            {/* Product Filter */}
            <div className="min-w-[180px]">
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-9 w-[180px]" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
