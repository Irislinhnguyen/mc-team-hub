/**
 * Fetch and analyze the current Sales sheet structure
 * This will help us understand what columns have changed
 */

import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function analyzeSalesSheet() {
  // Load service account from file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';

  let credentials;
  try {
    const credentialsJson = readFileSync(credentialsPath, 'utf-8');
    credentials = JSON.parse(credentialsJson);
  } catch (err) {
    console.error(`Failed to load service account from ${credentialsPath}:`, err.message);
    process.exit(1);
  }

  console.log('Using service account:', credentials.client_email);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`\nAnalyzing ${sheetName} sheet structure...\n`);

  // First, get the sheet metadata to understand column count
  const sheetMetadata = await sheets.spreadsheets.get({
    spreadsheetId,
    ranges: [sheetName]
  });

  const sheet = sheetMetadata.data.sheets.find(s => s.properties.title === sheetName);
  console.log('Sheet Info:');
  console.log(`  Title: ${sheet.properties.title}`);
  console.log(`  Row Count: ${sheet.properties.gridProperties.rowCount}`);
  console.log(`  Column Count: ${sheet.properties.gridProperties.columnCount}`);

  // Fetch first 10 rows to see all headers and some data
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:10`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('\n' + '='.repeat(80));
  console.log('FULL SHEET STRUCTURE (First 10 rows)');
  console.log('='.repeat(80) + '\n');

  // Print detailed column-by-column analysis
  const maxCols = Math.max(...rows.map(r => r.length));

  console.log(`Total columns found: ${maxCols}\n`);

  // Row 1 appears to have headers, Row 2 might have subheaders
  console.log('--- ROW 1 (Main Headers) ---');
  if (rows[0]) {
    rows[0].forEach((header, i) => {
      const colLetter = getColumnLetter(i);
      console.log(`  ${colLetter} (col ${i}): "${header}"`);
    });
  }

  console.log('\n--- ROW 2 (Subheaders/Values) ---');
  if (rows[1]) {
    rows[1].forEach((header, i) => {
      const colLetter = getColumnLetter(i);
      console.log(`  ${colLetter} (col ${i}): "${header}"`);
    });
  }

  console.log('\n--- COMBINED VIEW (using Row 2 as primary headers) ---');
  if (rows[1]) {
    rows[1].forEach((header, i) => {
      const colLetter = getColumnLetter(i);
      const row1Value = rows[0]?.[i] || '';
      const sampleValue = rows[2]?.[i] || rows[3]?.[i] || '';

      console.log(`  ${colLetter} (col ${i}): "${header}"`);
      if (row1Value && row1Value !== header) {
        console.log(`      Row 1 above: "${row1Value}"`);
      }
      if (sampleValue) {
        console.log(`      Sample data: "${sampleValue}"`);
      }
    });
  }

  console.log('\n--- EXISTING MAPPING FOR COMPARISON ---');
  console.log('Current mapping expects:');
  console.log('  col 0: key');
  console.log('  col 1: classification');
  console.log('  col 2: poc (AM)');
  console.log('  col 3: team');
  console.log('  col 4: MA/MI (mid)');
  console.log('  col 5: PID');
  console.log('  col 6: publisher');
  console.log('  col 7: MID/siteID');
  console.log('  col 8: domain');
  console.log('  col 9: ZID');
  console.log('  col 10: Channel');
  console.log('  col 11: Competitors');
  console.log('  col 12: Pipeline Quarter');
  console.log('  col 13: Pipeline detail');
  console.log('  col 14: Product');
  console.log('  col 15: day gross');
  console.log('  col 16: day net rev');
  console.log('  col 17: IMP (30days)');
  console.log('  col 18: eCPM');
  console.log('  col 19: Max Gross');
  console.log('  col 20: R/S (revenue_share)');
  console.log('  col 21: Action Date');
  console.log('  col 22: Next Action');
  console.log('  col 23: DETAIL');
  console.log('  col 24: Action Progress');
  console.log('  col 25: Update Target');
  console.log('  col 26: Action Progress (duplicate?)');
  console.log('  col 27: Starting Date');
  console.log('  col 28: Status');
  console.log('  col 29: % (progress_percent)');
  console.log('  col 30: Date of first proposal');
  console.log('  col 31: Interested date');
  console.log('  col 32: Acceptance date');
  console.log('  col 33: 【A】 (ready_to_deliver_date?)');
  console.log('  col 34: 【Z】 (c_plus_upgrade?)');
}

function getColumnLetter(index) {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode(65 + (index % 26)) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

analyzeSalesSheet().catch(console.error);
