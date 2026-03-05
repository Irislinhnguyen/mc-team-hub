import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function fetchSalesSheet() {
  // Load service account from file
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';

  let credentials;
  try {
    const credentialsJson = readFileSync(credentialsPath, 'utf-8');
    credentials = JSON.parse(credentialsJson);
  } catch (err) {
    console.error(`Failed to load service account from ${credentialsPath}:`, err.message);
    process.exit(1);
  }

  console.log('Using service account:', credentials.client_email);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`\nFetching headers from ${sheetName}...`);

  // Fetch header rows (first 5 rows to see headers and some data)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:AI5`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('\n========================================');
  console.log('SEA_SALES SHEET HEADERS (First 5 rows)');
  console.log('========================================\n');

  rows.forEach((row, i) => {
    console.log(`Row ${i + 1}:`);
    console.log(JSON.stringify(row));
    console.log('');
  });

  // Print column index mapping
  console.log('\n========================================');
  console.log('COLUMN INDEX MAPPING (A=0, B=1, ...)');
  console.log('========================================\n');

  if (rows.length > 0) {
    const headers = rows[0];
    headers.forEach((header, i) => {
      const colLetter = String.fromCharCode(65 + (i >= 26 ? i - 26 : i)); // A, B, C...
      console.log(`${colLetter} (col ${i}): "${header}"`);
    });
  }
}

fetchSalesSheet().catch(console.error);
