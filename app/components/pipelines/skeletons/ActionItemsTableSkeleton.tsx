import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface ActionItemsTableSkeletonProps {
  overdueRows?: number
  nextActionsRows?: number
}

export default function ActionItemsTableSkeleton({
  overdueRows = 3,
  nextActionsRows = 3
}: ActionItemsTableSkeletonProps) {
  const renderTable = (rows: number, hasOverdueColumn: boolean = false) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">
              <Skeleton className="h-3 w-16" />
            </th>
            <th className="px-3 py-2 text-left">
              <Skeleton className="h-3 w-12" />
            </th>
            <th className="px-3 py-2 text-left">
              <Skeleton className="h-3 w-16" />
            </th>
            <th className="px-3 py-2 text-left">
              <Skeleton className="h-3 w-20" />
            </th>
            {hasOverdueColumn && (
              <th className="px-3 py-2 text-left">
                <Skeleton className="h-3 w-16" />
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, idx) => (
            <tr key={idx} className="border-b border-gray-100">
              <td className="px-3 py-2">
                <Skeleton className="h-3 w-32" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-3 w-16" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-5 w-12" />
              </td>
              <td className="px-3 py-2">
                <Skeleton className="h-3 w-20" />
              </td>
              {hasOverdueColumn && (
                <td className="px-3 py-2">
                  <Skeleton className="h-3 w-12" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Overdue Pipelines */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          {renderTable(overdueRows, true)}
        </CardContent>
      </Card>

      {/* Next Actions */}
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          {renderTable(nextActionsRows, false)}
        </CardContent>
      </Card>
    </div>
  )
}
