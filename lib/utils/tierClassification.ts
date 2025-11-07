/**
 * Shared Tier Classification Logic
 *
 * Classifies items (zones, products, PIDs, MIDs, PICs) into performance tiers
 * based on revenue, growth, fill rate, and eCPM metrics.
 *
 * 6-Tier System (Research-Backed):
 * - Hero: High revenue with strong growth OR excellent monetization (existing zones)
 * - Solid: Good revenue with stable/positive growth and decent fill rate (existing zones)
 * - Underperformer: Declining revenue OR poor monetization (existing zones)
 * - Remove: Category C (Bottom 5% revenue) + Declining (< 0%) - based on Pareto Principle & SKU Rationalization
 * - New: Recently launched zones (P1 revenue = 0, P2 revenue > 0)
 * - Lost: Inactive zones (P1 revenue > 0, P2 revenue = 0)
 *
 * Remove tier based on 80/20 rule (Pareto Principle): Bottom 5% of revenue contributors
 * that are also declining should be considered for removal/rationalization.
 *
 * Research sources:
 * - BCG Matrix: Dogs (low market share + low growth) should be divested
 * - McKinsey GE Matrix: Business units making losses should be divested
 * - SKU Rationalization: 80/20 rule - bottom performers in decline phase are rationalization candidates
 */

import { colors } from '../colors'

export type TierType = 'hero' | 'solid' | 'underperformer' | 'remove' | 'new' | 'lost'
export type RevenueTier = 'A' | 'B' | 'C'  // ABC classification for revenue contribution

export interface TierMetrics {
  rev_p1: number        // Period 1 revenue (needed to detect new/lost)
  rev_p2: number        // Period 2 revenue
  rev_change_pct: number // Revenue change % (P2 vs P1)
  fill_rate: number     // Period 2 fill rate (%)
  ecpm: number          // Period 2 eCPM
}

/**
 * Item with revenue tier classification
 */
export interface ItemWithRevenueTier extends TierMetrics {
  id: string | number
  revenue_tier?: RevenueTier  // A = top 80%, B = next 15%, C = bottom 5%
  cumulative_revenue_pct?: number
}

export interface TierThresholds {
  hero: {
    minRevenue: number
    minGrowth: number
    minFillRate: number
    minEcpm: number
  }
  solid: {
    minRevenue: number
    minGrowth: number
    minFillRate: number
  }
  underperformer: {
    maxGrowth: number
    maxFillRate: number
    maxEcpm: number
  }
}

/**
 * Default tier thresholds
 * Based on industry research:
 * - Growth benchmarks from SaaS industry (2024-2025 data)
 * - Revenue tiers from Pareto/ABC analysis (cumulative contribution)
 */
export const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  hero: {
    minRevenue: 0,        // Will be calculated dynamically (Category A via cumulative %)
    minGrowth: 50,        // Top quartile growth (SaaS benchmark: 50-65% = exceptional)
    minFillRate: 40,
    minEcpm: 3
  },
  solid: {
    minRevenue: 0,        // Will be calculated dynamically (Category A via cumulative %)
    minGrowth: 20,        // Above median growth (SaaS benchmark: 20-50% = healthy)
    minFillRate: 25
  },
  underperformer: {
    maxGrowth: 0,         // Below median growth (0-20% = stagnant)
    maxFillRate: 20,
    maxEcpm: 1
  }
}

/**
 * Calculate revenue tiers for a portfolio using cumulative percentage method (ABC Analysis)
 *
 * Based on Pareto Principle:
 * - Category A: Items contributing to first 80% of total revenue (typically ~20% of items)
 * - Category B: Items contributing to next 15% of revenue (typically ~30% of items)
 * - Category C: Items contributing to last 5% of revenue (typically ~50% of items)
 *
 * @param items - Array of items with revenue data
 * @returns Array of items with revenue_tier and cumulative_revenue_pct added
 */
