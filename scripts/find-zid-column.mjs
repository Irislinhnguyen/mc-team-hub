import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function findZIDColumn() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log('Searching for ZID column...\n');

  // Fetch columns 28-45
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!AC2:AS5`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('Headers (Row 2):');
  for (let i = 0; i < rows[0].length; i++) {
    const colLetter = String.fromCharCode(65 + (29 + i)); // AC=29
    const header = rows[0][i];
    console.log(`  ${colLetter} (${29 + i}): "${header}"`);

    if (header && header.toLowerCase().includes('zid')) {
      console.log(`    ^^^ FOUND ZID!`);
    }
  }

  console.log('\nData (Row 3) - looking for non-empty values:');
  for (let i = 0; i < Math.min(rows[1].length, rows[0].length); i++) {
    const colLetter = String.fromCharCode(65 + (29 + i));
    const header = rows[0][i];
    const value = rows[1][i];

    if (value !== undefined && value !== '') {
      console.log(`  ${colLetter} (${29 + i}) "${header}": ${value}`);
    }
  }
}

findZIDColumn().catch(console.error);
