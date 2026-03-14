/**
 * SalesCycleBreakdownCard Skeleton
 * Loading state for the Sales Cycle Breakdown card
 */

import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { colors } from '@/lib/colors'

export default function SalesCycleBreakdownCardSkeleton() {
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
        {/* Title skeleton */}
        <Skeleton className="h-4 w-48 mb-3" />
        {/* Subtitle skeleton */}
        <Skeleton className="h-3 w-64 mb-3" />

        {/* Table skeleton */}
        <table className="w-full border-collapse">
          {/* Header skeleton */}
          <thead
            className="sticky top-0"
            style={{
              backgroundColor: colors.main,
            }}
          >
            <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
              <th className="px-2 py-2">
                <Skeleton className="h-3 w-28 bg-white/30" />
              </th>
              <th className="px-2 py-2 text-right">
                <Skeleton className="h-3 w-20 bg-white/30 ml-auto" />
              </th>
              <th className="px-2 py-2 text-right">
                <Skeleton className="h-3 w-24 bg-white/30 ml-auto" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr
                key={i}
                className="border-b border-slate-200"
                style={{
                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f8fafc',
                }}
              >
                <td className="px-2 py-2">
                  <Skeleton className="h-3 w-32" />
                </td>
                <td className="px-2 py-2 text-right">
                  <Skeleton className="h-3 w-12 ml-auto" />
                </td>
                <td className="px-2 py-2 text-right">
                  <Skeleton className="h-3 w-16 ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer note skeleton */}
        <div className="mt-4 pt-3 border-t" style={{ borderColor: colors.neutralLight }}>
          <Skeleton className="h-3 w-full" />
        </div>
      </CardContent>
    </Card>
  )
}
