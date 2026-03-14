/**
 * Deep Dive Preset Helpers
 *
 * Helper functions for generating smart descriptions for deep-dive filter presets
 */

import type { Period } from '../../app/components/performance-tracker/UnifiedDeepDiveView'

type Perspective = 'team' | 'pic' | 'pid' | 'mid' | 'product' | 'zone'
type TierType = 'A' | 'B' | 'C' | 'NEW' | 'LOST' | 'ALL'

interface DeepDiveState {
  perspective: Perspective
  period1: Period
  period2: Period
  filters: Record<string, any>
  activeTier?: TierType
  activePreset?: string
}

// Preset display names
const PRESET_NAMES: Record<string, string> = {
  yesterdayVs30DayAvg: 'Yesterday vs 30-day avg',
  last7vs7: 'Last 7 vs 7 days',
  last28vs28: 'Last 28 vs 28 days',
  last30vs30: 'Last 30 vs 30 days',
}

// Perspective display names
const PERSPECTIVE_NAMES: Record<Perspective, string> = {
  team: 'Team',
  pic: 'PIC',
  pid: 'Publisher',
  mid: 'Media',
  product: 'Product',
  zone: 'Zone',
}

/**
 * Generate a smart, human-readable description for a deep-dive preset
 *
 * Examples:
 * - "Publisher perspective | Last 28 vs 28 days | Team: Sales | Tier A"
 * - "PIC perspective | Yesterday vs 30-day avg | Product: Product A, Team: Team B"
 * - "Team perspective | Custom dates | All tiers"
 */
export function generateDeepDivePresetDescription(state: DeepDiveState): string {
  const parts: string[] = []

  // 1. Perspective (always first)
  const perspectiveName = PERSPECTIVE_NAMES[state.perspective] || state.perspective
  parts.push(`${perspectiveName} perspective`)

  // 2. Time range
  if (state.activePreset && PRESET_NAMES[state.activePreset]) {
    parts.push(PRESET_NAMES[state.activePreset])
  } else {
    // Custom date range
    const p1Start = state.period1.start
    const p2End = state.period2.end
    parts.push(`${p1Start} to ${p2End}`)
  }

  // 3. Active filters (skip perspective, tier, preset, and periods)
  const filterDescriptions: string[] = []
  const skipKeys = ['perspective', 'activeTier', 'activePreset', 'period1', 'period2']

  Object.entries(state.filters).forEach(([key, value]) => {
    if (skipKeys.includes(key)) return
    if (!value) return // Skip empty/null/undefined

    // Format filter name
    const filterNames: Record<string, string> = {
      team: 'Team',
      pic: 'PIC',
      pid: 'Publisher',
      mid: 'Media',
      product: 'Product',
      zid: 'Zone',
    }
    const filterName = filterNames[key] || key

    // Format value (handle arrays)
    let valueStr: string
    if (Array.isArray(value)) {
      if (value.length === 0) return // Skip empty arrays
      if (value.length === 1) {
        valueStr = String(value[0])
      } else if (value.length === 2) {
        valueStr = value.join(' & ')
      } else {
        valueStr = `${value[0]} +${value.length - 1} more`
      }
    } else {
      valueStr = String(value)
    }

    filterDescriptions.push(`${filterName}: ${valueStr}`)
  })

  if (filterDescriptions.length > 0) {
    parts.push(filterDescriptions.join(', '))
  }

  // 4. Tier filter (if not ALL)
  if (state.activeTier && state.activeTier !== 'ALL') {
    parts.push(`Tier ${state.activeTier}`)
  }

  return parts.join(' | ')
}

/**
 * Generate a suggested name for a deep-dive preset
 *
 * Examples:
 * - "Publisher Analysis - Sales Team"
 * - "Team Performance - Tier A"
 * - "PIC Review - Yesterday"
 */
export function generateDeepDivePresetName(state: DeepDiveState): string {
  const parts: string[] = []

  // 1. Perspective
  const perspectiveName = PERSPECTIVE_NAMES[state.perspective] || state.perspective
  parts.push(`${perspectiveName} Analysis`)

  // 2. Key filter (most prominent)
  const keyFilter =
    state.filters.team ||
    state.filters.product ||
    state.filters.pic ||
    state.filters.pid

  if (keyFilter) {
    const value = Array.isArray(keyFilter) ? keyFilter[0] : keyFilter
    parts.push(String(value))
  }

  // 3. Tier if specific
  if (state.activeTier && state.activeTier !== 'ALL') {
    parts.push(`Tier ${state.activeTier}`)
  }

  return parts.join(' - ')
}

/**
 * Get a short summary of what changed in the preset
 * Useful for showing what's different from the last saved state
 */
export function getPresetChangeSummary(
  current: DeepDiveState,
  saved: DeepDiveState
): string[] {
  const changes: string[] = []

  // Check perspective
  if (current.perspective !== saved.perspective) {
    changes.push(
      `Perspective: ${PERSPECTIVE_NAMES[saved.perspective]} → ${PERSPECTIVE_NAMES[current.perspective]}`
    )
  }

  // Check tier
  if (current.activeTier !== saved.activeTier) {
    changes.push(`Tier: ${saved.activeTier || 'ALL'} → ${current.activeTier || 'ALL'}`)
  }

  // Check time range
  if (
    current.period1.start !== saved.period1.start ||
    current.period1.end !== saved.period1.end ||
    current.period2.start !== saved.period2.start ||
    current.period2.end !== saved.period2.end
  ) {
    changes.push('Time range changed')
  }

  // Check filters
  const currentFiltersStr = JSON.stringify(current.filters)
  const savedFiltersStr = JSON.stringify(saved.filters)
  if (currentFiltersStr !== savedFiltersStr) {
    changes.push('Filters changed')
  }

  return changes
}

/**
 * Validate deep-dive preset state
 * Returns error message if invalid, null if valid
 */
export function validateDeepDivePreset(state: Partial<DeepDiveState>): string | null {
  // Validate perspective
  const validPerspectives: Perspective[] = ['team', 'pic', 'pid', 'mid', 'product', 'zone']
  if (state.perspective && !validPerspectives.includes(state.perspective)) {
    return `Invalid perspective: ${state.perspective}`
  }

  // Validate tier
  const validTiers: TierType[] = ['A', 'B', 'C', 'NEW', 'LOST', 'ALL']
  if (state.activeTier && !validTiers.includes(state.activeTier)) {
    return `Invalid tier: ${state.activeTier}`
  }

  // Validate periods
  if (state.period1) {
    if (!state.period1.start || !state.period1.end) {
      return 'Period 1 must have start and end dates'
    }
  }

  if (state.period2) {
    if (!state.period2.start || !state.period2.end) {
      return 'Period 2 must have start and end dates'
    }
  }

  return null
}

/**
 * Format preset for display in UI (truncate long values)
 */
export function formatPresetForDisplay(name: string, description: string): {
  name: string
  description: string
  isTruncated: boolean
} {
  const maxNameLength = 40
  const maxDescLength = 100

  const nameTruncated = name.length > maxNameLength
  const descTruncated = description.length > maxDescLength

  return {
    name: nameTruncated ? name.substring(0, maxNameLength) + '...' : name,
    description: descTruncated ? description.substring(0, maxDescLength) + '...' : description,
    isTruncated: nameTruncated || descTruncated,
  }
}
