#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkFilter() {
  const { data, error } = await supabase
    .from('filter_presets')
    .select('*')
    .eq('name', 'flexible sticky only')
    .single()

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Filter data:')
  console.log(JSON.stringify(data, null, 2))
}

checkFilter()
