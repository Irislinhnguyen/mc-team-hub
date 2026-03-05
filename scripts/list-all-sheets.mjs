import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function listAllSheets() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM'
  });

  console.log('ALL SHEETS IN SPREADSHEET:\n');
  response.data.sheets.forEach((sheet, index) => {
    const title = sheet.properties.title;
    const index2 = sheet.properties.index;
    const rowCount = sheet.properties.gridProperties.rowCount;
    const colCount = sheet.properties.gridProperties.columnCount;
    console.log(`${index + 1}. [${index2}] "${title}" (${rowCount} rows x ${colCount} cols)`);
  });
}

listAllSheets().catch(console.error);
