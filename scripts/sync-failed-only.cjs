#!/usr/bin/env node
/**
 * Sync only failed pipelines with longer delay
 */
const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

const FAILED_PUBLISHERS = [
  'Ha Van Dung',
  'Berita Satu',
  'welove-gourmet.com',
  'juiceonline.com',
  'redawine.com',
  'kwongwah.com.my',
  'upmedia.mg',
  'https://cloudz.fun/',
  'home.vn',
  'Komchadluek.net',
  'PT Viva Media Baru'
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const spreadsheetId = process.env.PIPELINE_SHEETS_ID
const DELAY_MS = 2000 // 2 seconds between requests

const COLUMNS = {
  id: 0, classification: 2, poc: 3, pid: 5, publisher: 6,
  mid: 8, domain: 9, description: 14, product: 15,
  imp: 18, ecpm: 19, /* max_gross: 20 - FORMULA! */ revenue_share: 21,
  action_date: 23, next_action: 24, action_detail: 25, action_progress: 26,
  starting_date: 28, status: 29,
  // proposal_date: 31, interested_date: 32 - NOT synced per user request
}

const SHEET_CONFIG = {
  spreadsheetId: spreadsheetId,
  sheets: { sales: 'SEA_Sales', cs: 'SEA_CS' }
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
})

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  })
  return google.sheets({ version: 'v4', auth })
}

function formatDateForSheet(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const excelEpoch = new Date(1899, 11, 30)
  const diffDays = (date.getTime() - excelEpoch.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(diffDays)
}

function formatValue(value, fieldName) {
  if (value === null || value === undefined) return ''
  if (fieldName.includes('date')) return formatDateForSheet(value)
  if (['day_gross', 'day_net_rev', 'ecpm', 'max_gross', 'revenue_share'].includes(fieldName)) {
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
    row[columnIndex] = formatValue(pipeline[fieldName], fieldName)
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

async function loadExistingRows(sheets, sheetName) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    range: `${sheetName}!A:D`
  })

  const rows = res.data.values || []
  const idMap = new Map()
  let firstEmptyRow = 3

  for (let i = 2; i < rows.length; i++) {
    const rowNum = i + 1
    const id = rows[i][0]
    const classification = rows[i][2]
    const poc = rows[i][3]

    if (id && id.length > 10) {
      idMap.set(id, rowNum)
    }

    if (!id && !classification && !poc && rowNum >= firstEmptyRow) {
      firstEmptyRow = rowNum
      break
    }
  }

  if (firstEmptyRow === 3 && rows.length > 2) {
    firstEmptyRow = rows.length + 1
  }

  return { idMap, firstEmptyRow }
}

async function syncPipeline(sheets, pipeline, existingData) {
  const sheetName = pipeline.group === 'sales' ? SHEET_CONFIG.sheets.sales : SHEET_CONFIG.sheets.cs
  const rowData = mapPipelineToRow(pipeline)

  let targetRow = existingData.idMap.get(pipeline.id)
  let isUpdate = false

  if (targetRow) {
    isUpdate = true
  } else {
    targetRow = existingData.firstEmptyRow
    if (pipeline.id) {
      existingData.idMap.set(pipeline.id, targetRow)
    }
    existingData.firstEmptyRow = targetRow + 1
  }

  const updates = []
  for (const [fieldName, columnIndex] of Object.entries(COLUMNS)) {
    const columnLetter = columnToLetter(columnIndex)
    const value = rowData[columnIndex]
    updates.push({
      range: `${sheetName}!${columnLetter}${targetRow}`,
      values: [[value]]
    })
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_CONFIG.spreadsheetId,
    requestBody: {
      valueInputOption: 'USER_ENTERED',
      data: updates
    }
  })

  return { success: true, rowNumber: targetRow, isUpdate }
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🔄 Syncing Failed Pipelines Only\n')
  console.log('⏱️  Using 2-second delay to avoid rate limiting\n')

  const sheets = getSheetsClient()

  // Fetch failed pipelines
  const { data: pipelines, error } = await supabase
    .from('pipelines')
    .select('*')
    .in('publisher', FAILED_PUBLISHERS)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }

  console.log(`📦 Found ${pipelines.length} failed pipelines\n`)

  // Load existing data
  const salesData = await loadExistingRows(sheets, SHEET_CONFIG.sheets.sales)
  const csData = await loadExistingRows(sheets, SHEET_CONFIG.sheets.cs)

  console.log(`🔍 Existing rows:`)
  console.log(`   Sales: ${salesData.idMap.size} IDs, next empty row: ${salesData.firstEmptyRow}`)
  console.log(`   CS: ${csData.idMap.size} IDs, next empty row: ${csData.firstEmptyRow}\n`)

  console.log('🔄 Starting sync...\n')

  let success = 0
  let failed = 0
  const errors = []

  for (let i = 0; i < pipelines.length; i++) {
    const pipeline = pipelines[i]
    const existingData = pipeline.group === 'sales' ? salesData : csData

    try {
      const result = await syncPipeline(sheets, pipeline, existingData)
      success++
      const action = result.isUpdate ? 'Updated' : 'Created'
      console.log(`[${i + 1}/${pipelines.length}] ${pipeline.publisher.padEnd(40)} (${pipeline.group})... ✅ ${action} row ${result.rowNumber}`)

      // Wait 2 seconds before next request
      if (i < pipelines.length - 1) {
        await sleep(DELAY_MS)
      }
    } catch (err) {
      failed++
      errors.push({ publisher: pipeline.publisher, error: err.message })
      console.log(`[${i + 1}/${pipelines.length}] ${pipeline.publisher.padEnd(40)} (${pipeline.group})... ❌ ${err.message}`)
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log('📊 Retry Sync Summary')
  console.log('═══════════════════════════════════════')
  console.log(`Total: ${pipelines.length}`)
  console.log(`✅ Success: ${success} (${(success / pipelines.length * 100).toFixed(1)}%)`)
  console.log(`❌ Failed: ${failed}`)

  if (errors.length > 0) {
    console.log('\n❌ Failed pipelines:')
    errors.forEach(e => console.log(`   - ${e.publisher}: ${e.error}`))
  }

  console.log('\n📊 View: https://docs.google.com/spreadsheets/d/1nZMTjsDydu2Dp8Vh621q88Wa-4blWG0elFWug8WXonk/edit')
}

main()
