import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '../../../../lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email') || 'test-leader@example.com'

  const supabase = createAdminClient()

  // Test user query
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single()

  return NextResponse.json({
    searchEmail: email,
    user: user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      hasPasswordHash: !!user.password_hash,
      passwordHashLength: user.password_hash?.length || 0
    } : null,
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    } : null
  })
}
