/**
 * Filter Presets API
 *
 * Endpoints for managing saved filter configurations:
 * - GET: List user's own presets and presets shared with them for a specific page
 * - POST: Create a new filter preset
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '../../../lib/supabase/admin';
import { CreateFilterPresetInput, FilterPresetListResponse } from '../../../lib/types/filterPreset';
import { createFilterPresetSchema, validateRequest } from '../../../lib/validation/schemas';
import { withCsrfProtection } from '../../../lib/middleware/csrf';
import type { Database } from '../../../lib/supabase/database.types';

/**
 * GET /api/filter-presets?page={page}
 * List filter presets for a specific page
 */
export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookie (same as what middleware checks)
    const authToken = request.cookies.get('__Host-auth_token')?.value;

    console.log('[GET filter-presets] Auth token present:', !!authToken);

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

      console.log('[GET filter-presets] Authenticated user:', userEmail);
    } catch (error) {
      console.error('[GET filter-presets] Invalid token:', error);
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
      console.error('[GET filter-presets] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    // Get page parameter
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get('page');
    const filterType = searchParams.get('filter_type');

    if (!page) {
      return NextResponse.json({ error: 'Page parameter is required' }, { status: 400 });
    }

    // Fetch user's own presets
    let ownQuery = supabase
      .from('filter_presets')
      .select('*')
      .eq('user_id', userId)
      .eq('page', page);

    // Filter by type if specified
    if (filterType) {
      ownQuery = ownQuery.eq('filter_type', filterType);
    }

    const { data: ownPresets, error: ownError } = await ownQuery.order('name', { ascending: true });

    if (ownError) {
      console.error('Error fetching own presets:', ownError);
      return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
    }

    // TODO: Implement shared presets later
    // For now, just return empty array to avoid RLS issues
    const sharedPresets: any[] = [];

    const response: FilterPresetListResponse = {
      own_presets: ownPresets || [],
      shared_presets: sharedPresets,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in GET /api/filter-presets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/filter-presets
 * Create a new filter preset
 * Protected with CSRF token validation
 */
async function postHandler(request: NextRequest) {
  try {
    // Get auth token from cookie (same as what middleware checks)
    const authToken = request.cookies.get('__Host-auth_token')?.value;

    console.log('[POST filter-presets] Auth token present:', !!authToken);

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

      console.log('[POST filter-presets] Authenticated user:', userEmail);
    } catch (error) {
      console.error('[POST filter-presets] Invalid token:', error);
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
      console.error('[POST filter-presets] User not found:', userError);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user.id;

    // Parse and validate request body with Zod
    const rawBody = await request.json();
    const body = validateRequest(createFilterPresetSchema, rawBody);

    console.log('[POST filter-presets] Creating preset:', { name: body.name, page: body.page, userId: user.id });

    // Check for duplicate name
    const { data: existingPreset } = await (supabase
      .from('filter_presets')
      .select('id')
      .eq('user_id', userId)
      .eq('page', body.page)
      .eq('name', body.name)
      .maybeSingle()) as any;

    if (existingPreset) {
      return NextResponse.json(
        { error: 'A preset with this name already exists for this page' },
        { status: 409 }
      );
    }

    // Insert new preset
    const insertData: Database['public']['Tables']['filter_presets']['Insert'] = {
      user_id: userId,
      name: body.name,
      description: body.description || null,
      page: body.page,
      filters: body.filters,
      cross_filters: body.cross_filters || [],
      simplified_filter: body.simplified_filter || null,
      filter_type: (body.filter_type || 'standard') as 'standard' | 'advanced' | 'deep_dive',
      advanced_filter_names: body.advanced_filter_names || [],
      is_default: body.is_default || false,
      is_shared: false,
    };

    const { data: newPreset, error: insertError } = (await supabase
      .from('filter_presets')
      .insert(insertData as any)
      .select()
      .single()) as any;

    if (insertError) {
      console.error('Error creating preset:', insertError);
      return NextResponse.json({ error: 'Failed to create preset', details: insertError.message }, { status: 500 });
    }

    console.log('[POST filter-presets] Preset created successfully:', newPreset.id);

    return NextResponse.json(newPreset, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/filter-presets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Export POST with CSRF protection
export const POST = withCsrfProtection(postHandler);
