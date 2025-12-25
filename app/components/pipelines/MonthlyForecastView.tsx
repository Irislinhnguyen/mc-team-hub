import type { Pipeline } from '@/lib/types/pipeline'

interface MonthlyForecastViewProps {
  pipeline: Pipeline
}

export function MonthlyForecastView({ pipeline }: MonthlyForecastViewProps) {
  // Format currency
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)
  }

  // Format month name as "Month 1", "Month 2", "Month 3" based on position in quarter
  const formatMonthLabel = (index: number) => {
    const labels = ['Month 1 (First)', 'Month 2 (Middle)', 'Month 3 (Last)']
    return labels[index] || `Month ${index + 1}`
  }

  // Get monthly forecasts from pipeline (limit to 3 as safety net)
  const monthlyForecasts = (pipeline.monthly_forecasts || []).slice(0, 3)

  // If no monthly forecast data available
  if (monthlyForecasts.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <p className="text-sm">No monthly forecast data available</p>
        <p className="text-xs mt-1">Monthly forecasts will be calculated when you save changes</p>
      </div>
    )
  }

  // Calculate totals
  const totalGross = monthlyForecasts.reduce((sum, m) => sum + (m.gross_revenue || 0), 0)
  const totalNet = monthlyForecasts.reduce((sum, m) => sum + (m.net_revenue || 0), 0)
  const totalDays = monthlyForecasts.reduce((sum, m) => sum + (m.delivery_days || 0), 0)

  // Check if totals match pipeline quarterly values
  const grossMatch = Math.abs(totalGross - (pipeline.q_gross || 0)) < 1
  const netMatch = Math.abs(totalNet - (pipeline.q_net_rev || 0)) < 1

  // Check if pipeline has zero-revenue status
  const isZeroRevenueStatus = ['【D】', '【E】', '【F】'].includes(pipeline.status)

  // DON'T filter - always show all 3 months in quarter (as per user request)
  // Each month will show 0 if before starting_date

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        Quarterly Breakdown - 3 Months
      </div>

      {/* Formula Explanation */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 text-xs border border-blue-200 dark:border-blue-800">
        <p className="font-semibold mb-1 text-blue-900 dark:text-blue-100">Google Sheet Formulas (Columns AL, AM, AN):</p>
        <div className="space-y-1 text-blue-800 dark:text-blue-200 font-mono text-[11px]">
          <div>AL (First Month) = IF(status IN [D,E,F], 0, $P × ($AD ÷ 100) × BV)</div>
          <div>AM (Middle) = IF(status IN [D,E,F], 0, $P × ($AD ÷ 100) × BW)</div>
          <div>AN (Last) = IF(status IN [D,E,F], 0, $P × ($AD ÷ 100) × BX)</div>
        </div>
        <div className="mt-2 text-[10px] text-blue-700 dark:text-blue-300">
          Where: $P = day_gross, $AD = progress%, BV/BW/BX = delivery_days
        </div>
      </div>

      {/* Zero-Revenue Status Warning */}
      {isZeroRevenueStatus && (
        <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-3 text-xs border border-orange-200 dark:border-orange-800">
          <p className="font-semibold text-orange-900 dark:text-orange-100">⚠️ Zero Revenue Status</p>
          <p className="text-orange-800 dark:text-orange-200 mt-1">
            Status <span className="font-mono font-bold">{pipeline.status}</span> forces all monthly revenue to $0 per Google Sheet formula
          </p>
        </div>
      )}

      {/* Monthly Breakdown Table */}
      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium">Month</th>
              <th className="p-3 text-center font-medium">Days</th>
              <th className="p-3 text-right font-medium">Gross</th>
              <th className="p-3 text-right font-medium">Net</th>
            </tr>
          </thead>
          <tbody>
            {monthlyForecasts.length > 0 ? (
              monthlyForecasts.map((forecast, index) => (
                <tr key={`${forecast.year}-${forecast.month}`} className="border-b last:border-0">
                  <td className="p-3 font-medium">
                    {formatMonthLabel(index)}
                  </td>
                  <td className="p-3 text-center text-muted-foreground">
                    {forecast.delivery_days ?? 0}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {formatCurrency(forecast.gross_revenue)}
                  </td>
                  <td className="p-3 text-right text-muted-foreground">
                    {formatCurrency(forecast.net_revenue)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground text-sm">
                  No monthly forecast data available
                  <div className="text-xs mt-1">Monthly forecasts will be calculated when you save changes</div>
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/30">
              <td className="p-3 font-bold">Total</td>
              <td className="p-3 text-center font-bold">{totalDays}</td>
              <td className="p-3 text-right font-bold">
                {formatCurrency(totalGross)}
                {!grossMatch && (
                  <span className="ml-2 text-xs text-orange-600" title="Total does not match quarterly gross">
                    ⚠
                  </span>
                )}
              </td>
              <td className="p-3 text-right font-bold">
                {formatCurrency(totalNet)}
                {!netMatch && (
                  <span className="ml-2 text-xs text-orange-600" title="Total does not match quarterly net revenue">
                    ⚠
                  </span>
                )}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Expected vs Actual Comparison */}
      {(!grossMatch || !netMatch) && (
        <div className="rounded-lg bg-orange-50 dark:bg-orange-950 p-3 text-xs border border-orange-200 dark:border-orange-800">
          <p className="mb-1 font-medium text-orange-900 dark:text-orange-100">⚠ Variance Detected:</p>
          <div className="grid grid-cols-2 gap-2 text-orange-800 dark:text-orange-200">
            <div>
              Expected Gross: {formatCurrency(pipeline.q_gross)}
              {!grossMatch && <span className="ml-1">(diff: {formatCurrency((totalGross - (pipeline.q_gross || 0)))})</span>}
            </div>
            <div>
              Expected Net: {formatCurrency(pipeline.q_net_rev)}
              {!netMatch && <span className="ml-1">(diff: {formatCurrency((totalNet - (pipeline.q_net_rev || 0)))})</span>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
