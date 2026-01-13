/**
 * Debug Script: Fetch Google Sheets and compare with database
 *
 * Usage: node scripts/debug-sheet-sync.js <spreadsheet_id> <sheet_name>
 */

const { GoogleSpreadsheet } = require('google-spreadsheet')
const creds = require('../google-credentials.json')

async function debugSheet() {
  const spreadsheetId = process.argv[2] || '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
  const sheetName = process.argv[3] || 'SEA_CS'

  console.log(`\n📊 Fetching Google Sheet...`)
  console.log(`Spreadsheet ID: ${spreadsheetId}`)
  console.log(`Sheet Name: ${sheetName}\n`)

  try {
    const doc = new GoogleSpreadsheet(spreadsheetId)
    await doc.useServiceAccountAuth(creds)
    await doc.loadInfo()

    const sheet = doc.sheetsByTitle[sheetName]
    if (!sheet) {
      console.error(`❌ Sheet "${sheetName}" not found!`)
      console.log(`Available sheets:`, Object.keys(doc.sheetsByTitle))
      return
    }

    const rows = await sheet.getRows()

    console.log(`✅ Total rows in sheet: ${rows.length}`)
    console.log(`   (including header rows)\n`)

    // Analyze rows
    let dataRows = 0
    let emptyRows = 0
    let noKeyRows = 0
    const rowsWithoutKey = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNumber = i + 1

      // Skip first 2 rows (headers)
      if (rowNumber <= 2) {
        console.log(`Row ${rowNumber}: HEADER - ${Object.values(row).slice(0, 3).join(' | ')}`)
        continue
      }

      // Check if empty (A, B, C)
      const colA = row['key'] || row['_raw'][0]
      const colB = row['classification'] || row['_raw'][1]
      const colC = row['poc'] || row['_raw'][2]

      if (!colA && !colB && !colC) {
        emptyRows++
        console.log(`Row ${rowNumber}: ⚠️  EMPTY (A, B, C are empty)`)
        continue
      }

      // Check if no key
      if (!colA || (typeof colA === 'string' && colA.trim() === '')) {
        noKeyRows++
        rowsWithoutKey.push(rowNumber)
        console.log(`Row ${rowNumber}: ⚠️  NO KEY - A="${colA}", B="${colB}", C="${colC}"`)
        continue
      }

      dataRows++
      if (dataRows <= 5 || dataRows >= 310) {
        console.log(`Row ${rowNumber}: ✅ Key="${colA}", Publisher="${row['publisher'] || 'N/A'}"`)
      }
    }

    console.log(`\n📈 SUMMARY:`)
    console.log(`   Header rows: 2`)
    console.log(`   Data rows: ${dataRows}`)
    console.log(`   Empty rows (A,B,C empty): ${emptyRows}`)
    console.log(`   Rows without key: ${noKeyRows}`)
    if (rowsWithoutKey.length > 0) {
      console.log(`   Row numbers without key: ${rowsWithoutKey.join(', ')}`)
    }
    console.log(`   Total expected in DB: ${dataRows}`)

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

debugSheet()
