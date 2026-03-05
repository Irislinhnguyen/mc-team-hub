import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkMasterSheet() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Check "master" sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'master!A1:S20',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('MASTER SHEET (first 20 rows):\n');
  if (rows.length > 0) {
    // Print header
    console.log('HEADER:', rows[0].join(' | '));
    console.log('');

    // Print first 5 data rows
    for (let i = 1; i < Math.min(6, rows.length); i++) {
      console.log(`Row ${i}:`, rows[i].join(' | '));
    }
  }
}

checkMasterSheet().catch(console.error);
