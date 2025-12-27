/**
 * Batch Sync Pipelines to Google Sheets (Optimized)
 *
 * Syncs pipelines in batches to avoid quota limits
 * Usage: node scripts/sync-pipelines-batch.cjs [batch_size] [start_index]
 *
 * Examples:
 *   node scripts/sync-pipelines-batch.cjs           # Sync first 50
 *   node scripts/sync-pipelines-batch.cjs 100       # Sync first 100
 *   node scripts/sync-pipelines-batch.cjs 50 0      # Sync index 0-49
 *   node scripts/sync-pipelines-batch.cjs 50 50     # Sync index 50-99
 */

const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

// Parse command line args
const BATCH_SIZE = parseInt(process.argv[2]) || 50
const START_INDEX = parseInt(process.argv[3]) || 0

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const spreadsheetId = process.env.PIPELINE_SHEETS_ID
const syncEnabled = process.env.PIPELINE_SYNC_ENABLED === 'true'

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

if (!spreadsheetId) {
  console.error('❌ Missing PIPELINE_SHEETS_ID in .env.local')
  process.exit(1)
}

if (!syncEnabled) {
  console.error('❌ PIPELINE_SYNC_ENABLED is not set to true in .env.local')
  process.exit(1)
}

// Google Sheets Configuration
const SHEET_CONFIG = {
  spreadsheetId: spreadsheetId,
  dataStartRow: 3,
  sheets: {
    sales: 'SEA_Sales',
    cs: 'SEA_CS'
  }
}

// Column mapping (CORRECT - matches pipelineSheetMapping.ts and test-sync page)
// A=id, B=key(skip), C=classification, D=poc, E=team(skip), F=pid, G=publisher
const COLUMNS = {
  id: 0,                    // A - Pipeline ID (UUID)
  classification: 2,        // C
  poc: 3,                   // D
  pid: 5,                   // F
  publisher: 6,             // G
  mid: 8,                   // I
  domain: 9,                // J
  description: 14,          // O - Pipeline detail
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

// Initialize Google Sheets
function getSheetsClient() {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    throw new Error('Missing GOOGLE_APPLICATION_CREDENTIALS_JSON')
  }

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

  if (['day_gross', 'day_net_rev', 'ecpm', 'max_gross', 'revenue_share', 'q_gross', 'q_net_rev'].includes(fieldName)) {
    return typeof value === 'number' ? Number(value.toFixed(2)) : value
  }

  if (['imp', 'progress_percent'].includes(fieldName)) {
    return typeof value === 'number' ? Math.round(value) : value
  }

  return value
}

function mapPipelineToRow(pipeline) {
  const maxCol = Math.max(...Object.values(COLUMNS))
  const row = new Array(maxCol + 1).fill('')

  for (const [fieldName, columnIndex] of Object.entries(COLUMNS)) {
    const value = pipeline[fieldName]
    row[columnIndex] = formatValue(value, fieldName)
  }

  return row
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

// Load existing rows from sheet (ONE READ for A, C, D columns)
async function loadExistingRows(sheets, sheetName) {
  try {
    // Read A (ID), C (Classification), D (POC)
    const range = `${sheetName}!A${SHEET_CONFIG.dataStartRow}:D`
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_CONFIG.spreadsheetId,
      range,
    })

    const rows = response.data.values || []
    const idMap = new Map()         // A (Pipeline ID) → row number
    let firstEmptyRow = null        // Dòng đầu tiên có A, C, D rỗng

    for (let i = 0; i < rows.length; i++) {
      const rowNum = SHEET_CONFIG.dataStartRow + i
      const row = rows[i] || []

      // A=0, C=2, D=3
      const id = row[0]?.trim() || ''
      const classification = row[2]?.trim() || ''
      const poc = row[3]?.trim() || ''

      // Map by A (Pipeline ID) - CHỈ TÌM THEO A
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

    return {
      idMap,
      firstEmptyRow
    }
  } catch (error) {
    console.warn(`Warning: Could not load existing rows: ${error.message}`)
    return { idMap: new Map(), firstEmptyRow: SHEET_CONFIG.dataStartRow }
  }
}

// Sync pipeline to sheet (using cached data)
async function syncPipeline(sheets, pipeline, existingData) {
  const sheetName = pipeline.group === 'sales' ? SHEET_CONFIG.sheets.sales : SHEET_CONFIG.sheets.cs
  const rowData = mapPipelineToRow(pipeline)

  // LOGIC ĐƠN GIẢN:
  // 1. Tìm theo A (Pipeline ID)
  //    - Nếu A khớp → UPDATE vào dòng đó
  // 2. Nếu A KHÔNG khớp → TẠO DÒNG MỚI
  //    - Dòng mới tạo tại: dòng có A, C, D rỗng (firstEmptyRow)

  let targetRow = null
  let isUpdate = false

  // Tìm theo A (Pipeline ID)
  if (pipeline.id) {
    targetRow = existingData.idMap.get(pipeline.id)
  }

  if (targetRow) {
    // Tìm thấy theo A → UPDATE
    isUpdate = true
  } else {
    // Không tìm thấy → TẠO DÒNG MỚI tại dòng có A,C,D rỗng
    targetRow = existingData.firstEmptyRow
    isUpdate = false

    // Update cache và move firstEmptyRow xuống dòng tiếp theo
    if (pipeline.id) {
      existingData.idMap.set(pipeline.id, targetRow)
    }
    existingData.firstEmptyRow = targetRow + 1
  }

  // Build batch update - CHỈ update các cột trong COLUMNS (KHÔNG đụng công thức!)
  const updates = []
  for (const [fieldName, columnIndex] of Object.entries(COLUMNS)) {
    const columnLetter = columnToLetter(columnIndex)
    const value = rowData[columnIndex]

    updates.push({
      range: `${sheetName}!${columnLetter}${targetRow}`,
      values: [[value]],
    })
  }

  // Execute batch update
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates,
    },
  })

  return {
    success: true,
    rowNumber: targetRow,
    isUpdate: isUpdate
  }
}