export function calculateRevenueTiers<T extends { id: string | number; rev_p2: number }>(
  items: T[]
): (T & { revenue_tier: RevenueTier; cumulative_revenue_pct: number })[] {
  // Calculate total revenue
  const totalRevenue = items.reduce((sum, item) => sum + item.rev_p2, 0)

  if (totalRevenue === 0) {
    // All items are Category C if no revenue
    return items.map(item => ({
      ...item,
      revenue_tier: 'C' as RevenueTier,
      cumulative_revenue_pct: 0
    }))
  }

  // Sort by revenue descending
  const sortedItems = [...items].sort((a, b) => b.rev_p2 - a.rev_p2)

  // Calculate cumulative percentage and assign tiers
  let cumulativeRevenue = 0
  return sortedItems.map(item => {
    cumulativeRevenue += item.rev_p2
    const cumulative_revenue_pct = (cumulativeRevenue / totalRevenue) * 100

    // ABC Classification based on cumulative percentage
    let revenue_tier: RevenueTier
    if (cumulative_revenue_pct <= 80) {
      revenue_tier = 'A'  // Top contributors (typically ~20% of items)
    } else if (cumulative_revenue_pct <= 95) {
      revenue_tier = 'B'  // Mid contributors (typically ~30% of items)
    } else {
      revenue_tier = 'C'  // Low contributors (typically ~50% of items)
    }

    return {
      ...item,
      revenue_tier,
      cumulative_revenue_pct
    }
  })
}

/**
 * Classify an item into a performance tier
 *
 * New 6-tier unified system based on BCG Matrix + Growth Benchmarks + Pareto Principle:
 * 1. Check if new (P1=0, P2>0) → 'new'
 * 2. Check if lost (P1>0, P2=0) → 'lost'
 * 3. For existing zones (P1>0, P2>0):
 *    - Combine revenue tier (A/B/C) with growth rate
 *
 *    Category A (Top 80% revenue - Stars/Cash Cows):
 *    - Growth ≥50% = Hero (Stars)
 *    - Growth 20-50% = Solid (Cash Cows)
 *    - Growth < 20% = Underperformer
 *
 *    Category B (Next 15% revenue - Question Marks):
 *    - Growth ≥50% = Hero (Rising Star)
 *    - Growth < 50% = Underperformer
 *
 *    Category C (Bottom 5% revenue - Dogs):
 *    - Growth ≥50% = Hero (Rare breakout)
 *    - Growth 0-50% = Underperformer
 *    - Growth < 0% = Remove (Pareto Principle: bottom 5% + declining = removal candidate)
 *
 * @param metrics - Item metrics including revenue tier
 * @param thresholds - Optional custom thresholds
 */
