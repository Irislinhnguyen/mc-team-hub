/**
 * Test Sync 1 Pipeline Only
 * Để verify mapping đúng trước khi sync hết
 */

const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const spreadsheetId = process.env.PIPELINE_SHEETS_ID

const SHEET_CONFIG = {
  spreadsheetId: spreadsheetId,
  dataStartRow: 3,
  sheets: { sales: 'SEA_Sales', cs: 'SEA_CS' }
}

// CORRECT mapping
const COLUMNS = {
  id: 0,                    // A
  classification: 2,        // C
  poc: 3,                   // D
  pid: 5,                   // F
  publisher: 6,             // G
  mid: 8,                   // I
  domain: 9,                // J
  description: 14,          // O
  product: 15,              // P
  imp: 18,                  // S
  ecpm: 19,                 // T
  // max_gross: 20,         // U - FORMULA: =S*T/1000 (DO NOT SYNC!)
  revenue_share: 21,        // V
  action_date: 23,          // X
  next_action: 24,          // Y
  action_detail: 25,        // Z
  action_progress: 26,      // AA
  starting_date: 28,        // AC
  status: 29,               // AD
  // proposal_date: 31,     // AF - NOT synced per user request
  // interested_date: 32,   // AG - NOT synced per user request
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

function getSheetsClient() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  const credentials = JSON.parse(credentialsJson)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
  return google.sheets({ version: 'v4', auth })
}

function formatDateForSheet(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const excelEpoch = new Date(1899, 11, 30)
  const diffTime = date.getTime() - excelEpoch.getTime()
  const diffDays = diffTime / (1000 * 60 * 60 * 24)
  return Math.floor(diffDays)
}

function formatValue(value, fieldName) {
  if (value === null || value === undefined) return ''
  if (fieldName.includes('date') || fieldName.includes('_date')) {
    return formatDateForSheet(value)
  }
  if (['ecpm', 'max_gross', 'revenue_share'].includes(fieldName)) {
    return typeof value === 'number' ? Number(value.toFixed(2)) : value
  }
  if (['imp'].includes(fieldName)) {
    return typeof value === 'number' ? Math.round(value) : value
  }
  return value
}

function columnToLetter(column) {
  let temp, letter = ''
  while (column >= 0) {
    temp = column % 26
    letter = String.fromCharCode(temp + 65) + letter
    column = Math.floor(column / 26) - 1
  }
  return letter
}

async function syncOnePipeline(sheets, pipeline, targetRow) {
  const sheetName = pipeline.group === 'sales' ? 'SEA_Sales' : 'SEA_CS'

  console.log(`\n${'═'.repeat(60)}`)
  console.log(`📦 Pipeline: ${pipeline.publisher || 'Unnamed'}`)
  console.log(`${'═'.repeat(60)}`)
  console.log(`   ID: ${pipeline.id}`)
  console.log(`   Group: ${pipeline.group} → ${sheetName}`)
  console.log(`   Classification: ${pipeline.classification || '-'}`)
  console.log(`   POC: ${pipeline.poc || '-'}`)
  console.log(`   Domain: ${pipeline.domain || '-'}`)
  console.log(`   Product: ${pipeline.product || '-'}`)
  console.log('')

  // Show what will be synced
  console.log('📝 Data to sync:')
  for (const [fieldName, columnIndex] of Object.entries(COLUMNS)) {
    const columnLetter = columnToLetter(columnIndex)
    const value = pipeline[fieldName]
    const formatted = formatValue(value, fieldName)

    if (formatted !== '') {
      console.log(`   ${columnLetter.padEnd(4)} ${fieldName.padEnd(20)} = ${formatted}`)
    }
  }
  console.log('')

  // Sync
  console.log(`🔄 Syncing to ${sheetName}!Row ${targetRow}...\n`)

  const updates = []
  for (const [fieldName, columnIndex] of Object.entries(COLUMNS)) {
    const columnLetter = columnToLetter(columnIndex)
    const value = formatValue(pipeline[fieldName], fieldName)

    updates.push({
      range: `${sheetName}!${columnLetter}${targetRow}`,
      values: [[value]],
    })
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  })

  console.log(`✅ Synced to ${sheetName}!Row ${targetRow}!`)
  console.log('')
  console.log('✅ Verify:')
  console.log(`   - Tab: ${sheetName}, Row: ${targetRow}`)
  console.log(`   - Column A (ID) = ${pipeline.id}`)
  console.log(`   - Column C (Classification) = ${pipeline.classification || '-'}`)
  console.log(`   - Column D (POC) = ${pipeline.poc || '-'}`)
  console.log(`   - Column G (Publisher) = ${pipeline.publisher || '-'}`)
  console.log(`   - Các columns có công thức (B, Q, R, AE, AK) KHÔNG bị mất`)
}

