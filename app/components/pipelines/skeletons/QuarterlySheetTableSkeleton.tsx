import { Skeleton } from '@/components/ui/skeleton'

/**
 * Quarterly Sheet Table Skeleton Component
 *
 * Matches the structure of QuarterlySheetManager table:
 * - Quarter/Year column
 * - Group badge column
 * - Sheet Name column (with external link)
 * - Pipelines count column
 * - Status badge column
 * - Last Sync column
 * - Actions column (sync, pause/resume, copy, edit, delete)
 */
export function QuarterlySheetTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      {/* Table Header */}
      <div className="border-b bg-muted/50 px-4 py-3">
        <div className="grid grid-cols-7 gap-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24 justify-self-end" />
        </div>
      </div>

      {/* Table Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b px-4 py-4">
          <div className="grid grid-cols-7 gap-4 items-center">
            {/* Quarter/Year */}
            <Skeleton className="h-5 w-16" />

            {/* Group Badge */}
            <Skeleton className="h-6 w-14 rounded-full" />

            {/* Sheet Name */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-6 w-6 rounded" />
            </div>

            {/* Pipelines Count */}
            <Skeleton className="h-4 w-8" />

            {/* Status Badge */}
            <Skeleton className="h-6 w-16 rounded-full" />

            {/* Last Sync */}
            <Skeleton className="h-4 w-24" />

            {/* Actions */}
            <div className="flex items-center justify-end gap-2">
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
              <Skeleton className="h-8 w-8 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
