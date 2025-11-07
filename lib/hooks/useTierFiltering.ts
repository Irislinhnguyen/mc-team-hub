import { useState, useMemo } from 'react'
import { TierType, classifyTier } from '../utils/tierClassification'

/**
 * Interface for items that can be tier-filtered
 * All AnalysisView data types should extend this
 */
export interface TierFilterableItem {
  total_rev_p1: number
  total_rev_p2: number
  rev_change_pct: number
  avg_fill_rate_p2: number
  avg_ecpm_p2: number
}

/**
 * Result type with tier classification added
 */
export type ItemWithTier<T> = T & { tier: TierType }

/**
 * Tier counts for all 6 tiers
 */
export interface TierCounts {
  hero: number
  solid: number
  underperformer: number
  remove: number
  new: number
  lost: number
}

/**
 * Return type of useTierFiltering hook
 */
export interface UseTierFilteringResult<T> {
  selectedTier: TierType | null
  setSelectedTier: (tier: TierType | null) => void
  itemsWithTiers: ItemWithTier<T>[]
  tierCounts: TierCounts
  filteredData: ItemWithTier<T>[]
}

/**
 * Custom hook for tier-based filtering with BCG Matrix classification
 *
 * This hook:
 * 1. Calculates tier for each item using classifyTier()
 * 2. Counts items in each tier (hero, solid, underperformer, remove, new, lost)
 * 3. Filters items based on selected tier
 * 4. Memoizes calculations for performance
 *
 * Usage:
 * ```typescript
 * const { selectedTier, setSelectedTier, tierCounts, filteredData } =
 *   useTierFiltering(products)
 * ```
 *
 * @param data - Array of items with revenue metrics (extends TierFilterableItem)
 * @returns Object with filtered data, tier counts, and selection state
 */
export function useTierFiltering<T extends TierFilterableItem>(
  data: T[]
): UseTierFilteringResult<T> {
  const [selectedTier, setSelectedTier] = useState<TierType | null>(null)

  // Calculate tier for each item
  const itemsWithTiers = useMemo<ItemWithTier<T>[]>(() => {
    if (!data || !Array.isArray(data)) {
      return []
    }
    return data.map(item => ({
      ...item,
      tier: classifyTier({
        rev_p1: item.total_rev_p1,
        rev_p2: item.total_rev_p2,
        rev_change_pct: item.rev_change_pct,
        fill_rate: item.avg_fill_rate_p2,
        ecpm: item.avg_ecpm_p2
      })
    }))
  }, [data])

  // Calculate tier counts
  const tierCounts = useMemo<TierCounts>(() => {
    return {
      hero: itemsWithTiers.filter(item => item.tier === 'hero').length,
      solid: itemsWithTiers.filter(item => item.tier === 'solid').length,
      underperformer: itemsWithTiers.filter(item => item.tier === 'underperformer').length,
      remove: itemsWithTiers.filter(item => item.tier === 'remove').length,
      new: itemsWithTiers.filter(item => item.tier === 'new').length,
      lost: itemsWithTiers.filter(item => item.tier === 'lost').length
    }
  }, [itemsWithTiers])

  // Filter data based on selected tier
  const filteredData = useMemo<ItemWithTier<T>[]>(() => {
    return selectedTier
      ? itemsWithTiers.filter(item => item.tier === selectedTier)
      : itemsWithTiers
  }, [itemsWithTiers, selectedTier])

  return {
    selectedTier,
    setSelectedTier,
    itemsWithTiers,
    tierCounts,
    filteredData
  }
}
