import { QueryConfig, QuestionTemplate, FormField } from './types'

export const checkAndExplainTemplate: QuestionTemplate = {
  id: 'check_and_explain',
  action: 'check',
  title: 'Check & Explain',
  description: 'Check metrics and explain reasons for changes',

  getFormFields: (): FormField[] => [
    {
      name: 'metric',
      label: 'Metric',
      type: 'select',
      options: [
        { label: 'Revenue', value: 'revenue' },
        { label: 'Profit', value: 'profit' },
        { label: 'Count', value: 'count' },
        { label: 'Ad Request', value: 'ad_request' },
        { label: 'eCPM', value: 'ecpm' },
        { label: 'Fill Rate', value: 'fill_rate' },
        { label: 'Prediction', value: 'prediction' },
      ],
      defaultValue: 'revenue',
      required: true,
      helpText: 'Select which metric to check',
    },
    {
      name: 'entity',
      label: 'For',
      type: 'select',
      options: [
        { label: 'Team', value: 'team' },
        { label: 'PIC', value: 'pic' },
        { label: 'Publisher', value: 'publisher' },
        { label: 'Zone', value: 'zone' },
        { label: 'Ad Format', value: 'format' },
        { label: 'Media', value: 'media' },
        { label: 'Ad Source', value: 'adsource' },
      ],
      defaultValue: 'publisher',
      required: true,
      helpText: 'Select dimension to analyze',
    },
    {
      name: 'timeframe',
      label: 'During',
      type: 'select',
      options: [
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'Last 7 Days', value: 'last_7days' },
        { label: 'Last 30 Days', value: 'last_30days' },
      ],
      defaultValue: 'yesterday',
      required: true,
      helpText: 'Select current time period',
    },
    {
      name: 'comparison',
      label: 'Compare With',
      type: 'select',
      options: [
        { label: 'Previous Period', value: 'previous_period' },
        { label: 'Previous Timeframe', value: 'previous_timeframe' },
        { label: 'Average 30 Days', value: 'average_30d' },
        { label: 'Average 90 Days', value: 'average_90d' },
        { label: 'Year-over-Year', value: 'yoy' },
      ],
      defaultValue: 'previous_period',
      required: true,
      helpText: 'Select comparison period',
    },
    {
      name: 'customEntities',
      label: 'Specify Entities (optional)',
      type: 'text',
      placeholder: 'Ex: PID123, PID456, PID789 (comma-separated)',
      helpText: 'Leave empty for all. Enter specific IDs to analyze only those',
    },
    {
      name: 'customEntityNames',
      label: 'Or Select from List',
      type: 'multiselect',
      options: [],
      helpText: 'Or search and select from dropdown',
    },
    {
      name: 'adFormatFilter',
      label: 'Filter by Ad Format',
      type: 'multiselect',
      options: [
        { label: 'Flexible Sticky', value: 'flexible_sticky' },
        { label: 'WipeAd', value: 'wipead' },
        { label: 'Video', value: 'video' },
        { label: 'Overlay', value: 'overlay' },
      ],
      helpText: 'Leave empty for all',
    },
    {
      name: 'teamFilter',
      label: 'Filter by Team',
      type: 'multiselect',
      options: [
        { label: 'APP_GV', value: 'APP_GV' },
        { label: 'WEB_GV', value: 'WEB_GV' },
        { label: 'WEB_GTI', value: 'WEB_GTI' },
      ],
      helpText: 'Leave empty for all',
    },
    {
      name: 'marketFilter',
      label: 'Market',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Thailand', value: 'TH' },
        { label: 'Vietnam', value: 'VN' },
        { label: 'Indonesia', value: 'ID' },
      ],
      defaultValue: 'all',
      helpText: 'Leave empty for all',
    },
    {
      name: 'explainEnabled',
      label: 'Explain reasons for changes',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'System will analyze why metrics changed',
    },
    {
      name: 'explainBy',
      label: 'Explain by (max 3)',
      type: 'multiselect',
      options: [
        { label: 'Ad Request', value: 'req' },
        { label: 'Fill Rate', value: 'fill_rate' },
        { label: 'eCPM', value: 'ecpm' },
        { label: 'Zone breakdown', value: 'zone' },
        { label: 'Publisher breakdown', value: 'pid' },
        { label: 'Format breakdown', value: 'format' },
        { label: 'Ad Source breakdown', value: 'adsource' },
      ],
      helpText: 'Select factors to analyze',
    },
  ],

  validateConfig: (config: QueryConfig): string | null => {
    if (!config.metric) return 'Please select a metric'
    if (!config.entity) return 'Please select a dimension'
    if (!config.timeframe) return 'Please select a time period'
    if (!config.comparison) return 'Please select a comparison period'
    if (config.explainEnabled && config.explainBy && config.explainBy.length > 3) {
      return 'Maximum 3 factors can be selected'
    }
    return null
  },
}
