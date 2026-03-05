import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkProductColumn() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Checking Product columns in ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:AZ5`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];
  const headers = rows[0];

  console.log('================================================================================');
  console.log('FINDING ALL "Product" COLUMNS IN HEADERS (Row 2):');
  console.log('================================================================================\n');

  const productColumns = [];
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && header.toLowerCase().includes('product')) {
      const colLetter = String.fromCharCode(65 + (i % 26));
      productColumns.push({ index: i, letter: colLetter, header: header });
      console.log(`Column ${i} (${colLetter}): "${header}"`);
    }
  }

  console.log(`\nFound ${productColumns.length} Product columns\n`);

  console.log('================================================================================');
  console.log('DATA IN PRODUCT COLUMNS (Rows 3-10):');
  console.log('================================================================================\n');

  for (const col of productColumns) {
    console.log(`Column ${col.index} (${col.letter}): "${col.header}"`);
    console.log('  Row | Value');
    console.log('  ---| -------');
    for (let i = 1; i < Math.min(9, rows.length); i++) {
      const value = rows[i][col.index];
      console.log(`  ${String(i + 2).padStart(3)} | ${value !== undefined ? value : 'NULL'}`);
    }
    console.log('');
  }

  console.log('================================================================================');
  console.log('ANALYSIS:');
  console.log('================================================================================\n');

  if (productColumns.length >= 2) {
    console.log(`DUPLICATE DETECTED: ${productColumns.length} Product columns found!\n`);

    console.log('Product columns:');
    productColumns.forEach(col => {
      console.log(`  - Column ${col.index} (${col.letter}): "${col.header}"`);
    });

    console.log('\nWhich one should be used?');
    console.log('Check the data values above to determine the correct Product column.');
  } else {
    console.log(`Found ${productColumns.length} Product column(s).`);
  }
}

checkProductColumn().catch(console.error);
