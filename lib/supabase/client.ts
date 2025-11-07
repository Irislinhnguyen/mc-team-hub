/**
 * Supabase Client (Browser/Client-side)
 * Used in Client Components
 */

import { createBrowserClient } from '@supabase/ssr'
import { settings } from '../utils/config'
import type { Database } from './database.types'

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      settings.supabaseUrl,
      settings.supabaseAnonKey
    )
  }

  return supabaseClient
}

/**
 * Hook-style export for use in Client Components
 */
export function useSupabase() {
  return getSupabaseClient()
}
