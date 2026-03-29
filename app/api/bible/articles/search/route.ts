/**
 * Bible Articles Search API
 * Endpoint: GET /api/bible/articles/search
 * Searches within article titles and content using PostgreSQL full-text search
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerUser } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

// =====================================================
// GET - Search articles
// =====================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const pathId = searchParams.get('path_id') // Optional: filter by path

    if (!query || query.trim().length === 0) {
      return NextResponse.json({
        error: 'Search query is required',
      }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Use the existing search_articles function
    const { data: searchResults, error: searchError } = await supabase.rpc('search_articles', {
      p_search_term: query.trim(),
    })

    if (searchError) {
      console.error('[Bible Search API] Error searching articles:', searchError)
      return NextResponse.json({ error: searchError.message }, { status: 500 })
    }

    // If path_id is provided, filter results to only articles in that path
    let filteredResults = searchResults || []
    if (pathId) {
      // Get all article IDs in this path
      const { data: pathArticles } = await supabase
        .from('bible_path_articles')
        .select('article_id')
        .eq('path_id', pathId)

      const articleIdsInPath = new Set(pathArticles?.map((pa: any) => pa.article_id) || [])

      // Filter search results to only include articles in this path
      filteredResults = searchResults.filter((result: any) =>
        articleIdsInPath.has(result.article_id)
      )
    }

    // Fetch full article details for search results
    if (filteredResults.length === 0) {
      return NextResponse.json({
        status: 'ok',
        query,
        results: [],
        total: 0,
      })
    }

    const articleIds = filteredResults.map((r: any) => r.article_id)

    // Get full article details
    const { data: articles, error: articlesError } = await supabase
      .from('bible_articles')
      .select('*')
      .in('id', articleIds)

    if (articlesError) {
      console.error('[Bible Search API] Error fetching articles:', articlesError)
      return NextResponse.json({ error: articlesError.message }, { status: 500 })
    }

    // Merge search rank with article details
    const rankedArticles = (articles || []).map((article: any) => {
      const searchResult = filteredResults.find((r: any) => r.article_id === article.id)
      return {
        ...article,
        rank: searchResult?.rank || 0,
      }
    }).sort((a, b) => b.rank - a.rank) // Sort by rank (highest first)

    return NextResponse.json({
      status: 'ok',
      query,
      results: rankedArticles,
      total: rankedArticles.length,
    })
  } catch (error) {
    console.error('[Bible Search API] Error in GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