export function classifyTier(
  metrics: TierMetrics & { revenue_tier?: RevenueTier },
  thresholds: TierThresholds = DEFAULT_TIER_THRESHOLDS
): TierType {
  const { rev_p1, rev_p2, rev_change_pct, fill_rate, ecpm, revenue_tier } = metrics

  // New: P1 revenue = 0, P2 revenue > 0
  if (rev_p1 === 0 && rev_p2 > 0) {
    return 'new'
  }

  // Lost: P1 revenue > 0, P2 revenue = 0
  if (rev_p1 > 0 && rev_p2 === 0) {
    return 'lost'
  }

  // For existing zones (both P1 and P2 have revenue)
  // Use BCG Matrix logic: Revenue Tier (A/B/C) × Growth Rate

  // If revenue_tier is not provided, fall back to simple classification
  if (!revenue_tier) {
    // Fallback: Use growth-only classification
    if (rev_change_pct >= thresholds.hero.minGrowth) return 'hero'
    if (rev_change_pct >= thresholds.solid.minGrowth) return 'solid'
    return 'underperformer'
  }

  // BCG Matrix Classification:
  // Category A (Top 80% revenue contributors) - Stars or Cash Cows
  if (revenue_tier === 'A') {
    // A + Exceptional Growth (≥50%) = HERO (Stars)
    if (rev_change_pct >= thresholds.hero.minGrowth) {
      return 'hero'
    }
    // A + Healthy Growth (20-50%) = SOLID (Cash Cows)
    if (rev_change_pct >= thresholds.solid.minGrowth) {
      return 'solid'
    }
    // A + Any other growth = UNDERPERFORMER (Warning: Cash Cow becoming Dog)
    return 'underperformer'
  }

  // Category B (Next 15% revenue) - Question Marks or transitioning
  if (revenue_tier === 'B') {
    // B + Exceptional Growth (≥50%) = HERO (Rising Star - potential to become Category A)
    if (rev_change_pct >= thresholds.hero.minGrowth) {
      return 'hero'
    }
    // B + Any other growth = UNDERPERFORMER (needs to prove itself or optimize)
    return 'underperformer'
  }

  // Category C (Bottom 5% revenue) - Dogs
  // Based on Pareto Principle & SKU Rationalization research

  // C + Exceptional Growth (≥50%) = HERO (Potential breakout - rare but valuable)
  if (rev_change_pct >= thresholds.hero.minGrowth) {
    return 'hero'
  }
  // C + Positive/Stagnant growth (0-50%) = UNDERPERFORMER (small and not growing enough)
  if (rev_change_pct >= 0) {
    return 'underperformer'
  }
  // C + Declining (< 0%) = REMOVE
  // Research-backed: Bottom 5% revenue + declining = clear removal candidate (80/20 rule)
  return 'remove'
}

/**
 * Tier info type returned by getTierInfo
 */
export type TierInfo = {
  label: string
  color: string
  bgColor: string
  description: string
  category: 'Perform Well' | 'Moderate' | 'Critical' | 'Action Required' | 'Growth' | 'Inactive'
}

/**
 * Get tier display info (label, color, description)
 * Colors mapped to existing design system (lib/colors.ts)
 */
export function getTierInfo(tier: TierType): TierInfo {
  switch (tier) {
    case 'hero':
      return {
        label: 'Hero',
        color: colors.status.success,
        bgColor: colors.status.successBg,
        description: 'Exceptional growth (50%+) OR high revenue with excellent monetization',
        category: 'Perform Well'
      }
    case 'solid':
      return {
        label: 'Solid',
        color: colors.status.info,
        bgColor: colors.status.infoBg,
        description: 'Stable/positive growth (0%+) with decent performance',
        category: 'Moderate'
      }
    case 'underperformer':
      return {
        label: 'Underperformer',
        color: colors.status.warning,
        bgColor: colors.status.warningBg,
        description: 'Declining or stagnant revenue, needs optimization',
        category: 'Critical'
      }
    case 'remove':
      return {
        label: 'Remove',
        color: colors.status.danger,
        bgColor: colors.status.dangerBg,
        description: 'Bottom 5% revenue + declining - removal candidate (Pareto Principle)',
        category: 'Action Required'
      }
    case 'new':
      return {
        label: 'New',
        color: colors.status.info,
        bgColor: colors.status.infoBg,
        description: 'Recently launched zones',
        category: 'Growth'
      }
    case 'lost':
      return {
        label: 'Lost',
        color: colors.status.danger,
        bgColor: colors.status.dangerBg,
        description: 'Inactive zones with zero revenue',
        category: 'Inactive'
      }
  }
}

/**
 * Determine item status (New, Lost, Existing) - DEPRECATED
 * Use classifyTier() instead which now includes new/lost as tier types
 * @deprecated
 */
export function getItemStatus(revP1: number, revP2: number): 'new' | 'lost' | 'existing' {
  if (revP1 === 0 && revP2 > 0) return 'new'
  if (revP1 > 0 && revP2 === 0) return 'lost'
  return 'existing'
}

/**
 * Get status display info - DEPRECATED
 * Use getTierInfo() instead which now includes new/lost tiers
 * @deprecated
 */
