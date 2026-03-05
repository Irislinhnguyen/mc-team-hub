import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function searchZID() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A2:BZ3',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const headers = response.data.values[0];

  console.log('Searching for ZID in all headers...\n');

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header && header.toLowerCase().includes('zid')) {
      console.log(`✓ FOUND ZID at index ${i}`);
      console.log(`  Header: "${header}"`);

      // Also get data value
      const dataRow = response.data.values[1];
      if (dataRow && dataRow[i]) {
        console.log(`  Data (Row 3): "${dataRow[i]}"`);
      }
    }
  }

  console.log(`\nTotal columns searched: ${headers.length}`);
}

searchZID().catch(console.error);
