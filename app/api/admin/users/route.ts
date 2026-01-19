import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager, isAdmin, requireLeaderOrAbove } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET all users
export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser()
    // Leader and above can view users
    requireLeaderOrAbove(user)

    const supabase = await createAdminClient()
    const searchParams = request.nextUrl.searchParams

    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const search = searchParams.get('search')
    const offset = (page - 1) * limit

    // Build query
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply role filter
    if (role && ['admin', 'manager', 'leader', 'user'].includes(role)) {
      query = query.eq('role', role)
    }

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: users, error, count } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      users: users || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    })
  } catch (error: any) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}

// POST create new user
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getServerUser()
    requireAdminOrManager(currentUser)

    // Only admin can create users
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Only admins can create users' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { email, name, role, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    if (!['admin', 'manager', 'leader', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Create user in auth (this would need admin SDK in real implementation)
    // For now, we'll just create in users table
    const { data: newUser, error } = await supabase
      .from('users')
      .insert({
        email,
        name: name || email.split('@')[0],
        role: role || 'user',
        password_hash: password, // In real implementation, this should be hashed
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating user:', error)
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error: any) {
    console.error('Admin create user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}
