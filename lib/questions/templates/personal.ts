import { QueryConfig, QuestionTemplate, FormField } from './types'

export const personalTemplate: QuestionTemplate = {
  id: 'personal',
  action: 'personal',
  title: 'Personal',
  description: 'View your metrics (PIC/Team)',

  getFormFields: (): FormField[] => [
    {
      name: 'userRole',
      label: 'I am',
      type: 'select',
      options: [
        { label: 'PIC (Person In Charge)', value: 'pic' },
        { label: 'Team', value: 'team' },
      ],
      defaultValue: 'pic',
      required: true,
      helpText: 'Select your role',
    },
    {
      name: 'userName',
      label: 'Name/ID',
      type: 'text',
      placeholder: 'Ex: Linh, ABC Team',
      required: true,
      helpText: 'Will auto-fill from your profile',
    },
    {
      name: 'breakdownBy',
      label: 'View By (select multiple)',
      type: 'multiselect',
      options: [
        { label: 'Publisher (PID)', value: 'pid' },
        { label: 'Zone (ZID)', value: 'zid' },
        { label: 'Media (MID)', value: 'mid' },
        { label: 'Ad Format', value: 'format' },
        { label: 'Ad Source', value: 'adsource' },
      ],
      defaultValue: ['pid', 'zid'],
      required: true,
      helpText: 'Select dimensions to analyze',
    },
    {
      name: 'metric',
      label: 'Metric',
      type: 'select',
      options: [
        { label: 'Prediction', value: 'prediction' },
        { label: 'Revenue', value: 'revenue' },
        { label: 'Profit', value: 'profit' },
        { label: 'Ad Request', value: 'ad_request' },
        { label: 'eCPM', value: 'ecpm' },
      ],
      defaultValue: 'prediction',
      required: true,
    },
    {
      name: 'timeframe',
      label: 'During',
      type: 'select',
      options: [
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
      label: 'Compare With',
      type: 'select',
      options: [
        { label: 'Previous Week', value: 'previous_week' },
        { label: 'Previous Month', value: 'previous_month' },
        { label: 'No Comparison', value: 'none' },
      ],
      defaultValue: 'previous_month',
    },
    {
      name: 'filterByChange',
      label: 'Show',
      type: 'select',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Only items down >10%', value: 'declining' },
        { label: 'Only items up >10%', value: 'growing' },
        { label: 'Only items up/down >20%', value: 'significant' },
      ],
      defaultValue: 'all',
      helpText: 'Filter to show only significant changes',
    },
    {
      name: 'sortBy',
      label: 'Sort By',
      type: 'select',
      options: [
        { label: 'Revenue (highest)', value: 'revenue_desc' },
        { label: 'Change (most declined)', value: 'change_asc' },
        { label: 'Change (most grown)', value: 'change_desc' },
        { label: 'Name (A-Z)', value: 'name_asc' },
      ],
      defaultValue: 'revenue_desc',
    },
    {
      name: 'explainEnabled',
      label: 'Explain reasons for changes',
      type: 'checkbox',
      defaultValue: true,
      helpText: 'System will explain why numbers changed',
    },
  ],

  validateConfig: (config: QueryConfig): string | null => {
    if (!config.userRole) return 'Please select role'
    if (!config.userName) return 'Please enter name/ID'
    if (!config.breakdownBy || config.breakdownBy.length === 0) return 'Please select at least 1 dimension'
    if (!config.metric) return 'Please select metric'
    if (!config.timeframe) return 'Please select time period'
    return null
  },
}
