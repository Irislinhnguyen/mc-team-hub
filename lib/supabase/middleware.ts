/**
 * Supabase Middleware
 * For use in middleware.ts
 */

import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'
import { settings } from '../utils/config'
import type { Database } from './database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    settings.supabaseUrl,
    settings.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // This refreshes a user's session in case they have logged in with a long-lived session token.
  // It also checks if there is a cached session to avoid making extra calls to Supabase.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return supabaseResponse
}
