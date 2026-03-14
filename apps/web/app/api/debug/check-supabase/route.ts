import { NextRequest, NextResponse } from 'next/server'
import { getTeamsWithPics } from '../../../../lib/utils/teamMatcher'

export async function GET(request: NextRequest) {
  try {
    const teamsWithPics = await getTeamsWithPics()

    // Get all unique PICs from Supabase
    const allPics = new Set<string>()
    teamsWithPics.forEach(({ team, pics }) => {
      pics.forEach(pic => {
        allPics.add(pic)
      })
    })

    // Check if the problematic PICs exist in Supabase
    const testPics = ['VN_linhnt', 'vn_thuongbt', 'VN_ngantt', 'ID_Doni', 'ID_Safitri']
    const results = testPics.map(pic => ({
      pic,
      existsInSupabase: allPics.has(pic),
      existsCaseInsensitive: Array.from(allPics).some(sp => sp.toLowerCase() === pic.toLowerCase())
    }))

    // Show sample Supabase PICs
    const samplePics = Array.from(allPics).slice(0, 20)

    return NextResponse.json({
      status: 'ok',
      totalSupabasePics: allPics.size,
      sampleSupabasePics,
      testResults: results
    })
  } catch (error) {
    console.error('[Debug Supabase] Error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
