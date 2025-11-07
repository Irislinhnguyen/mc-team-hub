#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getUserId() {
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', 'admin@geniee.co.jp')
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('User ID:', data.id)
  console.log('Email:', data.email)
}

getUserId()
