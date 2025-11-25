import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Knowledge Graph Initialization API
 *
 * UPDATED: Now uses Supabase-based Knowledge Graph instead of Neo4j.
 *
 * Checks if Knowledge Graph tables exist and have data.
 * If not initialized, provides instructions for running migrations.
 */

export async function POST(request: NextRequest) {
  try {
    console.log('[KG Init] Checking Knowledge Graph status...')

    const supabase = await createAdminClient()

    // Check if tables exist and have data
    const [
      tablesResult,
      conceptsResult,
      patternsResult,
      rulesResult
    ] = await Promise.all([
      supabase.from('kg_tables').select('id', { count: 'exact', head: true }),
      supabase.from('kg_concepts').select('id', { count: 'exact', head: true }),
      supabase.from('kg_query_patterns').select('id', { count: 'exact', head: true }),
      supabase.from('kg_business_rules').select('id', { count: 'exact', head: true })
    ])

    // Check for errors (tables don't exist)
    const hasErrors = [tablesResult, conceptsResult, patternsResult, rulesResult].some(r => r.error)

    if (hasErrors) {
      return NextResponse.json({
        status: 'not_initialized',
        message: 'Knowledge Graph tables not found. Please run migrations.',
        instructions: [
          '1. Run migration: supabase/migrations/20250124_create_knowledge_graph.sql',
          '2. Run seed data: supabase/migrations/20250124_seed_knowledge_graph.sql',
          'Or use Supabase Dashboard to run these SQL files.'
        ],
        migration_files: [
          '20250124_create_knowledge_graph.sql',
          '20250124_seed_knowledge_graph.sql'
        ]
      })
    }

    // Check if data is seeded
    const stats = {
      tables: tablesResult.count || 0,
      concepts: conceptsResult.count || 0,
      patterns: patternsResult.count || 0,
      rules: rulesResult.count || 0
    }

    const isSeeded = stats.tables > 0 && stats.concepts > 0

    if (!isSeeded) {
      return NextResponse.json({
        status: 'tables_exist_but_empty',
        message: 'Knowledge Graph tables exist but have no data. Please run seed migration.',
        stats,
        instructions: [
          'Run seed data: supabase/migrations/20250124_seed_knowledge_graph.sql'
        ]
      })
    }

    console.log('[KG Init] Knowledge Graph is initialized:', stats)

    return NextResponse.json({
      status: 'success',
      message: 'Knowledge Graph is initialized and ready',
      stats,
      system: 'Supabase',
      note: 'Neo4j has been replaced with Supabase-based Knowledge Graph for better reliability.'
    })

  } catch (error: any) {
    console.error('[KG Init] Error:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: error.message || 'Failed to check Knowledge Graph status',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  // Same as POST - check status
  return POST(request)
}

export async function OPTIONS(request: NextRequest) {
  return NextResponse.json({}, { status: 200 })
}
