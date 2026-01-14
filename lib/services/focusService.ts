/**
 * Focus Service
 * Business logic for Focus of the Month feature
 */

import { createClient } from '@supabase/supabase-js'
import type {
  Focus,
  FocusSuggestion,
  FocusActivity,
  FocusManagerRole,
  CreateFocusRequest,
  UpdateFocusRequest,
  AddSuggestionsRequest,
  UpdateSuggestionRequest,
  GrantManagerRoleRequest,
  FocusDashboardMetrics,
  FocusListFilters,
  SuggestionListFilters,
} from '@/lib/types/focus'

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
// FOCUS CRUD OPERATIONS
// =====================================================

/**
 * Get user UUID from email
 * Helper function to convert email (from JWT) to UUID (for database foreign keys)
 */
async function getUserUuid(email: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .single()

  return data?.id || email // Fallback to email if not found
}

/**
 * Create a new focus
 */
export async function createFocus(
  request: CreateFocusRequest,
  userId: string
): Promise<{ success: boolean; focus?: Focus; error?: string }> {
  try {
    // Convert email to UUID if needed
    const userUuid = await getUserUuid(userId)

    const { data, error } = await supabaseAdmin
      .from('focus_of_month')
      .insert({
        created_by: userUuid,
        focus_month: request.focus_month,
        focus_year: request.focus_year,
        group_type: request.group_type,
        team_id: request.team_id || null,
        title: request.title,
        description: request.description || null,
        status: 'draft',
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating focus:', error)
      return { success: false, error: error.message }
    }

    // Log activity
    await logActivity({
      focus_id: data.id,
      activity_type: 'created',
      logged_by: userUuid,
      details: { title: data.title },
    })

    return { success: true, focus: data }
  } catch (error) {
    console.error('Unexpected error creating focus:', error)
    return { success: false, error: 'Failed to create focus' }
  }
}

/**
 * Get focus by ID
 */
export async function getFocusById(
  focusId: string
): Promise<{ success: boolean; focus?: Focus; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('focus_of_month')
      .select('*')
      .eq('id', focusId)
      .single()

    if (error) {
      console.error('Error fetching focus:', error)
      return { success: false, error: error.message }
    }

    return { success: true, focus: data }
  } catch (error) {
    console.error('Unexpected error fetching focus:', error)
    return { success: false, error: 'Failed to fetch focus' }
  }
}

/**
 * List focuses with filters
 */
export async function listFocuses(
  filters: FocusListFilters = {}
): Promise<{ success: boolean; focuses?: Focus[]; error?: string }> {
  try {
    let query = supabaseAdmin.from('focus_of_month').select('*')

    // Apply filters
    if (filters.month) {
      query = query.eq('focus_month', filters.month)
    }
    if (filters.year) {
      query = query.eq('focus_year', filters.year)
    }
    if (filters.team) {
      query = query.eq('team_id', filters.team)
    }
    if (filters.group) {
      query = query.eq('group_type', filters.group)
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('status', filters.status)
      } else {
        query = query.eq('status', filters.status)
      }
    }
    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
    }

    // Order by most recent first
    query = query.order('focus_year', { ascending: false })
    query = query.order('focus_month', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error listing focuses:', error)
      return { success: false, error: error.message }
    }

    return { success: true, focuses: data }
  } catch (error) {
    console.error('Unexpected error listing focuses:', error)
    return { success: false, error: 'Failed to list focuses' }
  }
}

/**
 * Update focus
 */
export async function updateFocus(
  focusId: string,
  updates: UpdateFocusRequest,
  userId: string
): Promise<{ success: boolean; focus?: Focus; error?: string }> {
  try {
    const userUuid = await getUserUuid(userId)

    const { data, error } = await supabaseAdmin
      .from('focus_of_month')
      .update(updates)
      .eq('id', focusId)
      .select()
      .single()

    if (error) {
      console.error('Error updating focus:', error)
      return { success: false, error: error.message }
    }

    // Log activity
    await logActivity({
      focus_id: focusId,
      activity_type: 'published', // Simplification; can be more granular
      logged_by: userUuid,
      details: updates,
    })

    return { success: true, focus: data }
  } catch (error) {
    console.error('Unexpected error updating focus:', error)
    return { success: false, error: 'Failed to update focus' }
  }
}

/**
 * Publish focus
 */
export async function publishFocus(
  focusId: string,
  userId: string
): Promise<{ success: boolean; focus?: Focus; error?: string }> {
  try {
    const userUuid = await getUserUuid(userId)

    const { data, error } = await supabaseAdmin
      .from('focus_of_month')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: userUuid,
      })
      .eq('id', focusId)
      .select()
      .single()

    if (error) {
      console.error('Error publishing focus:', error)
      return { success: false, error: error.message }
    }

    return { success: true, focus: data }
  } catch (error) {
    console.error('Unexpected error publishing focus:', error)
    return { success: false, error: 'Failed to publish focus' }
  }
}

