import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkSalesColumns() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentialsJson = readFileSync(credentialsPath, 'utf-8');
  const credentials = JSON.parse(credentialsJson);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  
  // Fetch columns 35-55 (AJ to BG)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!AJ1:BG3',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('\n========================================');
  console.log('SALES SHEET - COLUMNS 35-55 (Quarterly Breakdown Area)');
  console.log('========================================\n');

  rows.forEach((row, i) => {
    console.log(`Row ${i + 1}:`);
    row.forEach((header, j) => {
      const colIndex = 35 + j;
      console.log(`  Col ${colIndex}: "${header}"`);
    });
    console.log('');
  });
}

checkSalesColumns().catch(console.error);
