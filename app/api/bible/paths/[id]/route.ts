/**
 * Bible Path Detail API - Get, Update, Delete
 * Endpoints: GET (details), PUT (update), DELETE (delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove, isAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  UpdatePathRequest,
  Path,
  PathArticle,
  Article,
} from '@/lib/types/bible'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const updatePathSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  icon: z.string().max(50).optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
})

// =====================================================
// GET - Get path details with articles
// =====================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const pathId = params.id

    // Fetch path
    const { data: path, error: pathError } = await supabase
      .from('bible_paths')
      .select('*')
      .eq('id', pathId)
      .single()

    if (pathError || !path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    // Fetch articles in this path with ordering
    const { data: pathArticles, error: articlesError } = await supabase
      .from('bible_path_articles')
      .select(`
        id,
        path_id,
        article_id,
        display_order,
        is_required,
        article:bible_articles(*)
      `)
      .eq('path_id', pathId)
      .order('display_order', { ascending: true })

    if (articlesError) {
      console.error('[Bible Path API] Error fetching articles:', articlesError)
      return NextResponse.json({ error: articlesError.message }, { status: 500 })
    }

    // Fetch creator name
    const { data: creator } = await supabase
      .from('users')
      .select('name')
      .eq('id', path.created_by)
      .single()

    // Fetch user progress for articles in this path
    const articleIds = (pathArticles || []).map((pa: any) => pa.article_id)
    const completedArticleIds = new Set<string>()

    if (articleIds.length > 0) {
      const { data: userProgress } = await supabase
        .from('bible_user_progress')
        .select('article_id')
        .eq('user_id', user.sub)
        .in('article_id', articleIds)

      userProgress?.forEach((p: any) => {
        completedArticleIds.add(p.article_id)
      })
    }

    // Format response with articles and completion status
    const formattedArticles: PathArticle[] = (pathArticles || []).map((pa: any) => ({
      id: pa.id,
      path_id: pa.path_id,
      article_id: pa.article_id,
      display_order: pa.display_order,
      is_required: pa.is_required,
      article: {
        ...pa.article,
        is_completed: completedArticleIds.has(pa.article_id),
      } as Article,
    }))

    const articleCount = formattedArticles.length
    const completedCount = formattedArticles.filter(pa => (pa.article as any)?.is_completed).length
    const progressPercentage = articleCount > 0 ? Math.round((completedCount / articleCount) * 100) : 0

    const formattedPath: Path = {
      id: path.id,
      title: path.title,
      description: path.description,
      icon: path.icon,
      color: path.color,
      created_by: path.created_by,
      created_at: path.created_at,
      updated_at: path.updated_at,
      article_count: articleCount,
      completed_count: completedCount,
      progress_percentage: progressPercentage,
      creator_name: creator?.name,
      articles: formattedArticles,
    }

    return NextResponse.json({
      status: 'ok',
      path: formattedPath,
    })
  } catch (error) {
    console.error('[Bible Path API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - Update path
// =====================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Leader/Manager/Admin can update paths
    requireLeaderOrAbove(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updatePathSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data
    const supabase = createAdminClient()
    const pathId = params.id

    // Check if path exists
    const { data: existingPath } = await supabase
      .from('bible_paths')
      .select('id')
      .eq('id', pathId)
      .single()

    if (!existingPath) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    // Update path
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color

    const { data: path, error } = await supabase
      .from('bible_paths')
      .update(updateData)
      .eq('id', pathId)
      .select()
      .single()

    if (error) {
      console.error('[Bible Path API] Error updating path:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      path,
    })
  } catch (error: any) {
    console.error('[Bible Path API] Error in PUT:', error)

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

// =====================================================
// DELETE - Delete path
// =====================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Admin/Manager can delete paths
    if (!isAdminOrManager(user)) {
      throw new Error('Forbidden: Admin or Manager access required')
    }

    const supabase = createAdminClient()
    const pathId = params.id

    // Check if path exists
    const { data: existingPath } = await supabase
      .from('bible_paths')
      .select('id')
      .eq('id', pathId)
      .single()

    if (!existingPath) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    // Delete path (cascade will delete path_article relationships)
    const { error } = await supabase
      .from('bible_paths')
      .delete()
      .eq('id', pathId)

    if (error) {
      console.error('[Bible Path API] Error deleting path:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Path deleted successfully',
    })
  } catch (error: any) {
    console.error('[Bible Path API] Error in DELETE:', error)

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
