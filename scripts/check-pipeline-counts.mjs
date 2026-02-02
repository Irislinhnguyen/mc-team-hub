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
  console.log('📊 Pipeline Counts by Quarterly Sheet\n')

  const { data: sheets, error } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  for (const sheet of sheets || []) {
    const { count } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('quarterly_sheet_id', sheet.id)

    console.log(`📋 ${sheet.sheet_name} (Q${sheet.quarter} ${sheet.year})`)
    console.log(`   Group: ${sheet.group.toUpperCase()}`)
    console.log(`   Status: ${sheet.sync_status}`)
    console.log(`   Database count: ${count || 0} pipelines`)
    console.log(`   Last sync: ${sheet.last_sync_at ? new Date(sheet.last_sync_at).toLocaleString() : 'Never'}`)
    console.log('')
  }

  // Total count
  const { count: totalCount } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total pipelines in database: ${totalCount || 0}\n`)
}

main().catch(console.error)
