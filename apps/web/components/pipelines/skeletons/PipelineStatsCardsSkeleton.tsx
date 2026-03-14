import { Skeleton } from '@/components/ui/skeleton'

export default function PipelineStatsCardsSkeleton() {
  return (
    <>
      {/* Total Pipelines */}
      <div className="bg-gray-50 rounded-lg px-5 py-4">
        <Skeleton className="h-3 w-28 mb-1" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Total Gross */}
      <div className="bg-gray-50 rounded-lg px-5 py-4">
        <Skeleton className="h-3 w-28 mb-1" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Total Net Revenue */}
      <div className="bg-gray-50 rounded-lg px-5 py-4">
        <Skeleton className="h-3 w-28 mb-1" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Avg Sales Cycle */}
      <div className="bg-gray-50 rounded-lg px-5 py-4">
        <Skeleton className="h-3 w-28 mb-1" />
        <Skeleton className="h-8 w-20" />
      </div>
    </>
  )
}
