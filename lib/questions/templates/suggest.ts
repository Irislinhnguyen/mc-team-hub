import { QueryConfig, QuestionTemplate, FormField } from './types'

export const suggestTemplate: QuestionTemplate = {
  id: 'suggest',
  action: 'suggest',
  title: 'Suggest',
  description: 'Get suggestions for growth, upsell, or churn risk',

  getFormFields: (): FormField[] => [
    {
      name: 'suggestType',
      label: 'Suggestion Type',
      type: 'select',
      options: [
        { label: 'Upsell Opportunities (unused formats)', value: 'upsell' },
        { label: 'Churn Risk (at risk of becoming inactive)', value: 'churn_risk' },
        { label: 'Growth Potential (high potential)', value: 'growth_potential' },
      ],
      defaultValue: 'upsell',
      required: true,
      helpText: 'Select type of suggestion',
    },
    {
      name: 'targetEntity',
      label: 'For',
      type: 'text',
      placeholder: 'Ex: PID123, ABC Publisher',
      required: true,
      helpText: 'Enter Publisher ID or name',
    },
    {
      name: 'basedOn',
      label: 'Based On (select multiple)',
      type: 'multiselect',
      options: [
        { label: 'Unused formats', value: 'unused_formats' },
        { label: 'Revenue potential', value: 'revenue_potential' },
        { label: 'Similar publishers', value: 'similar_publishers' },
        { label: 'Market trend', value: 'market_trend' },
        { label: 'Category trend', value: 'category_trend' },
      ],
      defaultValue: ['unused_formats', 'revenue_potential'],
      helpText: 'Select criteria for suggestions',
    },
    {
      name: 'timeframe',
      label: 'Based On Data From',
      type: 'select',
      options: [
        { label: 'This Month', value: 'this_month' },
        { label: 'Last 3 Months', value: 'last_3months' },
        { label: 'Last 6 Months', value: 'last_6months' },
        { label: 'This Year', value: 'this_year' },
      ],
      defaultValue: 'last_3months',
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
    {
      name: 'limit',
      label: 'Show Suggestions',
      type: 'select',
      options: [
        { label: 'Top 5', value: '5' },
        { label: 'Top 10', value: '10' },
        { label: 'Top 20', value: '20' },
      ],
      defaultValue: '10',
    },
  ],

  validateConfig: (config: QueryConfig): string | null => {
    if (!config.suggestType) return 'Please select suggestion type'
    if (!config.targetEntity) return 'Please enter Publisher'
    if (!config.basedOn || config.basedOn.length === 0) return 'Please select at least 1 criteria'
    return null
  },
}
