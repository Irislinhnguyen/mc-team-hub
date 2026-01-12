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

  const monthlyForecasts = (pipeline.monthly_forecasts || []).slice(0, 3)

  if (monthlyForecasts.length === 0) {
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
            {monthlyForecasts.map((forecast, index) => (
              <tr key={`${forecast.year}-${forecast.month}`} className="border-b last:border-0">
                <td className="p-3 font-medium">
                  Month {index + 1}
                </td>
                <td className="p-3 text-right">
                  {formatCurrency(forecast.gross_revenue)}
                </td>
                <td className="p-3 text-right">
                  {formatCurrency(forecast.net_revenue)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
