import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/colors'

interface PipelineImpactTableSkeletonProps {
  rows?: number
}

export default function PipelineImpactTableSkeleton({
  rows = 3
}: PipelineImpactTableSkeletonProps) {
  return (
    <Card
      style={{
        backgroundColor: '#FFFFFF',
        border: `1px solid ${colors.neutralLight}`,
        borderRadius: '4px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
      }}
    >
      <CardContent className="p-4">
        {/* Title Skeleton */}
        <Skeleton className="h-4 w-56 mb-3" />

        {/* Table Skeleton */}
        <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
          <table className="w-full border-collapse">
            <thead
              className="sticky top-0 shadow-sm"
              style={{
                zIndex: 20,
                backgroundColor: colors.main
              }}
            >
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                {/* Publisher */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-16 bg-white/20" />
                </th>
                {/* POC */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-12 bg-white/20" />
                </th>
                {/* Status */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-12 bg-white/20" />
                </th>
                {/* Projected Q Gross */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-24 bg-white/20" />
                </th>
                {/* Actual Revenue */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-24 bg-white/20" />
                </th>
                {/* Variance */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-16 bg-white/20" />
                </th>
                {/* Affected Zones */}
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-20 bg-white/20" />
                </th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: rows }).map((_, idx) => (
                <tr
                  key={idx}
                  className="border-b border-slate-200"
                  style={{
                    backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                  }}
                >
                  {/* Publisher */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-32" />
                  </td>
                  {/* POC */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  {/* Status */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-5 w-12 mx-auto" />
                  </td>
                  {/* Projected Q Gross */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  {/* Actual Revenue */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  {/* Variance */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-16" />
                  </td>
                  {/* Affected Zones */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-16" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
