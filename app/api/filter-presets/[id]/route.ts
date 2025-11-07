/**
 * Filter Preset Individual API
 *
 * Endpoints for managing a specific filter preset:
 * - GET: Retrieve a preset (public - for shareable links)
 * - PATCH: Update an existing preset
 * - DELETE: Delete a preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../../lib/supabase/admin';
import { UpdateFilterPresetInput } from '../../../../lib/types/filterPreset';

/**
 * GET /api/filter-presets/[id]
 * Retrieve a filter preset (public access for shareable links)
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = createAdminClient();
    const { id: presetId } = await params;

    // Fetch preset with owner info
    const { data: preset, error } = await (supabase
      .from('filter_presets')
      .select(`
        id,
        name,
        description,
        page,
        filters,
        cross_filters,
        is_default,
        created_at,
        updated_at,
        users!filter_presets_user_id_fkey (
          email,
          name
        )
      `)
      .eq('id', presetId)
      .single()) as any;

    if (error || !preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    // Format response (exclude sensitive data, include owner info)
    const response = {
      id: (preset as any).id,
      name: (preset as any).name,
      description: (preset as any).description,
      page: (preset as any).page,
      filters: (preset as any).filters,
      cross_filters: (preset as any).cross_filters,
      is_default: (preset as any).is_default,
      created_at: (preset as any).created_at,
      updated_at: (preset as any).updated_at,
      owner: {
        email: (preset as any).users?.email,
        name: (preset as any).users?.name,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/filter-presets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/filter-presets/[id]
 * Update an existing filter preset
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get auth token from cookie
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }

    // Parse JWT to get user email
    let userEmail: string;
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      userEmail = payload.sub || payload.email;

      if (!userEmail) {
        throw new Error('No user email in token');
      }
    } catch (error) {
      console.error('[PATCH filter-presets] Invalid token:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user ID from database using email
    const { data: user, error: userError } = await (supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()) as any;

    if (userError || !user) {
      console.error('[PATCH filter-presets] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;
    const { id: presetId } = await params;

    // Check if preset exists and user has permission
    const { data: existingPreset, error: fetchError } = await (supabase
      .from('filter_presets')
      .select('*, filter_preset_shares!filter_preset_shares_preset_id_fkey(permission, shared_with_user_id)')
      .eq('id', presetId)
      .single()) as any;

    if (fetchError || !existingPreset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    // Check permissions: user owns it OR has edit permission
    const isOwner = existingPreset.user_id === userId;
    const hasEditPermission = existingPreset.filter_preset_shares?.some(
      (share: any) => share.shared_with_user_id === userId && share.permission === 'edit'
    );

    if (!isOwner && !hasEditPermission) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Parse request body
    const body: UpdateFilterPresetInput = await request.json();

    // Validate name if provided
    if (body.name !== undefined) {
      if (body.name.length === 0 || body.name.length > 100) {
        return NextResponse.json(
          { error: 'Name must be between 1 and 100 characters' },
          { status: 400 }
        );
      }

      // Check for duplicate name (excluding current preset)
      const { data: duplicatePreset } = await (supabase
        .from('filter_presets')
        .select('id')
        .eq('user_id', existingPreset.user_id)
        .eq('page', existingPreset.page)
        .eq('name', body.name)
        .neq('id', presetId)
        .maybeSingle()) as any;

      if (duplicatePreset) {
        return NextResponse.json(
          { error: 'A preset with this name already exists for this page' },
          { status: 409 }
        );
      }
    }

    // Build update object
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.filters !== undefined) updateData.filters = body.filters;
    if (body.cross_filters !== undefined) updateData.cross_filters = body.cross_filters;
    if (body.simplified_filter !== undefined) updateData.simplified_filter = body.simplified_filter;
    if (body.filter_type !== undefined) updateData.filter_type = body.filter_type;
    if (body.advanced_filter_names !== undefined) updateData.advanced_filter_names = body.advanced_filter_names;
    if (body.is_default !== undefined) updateData.is_default = body.is_default;

    // Update preset
    const { data: updatedPreset, error: updateError } = await ((supabase
      .from('filter_presets') as any)
      .update(updateData)
      .eq('id', presetId)
      .select()
      .single()) as any;

    if (updateError) {
      console.error('Error updating preset:', updateError);
      return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
    }

    return NextResponse.json(updatedPreset);
  } catch (error) {
    console.error('Error in PATCH /api/filter-presets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/filter-presets/[id]
 * Delete a filter preset
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    // Get auth token from cookie
    const authToken = request.cookies.get('auth_token')?.value;

    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized - No auth token' }, { status: 401 });
    }

    // Parse JWT to get user email
    let userEmail: string;
    try {
      const payload = JSON.parse(atob(authToken.split('.')[1]));
      userEmail = payload.sub || payload.email;

      if (!userEmail) {
        throw new Error('No user email in token');
      }
    } catch (error) {
      console.error('[DELETE filter-presets] Invalid token:', error);
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get user ID from database using email
    const { data: user, error: userError } = await (supabase
      .from('users')
      .select('id')
      .eq('email', userEmail)
      .single()) as any;

    if (userError || !user) {
      console.error('[DELETE filter-presets] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;
    const { id: presetId } = await params;

    // Check if preset exists and user is the owner
    const { data: existingPreset, error: fetchError } = await (supabase
      .from('filter_presets')
      .select('user_id')
      .eq('id', presetId)
      .single()) as any;

    if (fetchError || !existingPreset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    // Only owner can delete
    if (existingPreset.user_id !== userId) {
      return NextResponse.json({ error: 'Only the owner can delete this preset' }, { status: 403 });
    }

    // Delete preset (shares will be cascade deleted)
    const { error: deleteError } = await (supabase
      .from('filter_presets') as any)
      .delete()
      .eq('id', presetId);

    if (deleteError) {
      console.error('Error deleting preset:', deleteError);
      return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Preset deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/filter-presets/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
