#!/usr/bin/env node
/**
 * Script to check CS Google Sheet structure and find ZID column
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Google Sheets configuration
const SPREADSHEET_ID = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'; // User's provided sheet
const CHECK_BOTH_SHEETS = true; // Check both Sales and CS
const CREDENTIALS_PATH = join(__dirname, '../service-account.json');

async function checkSheetStructure() {
  try {
    console.log('🔍 Checking CS Google Sheet structure...\n');

    // Load service account credentials
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf-8'));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Get all sheet names first
    console.log('📋 Fetching sheet tabs...');
    const metadata = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
    });

    console.log('\nAvailable sheet tabs:');
    metadata.data.sheets?.forEach((sheet, index) => {
      console.log(`  ${index + 1}. ${sheet.properties?.title}`);
    });

    // Find both Sales and CS sheets
    const salesSheet = metadata.data.sheets?.find(sheet =>
      sheet.properties?.title?.toLowerCase().includes('sales') &&
      !sheet.properties?.title?.toLowerCase().includes('lastweek')
    );
    const csSheet = metadata.data.sheets?.find(sheet =>
      (sheet.properties?.title?.toLowerCase().includes('cs') ||
       sheet.properties?.title?.toLowerCase().includes('customer')) &&
      !sheet.properties?.title?.toLowerCase().includes('lastweek')
    );

    const sheetsToCheck = [];
    if (CHECK_BOTH_SHEETS) {
      if (salesSheet) sheetsToCheck.push({ name: salesSheet.properties?.title || '', type: 'Sales' });
      if (csSheet) sheetsToCheck.push({ name: csSheet.properties?.title || '', type: 'CS' });
    } else {
      if (csSheet) sheetsToCheck.push({ name: csSheet.properties?.title || '', type: 'CS' });
    }

    if (sheetsToCheck.length === 0) {
      console.log('\n❌ No sheets found to check.');
      return;
    }

    for (const sheetInfo of sheetsToCheck) {
      await checkSheet(sheets, sheetInfo.name, sheetInfo.type);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 403) {
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Ensure service account has access to the Google Sheet');
      console.error('   2. Share the sheet with: n8n-bigquery-service@gcpp-check.iam.gserviceaccount.com');
      console.error('   3. Grant "Viewer" or "Editor" permissions');
    }
  }
}

async function checkSheet(sheets, sheetName, sheetType) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 Analyzing ${sheetType} Sheet: "${sheetName}"`);
  console.log('='.repeat(80));

  // Fetch headers (rows 1-2) and a few data rows
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A1:AO5`, // Fetch columns A to AO (up to 41 columns), rows 1-5
    valueRenderOption: 'UNFORMATTED_VALUE',
    dateTimeRenderOption: 'SERIAL_NUMBER',
  });

  const rows = response.data.values || [];

  if (rows.length < 2) {
    console.log('❌ Sheet has insufficient rows for header analysis');
    return;
  }

  const header1 = rows[0] || [];
  const header2 = rows[1] || [];
  const sampleData = rows.slice(2); // Rows 3-5

  // Display column structure  console.log('\nColumns 0-15 (A-P) - Basic Info:\n');

  // Look for ZID-related columns
  const zidColumns = [];
  const maxCols = 40;

  for (let i = 0; i < Math.min(maxCols, header2.length); i++) {
      const colLetter = getColumnLetter(i);
      const h1 = header1[i] || '';
      const h2 = header2[i] || '';
      const sample = sampleData.map(row => row[i] || '').filter(Boolean).slice(0, 2);

      // Highlight important columns
      const isZidRelated =
        h1.toString().toLowerCase().includes('zid') ||
        h2.toString().toLowerCase().includes('zid') ||
        h1.toString().toLowerCase().includes('zone') ||
        h2.toString().toLowerCase().includes('zone');

      const isActionField =
        h2.toString().toLowerCase().includes('action') ||
        h2.toString().toLowerCase().includes('next') ||
        h2.toString().toLowerCase().includes('progress');

      const isDateField =
        h2.toString().toLowerCase().includes('date') ||
        h2.toString().toLowerCase().includes('ready') ||
        h2.toString().toLowerCase().includes('closed');

      let prefix = '  ';
      if (isZidRelated) {
        prefix = '🎯';
        zidColumns.push({ index: i, letter: colLetter, header1: h1, header2: h2 });
      } else if (isActionField) {
        prefix = '📝';
      } else if (isDateField) {
        prefix = '📅';
      }

    const display = sample.length > 0 ? `"${h2}" (${sample.slice(0, 1)})` : `"${h2}"`;
    console.log(`${prefix} ${String(i).padStart(2)} (${colLetter.padEnd(2)}): ${display}`);

    // Add section breaks
    if (i === 8) console.log('\n' + '-'.repeat(60) + '\nColumns 9-14 - Channel & Product:\n');
    if (i === 14) console.log('\n' + '-'.repeat(60) + '\nColumns 15-22 - Revenue & Action:\n');
    if (i === 22) console.log('\n' + '-'.repeat(60) + '\nColumns 23-32 - Action & Status:\n');
    if (i === 32) console.log('\n' + '-'.repeat(60) + '\nColumns 33-36 - Key Difference Zone:\n');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`📊 SUMMARY for ${sheetType} Sheet\n`);

  if (zidColumns.length > 0) {
    console.log('🎯 ZID-related columns found:');
    zidColumns.forEach(col => {
      console.log(`   - Column ${col.index} (${col.letter}): "${col.header2}"`);
    });
  } else {
    console.log('❌ No ZID columns found');
  }
}

/**
 * Convert column index to letter (0 = A, 25 = Z, 26 = AA, etc.)
 */
function getColumnLetter(index) {
  let letter = '';
  let num = index;

  while (num >= 0) {
    letter = String.fromCharCode((num % 26) + 65) + letter;
    num = Math.floor(num / 26) - 1;
  }

  return letter;
}

// Run the script
checkSheetStructure();
