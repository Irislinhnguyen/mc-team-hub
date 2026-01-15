/**
 * Pipeline Remarks API - Global remarks for pipelines (shared across all focuses)
 * POST - Create/update global remark for a pipeline
 * GET - Get global remark for a pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { authenticateRequest } from '@/lib/auth/api-auth'

// =====================================================
// POST - Create/update global remark
// =====================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate using custom JWT (same pattern as other APIs)
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { mid, product, remark, cannot_create_reason, cannot_create_reason_other } = body

    if (!mid || !product) {
      return NextResponse.json(
        { error: 'mid and product are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Check if remark already exists
    const { data: existing } = await supabase
      .from('pipeline_remarks')
      .select('id')
      .eq('mid', mid)
      .eq('product', product)
      .single()

    let result
    if (existing) {
      // Update existing remark
      const { data, error } = await supabase
        .from('pipeline_remarks')
        .update({
          remark: remark?.trim() || null,
          cannot_create_reason: cannot_create_reason || null,
          cannot_create_reason_other: cannot_create_reason_other || null,
          updated_by: auth.userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single()

      if (error) throw error
      result = data
    } else {
      // Create new remark
      const { data, error } = await supabase
        .from('pipeline_remarks')
        .insert({
          mid,
          product,
          remark: remark?.trim() || null,
          cannot_create_reason: cannot_create_reason || null,
          cannot_create_reason_other: cannot_create_reason_other || null,
          updated_by: auth.userId,
        })
        .select()
        .single()

      if (error) throw error
      result = data
    }

    return NextResponse.json({
      status: 'ok',
      data: result,
    })
  } catch (error) {
    console.error('Error in POST /api/pipeline-remarks:', error)
    return NextResponse.json(
      { error: 'Failed to save remark' },
      { status: 500 }
    )
  }
}

// =====================================================
// GET - Get global remark for a pipeline
// =====================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate using custom JWT (same pattern as other APIs)
    const auth = await authenticateRequest(request)
    if (!auth.success) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mid = searchParams.get('mid')
    const product = searchParams.get('product')

    if (!mid || !product) {
      return NextResponse.json(
        { error: 'mid and product are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('pipeline_remarks')
      .select('*')
      .eq('mid', mid)
      .eq('product', product)
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return NextResponse.json({
      status: 'ok',
      data: data || null,
    })
  } catch (error) {
    console.error('Error in GET /api/pipeline-remarks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch remark' },
      { status: 500 }
    )
  }
}
