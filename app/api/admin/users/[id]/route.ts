import { NextRequest, NextResponse } from 'next/server'
import { getServerUser, requireAdminOrManager, isAdmin, requireLeaderOrAbove, canAssignRole } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET single user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUser()
    // Leader and above can view users
    requireLeaderOrAbove(user)

    const { id } = await params
    const supabase = await createAdminClient()

    const { data: userData, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ user: userData })
  } catch (error: any) {
    console.error('Admin get user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}

// PATCH update user
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getServerUser()
    // Leader and above can update users (but with role restrictions)
    requireLeaderOrAbove(currentUser)

    const { id } = await params
    const body = await request.json()
    const { name, role } = body

    // Validate role if provided
    if (role && !['admin', 'manager', 'leader', 'user'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role' },
        { status: 400 }
      )
    }

    // Check if current user can assign the target role based on hierarchy
    if (role && !canAssignRole(currentUser.role, role)) {
      return NextResponse.json(
        { error: `You cannot assign ${role} role` },
        { status: 403 }
      )
    }

    const supabase = await createAdminClient()

    // Check if trying to modify an admin (only admin can do this)
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (targetUser?.role === 'admin' && !isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Only admins can modify admin users' },
        { status: 403 }
      )
    }

    // Prevent self-demotion for admin
    if (currentUser?.id === id && role && role !== 'admin' && isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Cannot demote yourself from admin role' },
        { status: 400 }
      )
    }

    // Build update object
    const updateData: Record<string, any> = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ user: updatedUser })
  } catch (error: any) {
    console.error('Admin update user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getServerUser()
    requireAdminOrManager(currentUser)

    // Only admin can delete users
    if (!isAdmin(currentUser)) {
      return NextResponse.json(
        { error: 'Only admins can delete users' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Prevent self-deletion
    if (currentUser?.id === id) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Check if user exists and is not an admin
    const { data: targetUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', id)
      .single()

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deletion of admin users (extra safety)
    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { error: 'Cannot delete admin users' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting user:', error)
      return NextResponse.json(
        { error: 'Failed to delete user' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin delete user error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: error.message?.includes('Access denied') ? 403 : 500 }
    )
  }
}
