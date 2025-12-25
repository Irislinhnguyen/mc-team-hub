/**
 * Pipeline Revenue Calculation Service
 *
 * Replicates Google Sheet formulas for auto-calculating pipeline revenue fields.
 *
 * Google Sheet Formula References:
 * - Column P (day_gross) = T / 30
 * - Column Q (day_net_rev) = (T / 30) × (U / 100)
 * - Column AL-AN (monthly gross) = IF(status IN [D,E,F], 0, P × AD% × delivery_days)
 * - Column AO-AQ (monthly net) = IF(status IN [D,E,F], 0, Q × AD% × delivery_days)
 * - Column AJ (q_gross) = SUM(AL:AN)
 * - Column AK (q_net_rev) = SUM(AO:AQ)
 */

import { calculateDeliveryDays } from './deliveryDaysCalculation'

export type PipelineStageCode =
  | '【E】' // Exploration
  | '【D】' // Discovery
  | '【C】' // Consideration
  | '【B】' // Bargaining
  | '【A】' // Agreement
  | '【F】' // Failed
  | '【S】' // Suspended
  | '【Z】' // Closed

/**
 * Statuses that result in zero revenue calculations
 * Corresponds to Google Sheet: IF(OR($AC="【D】",$AC="【E】",$AC="【F】"), 0, ...)
 */
const ZERO_REVENUE_STATUSES: PipelineStageCode[] = ['【D】', '【E】', '【F】']

/**
 * Input fields required for pipeline revenue calculations
 */
export interface CalculationInputs {
  /** Column T - Maximum gross revenue per month */
  max_gross: number | null
  /** Column U - Revenue share percentage (0-100) */
  revenue_share: number | null
  /** Column AC - Pipeline status */
  status: PipelineStageCode
  /** Column AD - Progress percentage (0-100) */
  progress_percent: number | null
  /** Columns BV-BX - Monthly delivery days */
  monthly_forecasts: Array<{
    year: number
    month: number
    delivery_days: number | null
  }>
}

/**
 * Calculated output fields
 */
export interface CalculatedRevenue {
  /** Column P - Daily gross revenue (max_gross / 30) */
  day_gross: number | null
  /** Column Q - Daily net revenue (day_gross × revenue_share%) */
  day_net_rev: number | null
  /** Column AJ - Quarterly gross total */
  q_gross: number
  /** Column AK - Quarterly net total */
  q_net_rev: number
  /** Monthly forecasts with calculated revenue */
  monthly_forecasts: Array<{
    year: number
    month: number
    delivery_days: number | null
    gross_revenue: number
    net_revenue: number
  }>
  /** Metadata for quarterly breakdown (stored in pipelines.metadata JSONB) */
  metadata: {
    quarterly_breakdown: {
      gross: {
        first_month: number
        middle_month: number
        last_month: number
      }
      net: {
        first_month: number
        middle_month: number
        last_month: number
      }
    }
  }
}

/**
 * Calculate all pipeline revenue fields using Google Sheet formulas
 *
 * @param inputs - User input fields (max_gross, revenue_share, status, progress_percent, delivery_days)
 * @returns Calculated fields ready for database insert
 */
