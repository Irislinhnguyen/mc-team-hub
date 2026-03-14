import { Skeleton } from '@/components/ui/skeleton'

/**
 * Focus Card Skeleton Component
 *
 * Matches the structure of FocusCard component:
 * - Title and subtitle
 * - Status badge
 * - Description (optional)
 * - 3 stat boxes (Total, Created, Pending)
 */
export function FocusCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6 hover:shadow-md">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>

      {/* Description */}
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-3/4 mb-3" />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-center border-t pt-3">
        <div>
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div>
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
        <div>
          <Skeleton className="h-6 w-8 mx-auto mb-1" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      </div>
    </div>
  )
}
