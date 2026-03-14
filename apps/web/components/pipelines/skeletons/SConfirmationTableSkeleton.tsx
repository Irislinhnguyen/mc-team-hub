import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/colors'

interface SConfirmationTableSkeletonProps {
  rows?: number
}

export default function SConfirmationTableSkeleton({
  rows = 3
}: SConfirmationTableSkeletonProps) {
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
        <Skeleton className="h-4 w-48 mb-3" />

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
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-16 bg-white/20" />
                </th>
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-12 bg-white/20" />
                </th>
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-16 bg-white/20" />
                </th>
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-24 bg-white/20" />
                </th>
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-20 bg-white/20" />
                </th>
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-16 bg-white/20" />
                </th>
                <th className="px-2 py-2">
                  <Skeleton className="h-3 w-16 bg-white/20" />
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
                    <Skeleton className="h-3 w-24" />
                  </td>
                  {/* POC */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  {/* Started */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  {/* Expected Confirm */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-20" />
                  </td>
                  {/* Days Overdue */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-3 w-10" />
                  </td>
                  {/* Status */}
                  <td className="px-2 py-2">
                    <Skeleton className="h-5 w-16 mx-auto" />
                  </td>
                  {/* Actions */}
                  <td className="px-2 py-2">
                    <div className="flex gap-1 justify-center">
                      <Skeleton className="h-7 w-20" />
                      <Skeleton className="h-7 w-20" />
                    </div>
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
