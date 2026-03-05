import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkSalesColumns() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!K2:N5',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values;

  console.log('Sales Sheet - Columns K through N:\n');

  console.log('Row 2 (Headers):');
  console.log(`  K (10): "${rows[0][0]}"`);
  console.log(`  L (11): "${rows[0][1]}"`);
  console.log(`  M (12): "${rows[0][2]}"`);
  console.log(`  N (13): "${rows[0][3]}"`);

  console.log('\nRow 3 (Data):');
  console.log(`  K (10): ${rows[1][0] ?? '(empty)'}`);
  console.log(`  L (11): ${rows[1][1] ?? '(empty)'}`);
  console.log(`  M (12): ${rows[1][2] ?? '(empty)'}`);
  console.log(`  N (13): ${rows[1][3] ?? '(empty)'}`);

  console.log('\n================================================================================');
  console.log('QUESTION: Where is "Region" column in Sales?');
  console.log('================================================================================\n');

  // Search for "Region" in all headers
  const allHeaders = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!A2:BZ2',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const headers = allHeaders.data.values[0];

  for (let i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toLowerCase().includes('region')) {
      let colLetter = '';
      let temp = i;
      do {
        colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
        temp = Math.floor(temp / 26) - 1;
      } while (temp >= 0);

      console.log(`Found "Region" at column ${i} (${colLetter}): "${headers[i]}"`);
    }
  }

  if (!headers.some(h => h && h.toLowerCase().includes('region'))) {
    console.log('❌ "Region" column NOT FOUND in Sales sheet!');
  }
}

checkSalesColumns().catch(console.error);