/**
 * Archive focus
 */
export async function archiveFocus(
  focusId: string,
  userId: string
): Promise<{ success: boolean; focus?: Focus; error?: string }> {
  try {
    const userUuid = await getUserUuid(userId)

    const { data, error } = await supabaseAdmin
      .from('focus_of_month')
      .update({ status: 'archived' })
      .eq('id', focusId)
      .select()
      .single()

    if (error) {
      console.error('Error archiving focus:', error)
      return { success: false, error: error.message }
    }

    // Log activity
    await logActivity({
      focus_id: focusId,
      activity_type: 'archived',
      logged_by: userUuid,
    })

    return { success: true, focus: data }
  } catch (error) {
    console.error('Unexpected error archiving focus:', error)
    return { success: false, error: 'Failed to archive focus' }
  }
}

/**
 * Delete focus (admins only)
 */
export async function deleteFocus(
  focusId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('focus_of_month').delete().eq('id', focusId)

    if (error) {
      console.error('Error deleting focus:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting focus:', error)
    return { success: false, error: 'Failed to delete focus' }
  }
}

// =====================================================
// SUGGESTION OPERATIONS
// =====================================================

/**
 * Add suggestions from Query Lab
 * Preserves metadata (status, remarks, reasons) from previous focuses if the same pipeline was suggested before
 */
export async function addSuggestions(
  focusId: string,
  request: AddSuggestionsRequest,
  userId: string
): Promise<{ success: boolean; suggestions?: FocusSuggestion[]; error?: string }> {
  try {
    const userUuid = await getUserUuid(userId)

    // 📋 Query existing suggestions from ALL focuses to find metadata for reuse
    // Get all unique mid + product combinations from the request
    const uniqueMids = Array.from(new Set(request.suggestions.map((s) => s.mid)))
    const uniqueProducts = Array.from(new Set(request.suggestions.map((s) => s.product)))

    // Query existing suggestions ordered by created_at DESC (most recent first)
    // We query by mids and products, then filter for exact matches in JavaScript
    const { data: existingSuggestions } = await supabaseAdmin
      .from('focus_suggestions')
      .select('mid, product, user_status, cannot_create_reason, cannot_create_reason_other, user_remark, created_at')
      .in('mid', uniqueMids)
      .in('product', uniqueProducts)
      .order('created_at', { ascending: false })

    // Create map for quick lookup: key = "mid_product" → most recent suggestion
    const suggestionMap = new Map<string, FocusSuggestion>()
    if (existingSuggestions) {
      for (const suggestion of existingSuggestions) {
        const key = `${suggestion.mid}_${suggestion.product}`
        // Only set if not already in map (keeps most recent due to ORDER BY)
        if (!suggestionMap.has(key)) {
          suggestionMap.set(key, suggestion as FocusSuggestion)
        }
      }
    }

    console.log('[addSuggestions] 📋 Found', suggestionMap.size, 'existing suggestions from previous focuses')

    // Prepare suggestion records with preserved metadata from previous focuses
    const suggestions = request.suggestions.map((s, index) => {
      const key = `${s.mid}_${s.product}`
      const existingSuggestion = suggestionMap.get(key)

      return {
        focus_id: focusId,
        pid: s.pid || null,
        mid: s.mid,
        product: s.product,
        media_name: s.media_name || null,
        publisher_name: s.publisher_name || null,
        pic: s.pic || null,
        last_30d_requests: s.last_30d_requests || null,
        six_month_avg_requests: s.six_month_avg_requests || null,
        thirty_day_avg_revenue: s.thirty_day_avg_revenue || null,
        query_lab_data: s.query_lab_data || null,
        display_order: index,
        // Preserve metadata from previous focus if exists
        user_status: existingSuggestion?.user_status || 'pending',
        cannot_create_reason: existingSuggestion?.cannot_create_reason || null,
        cannot_create_reason_other: existingSuggestion?.cannot_create_reason_other || null,
        user_remark: existingSuggestion?.user_remark || null,
      }
    })

    const { data, error } = await supabaseAdmin
      .from('focus_suggestions')
      .insert(suggestions)
      .select()

    if (error) {
      console.error('Error adding suggestions:', error)
      return { success: false, error: error.message }
    }

    // Update source_session_ids if provided
    if (request.source_session_id) {
      const focusResult = await getFocusById(focusId)
      if (focusResult.success && focusResult.focus) {
        const existingIds = focusResult.focus.source_session_ids || []
        if (!existingIds.includes(request.source_session_id)) {
          await supabaseAdmin
            .from('focus_of_month')
            .update({
              source_session_ids: [...existingIds, request.source_session_id],
            })
            .eq('id', focusId)
        }
      }
    }

    // Log activity
    await logActivity({
      focus_id: focusId,
      activity_type: 'suggestion_added',
      logged_by: userUuid,
      details: { count: suggestions.length },
    })

    return { success: true, suggestions: data }
  } catch (error) {
    console.error('Unexpected error adding suggestions:', error)
    return { success: false, error: 'Failed to add suggestions' }
  }
}

