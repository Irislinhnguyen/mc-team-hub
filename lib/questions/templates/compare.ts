import { QueryConfig, QuestionTemplate, FormField } from './types'

export const compareTemplate: QuestionTemplate = {
  id: 'compare',
  action: 'compare',
  title: 'Compare',
  description: 'Compare performance between 2 entities',

  getFormFields: (): FormField[] => [
    {
      name: 'entity1',
      label: 'Entity 1',
      type: 'text',
      placeholder: 'Ex: Flexible Sticky, WipeAd, PID123',
      required: true,
      helpText: 'Enter name or ID of first entity',
    },
    {
      name: 'entity2',
      label: 'Entity 2',
      type: 'text',
      placeholder: 'Ex: WipeAd, Video, PID456',
      required: true,
      helpText: 'Enter name or ID of second entity',
    },
    {
      name: 'metrics',
      label: 'Metrics to Compare (select multiple)',
      type: 'multiselect',
      options: [
        { label: 'Revenue', value: 'revenue' },
        { label: 'Profit', value: 'profit' },
        { label: 'Ad Request', value: 'ad_request' },
        { label: 'eCPM', value: 'ecpm' },
        { label: 'Fill Rate', value: 'fill_rate' },
        { label: 'Active Zones', value: 'count' },
      ],
      defaultValue: ['revenue', 'ad_request', 'ecpm'],
      required: true,
      helpText: 'Select metrics to compare',
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
      name: 'comparison',
      label: 'Also Compare With (optional)',
      type: 'select',
      options: [
        { label: 'No', value: 'none' },
        { label: 'Previous Period', value: 'previous_period' },
        { label: 'Average 30 Days', value: 'average_30d' },
      ],
      defaultValue: 'none',
      helpText: 'Add a column to compare with another period',
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
    if (!config.entity1) return 'Please enter Entity 1'
    if (!config.entity2) return 'Please enter Entity 2'
    if (!config.metrics || config.metrics.length === 0) return 'Please select at least 1 metric'
    if (!config.timeframe) return 'Please select a time period'
    return null
  },
}
