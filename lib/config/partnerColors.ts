import { colors } from '../colors'

/**
 * Partner Color Configuration for GCPP Check
 * Maps partner names to consistent colors across all charts
 */

export const partnerColors: Record<string, string> = {
  'Anymind': '#8B5CF6',     // Purple
  'Geniee': '#EC4899',      // Pink
  'Netlink': '#3B82F6',     // Blue
  'Acqua': '#F97316',       // Orange
  'Optad360': '#F59E0B',    // Amber
  'Adopx': '#6B7280',       // Gray
}

/**
 * Get color for a partner (case-insensitive)
 */
export function getPartnerColor(partner: string): string {
  if (!partner) return colors.main
  // Convert to Title Case to match the keys
  const titleCasePartner = partner.charAt(0).toUpperCase() + partner.slice(1).toLowerCase()
  return partnerColors[titleCasePartner] || colors.main
}

/**
 * Get all partner colors as array (for chart legends)
 */
export function getAllPartnerColors(): string[] {
  return Object.values(partnerColors)
}

/**
 * Get color map for multiple partners
 */
export function getPartnerColorMap(partners: string[]): Record<string, string> {
  const colorMap: Record<string, string> = {}
  partners.forEach(partner => {
    colorMap[partner] = getPartnerColor(partner)
  })
  return colorMap
}

/**
 * Scenario colors for competitive monitoring
 */
export const scenarioColors: Record<string, string> = {
  'OUTPERFORMING': '#10B981',  // Green
  'FALLING BEHIND': '#F59E0B', // Amber/Yellow
  'STABLE': '#6B7280',          // Gray
  'CRITICAL': '#EF4444'         // Red
}

/**
 * Get scenario color
 */
export function getScenarioColor(scenario: string): string {
  const upperScenario = scenario?.toUpperCase()
  return scenarioColors[upperScenario] || '#6B7280'
}

/**
 * Get scenario emoji
 */
export function getScenarioEmoji(scenario: string): string {
  const upperScenario = scenario?.toUpperCase()
  switch (upperScenario) {
    case 'OUTPERFORMING':
      return '🟢'
    case 'FALLING BEHIND':
      return '🟡'
    case 'STABLE':
      return '⚪'
    case 'CRITICAL':
      return '🔴'
    default:
      return '⚪'
  }
}

/**
 * Performance trend colors
 */
export const performanceColors: Record<string, string> = {
  'Strong increase': '#10B981',   // Green
  'Mild increase': '#34D399',     // Light green
  'Stable': '#6B7280',             // Gray
  'Mild decrease': '#FBBF24',     // Yellow
  'Strong decrease': '#EF4444'    // Red
}

/**
 * Get performance color
 */
export function getPerformanceColor(performance: string): string {
  return performanceColors[performance] || '#6B7280'
}

/**
 * Publisher category colors
 */
export const categoryColors: Record<string, string> = {
  '>10M': '#8B5CF6',    // Purple - Largest
  '>5M': '#3B82F6',     // Blue - Large
  '>200K': '#10B981',   // Green - Medium
  '<=200K': '#9CA3AF'   // Gray - Small
}

/**
 * Get category color
 */
export function getCategoryColor(category: string): string {
  return categoryColors[category] || '#9CA3AF'
}

/**
 * Create entity color map for dynamic entities (Teams, PICs, PIDs, etc.)
 * Generates consistent colors for any list of entity names
 */
export function createEntityColorMap(entityNames: string[]): Record<string, string> {
  const predefinedColors = [
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#3B82F6', // Blue
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#10B981', // Green
    '#06B6D4', // Cyan
    '#8B5CF6', // Purple 2
    '#A855F7', // Purple 3
    '#D946EF', // Fuchsia
    '#F43F5E', // Rose
    '#FB923C', // Orange 2
    '#FBBF24', // Yellow
    '#84CC16', // Lime
    '#22C55E', // Green 2
    '#14B8A6', // Teal
    '#0EA5E9', // Sky
    '#6366F1', // Indigo
    '#A78BFA', // Violet
    '#C084FC', // Purple 4
  ]

  const colorMap: Record<string, string> = {}
  entityNames.forEach((name, index) => {
    colorMap[name] = predefinedColors[index % predefinedColors.length]
  })

  return colorMap
}