/**
 * Get suggestions for a focus
 */
export async function getSuggestions(
  focusId: string,
  filters: SuggestionListFilters = {}
): Promise<{ success: boolean; suggestions?: FocusSuggestion[]; error?: string }> {
  try {
    let query = supabaseAdmin
      .from('focus_suggestions')
      .select('*')
      .eq('focus_id', focusId)

    // Apply filters
    if (filters.team) {
      // Filter by PIC team (would need to join with team_pic_mappings)
      // For now, skip this filter or implement with a separate query
    }
    if (filters.pic) {
      query = query.eq('pic', filters.pic)
    }
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query = query.in('user_status', filters.status)
      } else {
        query = query.eq('user_status', filters.status)
      }
    }
    if (filters.product) {
      query = query.ilike('product', `%${filters.product}%`)
    }
    if (filters.pipeline_created !== undefined) {
      query = query.eq('pipeline_created', filters.pipeline_created)
    }

    // Order by display_order
    query = query.order('display_order', { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching suggestions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, suggestions: data }
  } catch (error) {
    console.error('Unexpected error fetching suggestions:', error)
    return { success: false, error: 'Failed to fetch suggestions' }
  }
}

/**
 * Update suggestion status
 */
export async function updateSuggestionStatus(
  suggestionId: string,
  updates: UpdateSuggestionRequest,
  userId: string
): Promise<{ success: boolean; suggestion?: FocusSuggestion; error?: string }> {
  try {
    const userUuid = await getUserUuid(userId)

    const updateData: any = { ...updates }

    // If marking as completed, set completed_at and completed_by
    if (updates.user_status === 'created' || updates.user_status === 'cannot_create') {
      updateData.completed_at = new Date().toISOString()
      updateData.completed_by = userUuid
    }

    const { data, error } = await supabaseAdmin
      .from('focus_suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select()
      .single()

    if (error) {
      console.error('Error updating suggestion:', error)
      return { success: false, error: error.message }
    }

    // Log activity
    await logActivity({
      focus_id: data.focus_id,
      activity_type: 'suggestion_completed',
      suggestion_id: suggestionId,
      logged_by: userUuid,
      details: updates,
    })

    return { success: true, suggestion: data }
  } catch (error) {
    console.error('Unexpected error updating suggestion:', error)
    return { success: false, error: 'Failed to update suggestion' }
  }
}

/**
 * Delete suggestion (managers only, before publish)
 */
export async function deleteSuggestion(
  suggestionId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userUuid = await getUserUuid(userId)

    // Get suggestion first to log activity
    const { data: suggestion } = await supabaseAdmin
      .from('focus_suggestions')
      .select('focus_id')
      .eq('id', suggestionId)
      .single()

    const { error } = await supabaseAdmin
      .from('focus_suggestions')
      .delete()
      .eq('id', suggestionId)

    if (error) {
      console.error('Error deleting suggestion:', error)
      return { success: false, error: error.message }
    }

    // Log activity
    if (suggestion) {
      await logActivity({
        focus_id: suggestion.focus_id,
        activity_type: 'suggestion_removed',
        suggestion_id: suggestionId,
        logged_by: userUuid,
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error deleting suggestion:', error)
    return { success: false, error: 'Failed to delete suggestion' }
  }
}

// =====================================================
// DASHBOARD & METRICS
// =====================================================

/**
 * Get focus dashboard metrics
 */
export async function getFocusDashboard(
  focusId: string
): Promise<{ success: boolean; metrics?: FocusDashboardMetrics; error?: string }> {
  try {
    // Get all suggestions for this focus
    const { data: suggestions, error } = await supabaseAdmin
      .from('focus_suggestions')
      .select('*, matched_pipeline:pipelines(status)')
      .eq('focus_id', focusId)

    if (error) {
      console.error('Error fetching suggestions for dashboard:', error)
      return { success: false, error: error.message }
    }

    // Calculate metrics
    const total = suggestions.length
    const created = suggestions.filter(
      (s) => s.user_status === 'created' || s.pipeline_created
    ).length
    const failed = suggestions.filter(
      (s) => s.matched_pipeline && (s.matched_pipeline as any).status === '【Z】'
    ).length
    const unavailable = suggestions.filter((s) => s.user_status === 'cannot_create').length
    const pending = suggestions.filter(
      (s) => !s.user_status || s.user_status === 'pending'
    ).length

    // Group by team (using PIC as proxy for team)
    // TODO: Join with team_pic_mappings for accurate team grouping
    const byTeamMap = new Map()
    for (const s of suggestions) {
      const team = 'Unknown' // TODO: Get team from team_pic_mappings
      if (!byTeamMap.has(team)) {
        byTeamMap.set(team, {
          team,
          team_name: team,
          total: 0,
          created: 0,
          failed: 0,
          unavailable: 0,
          pending: 0,
        })
      }
      const teamMetrics = byTeamMap.get(team)
      teamMetrics.total++
      if (s.user_status === 'created' || s.pipeline_created) teamMetrics.created++
      if (s.matched_pipeline && (s.matched_pipeline as any).status === '【Z】')
        teamMetrics.failed++
      if (s.user_status === 'cannot_create') teamMetrics.unavailable++
      if (!s.user_status || s.user_status === 'pending') teamMetrics.pending++
    }

    // Group by status tier
    // TODO: Join with pipelines to get actual status distribution

    // Timeline (group by completed_at date)
    const timelineMap = new Map()
    for (const s of suggestions) {
      if (s.completed_at) {
        const date = s.completed_at.split('T')[0]
        timelineMap.set(date, (timelineMap.get(date) || 0) + 1)
      }
    }

    const timeline = Array.from(timelineMap.entries())
      .map(([date, count]) => ({ date, created: count }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const metrics: FocusDashboardMetrics = {
      total_suggestions: total,
      created,
      failed,
      unavailable,
      pending,
      by_team: Array.from(byTeamMap.values()),
      by_status_tier: [], // TODO: Implement
      timeline,
      completion_rate: total > 0 ? ((created + unavailable) / total) * 100 : 0,
    }

    return { success: true, metrics }
  } catch (error) {
    console.error('Unexpected error getting dashboard:', error)
    return { success: false, error: 'Failed to get dashboard metrics' }
  }
}

// =====================================================
// MANAGER ROLES
// =====================================================

/**
 * Grant manager role
 */
export async function grantManagerRole(
  request: GrantManagerRoleRequest,
  grantedBy: string
): Promise<{ success: boolean; role?: FocusManagerRole; error?: string }> {
  try {
    const grantedByUuid = await getUserUuid(grantedBy)
    const userUuid = await getUserUuid(request.user_id)

    const { data, error } = await supabaseAdmin
      .from('focus_manager_roles')
      .insert({
        user_id: userUuid,
        team_id: request.team_id || null,
        can_create: request.can_create ?? true,
        can_publish: request.can_publish ?? true,
        can_delete: request.can_delete ?? false,
        granted_by: grantedByUuid,
      })
      .select()
      .single()

    if (error) {
      console.error('Error granting manager role:', error)
      return { success: false, error: error.message }
    }

    return { success: true, role: data }
  } catch (error) {
    console.error('Unexpected error granting manager role:', error)
    return { success: false, error: 'Failed to grant manager role' }
  }
}

/**
 * Revoke manager role
 */
export async function revokeManagerRole(
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.from('focus_manager_roles').delete().eq('id', roleId)

    if (error) {
      console.error('Error revoking manager role:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Unexpected error revoking manager role:', error)
    return { success: false, error: 'Failed to revoke manager role' }
  }
}

/**
 * Get manager roles
 */
export async function getManagerRoles(): Promise<{
  success: boolean
  roles?: FocusManagerRole[]
  error?: string
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('focus_manager_roles')
      .select('*, user:users!user_id(name, email), granted_by_user:users!granted_by(name, email)')

    if (error) {
      console.error('Error fetching manager roles:', error)
      return { success: false, error: error.message }
    }

    return { success: true, roles: data }
  } catch (error) {
    console.error('Unexpected error fetching manager roles:', error)
    return { success: false, error: 'Failed to fetch manager roles' }
  }
}

// =====================================================
// ACTIVITY LOG
// =====================================================

/**
 * Log focus activity
 */
async function logActivity(activity: {
  focus_id: string
  activity_type: string
  logged_by: string
  suggestion_id?: string
  details?: Record<string, any>
  notes?: string
}): Promise<void> {
  try {
    await supabaseAdmin.from('focus_activity_log').insert(activity)
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw - activity logging is non-critical
  }
}

/**
 * Get focus activity log
 */
export async function getFocusActivity(
  focusId: string
): Promise<{ success: boolean; activities?: FocusActivity[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('focus_activity_log')
      .select('*, logged_by_user:users!logged_by(name, email)')
      .eq('focus_id', focusId)
      .order('logged_at', { ascending: false })

    if (error) {
      console.error('Error fetching activity log:', error)
      return { success: false, error: error.message }
    }

    return { success: true, activities: data }
  } catch (error) {
    console.error('Unexpected error fetching activity log:', error)
    return { success: false, error: 'Failed to fetch activity log' }
  }
}
