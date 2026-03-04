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

async function testSync() {
  console.log('🧪 Testing Pipeline Sync with Enhanced Logging\n')

  // Get the first active quarterly sheet (CS sheet has more data)
  const { data: sheet, error: sheetError } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .eq('group', 'cs')
    .eq('sync_status', 'active')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })
    .limit(1)
    .single()

  if (sheetError || !sheet) {
    console.error('Error fetching quarterly sheet:', sheetError?.message || 'Unknown error')
    return
  }

  console.log(`📋 Testing sync for: ${sheet.sheet_name} (Q${sheet.quarter} ${sheet.year})`)
  console.log(`   Spreadsheet ID: ${sheet.spreadsheet_id}`)
  console.log(`   Group: ${sheet.group.toUpperCase()}`)
  console.log(`   Status: ${sheet.sync_status}\n`)

  // Import the sync function (need to use transpiled JS)
  const { syncQuarterlySheet } = await import('../lib/services/sheetToDatabaseSync.ts')

  console.log('🔄 Starting sync process...\n')
  console.log('=' .repeat(60))
  console.log()

  const startTime = Date.now()

  try {
    const result = await syncQuarterlySheet(sheet.id)

    const duration = Date.now() - startTime

    console.log()
    console.log('=' .repeat(60))
    console.log('\n✅ Sync completed successfully!')
    console.log(`   Duration: ${duration}ms`)
    console.log(`   Total processed: ${result.total}`)
    console.log(`   Created: ${result.created}`)
    console.log(`   Updated: ${result.updated}`)
    console.log(`   Deleted: ${result.deleted}`)
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`)
      result.errors.slice(0, 5).forEach(err => console.log(`      - ${err}`))
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.log()
    console.log('=' .repeat(60))
    console.error('\n❌ Sync failed!')
    console.error(`   Duration: ${duration}ms`)
    console.error(`   Error: ${error.message}`)
    console.error(`   Stack: ${error.stack}`)
  }

  // Check updated counts
  console.log('\n📊 Updated database counts:')

  const { count: newDbCount } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })
    .eq('quarterly_sheet_id', sheet.id)

  console.log(`   Database count: ${newDbCount || 0} pipelines`)

  // Get sheet count for comparison
  const { countSheetRows } = await import('./check-pipeline-sync-gaps.mjs')
  const sheetCount = await countSheetRows(sheet.spreadsheet_id, sheet.sheet_name)

  if (sheetCount !== null) {
    console.log(`   Sheet count: ${sheetCount} rows`)

    const gap = sheetCount - (newDbCount || 0)
    if (gap > 0) {
      console.log(`   ⚠️  Remaining gap: ${gap} rows still not synced`)
    } else {
      console.log(`   ✅ Perfect sync achieved!`)
    }
  }
}

testSync().catch(console.error)