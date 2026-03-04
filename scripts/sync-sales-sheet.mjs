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

async function syncSalesSheet() {
  console.log('🔄 Starting Sales Sheet Sync\n')
  console.log('='.repeat(60))
  console.log()

  // Get the sales quarterly sheet ID
  const { data: sheet, error: sheetError } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .eq('group', 'sales')
    .eq('sync_status', 'active')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })
    .limit(1)
    .single()

  if (sheetError || !sheet) {
    console.error('❌ Error fetching sales quarterly sheet:', sheetError?.message || 'Unknown error')
    return
  }

  console.log(`📋 Syncing: ${sheet.sheet_name} (Q${sheet.quarter} ${sheet.year})`)
  console.log(`   Current database count: Loading...`)
  console.log()

  const startTime = Date.now()

  try {
    // Import sync function
    const { syncQuarterlySheet } = await import('../lib/services/sheetToDatabaseSync.ts')

    const result = await syncQuarterlySheet(sheet.id)

    const duration = Date.now() - startTime

    console.log()
    console.log('='.repeat(60))
    console.log('\n✅ Sales Sync completed successfully!')
    console.log(`   Duration: ${(duration / 1000).toFixed(1)}s`)
    console.log(`   Total processed: ${result.total}`)
    console.log(`   Created: ${result.created}`)
    console.log(`   Updated: ${result.updated}`)
    console.log(`   Deleted: ${result.deleted}`)

    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`)
      result.errors.slice(0, 5).forEach(err => console.log(`      - ${err}`))
    }

    // Check final counts
    console.log('\n📊 Final database counts:')

    const { count: finalCount } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('quarterly_sheet_id', sheet.id)

    console.log(`   Database count: ${finalCount || 0} pipelines`)
    console.log(`   Sheet count: 415 rows (from earlier analysis)`)

    const gap = 415 - (finalCount || 0)
    if (gap > 0) {
      console.log(`   ⚠️  Remaining gap: ${gap} rows`)
    } else if (gap < 0) {
      console.log(`   ⚠️  Database has ${Math.abs(gap)} more pipelines than sheet`)
    } else {
      console.log(`   ✅ Perfect sync achieved!`)
    }

  } catch (error) {
    const duration = Date.now() - startTime
    console.log()
    console.log('='.repeat(60))
    console.error('\n❌ Sales Sync failed!')
    console.error(`   Duration: ${(duration / 1000).toFixed(1)}s`)
    console.error(`   Error: ${error.message}`)
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`)
    }
  }
}

syncSalesSheet().catch(console.error)
