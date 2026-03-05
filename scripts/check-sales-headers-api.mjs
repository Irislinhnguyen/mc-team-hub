import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkSalesHeaders() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log('Fetching Sales sheet columns AH-AK (indexes 33-36)...\n');

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!AH2:AK5`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('Row 2 (Headers):');
  console.log(`  AH (33): "${rows[0][0]}"`);
  console.log(`  AI (34): "${rows[0][1]}"`);
  console.log(`  AJ (35): "${rows[0][2]}"`);
  console.log(`  AK (36): "${rows[0][3]}"`);

  console.log('\nRow 3 (Data):');
  console.log(`  AH (33): ${rows[1][0] ?? '(empty)'}`);
  console.log(`  AI (34): ${rows[1][1] ?? '(empty)'}`);
  console.log(`  AJ (35): ${rows[1][2] ?? '(empty)'}`);
  console.log(`  AK (36): ${rows[1][3] ?? '(empty)'}`);
}

checkSalesHeaders().catch(console.error);
