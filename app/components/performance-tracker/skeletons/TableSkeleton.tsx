import { Skeleton } from "@/components/ui/skeleton"
import { colors } from "../../../../lib/colors"

export default function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        minHeight: '420px', // Match DataTable total height (header + content + pagination)
      }}
      className="space-y-0"
    >
      {/* Header Section - matches CardHeader */}
      <div style={{ padding: '16px 24px 12px' }}>
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Content Section - matches CardContent with 320px table area */}
      <div style={{ padding: '0 24px 24px' }}>
        <div style={{ minHeight: '320px' }} className="space-y-2">
          <Skeleton className="h-10 w-full" />
          {Array.from({ length: Math.min(rows, 8) }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>

        {/* Pagination area */}
        <div className="flex items-center justify-between mt-4">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}
