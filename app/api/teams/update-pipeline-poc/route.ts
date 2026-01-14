/**
 * POST /api/teams/update-pipeline-poc
 * Update the pipeline POC mapping for a BigQuery PIC
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { picName, pipelinePocName, userEmail } = await request.json()

    if (!picName) {
      return NextResponse.json(
        { status: 'error', message: 'picName is required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Update pipeline_poc_name in team_pic_mappings with audit fields
    const { error } = await supabase
      .from('team_pic_mappings')
      .update({
        pipeline_poc_name: pipelinePocName || null,
        updated_at: new Date().toISOString(),
        updated_by_email: userEmail || null
      })
      .eq('pic_name', picName)

    if (error) {
      console.error('[Update Pipeline POC] Error:', error)
      return NextResponse.json(
        { status: 'error', message: 'Failed to update pipeline POC mapping' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Pipeline POC mapping updated successfully'
    })
  } catch (error) {
    console.error('[Update Pipeline POC] Unexpected error:', error)
    return NextResponse.json(
      { status: 'error', message: 'Internal server error' },
      { status: 500 }
    )
  }
}
