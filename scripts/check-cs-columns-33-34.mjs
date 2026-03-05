import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkCSColumns() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_CS!AH2:AI10',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values;

  console.log('CS Sheet - Columns AH-AI (33-34):\n');
  console.log('Row 2 (Headers):');
  console.log(`  AH (33): "${rows[0][0]}"`);
  console.log(`  AI (34): "${rows[0][1]}"`);

  console.log('\nRow 3-10 (Data):');
  for (let i = 1; i < Math.min(10, rows.length); i++) {
    const val33 = rows[i][0] ?? '(empty)';
    const val34 = rows[i][1] ?? '(empty)';
    console.log(`  Row ${i + 2}: AH="${val33}", AI="${val34}"`);
  }

  console.log('\n================================================================================');
  console.log('QUESTION: What data is actually in these columns?');
  console.log('================================================================================\n');

  // Check if data looks like dates or status symbols
  const hasDates = rows.slice(1).some(row => row[0] && row[0].match(/^\d{5}$/)); // Excel dates are numbers like 46023
  const hasStatus = rows.slice(1).some(row => row[0] && row[0].includes('【'));

  console.log('Column 33 (AH) contains:');
  console.log(`  - Date values: ${hasDates ? 'YES' : 'NO'}`);
  console.log(`  - Status symbols: ${hasStatus ? 'YES' : 'NO'}`);
}

checkCSColumns().catch(console.error);
