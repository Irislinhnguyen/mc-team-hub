/**
 * Status to Progress Percentage Mapping
 * Based on Google Sheet Status lookup table
 *
 * Maps pipeline status codes to their corresponding progress percentages
 * Progress is used in revenue calculations
 */

import type { PipelineStageCode } from '@/lib/types/pipeline'

/**
 * Status → Progress % mapping from Google Sheet Status tab
 */
export const STATUS_PROGRESS_MAP: Record<PipelineStageCode, number> = {
  '【S】': 100,    // Repeat reflected (assumed 100%)
  '【S-】': 100,   // Distribution started / But, not reflected in the Repeat
  '【A】': 80,     // Tags sent (Distribution start date confirmed)
  '【B】': 60,     // Client agreement obtained (Agreement on distribution start timeline confirmed)
  '【C+】': 50,    // Client agreement obtained (Distribution start timeline undecided)
  '【C】': 30,     // Positively considering based on field representative
  '【C-】': 5,     // Proposal submitted (Client in consideration stage)
  '【D】': 100,    // Before proposal / Medium ~ High certainty measures
  '【E】': 0,      // Low certainty measures (assumed 0%)
}

/**
 * Get progress percentage for a given status code
 * @param status - Pipeline status code
 * @returns Progress percentage (0-100)
 */
export function getProgressFromStatus(status: PipelineStageCode): number {
  return STATUS_PROGRESS_MAP[status] ?? 0
}

/**
 * Auto-set progress_percent based on status when creating/updating pipeline
 * This matches the Google Sheet VLOOKUP behavior
 */
export function autoSetProgressPercent(status: PipelineStageCode): number {
  return getProgressFromStatus(status)
}
