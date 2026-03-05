import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function analyzeSalesStructure() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching Row 2 (headers) and Row 3 (data) from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:AZ3`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  const firstDataRow = rows[1];

  console.log('================================================================================');
  console.log('SALES SHEET - Column Mapping Analysis (Row 2: Headers, Row 3: Data)');
  console.log('================================================================================\n');

  // Show columns 0-25
  for (let i = 0; i < Math.min(26, headers.length); i++) {
    const header = headers[i] || '(empty)';
    const data = firstDataRow[i] !== undefined ? firstDataRow[i] : '(empty)';
    const colLetter = String.fromCharCode(65 + (i % 26));

    console.log(`Column ${i.toString().padStart(2)} (${colLetter}):`);
    console.log(`  Header: "${header}"`);
    console.log(`  Data:   ${data}`);
    console.log('');
  }

  // Find key columns based on data patterns
  console.log('================================================================================');
  console.log('KEY COLUMNS IDENTIFIED BY DATA PATTERNS:');
  console.log('================================================================================\n');

  // Find IMP column (large numbers like 40M, 2M)
  for (let i = 15; i < Math.min(25, firstDataRow.length); i++) {
    const value = firstDataRow[i];
    if (value && typeof value === 'number' && value > 1000000) {
      console.log(`Column ${i} likely has IMP data: ${value.toLocaleString()}`);
      console.log(`  Header says: "${headers[i]}"`);
    }
  }

  // Find eCPM column (small numbers like 0.06, 2418)
  console.log('\nColumns with eCPM-like values (0.01-10000):');
  for (let i = 15; i < Math.min(25, firstDataRow.length); i++) {
    const value = firstDataRow[i];
    if (value && typeof value === 'number' && value > 0.01 && value < 10000) {
      console.log(`Column ${i}: ${value} (Header: "${headers[i]}")`);
    }
  }

  // Find day_gross column (small decimal like 80.6)
  console.log('\nColumns with day_gross-like values (1-1000):');
  for (let i = 15; i < Math.min(25, firstDataRow.length); i++) {
    const value = firstDataRow[i];
    if (value && typeof value === 'number' && value > 1 && value < 1000) {
      console.log(`Column ${i}: ${value} (Header: "${headers[i]}")`);
    }
  }

  // Find revenue_share column (very small decimal like 0.06, 0.2)
  console.log('\nColumns with revenue_share-like values (0-1):');
  for (let i = 15; i < Math.min(25, firstDataRow.length); i++) {
    const value = firstDataRow[i];
    if (value && typeof value === 'number' && value > 0 && value < 1) {
      console.log(`Column ${i}: ${value} (Header: "${headers[i]}")`);
    }
  }
}

analyzeSalesStructure().catch(console.error);
