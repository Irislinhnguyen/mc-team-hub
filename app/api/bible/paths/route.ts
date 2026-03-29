/**
 * Bible Paths API - Main CRUD
 * Endpoints: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  CreatePathRequest,
  Path,
} from '@/lib/types/bible'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const createPathSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex color').optional().nullable(),
  sections: z.array(z.string()).optional(),
})

// =====================================================
// GET - List all paths
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { searchParams } = new URL(request.url)

    // Parse query parameters
    const search = searchParams.get('search')

    // Build query
    let query = supabase
      .from('bible_paths')
      .select('*')
      .order('created_at', { ascending: false })

    // Add search filter if provided
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: paths, error } = await query

    if (error) {
      console.error('[Bible Paths API] Error fetching paths:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch article counts and progress for each path
    const pathIds = (paths || []).map((p: any) => p.id)
    const articleCountMap: Record<string, number> = {}
    const completedCountMap: Record<string, number> = {}

    if (pathIds.length > 0) {
      // Get article counts
      const { data: pathArticles } = await supabase
        .from('bible_path_articles')
        .select('path_id')
        .in('path_id', pathIds)

      pathArticles?.forEach((pa: any) => {
        articleCountMap[pa.path_id] = (articleCountMap[pa.path_id] || 0) + 1
      })

      // Get completed counts for current user
      const { data: userProgress } = await supabase
        .from('bible_user_progress')
        .select('article_id')
        .eq('user_id', user.sub)

      const completedArticleIds = new Set(userProgress?.map((p: any) => p.article_id) || [])

      // For each path, count completed articles
      if (completedArticleIds.size > 0) {
        const { data: completedPathArticles } = await supabase
          .from('bible_path_articles')
          .select('path_id, article_id')
          .in('path_id', pathIds)
          .in('article_id', Array.from(completedArticleIds))

        completedPathArticles?.forEach((pa: any) => {
          completedCountMap[pa.path_id] = (completedCountMap[pa.path_id] || 0) + 1
        })
      }
    }

    // Fetch creator names
    const creatorIds = [...new Set((paths || []).map((p: any) => p.created_by))]
    const creatorNameMap: Record<string, string> = {}
    if (creatorIds.length > 0) {
      const { data: creators } = await supabase
        .from('users')
        .select('id, name')
        .in('id', creatorIds)

      creators?.forEach((creator: any) => {
        creatorNameMap[creator.id] = creator.name
      })
    }

    // Format response
    const formattedPaths: Path[] = (paths || []).map((p: any) => {
      const articleCount = articleCountMap[p.id] || 0
      const completedCount = completedCountMap[p.id] || 0
      const progressPercentage = articleCount > 0 ? Math.round((completedCount / articleCount) * 100) : 0

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        icon: p.icon,
        color: p.color,
        sections: p.sections || [],
        created_by: p.created_by,
        created_at: p.created_at,
        updated_at: p.updated_at,
        article_count: articleCount,
        completed_count: completedCount,
        progress_percentage: progressPercentage,
        creator_name: creatorNameMap[p.created_by],
      }
    })

    return NextResponse.json({
      status: 'ok',
      paths: formattedPaths,
    })
  } catch (error) {
    console.error('[Bible Paths API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Create new path
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Leader/Manager/Admin can create paths
    requireLeaderOrAbove(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createPathSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data

    const supabase = createAdminClient()

    // Create path
    const { data: path, error } = await supabase
      .from('bible_paths')
      .insert({
        title: data.title,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || null,
        sections: data.sections || [],
        created_by: user.sub,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bible Paths API] Error creating path:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      path,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Bible Paths API] Error in POST:', error)

    // Handle permission errors
    if (error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
