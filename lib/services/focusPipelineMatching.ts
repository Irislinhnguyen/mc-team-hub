/**
 * Focus Pipeline Matching Service
 * Handles auto-matching of created pipelines to focus suggestions
 */

import { createClient } from '@supabase/supabase-js'
import type { FocusSuggestion } from '@/lib/types/focus'

// Initialize Supabase admin client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

// =====================================================
// PIPELINE MATCHING LOGIC
// =====================================================

interface MatchResult {
  matched: boolean
  pipelineId: string | null
  matchType: 'pid_mid_product' | 'mid_product' | null
}

/**
 * Match a suggestion to an existing pipeline
 * Priority:
 * 1. PID + MID + Product
 * 2. MID + Product
 * Only matches pipelines created after the focus
 */
export async function matchPipelineToSuggestion(
  suggestion: FocusSuggestion,
  focusCreatedAt: Date
): Promise<MatchResult> {
  try {
    // Priority 1: Match by PID + MID + Product (if PID is available)
    if (suggestion.pid) {
      const { data: pidMatch } = await supabaseAdmin
        .from('pipelines')
        .select('id, created_at')
        .eq('pid', suggestion.pid)
        .eq('mid', suggestion.mid)
        .ilike('product', `%${suggestion.product}%`)
        .gte('created_at', focusCreatedAt.toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (pidMatch && pidMatch.length > 0) {
        return {
          matched: true,
          pipelineId: pidMatch[0].id,
          matchType: 'pid_mid_product',
        }
      }
    }

    // Priority 2: Match by MID + Product
    const { data: midMatch } = await supabaseAdmin
      .from('pipelines')
      .select('id, created_at')
      .eq('mid', suggestion.mid)
      .ilike('product', `%${suggestion.product}%`)
      .gte('created_at', focusCreatedAt.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)

    if (midMatch && midMatch.length > 0) {
      return {
        matched: true,
        pipelineId: midMatch[0].id,
        matchType: 'mid_product',
      }
    }

    return {
      matched: false,
      pipelineId: null,
      matchType: null,
    }
  } catch (error) {
    console.error('Error matching pipeline to suggestion:', error)
    return {
      matched: false,
      pipelineId: null,
      matchType: null,
    }
  }
}

/**
 * Refresh matches for all suggestions in a focus
 * This is useful for:
 * - Manual refresh button in UI
 * - Scheduled job to keep matches up to date
 */
export async function refreshFocusMatches(
  focusId: string
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  try {
    // Get focus created date
    const { data: focus, error: focusError } = await supabaseAdmin
      .from('focus_of_month')
      .select('created_at')
      .eq('id', focusId)
      .single()

    if (focusError || !focus) {
      return {
        success: false,
        updatedCount: 0,
        error: 'Focus not found',
      }
    }

    // Get all suggestions for this focus
    const { data: suggestions, error: suggestionsError } = await supabaseAdmin
      .from('focus_suggestions')
      .select('*')
      .eq('focus_id', focusId)

    if (suggestionsError) {
      return {
        success: false,
        updatedCount: 0,
        error: suggestionsError.message,
      }
    }

    if (!suggestions || suggestions.length === 0) {
      return {
        success: true,
        updatedCount: 0,
      }
    }

    // Check each suggestion for matches
    let updatedCount = 0
    const focusCreatedAt = new Date(focus.created_at)

    for (const suggestion of suggestions) {
      const matchResult = await matchPipelineToSuggestion(suggestion, focusCreatedAt)

      // Only update if match status changed
      const hasMatchNow = matchResult.matched
      const hadMatchBefore = suggestion.pipeline_created

      if (hasMatchNow !== hadMatchBefore) {
        const updateData: any = {
          pipeline_created: matchResult.matched,
          matched_pipeline_id: matchResult.pipelineId,
        }

        // If newly matched, update user_status to 'created'
        if (matchResult.matched && !hadMatchBefore) {
          updateData.user_status = 'created'
        }

        const { error: updateError } = await supabaseAdmin
          .from('focus_suggestions')
          .update(updateData)
          .eq('id', suggestion.id)

        if (!updateError) {
          updatedCount++

          // Log activity if newly matched
          if (matchResult.matched && !hadMatchBefore) {
            await logPipelineMatch({
              focus_id: focusId,
              suggestion_id: suggestion.id,
              pipeline_id: matchResult.pipelineId!,
              match_type: matchResult.matchType!,
            })
          }
        }
      }
    }

    return {
      success: true,
      updatedCount,
    }
  } catch (error) {
    console.error('Error refreshing focus matches:', error)
    return {
      success: false,
      updatedCount: 0,
      error: 'Failed to refresh matches',
    }
  }
}

/**
 * Check if a newly created pipeline matches any active focus suggestions
 * This should be called whenever a new pipeline is created
 */
export async function checkNewPipelineForMatches(pipelineId: string): Promise<{
  success: boolean
  matchedSuggestions: string[]
  error?: string
}> {
  try {
    // Get pipeline details
    const { data: pipeline, error: pipelineError } = await supabaseAdmin
      .from('pipelines')
      .select('id, pid, mid, product, created_at')
      .eq('id', pipelineId)
      .single()

    if (pipelineError || !pipeline) {
      return {
        success: false,
        matchedSuggestions: [],
        error: 'Pipeline not found',
      }
    }

    // Find all published focuses that could match this pipeline
    const { data: activeFocuses, error: focusesError } = await supabaseAdmin
      .from('focus_of_month')
      .select('id, created_at')
      .eq('status', 'published')
      .lte('created_at', pipeline.created_at) // Focus must exist before pipeline

    if (focusesError) {
      return {
        success: false,
        matchedSuggestions: [],
        error: focusesError.message,
      }
    }

    if (!activeFocuses || activeFocuses.length === 0) {
      return {
        success: true,
        matchedSuggestions: [],
      }
    }

    const focusIds = activeFocuses.map((f) => f.id)

    // Find matching suggestions
    let matchQuery = supabaseAdmin
      .from('focus_suggestions')
      .select('*')
      .in('focus_id', focusIds)
      .eq('mid', pipeline.mid)
      .ilike('product', `%${pipeline.product}%`)
      .eq('pipeline_created', false) // Only match unmatched suggestions

    const { data: matchingSuggestions, error: suggestionsError } = await matchQuery

    if (suggestionsError) {
      return {
        success: false,
        matchedSuggestions: [],
        error: suggestionsError.message,
      }
    }

    if (!matchingSuggestions || matchingSuggestions.length === 0) {
      return {
        success: true,
        matchedSuggestions: [],
      }
    }

    // Update matching suggestions
    const matchedIds: string[] = []

    for (const suggestion of matchingSuggestions) {
      // Check if this is a PID match (stronger) or just MID match
      const isPidMatch = pipeline.pid && suggestion.pid && pipeline.pid === suggestion.pid

      const { error: updateError } = await supabaseAdmin
        .from('focus_suggestions')
        .update({
          pipeline_created: true,
          matched_pipeline_id: pipelineId,
          user_status: 'created',
        })
        .eq('id', suggestion.id)

      if (!updateError) {
        matchedIds.push(suggestion.id)

        // Log activity
        await logPipelineMatch({
          focus_id: suggestion.focus_id,
          suggestion_id: suggestion.id,
          pipeline_id: pipelineId,
          match_type: isPidMatch ? 'pid_mid_product' : 'mid_product',
        })
      }
    }

    return {
      success: true,
      matchedSuggestions: matchedIds,
    }
  } catch (error) {
    console.error('Error checking new pipeline for matches:', error)
    return {
      success: false,
      matchedSuggestions: [],
      error: 'Failed to check pipeline matches',
    }
  }
}

/**
 * Batch refresh all published focuses
 * Useful for scheduled jobs
 */
export async function batchRefreshAllFocuses(): Promise<{
  success: boolean
  totalUpdated: number
  error?: string
}> {
  try {
    // Get all published focuses
    const { data: focuses, error: focusesError } = await supabaseAdmin
      .from('focus_of_month')
      .select('id')
      .eq('status', 'published')

    if (focusesError) {
      return {
        success: false,
        totalUpdated: 0,
        error: focusesError.message,
      }
    }

    if (!focuses || focuses.length === 0) {
      return {
        success: true,
        totalUpdated: 0,
      }
    }

    let totalUpdated = 0

    // Refresh each focus
    for (const focus of focuses) {
      const result = await refreshFocusMatches(focus.id)
      if (result.success) {
        totalUpdated += result.updatedCount
      }
    }

    return {
      success: true,
      totalUpdated,
    }
  } catch (error) {
    console.error('Error batch refreshing focuses:', error)
    return {
      success: false,
      totalUpdated: 0,
      error: 'Failed to batch refresh focuses',
    }
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Log pipeline match activity
 */
async function logPipelineMatch(activity: {
  focus_id: string
  suggestion_id: string
  pipeline_id: string
  match_type: string
}): Promise<void> {
  try {
    await supabaseAdmin.from('focus_activity_log').insert({
      focus_id: activity.focus_id,
      activity_type: 'pipeline_matched',
      suggestion_id: activity.suggestion_id,
      details: {
        pipeline_id: activity.pipeline_id,
        match_type: activity.match_type,
      },
      logged_by: 'system', // System-generated activity
      logged_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error logging pipeline match:', error)
    // Don't throw - logging is non-critical
  }
}

/**
 * Get match statistics for a focus
 */
export async function getFocusMatchStats(focusId: string): Promise<{
  success: boolean
  stats?: {
    total: number
    matched: number
    matchRate: number
    pidMatches: number
    midMatches: number
  }
  error?: string
}> {
  try {
    const { data: suggestions, error } = await supabaseAdmin
      .from('focus_suggestions')
      .select('pipeline_created, pid, matched_pipeline_id')
      .eq('focus_id', focusId)

    if (error) {
      return { success: false, error: error.message }
    }

    const total = suggestions?.length || 0
    const matched = suggestions?.filter((s) => s.pipeline_created).length || 0
    const pidMatches = suggestions?.filter((s) => s.pipeline_created && s.pid).length || 0
    const midMatches = matched - pidMatches

    return {
      success: true,
      stats: {
        total,
        matched,
        matchRate: total > 0 ? (matched / total) * 100 : 0,
        pidMatches,
        midMatches,
      },
    }
  } catch (error) {
    console.error('Error getting match stats:', error)
    return { success: false, error: 'Failed to get match stats' }
  }
}
