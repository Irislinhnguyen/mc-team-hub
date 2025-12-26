/**
 * Status to Progress Percentage Mapping
 * Based on Google Sheet Status lookup table
 *
 * Source: Status sheet in Pipeline Google Sheet
 * Column A: Status code
 * Column C: Progress percentage
 */

export const STATUS_PROGRESS_MAP: Record<string, number> = {
  '【S】': 0,      // Repeat reflected - 0% (already completed, no forecast)
  '【S-】': 100,   // Distribution started - 100%
  '【A】': 80,     // Tags sent (Distribution start date confirmed) - 80%
  '【B】': 60,     // Client agreement obtained - 60%
  '【C+】': 50,    // Client agreement (timeline undecided) - 50%
  '【C】': 30,     // Positively considering - 30%
  '【C-】': 5,     // Proposal submitted - 5%
  '【D】': 100,    // Before proposal / Medium ~ High certainty - 100%
  '【E】': 0,      // Low certainty measures - 0%
  '【F】': 0,      // Low certainty measures - 0%
  '【Z】': 0,      // Lost order - 0%
  '【X】': 0,      // Unknown status - 0%
}

/**
 * Get progress percentage for a given status
 * Returns null if status is not found
 */
export function getProgressForStatus(status: string | null): number | null {
  if (!status) return null
  return STATUS_PROGRESS_MAP[status] ?? null
}

/**
 * Check if a status should have progress automatically calculated
 */
export function shouldAutoCalculateProgress(status: string | null): boolean {
  if (!status) return false
  return status in STATUS_PROGRESS_MAP
}

/**
 * Get default progress for a new pipeline based on status
 */
export function getDefaultProgress(status: string | null): number {
  return getProgressForStatus(status) ?? 0
}
