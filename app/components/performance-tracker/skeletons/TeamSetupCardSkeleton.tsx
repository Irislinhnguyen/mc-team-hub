import { Skeleton } from '@/components/ui/skeleton'

export default function TeamSetupCardSkeleton() {
  return (
    <div className="flex-1 bg-white rounded-lg border border-gray-200 p-3">
      {/* Header with title and count badge */}
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-5 w-8 rounded" />
      </div>

      {/* Member list */}
      <div className="max-h-24 overflow-y-auto space-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-32" />
      </div>
    </div>
  )
}
