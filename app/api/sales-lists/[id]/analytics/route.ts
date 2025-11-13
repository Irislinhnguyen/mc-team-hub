/**
 * Sales List Analytics API
 *
 * Endpoint for retrieving analytics and metrics for a sales list:
 * - GET: Get comprehensive analytics for a list
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../../lib/supabase/admin'
import { SalesListAnalytics } from '../../../../../lib/types/salesLists'

/**
 * GET /api/sales-lists/[id]/analytics?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&pic_user_id=UUID
 * Get analytics for a sales list
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const listId = params.id

    // Get auth token from cookie
    const authToken = request.cookies.get('__Host-auth_token')?.value

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 })
    }

    // Parse JWT to get user email
    let userEmail: string
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]))
      userEmail = payload.sub || payload.email

      if (!userEmail) {
        throw new Error('No user email in token')
      }
    } catch (error) {
      console.error('[GET analytics] Invalid token:', error)
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 })
    }

    const supabase = createAdminClient()

    // Get user ID from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()

    if (userError || !user) {
      console.error('[GET analytics] User not found:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userId = user.id

    // Verify user has access to this list
    const { data: list } = await supabase
      .from('sales_lists')
      .select('id, name, user_id')
      .eq('id', listId)
      .single()

    if (!list) {
      return NextResponse.json({ error: 'List not found' }, { status: 404 })
    }

    const isOwner = list.user_id === userId

    if (!isOwner) {
      const { data: share } = await supabase
        .from('sales_list_shares')
        .select('permission')
        .eq('list_id', listId)
        .eq('shared_with_user_id', userId)
        .single()

      if (!share) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const picUserId = searchParams.get('pic_user_id')

    // Build date filter
    let dateFilter = ''
    if (startDate && endDate) {
      dateFilter = `AND sla.contact_time >= '${startDate}' AND sla.contact_time <= '${endDate}'`
    } else if (startDate) {
      dateFilter = `AND sla.contact_time >= '${startDate}'`
    } else if (endDate) {
      dateFilter = `AND sla.contact_time <= '${endDate}'`
    }

    // Build PIC filter
    let picFilter = ''
    if (picUserId) {
      picFilter = `AND sla.logged_by = '${picUserId}'`
    }

    // Query for overall metrics
    const { data: overallData, error: overallError } = await supabase.rpc(
      'get_sales_list_analytics',
      {
        p_list_id: listId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_pic_user_id: picUserId
      }
    ).catch(async () => {
      // If RPC doesn't exist, fall back to manual queries
      // This is a comprehensive analytics query
      const query = `
        SELECT
          COUNT(DISTINCT sli.id) as total_items,
          COUNT(CASE WHEN sla.activity_type = 'contact' THEN 1 END) as total_contacts,
          COUNT(CASE WHEN sla.contact_outcome = 'retarget' THEN 1 END) as total_retargets,
          COUNT(CASE WHEN sla.closed_status = 'closed_won' THEN 1 END) as closed_won,
          COUNT(CASE WHEN sla.closed_status = 'closed_lost' THEN 1 END) as closed_lost,
          COUNT(CASE WHEN sla.response_outcome = 'positive' THEN 1 END) as positive_responses,
          COUNT(CASE WHEN sla.response_outcome = 'negative' THEN 1 END) as negative_responses,
          COUNT(CASE WHEN sla.response_outcome = 'neutral' THEN 1 END) as neutral_responses,
          COUNT(CASE WHEN sla.activity_type = 'contact' AND sla.response_outcome IS NULL THEN 1 END) as awaiting_response,
          COALESCE(SUM(CASE WHEN sla.closed_status = 'closed_won' THEN sla.deal_value END), 0) as total_deal_value,
          COALESCE(AVG(CASE WHEN sla.closed_status = 'closed_won' THEN sla.deal_value END), 0) as avg_deal_value,
          COALESCE(AVG(EXTRACT(EPOCH FROM (sla.response_time - sla.contact_time))/3600), 0) as avg_response_hours,
          COALESCE(MIN(EXTRACT(EPOCH FROM (sla.response_time - sla.contact_time))/3600), 0) as fastest_response_hours,
          COALESCE(MAX(EXTRACT(EPOCH FROM (sla.response_time - sla.contact_time))/3600), 0) as slowest_response_hours
        FROM sales_list_items sli
        LEFT JOIN sales_list_activities sla ON sla.list_item_id = sli.id
        WHERE sli.list_id = $1
          ${dateFilter}
          ${picFilter}
      `

      const { data, error } = await supabase.rpc('execute_sql', { sql: query, params: [listId] })
      return { data, error }
    })

    // Fetch items summary for retarget analysis
    const { data: itemsSummary } = await supabase
      .from('sales_list_items_summary')
      .select('id, retarget_count, total_contacts, successful_retargets')
      .eq('list_id', listId)

    // Calculate retarget metrics
    const totalRetargets = itemsSummary?.reduce((sum, item) => sum + (item.retarget_count || 0), 0) || 0
    const successfulRetargets = itemsSummary?.reduce((sum, item) => sum + (item.successful_retargets || 0), 0) || 0
    const retargetSuccessRate = totalRetargets > 0 ? (successfulRetargets / totalRetargets) * 100 : 0
    const avgContactsPerItem = itemsSummary && itemsSummary.length > 0
      ? itemsSummary.reduce((sum, item) => sum + (item.total_contacts || 0), 0) / itemsSummary.length
      : 0
    const avgRetargetsPerItem = itemsSummary && itemsSummary.length > 0
      ? totalRetargets / itemsSummary.length
      : 0
    const itemsWith3PlusRetargets = itemsSummary?.filter(item => (item.retarget_count || 0) >= 3).length || 0

    // Fetch PIC performance
    const { data: picPerformance } = await supabase
      .from('sales_list_activities')
      .select(`
        logged_by,
        activity_type,
        contact_outcome,
        response_outcome,
        closed_status,
        deal_value,
        contact_time,
        response_time,
        user:users!logged_by(email, name)
      `)
      .in('list_item_id', supabase
        .from('sales_list_items')
        .select('id')
        .eq('list_id', listId)
      )

    // Process PIC performance data
    const picStats: { [key: string]: any } = {}

    picPerformance?.forEach(activity => {
      const picId = activity.logged_by
      if (!picStats[picId]) {
        picStats[picId] = {
          user_id: picId,
          user_email: activity.user?.email || 'Unknown',
          total_contacts: 0,
          total_retargets: 0,
          positive_responses: 0,
          negative_responses: 0,
          closed_won: 0,
          closed_lost: 0,
          total_deal_value: 0,
          response_times: [],
          successful_retargets: 0,
        }
      }

      if (activity.activity_type === 'contact') picStats[picId].total_contacts++
      if (activity.contact_outcome === 'retarget') picStats[picId].total_retargets++
      if (activity.response_outcome === 'positive') picStats[picId].positive_responses++
      if (activity.response_outcome === 'negative') picStats[picId].negative_responses++
      if (activity.closed_status === 'closed_won') {
        picStats[picId].closed_won++
        if (activity.deal_value) picStats[picId].total_deal_value += Number(activity.deal_value)
      }
      if (activity.closed_status === 'closed_lost') picStats[picId].closed_lost++

      if (activity.response_time && activity.contact_time) {
        const responseHours = (new Date(activity.response_time).getTime() - new Date(activity.contact_time).getTime()) / (1000 * 60 * 60)
        picStats[picId].response_times.push(responseHours)
      }

      if (activity.contact_outcome === 'retarget' && activity.response_outcome === 'positive') {
        picStats[picId].successful_retargets++
      }
    })

    const picPerformanceArray = Object.values(picStats).map((pic: any) => ({
      user_id: pic.user_id,
      user_email: pic.user_email,
      total_contacts: pic.total_contacts,
      total_retargets: pic.total_retargets,
      positive_responses: pic.positive_responses,
      negative_responses: pic.negative_responses,
      closed_won: pic.closed_won,
      closed_lost: pic.closed_lost,
      total_deal_value: pic.total_deal_value,
      avg_response_time_hours: pic.response_times.length > 0
        ? pic.response_times.reduce((a: number, b: number) => a + b, 0) / pic.response_times.length
        : 0,
      retarget_success_rate: pic.total_retargets > 0
        ? (pic.successful_retargets / pic.total_retargets) * 100
        : 0,
    }))

    // Fetch contacts by day (for chart)
    const { data: contactsByDay } = await supabase
      .from('sales_list_activities')
      .select('contact_time, activity_type, contact_outcome, response_time')
      .in('list_item_id', supabase
        .from('sales_list_items')
        .select('id')
        .eq('list_id', listId)
      )
      .order('contact_time', { ascending: true })

    // Group by day
    const contactsByDayMap: { [key: string]: any } = {}
    contactsByDay?.forEach(activity => {
      const date = activity.contact_time.split('T')[0]
      if (!contactsByDayMap[date]) {
        contactsByDayMap[date] = {
          date,
          contact_count: 0,
          retarget_count: 0,
          response_count: 0,
        }
      }
      if (activity.activity_type === 'contact') contactsByDayMap[date].contact_count++
      if (activity.contact_outcome === 'retarget') contactsByDayMap[date].retarget_count++
      if (activity.response_time) contactsByDayMap[date].response_count++
    })

    const analytics: Partial<SalesListAnalytics> = {
      list_id: listId,
      list_name: list.name,
      total_items: itemsSummary?.length || 0,
      total_contacts: overallData?.[0]?.total_contacts || 0,
      total_retargets: totalRetargets,
      closed_won: overallData?.[0]?.closed_won || 0,
      closed_lost: overallData?.[0]?.closed_lost || 0,
      positive_responses: overallData?.[0]?.positive_responses || 0,
      negative_responses: overallData?.[0]?.negative_responses || 0,
      neutral_responses: overallData?.[0]?.neutral_responses || 0,
      awaiting_response: overallData?.[0]?.awaiting_response || 0,
      total_deal_value: overallData?.[0]?.total_deal_value || 0,
      avg_deal_value: overallData?.[0]?.avg_deal_value || 0,
      retarget_success_rate: retargetSuccessRate,
      avg_contacts_per_item: avgContactsPerItem,
      avg_retargets_per_item: avgRetargetsPerItem,
      items_with_3plus_retargets: itemsWith3PlusRetargets,
      avg_response_time_hours: overallData?.[0]?.avg_response_hours || 0,
      fastest_response_hours: overallData?.[0]?.fastest_response_hours || 0,
      slowest_response_hours: overallData?.[0]?.slowest_response_hours || 0,
      pic_performance: picPerformanceArray,
      contacts_by_day: Object.values(contactsByDayMap),
      outcomes_by_week: [], // Can be calculated if needed
    }

    return NextResponse.json(analytics)
  } catch (error) {
    console.error('[GET analytics] Unexpected error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
