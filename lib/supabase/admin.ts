/**
 * Supabase Admin Client
 * Used for privileged operations with service role key
 * Should only be used in API routes and server-side code
 */

import { createClient } from '@supabase/supabase-js'
import { settings } from '../utils/config'
import type { Database } from './database.types'

/**
 * Create admin client with service role key
 * This client bypasses Row Level Security (RLS)
 * Use with caution and only in server-side code
 */
export function createAdminClient() {
  return createClient<Database>(
    settings.supabaseUrl,
    settings.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
