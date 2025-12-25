import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'
import { colors } from '@/lib/colors'

export default function RevenueForecastTableSkeleton() {
  return (
    <div className="w-1/2">
      <Card
        style={{
          backgroundColor: '#FFFFFF',
          border: `1px solid ${colors.neutralLight}`,
          borderRadius: '4px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
        }}
      >
        <CardContent className="p-3">
          <Skeleton className="h-4 w-48 mb-2" />

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead style={{ backgroundColor: colors.main }}>
                <tr>
                  <th className="px-2 py-1.5 text-left"></th>
                  <th className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                  </th>
                  <th className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                  </th>
                  <th className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                  </th>
                  <th className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-12 ml-auto" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }} />
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Gross Revenue Row */}
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1.5">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                </tr>

                {/* Net Revenue Row */}
                <tr className="border-b border-slate-200">
                  <td className="px-2 py-1.5">
                    <Skeleton className="h-3 w-24" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Skeleton className="h-3 w-16 ml-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