// Load existing rows from sheet (tìm dòng trống)
async function loadExistingRows(sheets, sheetName) {
  try {
    const range = `${sheetName}!A${SHEET_CONFIG.dataStartRow}:D`
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_CONFIG.spreadsheetId,
      range,
    })

    const rows = response.data.values || []
    const idMap = new Map()
    let firstEmptyRow = null

    for (let i = 0; i < rows.length; i++) {
      const rowNum = SHEET_CONFIG.dataStartRow + i
      const row = rows[i] || []

      const id = row[0]?.trim() || ''
      const classification = row[2]?.trim() || ''
      const poc = row[3]?.trim() || ''

      if (id) {
        idMap.set(id, rowNum)
      }

      // Tìm dòng trống đầu tiên (A, C, D đều rỗng)
      if (!id && !classification && !poc && firstEmptyRow === null) {
        firstEmptyRow = rowNum
      }
    }

    // Nếu không có dòng trống, dòng mới = sau dòng cuối
    if (firstEmptyRow === null) {
      firstEmptyRow = rows.length > 0
        ? SHEET_CONFIG.dataStartRow + rows.length
        : SHEET_CONFIG.dataStartRow
    }

    return { idMap, firstEmptyRow }
  } catch (error) {
    console.warn(`Warning: Could not load existing rows: ${error.message}`)
    return { idMap: new Map(), firstEmptyRow: SHEET_CONFIG.dataStartRow }
  }
}

async function main() {
  console.log('🧪 Test Sync: 1 Sales + 1 CS Pipeline\n')

  try {
    const sheets = getSheetsClient()

    // Get 1 Sales pipeline
    console.log('📊 Fetching 1 Sales pipeline...')
    const { data: salesPipelines, error: salesError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('group', 'sales')
      .limit(1)

    if (salesError || !salesPipelines || salesPipelines.length === 0) {
      console.error('❌ No Sales pipeline found')
      return
    }

    // Get 1 CS pipeline
    console.log('📊 Fetching 1 CS pipeline...')
    const { data: csPipelines, error: csError } = await supabase
      .from('pipelines')
      .select('*')
      .eq('group', 'cs')
      .limit(1)

    if (csError || !csPipelines || csPipelines.length === 0) {
      console.error('❌ No CS pipeline found')
      return
    }

    console.log('✅ Found both pipelines\n')

    // TÌM DÒNG TRỐNG (thay vì hard-code row 3)
    console.log('🔍 Finding empty rows in sheets...')
    const salesData = await loadExistingRows(sheets, 'SEA_Sales')
    const csData = await loadExistingRows(sheets, 'SEA_CS')
    console.log(`   ✅ Sales: ${salesData.idMap.size} existing rows, next empty = row ${salesData.firstEmptyRow}`)
    console.log(`   ✅ CS: ${csData.idMap.size} existing rows, next empty = row ${csData.firstEmptyRow}`)
    console.log('')

    // Sync to empty rows
    await syncOnePipeline(sheets, salesPipelines[0], salesData.firstEmptyRow)
    await syncOnePipeline(sheets, csPipelines[0], csData.firstEmptyRow)

    // Final summary
    console.log(`\n${'═'.repeat(60)}`)
    console.log('✅ TEST COMPLETE - Verify in Google Sheets')
    console.log(`${'═'.repeat(60)}`)
    console.log(`📊 https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`)
    console.log('')
    console.log('Check:')
    console.log(`  ✅ SEA_Sales tab, Row ${salesData.firstEmptyRow} = Sales pipeline`)
    console.log(`  ✅ SEA_CS tab, Row ${csData.firstEmptyRow} = CS pipeline`)
    console.log(`  ✅ Columns B, Q, R, AE, AK still have formulas (not overwritten)`)
    console.log(`  ✅ Column mapping correct (A=ID, C=Classification, D=POC, G=Publisher, etc.)`)
    console.log('')

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

main()
