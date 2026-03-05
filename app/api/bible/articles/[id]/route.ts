/**
 * Bible Article Detail API - Get, Update, Delete
 * Endpoints: GET (details), PUT (update), DELETE (delete)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove, isAdminOrManager } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  UpdateArticleRequest,
  Article,
} from '@/lib/types/bible'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const updateArticleSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  content: z.string().min(1).max(100000).optional(),
  content_type: z.enum(['article', 'howto', 'video', 'file']).optional(),
  video_url: z.string().url().nullable().optional(),
  file_url: z.string().url().nullable().optional(),
  file_name: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).nullable().optional(),
})

// =====================================================
// GET - Get article content
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
    const articleId = params.id

    // Fetch article
    const { data: article, error } = await supabase
      .from('bible_articles')
      .select('*')
      .eq('id', articleId)
      .single()

    if (error || !article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Fetch creator name
    const { data: creator } = await supabase
      .from('users')
      .select('name')
      .eq('id', article.created_by)
      .single()

    // Check completion status
    const { data: userProgress } = await supabase
      .from('bible_user_progress')
      .select('completed_at')
      .eq('user_id', user.sub)
      .eq('article_id', articleId)
      .single()

    // Format response
    const formattedArticle: Article = {
      id: article.id,
      title: article.title,
      content: article.content,
      content_type: article.content_type,
      video_url: article.video_url,
      file_url: article.file_url,
      file_name: article.file_name,
      file_size: article.file_size,
      tags: article.tags,
      created_by: article.created_by,
      created_at: article.created_at,
      updated_at: article.updated_at,
      creator_name: creator?.name,
      is_completed: !!userProgress,
      completed_at: userProgress?.completed_at || null,
    }

    return NextResponse.json({
      status: 'ok',
      article: formattedArticle,
    })
  } catch (error) {
    console.error('[Bible Article API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// PUT - Update article
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

    // Only Leader/Manager/Admin can update articles
    requireLeaderOrAbove(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = updateArticleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data
    const supabase = createAdminClient()
    const articleId = params.id

    // Check if article exists
    const { data: existingArticle } = await supabase
      .from('bible_articles')
      .select('id')
      .eq('id', articleId)
      .single()

    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Update article
    const updateData: any = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.content !== undefined) updateData.content = data.content
    if (data.content_type !== undefined) updateData.content_type = data.content_type
    if (data.video_url !== undefined) updateData.video_url = data.video_url
    if (data.file_url !== undefined) updateData.file_url = data.file_url
    if (data.file_name !== undefined) updateData.file_name = data.file_name
    if (data.file_size !== undefined) updateData.file_size = data.file_size
    if (data.tags !== undefined) updateData.tags = data.tags

    const { data: article, error } = await supabase
      .from('bible_articles')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      console.error('[Bible Article API] Error updating article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      article,
    })
  } catch (error: any) {
    console.error('[Bible Article API] Error in PUT:', error)

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
// DELETE - Delete article
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

    // Only Admin/Manager can delete articles
    if (!isAdminOrManager(user)) {
      throw new Error('Forbidden: Admin or Manager access required')
    }

    const supabase = createAdminClient()
    const articleId = params.id

    // Check if article exists
    const { data: existingArticle } = await supabase
      .from('bible_articles')
      .select('id')
      .eq('id', articleId)
      .single()

    if (!existingArticle) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 })
    }

    // Delete article (cascade will delete path_article relationships and user_progress)
    const { error } = await supabase
      .from('bible_articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('[Bible Article API] Error deleting article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      message: 'Article deleted successfully',
    })
  } catch (error: any) {
    console.error('[Bible Article API] Error in DELETE:', error)

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
