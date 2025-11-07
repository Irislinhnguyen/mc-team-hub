import { Skeleton } from "../../../../src/components/ui/skeleton"
import { colors } from "../../../../lib/colors"

export default function MetricCardSkeleton() {
  return (
    <div
      className="transition-all duration-200"
      style={{
        backgroundColor: colors.main,
        border: `1px solid ${colors.main}`,
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        padding: '16px'
      }}
    >
      <div className="flex flex-col items-center justify-center text-center space-y-2">
        {/* Label skeleton - matches 10px font with uppercase tracking */}
        <Skeleton className="h-3 w-20" style={{ backgroundColor: colors.contrast, opacity: 0.3 }} />
        {/* Value skeleton - matches 24px font (metricValue) */}
        <Skeleton className="h-7 w-24" style={{ backgroundColor: colors.contrast, opacity: 0.3 }} />
      </div>
    </div>
  )
}
