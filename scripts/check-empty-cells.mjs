import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkEmptyCells() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';

  console.log('================================================================================');
  console.log('CHECKING IF GOOGLE SHEETS API SKIPS EMPTY CELLS');
  console.log('================================================================================\n');

  // Fetch row 28 with both options
  console.log('--- Fetching Row 28 with UNFORMATTED_VALUE ---');
  const response1 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!A28:O28',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row1 = response1.data.values?.[0] || [];
  console.log(`Array length: ${row1.length}`);
  console.log(`row[5] (F): "${row1[5]}"`);
  console.log(`row[6] (G): "${row1[6]}"`);
  console.log(`row[7] (H): "${row1[7]}"`);

  console.log('\n--- Fetching Row 28 with FORMATTED_VALUE ---');
  const response2 = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!A28:O28',
    valueRenderOption: 'FORMATTED_VALUE'
  });

  const row2 = response2.data.values?.[0] || [];
  console.log(`Array length: ${row2.length}`);
  console.log(`row[5] (F): "${row2[5]}"`);
  console.log(`row[6] (G): "${row2[6]}"`);
  console.log(`row[7] (H): "${row2[7]}"`);

  console.log('\n--- Conclusion ---');
  if (row1.length < row2.length || row1[6] === undefined) {
    console.log('⚠️  UNFORMATTED_VALUE skips empty cells - causes column shift!');
    console.log(`   Expected row[6] to be Column G, but got: "${row1[6]}"`);
    console.log(`   If row[6] is undefined/Column H, then empty Column G was skipped!`);
  } else {
    console.log('✅ Empty cells are preserved in array');
  }
}

checkEmptyCells().catch(console.error);
