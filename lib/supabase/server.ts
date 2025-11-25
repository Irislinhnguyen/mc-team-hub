/**
 * Supabase Server Components
 * Used in Server Components and Server Actions
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { settings } from '../utils/config'
import type { Database } from './database.types'

export async function createServerComponentClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    settings.supabaseUrl,
    settings.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export async function createServerActionClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    settings.supabaseUrl,
    settings.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // The `setAll` method was called from a Server Action.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create admin client (with service role key for privileged operations)
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    settings.supabaseUrl,
    settings.supabaseServiceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Ignore
          }
        },
      },
    }
  )
}

/**
 * Default export - alias for createServerComponentClient
 */
export const createClient = createServerComponentClient
