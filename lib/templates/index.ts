/**
 * Template Library Index
 * Exports all 19 analytics templates organized by category
 */

export * from './types'
export * from './performance-analysis'
export * from './prediction-forecasting'
export * from './format-insights'
export * from './customer-risk'
export * from './sales-revenue'

import { performanceTemplates } from './performance-analysis'
import { predictionTemplates } from './prediction-forecasting'
import { formatTemplates } from './format-insights'
import { customerRiskTemplates } from './customer-risk'
import { salesRevenueTemplates } from './sales-revenue'
import { AnalyticsTemplate, CATEGORIES } from './types'

/**
 * All 19 templates combined
 */
export const ALL_TEMPLATES: AnalyticsTemplate[] = [
  ...performanceTemplates,
  ...predictionTemplates,
  ...formatTemplates,
  ...customerRiskTemplates,
  ...salesRevenueTemplates,
]

/**
 * Templates organized by category
 */
export const TEMPLATES_BY_CATEGORY = {
  [CATEGORIES.PERFORMANCE.id]: performanceTemplates,
  [CATEGORIES.PREDICTION.id]: predictionTemplates,
  [CATEGORIES.FORMAT.id]: formatTemplates,
  [CATEGORIES.CUSTOMER.id]: customerRiskTemplates,
  [CATEGORIES.SALES.id]: salesRevenueTemplates,
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AnalyticsTemplate | undefined {
  return ALL_TEMPLATES.find((t) => t.id === id)
}

/**
 * Get templates by category ID
 */
export function getTemplatesByCategory(categoryId: string): AnalyticsTemplate[] {
  const templates = TEMPLATES_BY_CATEGORY[categoryId as keyof typeof TEMPLATES_BY_CATEGORY]
  return templates || []
}

/**
 * Search templates
 */
export function searchTemplates(query: string): AnalyticsTemplate[] {
  const lowerQuery = query.toLowerCase()
  return ALL_TEMPLATES.filter(
    (t) =>
      t.id.toLowerCase().includes(lowerQuery) ||
      t.title.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get all categories
 */
export const ALL_CATEGORIES = Object.values(CATEGORIES)
