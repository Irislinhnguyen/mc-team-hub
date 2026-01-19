import { NextResponse } from 'next/server'
import { getServerUser, requireLeaderOrAbove } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * GET /api/admin/users/stats
 * Get user count by role (for stats cards)
 */
export async function GET() {
  try {
    const user = await getServerUser()
    requireLeaderOrAbove(user)

    const supabase = await createAdminClient()

    // Get count by role
    const { count: adminCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'admin')

    const { count: managerCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'manager')

    const { count: leaderCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'leader')

    const { count: userCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'user')

    return NextResponse.json({
      admin: adminCount || 0,
      manager: managerCount || 0,
      leader: leaderCount || 0,
      user: userCount || 0,
    })
  } catch (error: any) {
    console.error('Admin users stats error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}
