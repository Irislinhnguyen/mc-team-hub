/**
 * Local Script: Check skipped rows from Google Sheets
 *
 * This script fetches specific rows directly from Google Sheets
 * to verify which rows have data and were incorrectly skipped.
 *
 * Usage: node scripts/check-skipped-rows.js
 */

import { google } from 'googleapis'
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
dotenv.config({ path: '.env.local' })

const getGoogleCredentials = () => {
  // Try base64 first
  const credentialsBase64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_BASE64
  if (credentialsBase64) {
    const credentialsJson = Buffer.from(credentialsBase64, 'base64').toString('utf-8')
    return JSON.parse(credentialsJson)
  }

  // Try JSON string
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (credentialsJson) {
    return JSON.parse(credentialsJson)
  }

  // Try file path
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  if (credentialsPath) {
    const fs = require('fs')
    const credentialsContent = fs.readFileSync(credentialsPath, 'utf-8')
    return JSON.parse(credentialsContent)
  }

  throw new Error('No Google credentials found in environment variables (GOOGLE_APPLICATION_CREDENTIALS_BASE64, GOOGLE_APPLICATION_CREDENTIALS_JSON, or GOOGLE_APPLICATION_CREDENTIALS)')
}

async function checkSkippedRows() {
  try {
    // Connect to Supabase directly
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    console.log('📊 Fetching quarterly sheets from database...\n')

    const { data: sheets, error } = await supabase
      .from('quarterly_sheets')
      .select('*')
      .eq('sheet_name', 'SEA_CS')
      .eq('year', 2025)
      .eq('quarter', 4)

    if (error) {
      console.error('❌ Database error:', error.message)
      return
    }

    if (!sheets || sheets.length === 0) {
      console.error('❌ SEA_CS sheet not found')
      return
    }

    const sheet = sheets[0]

    console.log(`✅ Found sheet: ${sheet.sheet_name}`)
    console.log(`   Spreadsheet ID: ${sheet.spreadsheet_id}`)
    console.log(`   Year: ${sheet.year}, Quarter: Q${sheet.quarter}`)
    console.log()

    // Initialize Google Sheets API
    const credentials = getGoogleCredentials()
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
    })

    const sheetsApi = google.sheets({ version: 'v4', auth })

    // Rows to check (the skipped rows from database)
    const rowsToCheck = [24, 27, 225, 226, 313, 314]

    console.log('🔍 Checking missing rows in Google Sheets...\n')

    for (const rowNumber of rowsToCheck) {
      const range = `SEA_CS!A${rowNumber}:C${rowNumber}`

      try {
        const response = await sheetsApi.spreadsheets.values.get({
          spreadsheetId: sheet.spreadsheet_id,
          range,
          valueRenderOption: 'UNFORMATTED_VALUE',
        })

        const row = response.data.values ? response.data.values[0] : null

        if (row) {
          const colA = row[0]
          const colB = row[1]
          const colC = row[2]

          const hasData = colA != null || colB != null || colC != null

          console.log(`Row ${rowNumber}:`)
          console.log(`  Col A (key): ${colA ?? '(empty)'}`)
          console.log(`  Col B:      ${colB ?? '(empty)'}`)
          console.log(`  Col C:      ${colC ?? '(empty)'}`)
          console.log(`  Status:     ${hasData ? '⚠️ HAS DATA (should sync)' : '✓ Empty (correct skip)'}`)

          // Check if key is falsy but valid
          if (colA != null) {
            const isEmpty = typeof colA === 'string' && colA.trim() === ''
            const isFalsy = !colA
            console.log(`  Key check:  ${isFalsy && !isEmpty ? '⚠️ Falsy but valid!' : 'Valid key'}`)
          }
        } else {
          console.log(`Row ${rowNumber}: ✓ Empty (correct skip)`)
        }
        console.log()
      } catch (error) {
        console.error(`  ❌ Error fetching row ${rowNumber}: ${error.message}`)
        console.log()
      }
    }

    // Fetch all data rows to get accurate count
    console.log('📈 Fetching total row count from sheet...\n')

    const fullResponse = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: sheet.spreadsheet_id,
      range: 'SEA_CS!A:C',
      valueRenderOption: 'UNFORMATTED_VALUE',
    })

    const allRows = fullResponse.data.values || []
    const dataRows = allRows.slice(2) // Skip header rows (1-2)

    console.log(`Total rows in sheet: ${allRows.length}`)
    console.log(`Data rows (excluding headers): ${dataRows.length}`)
    console.log()

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error)
  }
}

checkSkippedRows()