export function calculatePipelineRevenue(
  inputs: CalculationInputs
): CalculatedRevenue {
  // Step 1: Calculate daily rates (Columns P, Q)
  // Formula: day_gross = max_gross / 30
  const day_gross = inputs.max_gross !== null ? inputs.max_gross / 30 : null

  // Formula: day_net_rev = (max_gross / 30) × (revenue_share / 100)
  const day_net_rev =
    day_gross !== null && inputs.revenue_share !== null
      ? day_gross * (inputs.revenue_share / 100)
      : null

  // Step 2: Check if status requires zero revenue
  const isZeroRevenue = ZERO_REVENUE_STATUSES.includes(inputs.status)

  // Step 3: Calculate progress multiplier
  // Formula uses progress% directly: P × AD% × delivery_days
  const progressMultiplier =
    inputs.progress_percent !== null ? inputs.progress_percent / 100 : 0

  // Step 4: Calculate monthly revenue (Columns AL-AN for gross, AO-AQ for net)
  const monthly_forecasts = inputs.monthly_forecasts.map((forecast) => {
    let gross_revenue = 0
    let net_revenue = 0

    // Formula: IF(status IN [D,E,F], 0, day_gross × progress% × delivery_days)
    if (!isZeroRevenue && day_gross !== null && day_net_rev !== null) {
      const deliveryDays = forecast.delivery_days ?? 30

      gross_revenue = day_gross * progressMultiplier * deliveryDays
      net_revenue = day_net_rev * progressMultiplier * deliveryDays
    }

    return {
      year: forecast.year,
      month: forecast.month,
      delivery_days: forecast.delivery_days,
      gross_revenue: Math.round(gross_revenue * 100) / 100, // Round to 2 decimals
      net_revenue: Math.round(net_revenue * 100) / 100,
    }
  })

  // Step 5: Calculate quarterly totals (Columns AJ, AK)
  // Formula: SUM of 3 months
  const q_gross = monthly_forecasts.reduce(
    (sum, month) => sum + month.gross_revenue,
    0
  )
  const q_net_rev = monthly_forecasts.reduce(
    (sum, month) => sum + month.net_revenue,
    0
  )

  // Step 6: Build quarterly breakdown metadata structure
  const quarterly_breakdown = {
    gross: {
      first_month: monthly_forecasts[0]?.gross_revenue || 0,
      middle_month: monthly_forecasts[1]?.gross_revenue || 0,
      last_month: monthly_forecasts[2]?.gross_revenue || 0,
    },
    net: {
      first_month: monthly_forecasts[0]?.net_revenue || 0,
      middle_month: monthly_forecasts[1]?.net_revenue || 0,
      last_month: monthly_forecasts[2]?.net_revenue || 0,
    },
  }

  return {
    day_gross: day_gross !== null ? Math.round(day_gross * 100) / 100 : null,
    day_net_rev: day_net_rev !== null ? Math.round(day_net_rev * 100) / 100 : null,
    q_gross: Math.round(q_gross * 100) / 100,
    q_net_rev: Math.round(q_net_rev * 100) / 100,
    monthly_forecasts,
    metadata: { quarterly_breakdown },
  }
}

/**
 * Get default quarterly months for current fiscal quarter
 * FY quarters: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
 *
 * @returns Array of 3 months for current quarter with null delivery_days
 */
export function getDefaultQuarterlyMonths(): Array<{
  year: number
  month: number
  delivery_days: null
}> {
  const today = new Date()
  const currentMonth = today.getMonth() + 1 // 1-12
  const currentYear = today.getFullYear()

  // Determine fiscal month (Apr=1, May=2, ..., Mar=12)
  const fiscalMonth = currentMonth >= 4 ? currentMonth : currentMonth + 12

  // Calculate quarter start month (4, 7, 10, or 13)
  const quarterStartMonth = Math.floor((fiscalMonth - 4) / 3) * 3 + 4

  // Generate 3 months
  const months = []
  for (let i = 0; i < 3; i++) {
    let targetMonth = quarterStartMonth + i
    let targetYear = currentYear

    // Handle Q4 (Jan-Mar) which crosses year boundary
    if (targetMonth > 12) {
      targetMonth -= 12
      targetYear += 1
    }

    months.push({
      year: targetYear,
      month: targetMonth,
      delivery_days: null,
    })
  }

  return months
}

/**
 * Calculate pipeline revenue WITH auto-calculated delivery_days
 *
 * This is the enhanced version that auto-calculates delivery_days
 * based on starting_date and end_date using Google Sheet formula
 *
 * @param inputs - Calculation inputs WITH starting_date and end_date
 * @returns Calculated revenue with auto-calculated delivery_days
 */
export interface EnhancedCalculationInputs {
  /** Column T - Maximum gross revenue per month */
  max_gross: number | null
  /** Column U - Revenue share percentage (0-100) */
  revenue_share: number | null
  /** Column AC - Pipeline status */
  status: PipelineStageCode
  /** Column AD - Progress percentage (0-100) */
  progress_percent: number | null
  /** Column AB - Pipeline starting date */
  starting_date: Date | string | null
  /** Column AX - Pipeline end date */
  end_date: Date | string | null
  /** Fiscal year and quarter for determining months */
  fiscal_year?: number
  fiscal_quarter?: number | null
}

export function calculatePipelineRevenueWithDeliveryDays(
  inputs: EnhancedCalculationInputs
): CalculatedRevenue {
  // Step 1: Get quarterly months (either from fiscal_quarter or current quarter)
  const months = getDefaultQuarterlyMonths()

  // Step 2: Calculate delivery_days for each month using imported function
  const monthly_forecasts = months.map(({ year, month }) => ({
    year,
    month,
    delivery_days: calculateDeliveryDays(
      inputs.starting_date,
      year,
      month
    ),
  }))

  // Step 3: Use the standard calculatePipelineRevenue with calculated delivery_days
  return calculatePipelineRevenue({
    max_gross: inputs.max_gross,
    revenue_share: inputs.revenue_share,
    status: inputs.status,
    progress_percent: inputs.progress_percent,
    monthly_forecasts,
  })
}
