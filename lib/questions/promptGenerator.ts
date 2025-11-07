import { QuestionTemplate, FormField } from './templates'

export function generatePreviewText(
  template: QuestionTemplate,
  formData: Record<string, any>
): string {
  const actionType = formData.action || 'check'

  switch (actionType) {
    case 'check':
      return generateCheckPreview(formData)
    case 'compare':
      return generateComparePreview(formData)
    case 'rank':
      return generateRankPreview(formData)
    case 'suggest':
      return generateSuggestPreview(formData)
    case 'personal':
      return generatePersonalPreview(formData)
    default:
      return 'Build your query...'
  }
}

function generateCheckPreview(formData: Record<string, any>): string {
  const metrics: Record<string, string> = {
    revenue: 'Revenue',
    profit: 'Profit',
    count: 'Count',
    ad_request: 'Ad Request',
    ecpm: 'eCPM',
    fill_rate: 'Fill Rate',
    prediction: 'Prediction'
  }

  const entityLabels: Record<string, string> = {
    publisher: 'Publisher',
    zone: 'Zone',
    format: 'Format',
    team: 'Team'
  }

  const timeframeLabels: Record<string, string> = {
    yesterday: 'yesterday',
    this_week: 'this week',
    this_month: 'this month',
    last_7days: 'last 7 days',
    last_30days: 'last 30 days',
    custom: 'custom period'
  }

  const comparisonLabels: Record<string, string> = {
    previous_period: 'previous period',
    previous_timeframe: 'previous timeframe',
    average_30d: 'average of last 30 days',
    average_90d: 'average of last 90 days',
    yoy: 'year-over-year'
  }

  const metric = metrics[formData.metric] || 'metric'
  const entity = entityLabels[formData.entityType] || 'entity'
  const timeframe = timeframeLabels[formData.timeframe] || 'period'
  const comparison = comparisonLabels[formData.comparisonPeriod] || ''

  let preview = `Check ${metric} for ${entity} during ${timeframe}`

  if (comparison) {
    preview += ` compared with ${comparison}`
  }

  if (formData.explainEnabled && formData.explainBy && formData.explainBy.length > 0) {
    const factors = mapExplainFactors(formData.explainBy)
    preview += `. Explain by ${factors}`
  }

  return preview + '.'
}

function generateComparePreview(formData: Record<string, any>): string {
  const entityLabels: Record<string, string> = {
    publisher: 'Publisher',
    zone: 'Zone',
    format: 'Format',
    team: 'Team'
  }

  const timeframeLabels: Record<string, string> = {
    yesterday: 'yesterday',
    this_week: 'this week',
    this_month: 'this month',
    last_7days: 'last 7 days',
    last_30days: 'last 30 days',
    custom: 'custom period'
  }

  const entity = entityLabels[formData.entityType] || 'entity'
  const entity1 = formData.entity1 || '[first entity]'
  const entity2 = formData.entity2 || '[second entity]'
  const timeframe = timeframeLabels[formData.timeframe] || 'period'

  const preview = `Compare ${entity1} vs ${entity2} during ${timeframe}`

  return preview + '.'
}

function generateRankPreview(formData: Record<string, any>): string {
  const metrics: Record<string, string> = {
    revenue: 'Revenue',
    profit: 'Profit',
    count: 'Count',
    ad_request: 'Ad Request',
    ecpm: 'eCPM',
    fill_rate: 'Fill Rate',
    prediction: 'Prediction'
  }

  const timeframeLabels: Record<string, string> = {
    yesterday: 'yesterday',
    this_week: 'this week',
    this_month: 'this month',
    last_7days: 'last 7 days',
    last_30days: 'last 30 days',
    custom: 'custom period'
  }

  const ranking = formData.rankingType === 'top' ? 'top' : 'bottom'
  const limit = formData.rankLimit || '10'
  const metric = metrics[formData.rankMetric] || 'metric'
  const timeframe = timeframeLabels[formData.timeframe] || 'period'

  const preview = `Show ${ranking} ${limit} entities ranked by ${metric} during ${timeframe}`

  return preview + '.'
}

function generateSuggestPreview(formData: Record<string, any>): string {
  const suggestTypes: Record<string, string> = {
    upsell: 'upsell opportunities',
    churn_risk: 'churn risks',
    growth_potential: 'growth potential'
  }

  const timeframeLabels: Record<string, string> = {
    yesterday: 'yesterday',
    this_week: 'this week',
    this_month: 'this month',
    last_7days: 'last 7 days',
    last_30days: 'last 30 days',
    custom: 'custom period'
  }

  const suggestType = suggestTypes[formData.suggestType] || 'suggestions'
  const timeframe = timeframeLabels[formData.timeframe] || 'period'

  const preview = `Get ${suggestType} based on ${timeframe} data`

  return preview + '.'
}

function generatePersonalPreview(formData: Record<string, any>): string {
  const metrics: Record<string, string> = {
    revenue: 'Revenue',
    profit: 'Profit',
    count: 'Count',
    ad_request: 'Ad Request',
    ecpm: 'eCPM',
    fill_rate: 'Fill Rate',
    prediction: 'Prediction'
  }

  const timeframeLabels: Record<string, string> = {
    yesterday: 'yesterday',
    this_week: 'this week',
    this_month: 'this month',
    last_7days: 'last 7 days',
    last_30days: 'last 30 days',
    custom: 'custom period'
  }

  const metric = metrics[formData.metric] || 'metric'
  const role = formData.userRole || 'your role'
  const name = formData.userName || ''
  const timeframe = timeframeLabels[formData.timeframe] || 'period'

  const preview = `Show ${metric} for ${role}${name ? ` ${name}` : ''} during ${timeframe}`

  return preview + '.'
}

function mapExplainFactors(factors: string[]): string {
  const labels: Record<string, string> = {
    req: 'ad requests',
    fill_rate: 'fill rate',
    ecpm: 'eCPM',
    zone: 'zone',
    pid: 'publisher',
    mid: 'media',
    format: 'ad format',
    adsource: 'ad source',
    team: 'team',
  }

  return factors.map((f) => labels[f] || f).join(' and ')
}
