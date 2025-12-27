#!/usr/bin/env node
/**
 * Sync 34 TRULY missing CS pipelines (verified accurate)
 */
const { createClient } = require('@supabase/supabase-js')
const { google } = require('googleapis')
require('dotenv').config({ path: '.env.local' })

const MISSING_IDS = [
  "e0679430-93d4-4ce0-99ce-94bbc7f07dcc", "4414771e-0959-4b57-a852-88c91de33739",
  "c3540111-e7e2-46cc-b062-918837c26dce", "1865f467-77b1-4c9a-858b-8f33f1e3b75a",
  "dc92d013-8b9b-40c4-9124-487802102cf5", "de07e193-6c0f-4857-939f-17947c7f83dc",
  "b4d47234-a0b6-4a8f-bbd3-d9495778b103", "b1da9996-b9e6-40e0-ab16-53a8fe1f4b3a",
  "0f09f14f-5753-448e-85ae-660eff6a0cb9", "60d71288-bd8e-410f-bbf7-c1b813f9f4b5",
  "71b4f855-f53a-41a4-baf5-c754cbed01dd", "45db9cc3-c9c7-4318-880e-5643c11703fe",
  "96657a18-9d17-4d03-85f0-d5d360fa7506", "fef3deb9-f607-461f-880b-6fe2ead085ca",
  "21f6b5f4-c943-48df-a669-369548a7a711", "d7a2aa3d-38e5-4c2a-a09c-0864e7f8e2b9",
  "f4338d6b-752b-4505-ab26-f5d1c24f14f8", "34730794-9300-4618-802a-b1f005767f65",
  "770f9f6b-aff6-4983-9e92-e009f029a410", "8bbd62ec-2b58-4f70-87b9-61f605604d3f",
  "f8734b25-7467-481f-9776-18acfc3fb1ac", "6fe82b22-e94c-4aa5-9ba0-d4bc0937a3bc",
  "3e16b003-c956-4f8d-bc99-e4309b4ef715", "432a1c9a-4a7a-4122-ae58-495639658427",
  "4d0a2916-9b0f-405e-b9a7-698df741820e", "0c3ca8b4-aef9-4f2c-9c36-dca7f06bbb6c",
  "fba00aa6-935f-40e4-822b-2566cb5e4456", "e148c026-c148-4b6a-b3ec-b89d14c9918f",
  "e8e07971-323c-40eb-af2a-a3becca905df", "e4d2672a-092b-4ddf-9a2e-5d5ca5f66d0d",
  "796c1bda-f699-4922-9cc8-f94bf89f26bd", "2d979e72-dc7f-4055-ac3a-80c476c4b49f",
  "dd4fda45-2df9-4ac0-9cbc-f77092efc4de", "a8964455-d5e0-42d4-a1e7-36e9a00bfbd8"
]

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const spreadsheetId = process.env.PIPELINE_SHEETS_ID

const DELAY_MS = 1500
// NOTE: Columns with formulas that should NOT be synced:
// - Column B (index 1): Concatenation formula
// - Column Q (index 16): =U/30 (day_gross formula)
// - Column R (index 17): =U/30*V (day_net_rev formula)
// - Column U (index 20): =S*T/1000 (max_gross formula - imp * eCPM / 1000)
// - Column AE (index 30): Status lookup formula
// - Column AF (index 31): proposal_date - NOT synced per user request
// - Column AG (index 32): interested_date - NOT synced per user request
const COLUMNS = { id: 0, classification: 2, poc: 3, pid: 5, publisher: 6, mid: 8, domain: 9, description: 14, product: 15, imp: 18, ecpm: 19, revenue_share: 21, action_date: 23, next_action: 24, action_detail: 25, action_progress: 26, starting_date: 28, status: 29 }

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } })

function getSheetsClient() {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const auth = new google.auth.GoogleAuth({ credentials, scopes: ['https://www.googleapis.com/auth/spreadsheets'] })
  return google.sheets({ version: 'v4', auth })
}

