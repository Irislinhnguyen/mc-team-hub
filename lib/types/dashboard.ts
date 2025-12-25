/**
 * TypeScript types for Pipeline Dashboard
 */

export interface DashboardOverview {
  total_deals: number
  total_pipeline_value: number
  weighted_pipeline_value: number
  avg_deal_size: number
  win_rate: number
}

export interface StatusBreakdown {
  status: string
  status_name: string
  status_description: string
  status_color: string
  count: number
  total_value: number
  weighted_value: number
  estimate_percent: number
  out_of_estimate_percent: number
}

export interface PocPerformance {
  poc: string
  count: number
  total_value: number
  weighted_value: number
  avg_deal_size: number
  win_rate: number
}

export interface RegionBreakdown {
  region: string
  count: number
  total_value: number
  weighted_value: number
}

export interface ProductBreakdown {
  product: string
  count: number
  total_value: number
  weighted_value: number
}

export interface MonthlyForecast {
  year: number
  month: number
  month_label: string // "Jan 2025"
  gross_revenue: number
  net_revenue: number
  deal_count: number
}

export interface ActionItem {
  id: string
  publisher: string
  poc: string
  status: string
  status_color: string
  action_date: string
  next_action: string | null
  action_detail: string | null
  q_gross: number | null
  days_until_action: number
}

export interface TopOpportunity {
  id: string
  publisher: string
  poc: string
  team: string | null
  status: string
  status_name: string
  status_color: string
  q_gross: number | null
  q_net_rev: number | null
  progress_percent: number | null
  next_action: string | null
  days_in_status: number
}

export interface DashboardStats {
  overview: DashboardOverview
  by_status: StatusBreakdown[]
  by_poc: PocPerformance[]
  by_region: RegionBreakdown[]
  by_product: ProductBreakdown[]
  monthly_forecast: MonthlyForecast[]
  action_items: ActionItem[]
  top_opportunities: TopOpportunity[]
}
