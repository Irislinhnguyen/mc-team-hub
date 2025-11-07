/**
 * Filter Preset Sharing API
 *
 * Endpoints for managing preset sharing:
 * - GET: List all shares for a preset
 * - POST: Share preset with a user
 * - DELETE: Remove a share
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerActionClient } from '../../../../../lib/supabase/server';
import { SharePresetInput } from '../../../../../lib/types/filterPreset';

/**
 * GET /api/filter-presets/[id]/share
 * List all shares for a preset
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerActionClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: presetId } = await params;

    // Check if user owns the preset
    const { data: preset, error: presetError } = await (supabase
      .from('filter_presets')
      .select('user_id')
      .eq('id', presetId)
      .single()) as any;

    if (presetError || !preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    if (preset.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can view shares' }, { status: 403 });
    }

    // Fetch all shares for this preset
    const { data: shares, error: sharesError } = await supabase
      .from('filter_preset_shares')
      .select(
        `
        id,
        preset_id,
        shared_with_user_id,
        shared_by_user_id,
        permission,
        created_at,
        users!filter_preset_shares_shared_with_user_id_fkey (
          email,
          full_name
        )
      `
      )
      .eq('preset_id', presetId)
      .order('created_at', { ascending: false });

    if (sharesError) {
      console.error('Error fetching shares:', sharesError);
      return NextResponse.json({ error: 'Failed to fetch shares' }, { status: 500 });
    }

    // Transform data
    const transformedShares = (shares || []).map((share: any) => ({
      id: share.id,
      preset_id: share.preset_id,
      shared_with_user_id: share.shared_with_user_id,
      shared_by_user_id: share.shared_by_user_id,
      permission: share.permission,
      created_at: share.created_at,
      shared_with_email: share.users?.email,
      shared_with_name: share.users?.full_name,
    }));

    return NextResponse.json(transformedShares);
  } catch (error) {
    console.error('Error in GET /api/filter-presets/[id]/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/filter-presets/[id]/share
 * Share preset with a user
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerActionClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: presetId } = await params;

    // Check if user owns the preset
    const { data: preset, error: presetError } = await (supabase
      .from('filter_presets')
      .select('user_id')
      .eq('id', presetId)
      .single()) as any;

    if (presetError || !preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    if (preset.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can share this preset' }, { status: 403 });
    }

    // Parse request body
    const body: { shared_with_user_email: string; permission: 'view' | 'edit' } = await request.json();

    // Validate input
    if (!body.shared_with_user_email || !body.permission) {
      return NextResponse.json(
        { error: 'shared_with_user_email and permission are required' },
        { status: 400 }
      );
    }

    if (!['view', 'edit'].includes(body.permission)) {
      return NextResponse.json(
        { error: 'Permission must be either "view" or "edit"' },
        { status: 400 }
      );
    }

    // Find user by email
    const { data: targetUser, error: userError } = await (supabase
      .from('users')
      .select('id, email')
      .eq('email', body.shared_with_user_email)
      .maybeSingle()) as any;

    if (userError || !targetUser) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    }

    // Prevent sharing with self
    if (targetUser.id === user.id) {
      return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 });
    }

    // Check if already shared
    const { data: existingShare } = await (supabase
      .from('filter_preset_shares')
      .select('id, permission')
      .eq('preset_id', presetId)
      .eq('shared_with_user_id', targetUser.id)
      .maybeSingle()) as any;

    if (existingShare) {
      // Update permission if different
      if (existingShare.permission !== body.permission) {
        const { data: updatedShare, error: updateError } = await ((supabase
          .from('filter_preset_shares') as any)
          .update({ permission: body.permission })
          .eq('id', existingShare.id)
          .select()
          .single()) as any;

        if (updateError) {
          console.error('Error updating share permission:', updateError);
          return NextResponse.json({ error: 'Failed to update share permission' }, { status: 500 });
        }

        return NextResponse.json({
          ...updatedShare,
          shared_with_email: targetUser.email,
          message: 'Share permission updated',
        });
      }

      return NextResponse.json(
        { error: 'Preset is already shared with this user' },
        { status: 409 }
      );
    }

    // Create new share
    const { data: newShare, error: insertError } = await ((supabase
      .from('filter_preset_shares') as any)
      .insert({
        preset_id: presetId,
        shared_with_user_id: targetUser.id,
        shared_by_user_id: user.id,
        permission: body.permission,
      })
      .select()
      .single()) as any;

    if (insertError) {
      console.error('Error creating share:', insertError);
      return NextResponse.json({ error: 'Failed to share preset' }, { status: 500 });
    }

    // Update preset's is_shared flag
    await (supabase
      .from('filter_presets') as any).update({ is_shared: true })
      .eq('id', presetId);

    return NextResponse.json(
      {
        ...newShare,
        shared_with_email: targetUser.email,
        message: 'Preset shared successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error in POST /api/filter-presets/[id]/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/filter-presets/[id]/share?user_id={user_id}
 * Remove a share
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerActionClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: presetId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const sharedWithUserId = searchParams.get('user_id');

    if (!sharedWithUserId) {
      return NextResponse.json({ error: 'user_id parameter is required' }, { status: 400 });
    }

    // Check if user owns the preset
    const { data: preset, error: presetError } = await (supabase
      .from('filter_presets')
      .select('user_id')
      .eq('id', presetId)
      .single()) as any;

    if (presetError || !preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    if (preset.user_id !== user.id) {
      return NextResponse.json({ error: 'Only the owner can remove shares' }, { status: 403 });
    }

    // Delete the share
    const { error: deleteError } = await (supabase
      .from('filter_preset_shares') as any).delete()
      .eq('preset_id', presetId)
      .eq('shared_with_user_id', sharedWithUserId);

    if (deleteError) {
      console.error('Error deleting share:', deleteError);
      return NextResponse.json({ error: 'Failed to remove share' }, { status: 500 });
    }

    // Check if there are any remaining shares
    const { data: remainingShares } = await supabase
      .from('filter_preset_shares')
      .select('id')
      .eq('preset_id', presetId)
      .limit(1);

    // Update is_shared flag if no more shares
    if (!remainingShares || remainingShares.length === 0) {
      await (supabase
        .from('filter_presets') as any).update({ is_shared: false })
        .eq('id', presetId);
    }

    return NextResponse.json({ success: true, message: 'Share removed successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/filter-presets/[id]/share:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
