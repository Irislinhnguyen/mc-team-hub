import { NextResponse } from 'next/server'
import { getTeamsWithPics } from '../../../../../lib/utils/teamMatcher'

// 5-minute cache
let cachedData: Record<string, string[]> | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000

/**
 * GET /api/performance-tracker/metadata/team-pic-mappings
 *
 * Returns team→PIC mappings for cascading filters
 *
 * Response format:
 * {
 *   "status": "ok",
 *   "data": {
 *     "WEB_GTI": ["Febri", "ID_Doni", "ID_Safitri", ...],
 *     "WEB_GV": ["Zenny", "VN_minhlv", "VN_ngantt", ...],
 *     "APP": ["VN_linhvh", "Safitri", "VN_anhtn", ...]
 *   },
 *   "fromCache": false
 * }
 */
export async function GET() {
  try {
    // Check cache
    if (cachedData && Date.now() - cacheTimestamp < CACHE_TTL) {
      console.log('[team-pic-mappings] ✅ Returning from cache')
      return NextResponse.json({
        status: 'ok',
        data: cachedData,
        fromCache: true
      })
    }

    console.log('[team-pic-mappings] 🔄 Fetching fresh team→PIC mappings from Supabase...')

    // Fetch fresh data (server-side, has service role key)
    const teamsWithPics = await getTeamsWithPics()

    // Transform to simple format: { "TEAM_ID": ["PIC1", "PIC2", ...] }
    const mappings = new Map<string, string[]>()
    teamsWithPics.forEach(({ team, pics }) => {
      mappings.set(team.team_id, pics)
    })

    const data = Object.fromEntries(mappings)

    // Update cache
    cachedData = data
    cacheTimestamp = Date.now()

    console.log('[team-pic-mappings] ✅ Fetched mappings:', Object.keys(data).length, 'teams')
    Object.entries(data).forEach(([teamId, pics]) => {
      console.log(`   - Team "${teamId}": ${pics.length} PICs`)
    })

    return NextResponse.json({
      status: 'ok',
      data,
      fromCache: false
    })
  } catch (error) {
    console.error('[team-pic-mappings] ❌ Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Failed to fetch team-PIC mappings'
    }, { status: 500 })
  }
}
