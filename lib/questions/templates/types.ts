// Type definitions for all question templates

export type ActionType = 'check' | 'compare' | 'suggest' | 'rank' | 'personal'
export type MetricType = 'revenue' | 'profit' | 'count' | 'ad_request' | 'ecpm' | 'fill_rate' | 'prediction'
export type EntityType = 'team' | 'pic' | 'publisher' | 'zone' | 'format' | 'media' | 'adsource'
export type TimeframeType = 'yesterday' | 'this_week' | 'this_month' | 'last_7days' | 'last_30days' | 'custom'
export type ComparisonType = 'previous_period' | 'previous_timeframe' | 'average_30d' | 'average_90d' | 'yoy'
export type ExplainByType = 'req' | 'fill_rate' | 'ecpm' | 'zone' | 'pid' | 'mid' | 'format' | 'adsource' | 'team'

export interface FilterConfig {
  adFormat?: string[]
  team?: string[]
  market?: string[]
  status?: string[]
  minRevenue?: number
  [key: string]: any
}

export interface QueryConfig {
  action: ActionType
  metric?: MetricType
  entity?: EntityType
  timeframe?: TimeframeType
  comparison?: ComparisonType
  filters?: FilterConfig
  explainBy?: ExplainByType[]
  // For check & explain
  userRole?: string
  userName?: string
  filterByChange?: string
  sortBy?: string
  explainEnabled?: boolean
  // For compare
  entity1?: EntityType | string
  entity2?: EntityType | string
  metrics?: MetricType[]
  // For suggest
  suggestType?: 'upsell' | 'churn_risk' | 'growth_potential'
  targetEntity?: string
  basedOn?: string[]
  marketFilter?: string
  limit?: string | number
  // For rank
  ranking?: 'top' | 'bottom'
  // For personal
  userPic?: string
  breakdownBy?: EntityType[] | string[]
  // For custom date range
  startDate?: string | Date
  endDate?: string | Date
  // Flexible support for any additional fields
  [key: string]: any
}

export interface AnalysisResult {
  summary: {
    metric: string
    current: number
    previous: number
    change: number
    changePct: number
    status: 'up' | 'down' | 'stable' | 'new' | 'dropped'
  }
  details: Array<{
    entityId: string | number
    entityName: string
    current: number
    previous: number
    change: number
    changePct: number
    status: 'up' | 'down' | 'stable' | 'new' | 'dropped' | 'growing' | 'declining' | 'at_risk'
    [key: string]: any
  }>
  contributions?: {
    req?: ContributionMetric
    fill_rate?: ContributionMetric
    ecpm?: ContributionMetric
    [key: string]: ContributionMetric
  }
  metadata: {
    queryTime: number
    rowsReturned: number
    generatedAt: string
  }
}

export interface ContributionMetric {
  change: number
  changePct: number
  contribution: number
  contributionPct: number
  status: 'primary' | 'secondary' | 'minor'
}

export interface FormField {
  name: string
  label: string
  type: 'select' | 'multiselect' | 'checkbox' | 'number' | 'text' | 'radio'
  options?: Array<{ label: string; value: string | number }>
  defaultValue?: string | number | boolean | string[]
  required?: boolean
  helpText?: string
  placeholder?: string
  validation?: (value: any) => string | null
}

export interface QuestionTemplate {
  id: string
  action: ActionType
  title: string
  description: string
  getFormFields: () => FormField[]
  validateConfig: (config: QueryConfig) => string | null
}
