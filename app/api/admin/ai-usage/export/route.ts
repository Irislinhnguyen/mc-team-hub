/**
 * API Route: Admin AI Usage Export
 * GET /api/admin/ai-usage/export
 *
 * Exports OpenAI usage data as CSV or JSON:
 * - Supports date range filtering
 * - Supports format selection (csv, json)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserFromRequest, isAdmin, isManager } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const user = getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or manager
    if (!isAdmin(user) && !isManager(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin or Manager access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json' // json or csv
    const days = parseInt(searchParams.get('days') || '30', 10)

    const supabase = createAdminClient()

    // Calculate start date
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Query all logs
    const { data: logs, error } = await supabase
      .from('openai_usage_logs')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[AI Usage Export] Query error:', error)
      return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
    }

    // Format data
    const exportData = logs?.map(log => ({
      id: log.id,
      timestamp: log.created_at,
      user_id: log.user_id,
      user_email: log.user_email,
      user_role: log.user_role,
      endpoint: log.endpoint,
      feature: log.feature,
      model: log.model,
      prompt_tokens: log.prompt_tokens,
      completion_tokens: log.completion_tokens,
      total_tokens: log.total_tokens,
      input_cost_usd: log.input_cost,
      output_cost_usd: log.output_cost,
      total_cost_usd: log.total_cost,
      request_summary: log.request_summary,
      status: log.response_status,
      error_message: log.error_message,
      execution_time_ms: log.execution_time_ms,
    }))

    if (format === 'csv') {
      // Generate CSV
      const headers = [
        'id', 'timestamp', 'user_id', 'user_email', 'user_role',
        'endpoint', 'feature', 'model',
        'prompt_tokens', 'completion_tokens', 'total_tokens',
        'input_cost_usd', 'output_cost_usd', 'total_cost_usd',
        'request_summary', 'status', 'error_message', 'execution_time_ms'
      ]

      const csvRows = [
        headers.join(','),
        ...(exportData || []).map(row =>
          headers.map(header => {
            const value = row[header as keyof typeof row]
            // Escape commas and quotes in string values
            if (typeof value === 'string') {
              return `"${value.replace(/"/g, '""').replace(/\n/g, ' ')}"`
            }
            return value ?? ''
          }).join(',')
        )
      ]

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="openai-usage-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    // Default: JSON format
    return NextResponse.json({
      data: exportData,
      metadata: {
        exportedAt: new Date().toISOString(),
        period: { days },
        totalRecords: exportData?.length || 0,
      },
    })

  } catch (error) {
    console.error('[AI Usage Export] Error:', error)
    return NextResponse.json(
      { error: 'Failed to export usage data' },
      { status: 500 }
    )
  }
}
