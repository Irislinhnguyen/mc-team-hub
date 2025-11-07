import { Skeleton } from "../../../../src/components/ui/skeleton"
import { colors } from "../../../../lib/colors"

export default function ChartSkeleton() {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        minHeight: '380px', // Match TimeSeriesChart and BarChart
      }}
      className="space-y-0"
    >
      {/* Header Section */}
      <div style={{ padding: '16px 24px 12px' }}>
        <Skeleton className="h-6 w-48" />
      </div>

      {/* Chart Section */}
      <div style={{ padding: '0 24px 24px' }}>
        <Skeleton className="h-[320px] w-full" />
      </div>
    </div>
  )
}
