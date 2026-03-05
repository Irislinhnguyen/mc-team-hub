/**
 * Bible Path Articles API - Manage articles in a path
 * Endpoints: GET (list), POST (add), PUT (reorder)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AddArticleToPathRequest,
  ReorderPathArticlesRequest,
  PathArticle,
} from '@/lib/types/bible'
import { z } from 'zod'

// =====================================================
// Validation Schemas
// =====================================================

const addArticleSchema = z.object({
  article_id: z.string().uuid('Invalid article ID'),
  display_order: z.number().int().min(0).optional(),
  is_required: z.boolean().optional(),
})

const reorderArticlesSchema = z.object({
  articles: z.array(z.object({
    id: z.string().uuid(),
    display_order: z.number().int().min(0),
  })).min(1),
})

// =====================================================
// GET - Get all articles in a path
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

    // Verify path exists
    const { data: path } = await supabase
      .from('bible_paths')
      .select('id')
      .eq('id', pathId)
      .single()

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    // Fetch articles in this path
    const { data: pathArticles, error } = await supabase
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

    if (error) {
      console.error('[Bible Path Articles API] Error fetching articles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      articles: pathArticles || [],
      total: (pathArticles || []).length,
    })
  } catch (error) {
    console.error('[Bible Path Articles API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Add article to path
// =====================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Leader/Manager/Admin can add articles to paths
    requireLeaderOrAbove(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = addArticleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data
    const supabase = createAdminClient()
    const pathId = params.id

    // Verify path exists
    const { data: path } = await supabase
      .from('bible_paths')
      .select('id')
      .eq('id', pathId)
      .single()

    if (!path) {
      return NextResponse.json({ error: 'Path not found' }, { status: 404 })
    }

    // Verify article exists
    const { data: article } = await supabase
      .from('bible_articles')
      .select('id')
      .eq('id', data.article_id)
      .single()

    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Check if article is already in this path
    const { data: existing } = await supabase
      .from('bible_path_articles')
      .select('id')
      .eq('path_id', pathId)
      .eq('article_id', data.article_id)
      .single()

    if (existing) {
      return NextResponse.json({
        error: 'Article already added to this path',
      }, { status: 409 })
    }

    // Get next display order if not provided
    let displayOrder = data.display_order
    if (displayOrder === undefined) {
      const { data: lastArticle } = await supabase
        .from('bible_path_articles')
        .select('display_order')
        .eq('path_id', pathId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()

      displayOrder = (lastArticle?.display_order ?? -1) + 1
    }

    // Add article to path
    const { data: pathArticle, error } = await supabase
      .from('bible_path_articles')
      .insert({
        path_id: pathId,
        article_id: data.article_id,
        display_order: displayOrder,
        is_required: data.is_required ?? false,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bible Path Articles API] Error adding article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      article: pathArticle,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Bible Path Articles API] Error in POST:', error)

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
// PUT - Reorder articles in path
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

    // Only Leader/Manager/Admin can reorder articles
    requireLeaderOrAbove(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = reorderArticlesSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data
    const supabase = createAdminClient()
    const pathId = params.id

    // Update each article's display order
    const updates = data.articles.map(article =>
      supabase
        .from('bible_path_articles')
        .update({ display_order: article.display_order })
        .eq('id', article.id)
        .eq('path_id', pathId)
    )

    // Execute all updates
    const results = await Promise.all(updates)

    // Check for errors
    const errors = results.filter(r => r.error).map(r => r.error)
    if (errors.length > 0) {
      console.error('[Bible Path Articles API] Errors reordering articles:', errors)
      return NextResponse.json({
        error: 'Some articles could not be reordered',
        details: errors,
      }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Articles reordered successfully',
    })
  } catch (error: any) {
    console.error('[Bible Path Articles API] Error in PUT:', error)

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
// DELETE - Remove article from path
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

    // Only Leader/Manager/Admin can remove articles from paths
    requireLeaderOrAbove(user)

    const { searchParams } = new URL(request.url)
    const articleId = searchParams.get('article_id')

    if (!articleId) {
      return NextResponse.json({
        error: 'article_id query parameter is required',
      }, { status: 400 })
    }

    const supabase = createAdminClient()
    const pathId = params.id

    // Remove article from path
    const { error } = await supabase
      .from('bible_path_articles')
      .delete()
      .eq('path_id', pathId)
      .eq('article_id', articleId)

    if (error) {
      console.error('[Bible Path Articles API] Error removing article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Article removed from path successfully',
    })
  } catch (error: any) {
    console.error('[Bible Path Articles API] Error in DELETE:', error)

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
