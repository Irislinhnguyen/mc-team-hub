import type { Pipeline } from '@/lib/types/pipeline'

interface MonthlyForecastViewProps {
  pipeline: Pipeline
}

export function MonthlyForecastView({ pipeline }: MonthlyForecastViewProps) {
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const quarterlyBreakdown = pipeline.metadata?.quarterly_breakdown
  const monthlyData = [
    { month: 1, gross: quarterlyBreakdown?.gross?.first_month, net: quarterlyBreakdown?.net?.first_month },
    { month: 2, gross: quarterlyBreakdown?.gross?.middle_month, net: quarterlyBreakdown?.net?.middle_month },
    { month: 3, gross: quarterlyBreakdown?.gross?.last_month, net: quarterlyBreakdown?.net?.last_month }
  ].filter(m => m.gross !== null || m.net !== null)

  if (monthlyData.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">No monthly forecast data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Quarterly Breakdown - 3 Months
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium">Month</th>
              <th className="p-3 text-right font-medium">Gross</th>
              <th className="p-3 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {monthlyData.map((data) => (
              <tr key={data.month} className="border-b last:border-0">
                <td className="p-3 font-medium">Month {data.month}</td>
                <td className="p-3 text-right">{formatCurrency(data.gross)}</td>
                <td className="p-3 text-right">{formatCurrency(data.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
