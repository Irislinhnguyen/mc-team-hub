/**
 * Check if row 248 is in the database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function main() {
  console.log(`\n🔍 CHECKING ROW 248 IN DATABASE\n`)

  // Get Sales quarterly sheet ID
  const { data: salesSheet } = await supabase
    .from('quarterly_sheets')
    .select('id')
    .eq('sheet_name', 'SEA_Sales')
    .single()

  if (!salesSheet) {
    console.log('❌ Sales sheet not found')
    return
  }

  // Check row 248 specifically
  const { data: row248 } = await supabase
    .from('pipelines')
    .select('*')
    .eq('quarterly_sheet_id', salesSheet.id)
    .eq('sheet_row_number', 248)
    .single()

  if (row248) {
    console.log('✅ Row 248 EXISTS in database!\n')
    console.log(`ID: ${row248.id}`)
    console.log(`Key: ${row248.key}`)
    console.log(`Publisher: ${row248.publisher}`)
    console.log(`PID: ${row248.pid}`)
    console.log(`Status: ${row248.status}`)
  } else {
    console.log('❌ Row 248 NOT found in database!\n')
  }

  // Check rows around it
  console.log('\n📋 Rows 245-250 in database:\n')

  const { data: nearbyRows } = await supabase
    .from('pipelines')
    .select('sheet_row_number, key, publisher, pid')
    .eq('quarterly_sheet_id', salesSheet.id)
    .gte('sheet_row_number', 245)
    .lte('sheet_row_number', 250)
    .order('sheet_row_number', { ascending: true })

  if (nearbyRows && nearbyRows.length > 0) {
    nearbyRows.forEach(row => {
      console.log(`Row ${row.sheet_row_number}: Key="${row.key?.substring(0, 50)}..." Publisher="${row.publisher || 'N/A'}"`)
    })
  } else {
    console.log('No rows found in range 245-250')
  }

  // Total count
  const { count } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })
    .eq('quarterly_sheet_id', salesSheet.id)

  console.log(`\n📊 Total pipelines: ${count}\n`)
}

main().catch(console.error)
