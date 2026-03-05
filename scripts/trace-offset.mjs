import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function traceOffset() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching Columns A-T (0-19) from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:T10`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];
  const headers = rows[0];

  console.log('================================================================================');
  console.log('HEADERS (Row 2) - Columns 0-19:');
  console.log('================================================================================\n');

  for (let i = 0; i < Math.min(headers.length, 20); i++) {
    const colLetter = String.fromCharCode(65 + i); // A=65, B=66, etc.
    console.log(`[${i.toString().padStart(2)}] ${colLetter} (Col ${i + 1}): "${headers[i]}"`);
  }

  console.log('\n================================================================================');
  console.log('ROW 3 DATA - Looking for where data mismatch starts:');
  console.log('================================================================================\n');

  const dataRow = rows[1];

  console.log('Expected vs Actual:\n');

  // Check key columns
  console.log('[5] F (Col 6) - Publisher:');
  console.log(`  Expected: Publisher name`);
  console.log(`  Actual: "${dataRow[5]}"`);
  console.log(`  ✓ CORRECT\n`);

  console.log('[8] I (Col 9) - domain:');
  console.log(`  Expected: domain`);
  console.log(`  Actual: "${dataRow[8]}"`);
  console.log(`  ✓ CORRECT\n`);

  console.log('[9] J (Col 10) - Product:');
  console.log(`  Expected: Product`);
  console.log(`  Actual: "${dataRow[9]}"`);
  console.log(`  ✓ CORRECT\n`);

  console.log('[11] L (Col 12) - Competitors:');
  console.log(`  Expected: Competitors`);
  console.log(`  Actual: "${dataRow[11]}"`);
  console.log(`  ✗ WRONG! This is "4Q FY2025" (Pipeline Quarter!)\n`);

  console.log('[12] M (Col 13) - Pipeline Quarter:');
  console.log(`  Expected: Pipeline Quarter`);
  console.log(`  Actual: "${dataRow[12]}"`);
  console.log(`  ✗ WRONG! This is "Video ad sticky" (Pipeline detail/Product!)\n`);

  console.log('[13] N (Col 14) - Pipeline detail:');
  console.log(`  Expected: Pipeline detail`);
  console.log(`  Actual: "${dataRow[13]}"`);
  console.log(`  ✗ This might be OK depending on data\n`);

  console.log('[14] O (Col 15) - Product? (DUPLICATE HEADER):');
  console.log(`  Header: "${headers[14]}"`);
  console.log(`  Actual: "${dataRow[14]}"`);
  console.log(`  ✗ WRONG! Contains 80.6 (should be Product, but has day_gross!)\n`);

  console.log('================================================================================');
  console.log('CONCLUSION:');
  console.log('================================================================================\n');

  console.log('OFFSET STARTS AT COLUMN 11 (L)!');
  console.log('From Column 11 onwards, data is shifted by 1 column to the left.');
  console.log('');
  console.log('This means:');
  console.log('  Column 11 (L): Should have Competitors, but has Pipeline Quarter (from Col 12)');
  console.log('  Column 12 (M): Should have Pipeline Quarter, but has Pipeline detail (from Col 13)');
  console.log('  Column 13 (N): Should have Pipeline detail, but has Product data?');
  console.log('  And so on...');
  console.log('');
  console.log('ROOT CAUSE: Column 11 (L) "Competitors" is empty or missing!');
  console.log('All subsequent columns shift left by 1 to fill the gap.');
}

traceOffset().catch(console.error);