function formatDateForSheet(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return ''
  const excelEpoch = new Date(1899, 11, 30)
  return Math.floor((date.getTime() - excelEpoch.getTime()) / (1000 * 60 * 60 * 24))
}

function formatValue(value, fieldName) {
  if (value === null || value === undefined) return ''
  if (fieldName.includes('date')) return formatDateForSheet(value)
  if (['day_gross', 'day_net_rev', 'ecpm', 'max_gross', 'revenue_share'].includes(fieldName)) {
    return typeof value === 'number' ? Number(value.toFixed(2)) : value
  }
  if (['imp', 'progress_percent'].includes(fieldName)) return typeof value === 'number' ? Math.round(value) : value
  return value
}

function mapPipelineToRow(pipeline) {
  const row = new Array(Math.max(...Object.values(COLUMNS)) + 1).fill('')
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

async function loadExistingRows(sheets) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_CS!A:D'
  })
  const rows = res.data.values || []
  const idMap = new Map()
  let firstEmptyRow = 3
  for (let i = 2; i < rows.length; i++) {
    const id = rows[i][0]
    if (id && id.length > 10) idMap.set(id, i + 1)
    if (!id && !rows[i][2] && !rows[i][3] && (i + 1) >= firstEmptyRow) {
      firstEmptyRow = i + 1
      break
    }
  }
  if (firstEmptyRow === 3 && rows.length > 2) firstEmptyRow = rows.length + 1
  return { idMap, firstEmptyRow }
}

async function syncPipeline(sheets, pipeline, existingData) {
  const rowData = mapPipelineToRow(pipeline)
  let targetRow = existingData.idMap.get(pipeline.id) || existingData.firstEmptyRow++
  const isUpdate = existingData.idMap.has(pipeline.id)
  if (!isUpdate) existingData.idMap.set(pipeline.id, targetRow)

  const updates = []
  for (const [fieldName, columnIndex] of Object.entries(COLUMNS)) {
    updates.push({
      range: `SEA_CS!${columnToLetter(columnIndex)}${targetRow}`,
      values: [[rowData[columnIndex]]]
    })
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates }
  })

  return { success: true, rowNumber: targetRow, isUpdate }
}

async function main() {
  console.log('🔄 Syncing 34 TRULY Missing CS Pipelines (Verified Accurate)\n')
  const sheets = getSheetsClient()

  const { data: pipelines, error } = await supabase.from('pipelines').select('*').in('id', MISSING_IDS)
  if (error) { console.error('❌ Error:', error.message); process.exit(1) }
  console.log(`📦 Found ${pipelines.length}/${MISSING_IDS.length} pipelines`)
  console.log(`ℹ️  These IDs were verified to NOT exist in sheet\n`)

  const existingData = await loadExistingRows(sheets)
  console.log(`🔍 CS: ${existingData.idMap.size} IDs, next empty row: ${existingData.firstEmptyRow}\n`)

  console.log('🔄 Starting sync...\n')
  let success = 0, failed = 0
  for (let i = 0; i < pipelines.length; i++) {
    try {
      const result = await syncPipeline(sheets, pipelines[i], existingData)
      success++
      console.log(`[${i + 1}/${pipelines.length}] ${pipelines[i].publisher.padEnd(40)} ✅ ${result.isUpdate ? 'Updated' : 'Created'} row ${result.rowNumber}`)
      if (i < pipelines.length - 1) await new Promise(r => setTimeout(r, DELAY_MS))
    } catch (err) {
      failed++
      console.log(`[${i + 1}/${pipelines.length}] ${pipelines[i].publisher.padEnd(40)} ❌ ${err.message}`)
    }
  }

  console.log('\n═══════════════════════════════════════')
  console.log(`✅ Success: ${success}/${pipelines.length}`)
  console.log(`❌ Failed: ${failed}`)
}

main()
