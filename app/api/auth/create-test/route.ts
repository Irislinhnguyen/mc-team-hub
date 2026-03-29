import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@query-stream-ai/db/admin'
import bcrypt from 'bcryptjs'

/**
 * Create test admin user for E2E testing
 * POST /api/auth/create-test
 */
export async function POST(request: NextRequest) {
  try {
    // Security: Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Not allowed in production' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    const email = 'bible-admin@geniee.co.jp'
    const password = 'test12345'

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10)

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      // Update
      const { data: user } = await supabase
        .from('users')
        .update({
          password_hash: passwordHash,
          name: 'Bible Admin',
          role: 'admin',
          auth_method: 'password',
        })
        .eq('email', email)
        .select()
        .single()

      return NextResponse.json({
        message: 'Test admin user updated',
        user: {
          email: user.email,
          password: password,
          name: user.name,
          role: user.role,
        }
      })
    } else {
      // Create new
      const { data: user } = await supabase
        .from('users')
        .insert({
          email,
          password_hash: passwordHash,
          name: 'Bible Admin',
          role: 'admin',
          auth_method: 'password',
        })
        .select()
        .single()

      return NextResponse.json({
        message: 'Test admin user created',
        user: {
          email: user.email,
          password: password,
          name: user.name,
          role: user.role,
        }
      })
    }
  } catch (error: any) {
    console.error('Error creating test user:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create test user' },
      { status: 500 }
    )
  }
}
