/**
 * Template Type Definitions
 * Defines all types for the 19 analytics templates
 */

export type FormFieldType = 'text' | 'select' | 'date' | 'date-range' | 'multi-select' | 'number'

export interface FormField {
  name: string
  label: string
  type: FormFieldType
  placeholder?: string
  options?: string[] | { label: string; value: string }[]
  defaultValue?: string | string[]
  required?: boolean
  description?: string
  min?: number
  max?: number
}

export interface TemplateCategory {
  id: string
  name: string
  description: string
  color: string
  icon: string
}

export interface AnalyticsTemplate {
  id: string
  title: string
  description: string
  category: TemplateCategory
  fields: FormField[]
  sourceTable: string | string[]
  buildQuery: (params: Record<string, any>) => string
  expectedColumns?: string[]
  insights?: string[]
}

export interface QueryResult {
  status: 'success' | 'error'
  rowCount: number
  executionTimeMs: number
  sampleData: Record<string, any>[]
  columns?: string[]
  analysis?: {
    analysis: string
    keyInsights: string[]
    recommendations: string[]
    validationScore: number
    dataQualityIssues?: string[]
  }
  error?: string
}

// Template Categories
export const CATEGORIES = {
  PERFORMANCE: {
    id: 'performance',
    name: 'Performance Analysis',
    description: 'Analyze performance metrics and trends',
    color: 'blue',
    icon: '📊',
  },
  PREDICTION: {
    id: 'prediction',
    name: 'Prediction & Forecasting',
    description: 'Forecast and predict future performance',
    color: 'purple',
    icon: '🔮',
  },
  FORMAT: {
    id: 'format',
    name: 'Format Insights',
    description: 'Analyze ad format performance',
    color: 'green',
    icon: '🎨',
  },
  CUSTOMER: {
    id: 'customer',
    name: 'Customer / Risk Insights',
    description: 'Publisher health and risk analysis',
    color: 'orange',
    icon: '👥',
  },
  SALES: {
    id: 'sales',
    name: 'Sales / Revenue Tracking',
    description: 'Revenue and sales metrics',
    color: 'red',
    icon: '💰',
  },
} as const
