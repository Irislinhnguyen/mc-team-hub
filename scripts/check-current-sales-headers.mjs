import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkCurrentHeaders() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching CURRENT headers from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:Z2`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const headers = response.data.values[0];

  console.log('================================================================================');
  console.log('CURRENT HEADERS (Row 2) - ALL COLUMNS:');
  console.log('================================================================================\n');

  for (let i = 0; i < headers.length; i++) {
    const colLetter = String.fromCharCode(65 + i); // A=65, B=66, etc.
    const header = headers[i] || '(empty)';
    console.log(`[${String(i).padStart(2)}] ${colLetter} (Col ${i + 1}): "${header}"`);
  }

  console.log('\n================================================================================');
  console.log('CHECKING DATA ALIGNMENT (Row 3):');
  console.log('================================================================================\n');

  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A3:Z3`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const dataRow = dataResponse.data.values[0];

  console.log('Key columns to verify:\n');

  // Check critical columns
  const criticalCols = [
    { index: 5, name: 'Publisher', expected: 'Publisher name' },
    { index: 9, name: 'Product (J)', expected: 'Product name' },
    { index: 15, name: 'Product (P)', expected: 'Product OR day_gross' },
    { index: 16, name: 'day gross (Q)', expected: 'number like 80.6' },
    { index: 17, name: 'day net rev (R)', expected: 'number like 16.12' },
    { index: 18, name: 'IMP (S)', expected: 'large number like 40300000' },
    { index: 19, name: 'eCPM (T)', expected: 'number like 2418' }
  ];

  for (const col of criticalCols) {
    if (col.index >= headers.length) {
      console.log(`✗ Column ${col.index} does not exist!\n`);
      continue;
    }

    const header = headers[col.index];
    const value = dataRow[col.index];

    console.log(`[${col.index}] Column ${col.name}:`);
    console.log(`  Header: "${header}"`);
    console.log(`  Data (Row 3): ${value !== undefined ? `"${value}"` : '(empty)'}`);

    // Check if data matches expectation
    if (col.name === 'Publisher') {
      if (!value || value === '') {
        console.log(`  ✗ EMPTY! This causes column shift!\n`);
      } else {
        console.log(`  ✓ Has data\n`);
      }
    } else if (col.name === 'day gross (Q)') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 0) {
        console.log(`  ✓ Has day_gross value\n`);
      } else {
        console.log(`  ✗ Wrong data type\n`);
      }
    } else if (col.name === 'IMP (S)') {
      const num = parseFloat(value);
      if (!isNaN(num) && num > 1000000) {
        console.log(`  ✓ Has IMP value (large number)\n`);
      } else {
        console.log(`  ✗ Wrong data (expected large IMP number)\n`);
      }
    } else {
      console.log('');
    }
  }

  console.log('================================================================================');
  console.log('CODE MAPPING IN sheetToDatabaseSync.ts:');
  console.log('================================================================================\n');

  console.log('Revenue columns mapping:');
  console.log('  Column 16 (Q): day_gross');
  console.log('  Column 17 (R): day_net_rev');
  console.log('  Column 18 (S): imp');
  console.log('  Column 19 (T): ecpm');
  console.log('  Column 20 (U): max_gross');
  console.log('  Column 21 (V): revenue_share');
  console.log('');

  console.log('Do these match the ACTUAL headers above?');
}

checkCurrentHeaders().catch(console.error);
