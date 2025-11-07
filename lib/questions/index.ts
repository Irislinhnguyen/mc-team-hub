/**
 * Question Library - Maps common sales questions to templates
 * Simplifies the UI from complex template navigation to simple question-based flow
 */

export interface QuestionOption {
  label: string
  value: string
  icon?: string
}

export interface QuestionField {
  name: string
  label: string
  type: 'select' | 'text' | 'number' | 'date'
  options?: QuestionOption[]
  placeholder?: string
  required?: boolean
  defaultValue?: string
}

export interface Question {
  id: string
  title: string
  subtitle?: string
  icon: string
  description: string
  templateId: string
  fillInBlanks: QuestionField[]
  keywords: string[] // For natural language search
}

export const QUESTIONS: Question[] = [
  {
    id: 'revenue_drop_analysis',
    title: 'Why did revenue drop?',
    subtitle: 'Compare yesterday vs 30-day average',
    icon: '',
    description: 'Analyze revenue drops by team, zone, publisher, or ad format',
    templateId: 'team_daily_vs_30d',
    keywords: ['drop', 'revenue', 'decreased', 'down', 'yesterday', 'decline'],
    fillInBlanks: [
      {
        name: 'team',
        label: 'Your Team',
        type: 'select',
        options: [
          { label: 'APP_GV', value: 'APP_GV' },
          { label: 'WEB_GV', value: 'WEB_GV' },
          { label: 'WEB_GTI', value: 'WEB_GTI' },
          { label: 'All Teams', value: 'All Teams' },
        ],
        defaultValue: 'All Teams',
      },
      {
        name: 'metric',
        label: 'What metric?',
        type: 'select',
        options: [
          { label: 'Revenue', value: 'revenue' },
          { label: 'Profit', value: 'profit' },
          { label: 'RPM', value: 'rpm' },
          { label: 'Impressions', value: 'impressions' },
        ],
        defaultValue: 'revenue',
      },
      {
        name: 'drill_down',
        label: 'Show me breakdown by',
        type: 'select',
        options: [
          { label: 'Publisher', value: 'publisher' },
          { label: 'Zone', value: 'zone' },
          { label: 'Ad Format', value: 'product' },
          { label: 'Nothing - just summary', value: 'none' },
        ],
        defaultValue: 'publisher',
      },
    ],
  },

  {
    id: 'top_publishers',
    title: 'Top publishers by metric',
    subtitle: 'Rank publishers by revenue, profit, or requests',
    icon: '',
    description: 'Find your top-performing publishers this month',
    templateId: 'top_publishers_by_metric',
    keywords: ['top', 'best', 'high', 'revenue', 'profit', 'publishers', 'leading'],
    fillInBlanks: [
      {
        name: 'metric',
        label: 'Sort by',
        type: 'select',
        options: [
          { label: 'Revenue', value: 'revenue' },
          { label: 'Profit', value: 'profit' },
          { label: 'Requests', value: 'requests' },
        ],
        defaultValue: 'revenue',
      },
      {
        name: 'limit',
        label: 'How many?',
        type: 'select',
        options: [
          { label: 'Top 10', value: '10' },
          { label: 'Top 20', value: '20' },
          { label: 'Top 50', value: '50' },
        ],
        defaultValue: '20',
      },
    ],
  },

  {
    id: 'upsell_opportunities',
    title: 'Upsell opportunity finder',
    subtitle: 'Which formats can I sell to a publisher?',
    icon: '',
    description: 'Find unused formats that similar publishers are using successfully',
    templateId: 'upsell_opportunity',
    keywords: ['upsell', 'opportunity', 'unused', 'format', 'recommend', 'sell'],
    fillInBlanks: [
      {
        name: 'top_n',
        label: 'Show me top',
        type: 'select',
        options: [
          { label: '5 Opportunities', value: '5' },
          { label: '10 Opportunities', value: '10' },
          { label: '20 Opportunities', value: '20' },
        ],
        defaultValue: '10',
      },
      {
        name: 'min_peer_revenue',
        label: 'Only if peers make >',
        type: 'select',
        options: [
          { label: '$500/month', value: '500' },
          { label: '$1,000/month', value: '1000' },
          { label: '$5,000/month', value: '5000' },
        ],
        defaultValue: '1000',
      },
    ],
  },

  {
    id: 'format_performance',
    title: 'Format growth & decline',
    subtitle: 'Which formats are hot, which are cooling?',
    icon: '',
    description: 'See which ad formats are growing or losing momentum this month',
    templateId: 'adformat_growth_decline',
    keywords: ['format', 'growth', 'trend', 'decline', 'performance', 'product'],
    fillInBlanks: [
      {
        name: 'metric',
        label: 'Measure by',
        type: 'select',
        options: [
          { label: 'Revenue', value: 'revenue' },
          { label: 'Profit', value: 'profit' },
          { label: 'Impressions', value: 'impressions' },
        ],
        defaultValue: 'revenue',
      },
      {
        name: 'compare_to',
        label: 'Compare to',
        type: 'select',
        options: [
          { label: 'Last Month', value: 'last month' },
          { label: 'Last Quarter', value: 'last quarter' },
          { label: 'Year Ago', value: 'year ago' },
        ],
        defaultValue: 'last month',
      },
    ],
  },

  {
    id: 'churn_risk',
    title: 'Churn risk detection',
    subtitle: 'Which publishers are at risk of leaving?',
    icon: '',
    description: 'Identify publishers showing declining revenue (risky trends)',
    templateId: 'churn_risk_detector',
    keywords: ['churn', 'risk', 'decline', 'leave', 'at risk', 'drop'],
    fillInBlanks: [
      {
        name: 'risk_threshold',
        label: 'Risk threshold',
        type: 'select',
        options: [
          { label: 'High Risk (>50% drop)', value: '50' },
          { label: 'Medium Risk (>20% drop)', value: '20' },
          { label: 'Any decline', value: '0' },
        ],
        defaultValue: '50',
      },
      {
        name: 'min_historical_revenue',
        label: 'Only consider if they made >',
        type: 'select',
        options: [
          { label: '$1,000', value: '1000' },
          { label: '$5,000', value: '5000' },
          { label: '$10,000', value: '10000' },
        ],
        defaultValue: '5000',
      },
    ],
  },

  {
    id: 'team_performance',
    title: 'Team performance by week',
    subtitle: 'How are my teams doing?',
    icon: '',
    description: 'Compare performance across teams week by week',
    templateId: 'team_prediction_breakdown',
    keywords: ['team', 'performance', 'weekly', 'compare', 'breakdown'],
    fillInBlanks: [
      {
        name: 'metric',
        label: 'Compare by',
        type: 'select',
        options: [
          { label: 'Revenue', value: 'revenue' },
          { label: 'Profit', value: 'profit' },
          { label: 'Publishers', value: 'count' },
        ],
        defaultValue: 'revenue',
      },
      {
        name: 'days_back',
        label: 'Time period',
        type: 'select',
        options: [
          { label: 'Last 2 weeks', value: '14' },
          { label: 'Last month', value: '30' },
          { label: 'Last quarter', value: '90' },
        ],
        defaultValue: '30',
      },
    ],
  },

  {
    id: 'format_comparison',
    title: 'Compare two formats',
    subtitle: 'Head-to-head: Format A vs Format B',
    icon: '',
    description: 'Benchmark performance of two ad formats side by side',
    templateId: 'compare_two_formats',
    keywords: ['compare', 'versus', 'vs', 'format', 'benchmark', 'difference'],
    fillInBlanks: [
      {
        name: 'format1',
        label: 'Format 1',
        type: 'select',
        options: [
          { label: 'WipeAd', value: 'WipeAd' },
          { label: 'Sticky', value: 'Sticky' },
          { label: 'Flexible Sticky', value: 'Flexible Sticky' },
          { label: 'Expandable', value: 'Expandable' },
          { label: 'Overlay', value: 'Overlay' },
        ],
        defaultValue: 'WipeAd',
      },
      {
        name: 'format2',
        label: 'Format 2',
        type: 'select',
        options: [
          { label: 'WipeAd', value: 'WipeAd' },
          { label: 'Sticky', value: 'Sticky' },
          { label: 'Flexible Sticky', value: 'Flexible Sticky' },
          { label: 'Expandable', value: 'Expandable' },
          { label: 'Overlay', value: 'Overlay' },
        ],
        defaultValue: 'Sticky',
      },
      {
        name: 'days_back',
        label: 'Time period',
        type: 'select',
        options: [
          { label: 'Last 7 days', value: '7' },
          { label: 'Last 30 days', value: '30' },
          { label: 'Last 90 days', value: '90' },
        ],
        defaultValue: '30',
      },
    ],
  },

  {
    id: 'publisher_analysis',
    title: 'Publisher deep dive',
    subtitle: 'Why did this publisher\'s revenue change?',
    icon: '',
    description: 'Analyze a specific publisher performance by zone and format',
    templateId: 'pid_deep_dive',
    keywords: ['publisher', 'pid', 'specific', 'analyze', 'zone', 'product'],
    fillInBlanks: [
      {
        name: 'pid',
        label: 'Publisher ID',
        type: 'text',
        placeholder: 'e.g., 12345',
        required: true,
      },
      {
        name: 'metric',
        label: 'Analyze by',
        type: 'select',
        options: [
          { label: 'Revenue', value: 'revenue' },
          { label: 'Profit', value: 'profit' },
          { label: 'Impressions', value: 'impressions' },
        ],
        defaultValue: 'revenue',
      },
      {
        name: 'period',
        label: 'Compare to',
        type: 'select',
        options: [
          { label: 'Yesterday', value: 'vs yesterday' },
          { label: '7 days ago', value: 'vs 7d ago' },
          { label: '30-day average', value: 'vs 30d avg' },
        ],
        defaultValue: 'vs yesterday',
      },
    ],
  },

  {
    id: 'zone_performance',
    title: 'Zone-level performance',
    subtitle: 'How are my zones doing?',
    icon: '',
    description: 'Analyze performance across zones over time',
    templateId: 'zone_performance_change',
    keywords: ['zone', 'site', 'location', 'performance', 'analyze'],
    fillInBlanks: [
      {
        name: 'days_back',
        label: 'Time period',
        type: 'select',
        options: [
          { label: 'Last 7 days', value: '7' },
          { label: 'Last 30 days', value: '30' },
          { label: 'Last 90 days', value: '90' },
        ],
        defaultValue: '30',
      },
      {
        name: 'metric',
        label: 'Measure by',
        type: 'select',
        options: [
          { label: 'Revenue', value: 'revenue' },
          { label: 'Profit', value: 'profit' },
          { label: 'Impressions', value: 'impressions' },
        ],
        defaultValue: 'revenue',
      },
    ],
  },
]

export function getQuestionById(id: string): Question | undefined {
  return QUESTIONS.find((q) => q.id === id)
}

export function searchQuestions(query: string): Question[] {
  const lowerQuery = query.toLowerCase().trim()
  if (!lowerQuery) return QUESTIONS

  return QUESTIONS.filter((question) => {
    // Search in title, subtitle, description
    const titleMatch = question.title.toLowerCase().includes(lowerQuery)
    const subtitleMatch = question.subtitle?.toLowerCase().includes(lowerQuery) ?? false
    const descriptionMatch = question.description.toLowerCase().includes(lowerQuery)

    // Search in keywords
    const keywordMatch = question.keywords.some((kw) =>
      kw.toLowerCase().includes(lowerQuery) || lowerQuery.includes(kw.toLowerCase()),
    )

    return titleMatch || subtitleMatch || descriptionMatch || keywordMatch
  })
}
