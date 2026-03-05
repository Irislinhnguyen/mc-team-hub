import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
)

async function testSalesSync() {
  console.log('🧪 Testing Sales Pipeline Sync\n')

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
    console.error('Error fetching quarterly sheet:', sheetError?.message || 'Unknown error')
    return
  }

  console.log(`📋 Testing sync for: ${sheet.sheet_name} (Q${sheet.quarter} ${sheet.year})`)
  console.log(`   Group: ${sheet.group.toUpperCase()}`)
  console.log(`   Status: ${sheet.sync_status}\n`)

  const { syncQuarterlySheet } = await import('../lib/services/sheetToDatabaseSync.ts')

  console.log('🔄 Starting sync process...\n')
  console.log('='.repeat(60))
  console.log()

  const startTime = Date.now()

  try {
    const result = await syncQuarterlySheet(sheet.id)

    const duration = Date.now() - startTime

    console.log()
    console.log('='.repeat(60))
    console.log('\n✅ Sync completed successfully!')
    console.log(`   Duration: ${duration}ms`)
    console.log(`   Total processed: ${result.total}`)
    console.log(`   Created: ${result.created}`)
    console.log(`   Updated: ${result.updated}`)

    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`)
      result.errors.slice(0, 5).forEach(err => console.log(`      - ${err}`))
    }
  } catch (error) {
    const duration = Date.now() - startTime
    console.log()
    console.log('='.repeat(60))
    console.error('\n❌ Sync failed!')
    console.error(`   Duration: ${duration}ms`)
    console.error(`   Error: ${error.message}`)
  }

  console.log('\n📊 Updated database counts:')

  const { count: newDbCount } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })
    .eq('quarterly_sheet_id', sheet.id)

  console.log(`   Database count: ${newDbCount || 0} pipelines`)

  let credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf-8')
    )
  } else {
    console.log('   ⚠️  No Google credentials available')
    return
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  const sheets = google.sheets({ version: 'v4', auth })

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheet.spreadsheet_id,
      range: `${sheet.sheet_name}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    })

    const values = response.data.values || []
    const dataRows = values.slice(2).filter(row => row[0] && row[0].trim() !== '')

    console.log(`   Sheet count: ${dataRows.length} rows`)

    const gap = dataRows.length - (newDbCount || 0)
    if (gap > 0) {
      console.log(`   ⚠️  Remaining gap: ${gap} rows still not synced`)
    } else if (gap < 0) {
      console.log(`   ⚠️  Database has ${Math.abs(gap)} more pipelines than sheet`)
    } else {
      console.log(`   ✅ Perfect sync achieved!`)
    }
  } catch (error) {
    console.log(`   ⚠️  Could not count sheet rows: ${error.message}`)
  }
}

testSalesSync().catch(console.error)
