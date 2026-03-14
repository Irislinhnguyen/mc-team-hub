/**
 * Bible Articles API - Main CRUD
 * Endpoints: GET (list), POST (create)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove } from '@query-stream-ai/auth/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import type {
  CreateArticleRequest,
  Article,
  ArticleContentType,
} from '@query-stream-ai/types/bible'
import { z } from 'zod'

// =====================================================
// Validation Schema
// =====================================================

const createArticleSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').max(200),
  content: z.string().min(1, 'Content is required').max(100000, 'Content is too large'),
  content_type: z.enum(['article', 'howto', 'video', 'file']).default('article'),
  video_url: z.string().url().nullable().optional(),
  file_url: z.string().url().nullable().optional(),
  file_name: z.string().nullable().optional(),
  file_size: z.number().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
})

// =====================================================
// GET - List all articles
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
    const content_type = searchParams.get('content_type') as ArticleContentType | null
    const tags = searchParams.get('tags')?.split(',') || []

    // Build query
    let query = supabase
      .from('bible_articles')
      .select('*')
      .order('created_at', { ascending: false })

    // Add content type filter
    if (content_type) {
      query = query.eq('content_type', content_type)
    }

    // Add tag filter
    if (tags.length > 0) {
      query = query.contains('tags', tags)
    }

    // Add search filter (title/content search)
    if (search) {
      query = query.or(`title.ilike.%${search}%,content.ilike.%${search}%`)
    }

    const { data: articles, error } = await query

    if (error) {
      console.error('[Bible Articles API] Error fetching articles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch creator names
    const creatorIds = [...new Set((articles || []).map((a: any) => a.created_by))]
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

    // Check completion status for current user
    const articleIds = (articles || []).map((a: any) => a.id)
    const completedArticleIds = new Set<string>()

    if (articleIds.length > 0) {
      const { data: userProgress } = await supabase
        .from('bible_user_progress')
        .select('article_id, completed_at')
        .eq('user_id', user.sub)
        .in('article_id', articleIds)

      userProgress?.forEach((p: any) => {
        completedArticleIds.add(p.article_id)
      })
    }

    // Format response
    const formattedArticles: Article[] = (articles || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      content_type: a.content_type,
      video_url: a.video_url,
      file_url: a.file_url,
      file_name: a.file_name,
      file_size: a.file_size,
      tags: a.tags,
      created_by: a.created_by,
      created_at: a.created_at,
      updated_at: a.updated_at,
      creator_name: creatorNameMap[a.created_by],
      is_completed: completedArticleIds.has(a.id),
    }))

    return NextResponse.json({
      status: 'ok',
      articles: formattedArticles,
      total: formattedArticles.length,
    })
  } catch (error) {
    console.error('[Bible Articles API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =====================================================
// POST - Create new article
// =====================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Leader/Manager/Admin can create articles
    requireLeaderOrAbove(user)

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createArticleSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json({
        error: 'Validation failed',
        details: validationResult.error.flatten().fieldErrors,
      }, { status: 400 })
    }

    const data = validationResult.data

    const supabase = createAdminClient()

    // Create article
    const { data: article, error } = await supabase
      .from('bible_articles')
      .insert({
        title: data.title,
        content: data.content,
        content_type: data.content_type,
        video_url: data.video_url || null,
        file_url: data.file_url || null,
        file_name: data.file_name || null,
        file_size: data.file_size || null,
        tags: data.tags || null,
        created_by: user.sub,
      })
      .select()
      .single()

    if (error) {
      console.error('[Bible Articles API] Error creating article:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      status: 'ok',
      article,
    }, { status: 201 })
  } catch (error: any) {
    console.error('[Bible Articles API] Error in POST:', error)

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
