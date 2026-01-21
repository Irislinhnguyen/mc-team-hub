import { Skeleton } from "@/components/ui/skeleton"
import { colors } from "../../../../lib/colors"

interface FilterPanelSkeletonProps {
  filterCount?: number
}

export default function FilterPanelSkeleton({ filterCount = 8 }: FilterPanelSkeletonProps) {
  return (
    <div
      style={{
        backgroundColor: colors.neutralLight,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        padding: '24px'
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dynamic filter dropdowns skeleton based on filterCount */}
        {Array.from({ length: filterCount }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex justify-end">
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  )
}
