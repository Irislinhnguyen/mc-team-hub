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

async function getGoogleSheetsClient() {
  // Try both authentication methods from the sync service
  let credentials

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64) {
    credentials = JSON.parse(
      Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64, 'base64').toString('utf-8')
    )
  } else {
    throw new Error('No Google credentials found in environment variables')
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  })

  return google.sheets({ version: 'v4', auth })
}

async function countSheetRows(spreadsheetId, sheetName) {
  try {
    const sheets = await getGoogleSheetsClient()

    // Count all non-empty rows (rows where column A is not empty)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:A`,
      valueRenderOption: 'UNFORMATTED_VALUE'
    })

    const values = response.data.values || []
    // Skip header rows (rows 1-2), count data rows
    const dataRows = values.slice(2).filter(row => row[0] && row[0].trim() !== '')

    return dataRows.length
  } catch (error) {
    console.error(`   Error counting sheet rows: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('🔍 Pipeline Sync Gap Analysis\n')
  console.log('Comparing Google Sheets vs Supabase pipeline counts\n')

  const { data: sheets, error } = await supabase
    .from('quarterly_sheets')
    .select('*')
    .order('year', { ascending: false })
    .order('quarter', { ascending: false })

  if (error) {
    console.error('Error:', error.message)
    return
  }

  let totalGaps = 0

  for (const sheet of sheets || []) {
    console.log(`📋 ${sheet.sheet_name} (Q${sheet.quarter} ${sheet.year})`)
    console.log(`   Group: ${sheet.group.toUpperCase()}`)
    console.log(`   Status: ${sheet.sync_status}`)

    // Count in database
    const { count: dbCount } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact', head: true })
      .eq('quarterly_sheet_id', sheet.id)

    console.log(`   Database count: ${dbCount || 0} pipelines`)

    // Count in Google Sheets
    const sheetCount = await countSheetRows(sheet.spreadsheet_id, sheet.sheet_name)
    if (sheetCount !== null) {
      console.log(`   Sheet count: ${sheetCount} rows`)

      const gap = sheetCount - (dbCount || 0)
      if (gap > 0) {
        console.log(`   ⚠️  GAP: ${gap} rows in sheet not synced to database`)
        totalGaps += gap
      } else if (gap < 0) {
        console.log(`   ⚠️  GAP: ${Math.abs(gap)} pipelines in database not in sheet`)
      } else {
        console.log(`   ✅ Counts match perfectly`)
      }
    }

    console.log(`   Last sync: ${sheet.last_sync_at ? new Date(sheet.last_sync_at).toLocaleString() : 'Never'}`)
    console.log('')
  }

  // Total count
  const { count: totalDbCount } = await supabase
    .from('pipelines')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total pipelines in database: ${totalDbCount || 0}`)

  if (totalGaps > 0) {
    console.log(`\n⚠️  TOTAL GAP: ${totalGaps} rows across all sheets need syncing`)
  } else {
    console.log(`\n✅ All sheets appear to be in sync`)
  }
}

main().catch(console.error)