export function getStatusInfo(status: 'new' | 'lost' | 'existing'): {
  label: string
  color: string
  bgColor: string
} {
  switch (status) {
    case 'new':
      return {
        label: 'New',
        color: colors.status.info,
        bgColor: colors.status.infoBg
      }
    case 'lost':
      return {
        label: 'Lost',
        color: colors.status.danger,
        bgColor: colors.status.dangerBg
      }
    case 'existing':
      return {
        label: 'Existing',
        color: colors.text.secondary,
        bgColor: colors.surface.muted
      }
  }
}

/**
 * SQL fragment for tier classification using BCG Matrix + Cumulative Revenue + Pareto Principle
 *
 * This creates a CTE that:
 * 1. Calculates cumulative revenue percentage (ABC classification)
 * 2. Assigns revenue_tier (A/B/C) based on cumulative %
 * 3. Classifies performance tier based on revenue_tier × growth_rate
 * 4. 'Remove' tier: Category C (Bottom 5%) + Declining only (research-backed via Pareto Principle)
 *
 * Usage: Include this in a WITH clause before your main query
 */
export function getTierClassificationSQL(
  thresholds: TierThresholds = DEFAULT_TIER_THRESHOLDS
): string {
  return `
    -- Step 1: Calculate cumulative revenue percentage (ABC Analysis)
    WITH revenue_ranked AS (
      SELECT
        *,
        SUM(rev_p2) OVER () as total_revenue,
        SUM(rev_p2) OVER (ORDER BY rev_p2 DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) as cumulative_revenue
      FROM zone_calculations
    ),
    revenue_tiered AS (
      SELECT
        *,
        (cumulative_revenue / NULLIF(total_revenue, 0)) * 100 as cumulative_revenue_pct,
        -- ABC Classification (Pareto Principle: 80/15/5)
        CASE
          WHEN (cumulative_revenue / NULLIF(total_revenue, 0)) * 100 <= 80 THEN 'A'
          WHEN (cumulative_revenue / NULLIF(total_revenue, 0)) * 100 <= 95 THEN 'B'
          ELSE 'C'
        END as revenue_tier
      FROM revenue_ranked
    )
    SELECT
      *,
      -- Step 2: BCG Matrix classification using revenue_tier × growth_rate
      CASE
        -- New: P1 = 0, P2 > 0
        WHEN rev_p1 = 0 AND rev_p2 > 0 THEN 'new'

        -- Lost: P1 > 0, P2 = 0
        WHEN rev_p1 > 0 AND rev_p2 = 0 THEN 'lost'

        -- Category A (Top 80% revenue) - Stars or Cash Cows
        WHEN revenue_tier = 'A' AND rev_change_pct >= ${thresholds.hero.minGrowth} THEN 'hero'      -- Stars
        WHEN revenue_tier = 'A' AND rev_change_pct >= ${thresholds.solid.minGrowth} THEN 'solid'    -- Cash Cows
        WHEN revenue_tier = 'A' THEN 'underperformer'  -- Any other growth

        -- Category B (Next 15% revenue) - Question Marks
        WHEN revenue_tier = 'B' AND rev_change_pct >= ${thresholds.hero.minGrowth} THEN 'hero'      -- Rising Star
        WHEN revenue_tier = 'B' THEN 'underperformer'  -- Any other growth

        -- Category C (Bottom 5% revenue) - Dogs
        -- Research-backed removal criteria: Bottom 5% + Declining (Pareto Principle)
        WHEN revenue_tier = 'C' AND rev_change_pct >= ${thresholds.hero.minGrowth} THEN 'hero'      -- Rare breakout
        WHEN revenue_tier = 'C' AND rev_change_pct >= 0 THEN 'underperformer'  -- Stagnant
        ELSE 'remove'  -- Bottom 5% + Declining = removal candidate
      END as tier
    FROM revenue_tiered
  `.trim()
}
