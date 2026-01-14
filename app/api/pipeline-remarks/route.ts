/**
 * Pipeline Remarks API - Global remarks for pipelines (shared across all focuses)
 * POST - Create/update global remark for a pipeline
 * GET - Get global remark for a pipeline
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { createClient } from '@/lib/supabase/server'

// =====================================================
// POST - Create/update global remark
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { mid, product, remark, cannot_create_reason, cannot_create_reason_other } = body

    if (!mid || !product) {
      return NextResponse.json(
        { error: 'mid and product are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get user UUID
    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('email', user.sub)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

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
          updated_by: userData.id,
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
          updated_by: userData.id,
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
    const { searchParams } = new URL(request.url)
    const mid = searchParams.get('mid')
    const product = searchParams.get('product')

    if (!mid || !product) {
      return NextResponse.json(
        { error: 'mid and product are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

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
