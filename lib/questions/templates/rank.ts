import { QueryConfig, QuestionTemplate, FormField } from './types'

export const rankTemplate: QuestionTemplate = {
  id: 'rank',
  action: 'rank',
  title: 'Rank',
  description: 'Rank entities by metric',

  getFormFields: (): FormField[] => [
    {
      name: 'ranking',
      label: 'Show',
      type: 'radio',
      options: [
        { label: 'Top 5', value: 'top_5' },
        { label: 'Top 10', value: 'top_10' },
        { label: 'Top 20', value: 'top_20' },
        { label: 'Top 50', value: 'top_50' },
        { label: 'Bottom 5', value: 'bottom_5' },
        { label: 'Bottom 10', value: 'bottom_10' },
      ],
      defaultValue: 'top_10',
      required: true,
    },
    {
      name: 'entity',
      label: 'Entity',
      type: 'select',
      options: [
        { label: 'Publisher', value: 'publisher' },
        { label: 'Zone', value: 'zone' },
        { label: 'Ad Format', value: 'format' },
        { label: 'Team', value: 'team' },
        { label: 'Media', value: 'media' },
      ],
      defaultValue: 'publisher',
      required: true,
      helpText: 'Select entity type to rank',
    },
    {
      name: 'metric',
      label: 'By Metric',
      type: 'select',
      options: [
        { label: 'Revenue', value: 'revenue' },
        { label: 'Profit', value: 'profit' },
        { label: 'Ad Request', value: 'ad_request' },
        { label: 'eCPM', value: 'ecpm' },
        { label: 'Fill Rate', value: 'fill_rate' },
        { label: 'Prediction', value: 'prediction' },
      ],
      defaultValue: 'revenue',
      required: true,
    },
    {
      name: 'timeframe',
      label: 'Time Period',
      type: 'select',
      options: [
        { label: 'Yesterday', value: 'yesterday' },
        { label: 'This Week', value: 'this_week' },
        { label: 'This Month', value: 'this_month' },
        { label: 'Last 7 Days', value: 'last_7days' },
        { label: 'Last 30 Days', value: 'last_30days' },
      ],
      defaultValue: 'this_month',
      required: true,
    },
    {
      name: 'minValue',
      label: 'Minimum Revenue (optional)',
      type: 'number',
      placeholder: 'Ex: 1000',
      helpText: 'Only show entities with revenue >= this value',
    },
    {
      name: 'adFormatFilter',
      label: 'Ad Format',
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
      label: 'Team',
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
    },
  ],

  validateConfig: (config: QueryConfig): string | null => {
    if (!config.ranking) return 'Please select ranking type'
    if (!config.entity) return 'Please select entity'
    if (!config.metric) return 'Please select metric'
    if (!config.timeframe) return 'Please select time period'
    return null
  },
}