// Main function
async function main() {
  console.log('🔄 Batch Sync Pipelines to Google Sheets\n')
  console.log(`📊 Batch: ${BATCH_SIZE} pipelines starting from index ${START_INDEX}\n`)

  try {
    // Initialize Google Sheets
    console.log('🔑 Initializing Google Sheets API...')
    const sheets = getSheetsClient()
    console.log('✅ Google Sheets API ready\n')

    // Fetch pipelines - use .range() to fetch only the batch we need
    console.log('📊 Fetching pipelines from database...')
    const endIndex = START_INDEX + BATCH_SIZE - 1
    const { data: pipelines, error, count } = await supabase
      .from('pipelines')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(START_INDEX, endIndex) // Fetch only the batch range needed

    if (error) {
      console.error('❌ Failed to fetch pipelines:', error.message)
      process.exit(1)
    }

    console.log(`✅ Total pipelines in database: ${count}\n`)

    // pipelines already contains only the batch we need (no slicing required)

    if (pipelines.length === 0) {
      console.log(`⚠️  No pipelines in range ${START_INDEX}-${START_INDEX + BATCH_SIZE}`)
      return
    }

    console.log(`📦 Selected pipelines: ${pipelines.length}`)
    console.log(`   Range: Index ${START_INDEX} to ${START_INDEX + pipelines.length - 1}\n`)

    // Load existing rows (2 reads total - one per sheet)
    console.log('🔍 Loading existing Pipeline IDs from sheets...')
    const salesData = await loadExistingRows(sheets, SHEET_CONFIG.sheets.sales)
    const csData = await loadExistingRows(sheets, SHEET_CONFIG.sheets.cs)
    console.log(`   ✅ Sales: ${salesData.idMap.size} IDs, next empty row: ${salesData.firstEmptyRow}`)
    console.log(`   ✅ CS: ${csData.idMap.size} IDs, next empty row: ${csData.firstEmptyRow}\n`)

    // Sync batch
    let successCount = 0
    let failedCount = 0
    let updateCount = 0
    let createCount = 0
    const failed = []

    console.log('🔄 Starting sync...\n')

    for (let i = 0; i < pipelines.length; i++) {
      const pipeline = pipelines[i]
      const globalIndex = START_INDEX + i
      const progress = `[${globalIndex + 1}/${count || allPipelines.length}]`
      const displayName = pipeline.publisher || pipeline.name || 'Unnamed'

      process.stdout.write(`${progress} ${displayName.substring(0, 40).padEnd(40)} (${pipeline.group})... `)

      try {
        const existingData = pipeline.group === 'sales' ? salesData : csData
        const result = await syncPipeline(sheets, pipeline, existingData)

        if (result.success) {
          successCount++
          if (result.isUpdate) {
            updateCount++
            console.log(`✅ Updated row ${result.rowNumber}`)
          } else {
            createCount++
            console.log(`✅ Created row ${result.rowNumber}`)
          }
        }
      } catch (error) {
        failedCount++
        failed.push({ pipeline, error: error.message })
        console.log(`❌ ${error.message}`)
      }

      // Rate limiting: 1 second between pipelines (safe for quota)
      if (i < pipelines.length - 1) {
        await sleep(1000)
      }
    }

    // Summary
    console.log('')
    console.log('═══════════════════════════════════════')
    console.log('📊 Batch Sync Summary')
    console.log('═══════════════════════════════════════')
    console.log(`Batch Range: ${START_INDEX} to ${START_INDEX + pipelines.length - 1}`)
    console.log(`Pipelines Synced: ${pipelines.length}`)
    console.log(`✅ Success: ${successCount} (${((successCount/pipelines.length)*100).toFixed(1)}%)`)
    console.log(`   - Created: ${createCount}`)
    console.log(`   - Updated: ${updateCount}`)
    console.log(`❌ Failed: ${failedCount}`)
    console.log('')

    if (failed.length > 0) {
      console.log('❌ Failed Pipelines:')
      failed.forEach(({ pipeline, error }) => {
        const name = pipeline.publisher || pipeline.name || 'Unnamed'
        console.log(`   - ${name}: ${error}`)
      })
      console.log('')
    }

    // Next batch suggestion
    const remaining = (count || allPipelines.length) - (START_INDEX + pipelines.length)
    if (remaining > 0) {
      console.log(`📦 Next batch: ${remaining} pipelines remaining`)
      console.log(`   Run: node scripts/sync-pipelines-batch.cjs ${BATCH_SIZE} ${START_INDEX + BATCH_SIZE}`)
      console.log('')
    } else {
      console.log('🎉 All pipelines synced!\n')
    }

    console.log(`📊 View results: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`)
    console.log('')

  } catch (error) {
    console.error('❌ Sync failed:', error.message)
    console.error(error)
    process.exit(1)
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Run
main().catch(console.error)
