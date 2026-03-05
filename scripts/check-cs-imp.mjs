import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkCSIMP() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_CS';

  console.log(`Fetching data from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:AZ20`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('========================================');
  console.log('CS SHEET - Looking for IMP column');
  console.log('========================================\n');

  // Find IMP column in first few rows
  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i];
    const impIndex = row.findIndex(cell =>
      cell && typeof cell === 'string' && cell.toUpperCase().includes('IMP')
    );

    if (impIndex !== -1) {
      console.log(`Found "IMP" in Row ${i + 1}, Column ${impIndex}:`);
      console.log(`  Header: "${row[impIndex]}"`);
      console.log(`  Next 5 headers in same row:`);

      for (let j = Math.max(0, impIndex - 1); j < Math.min(impIndex + 5, row.length); j++) {
        const colLetter = String.fromCharCode(65 + (j % 26));
        console.log(`    Column ${j} (${colLetter}): "${row[j]}"`);
      }

      // Show data from this column in next few rows
      console.log(`\n  Data values from Column ${impIndex} (next 10 rows):`);
      for (let k = i + 1; k < Math.min(i + 11, rows.length); k++) {
        const value = rows[k][impIndex];
        console.log(`    Row ${k + 1}: ${value ?? 'NULL'}`);
      }

      break;
    }
  }
}

checkCSIMP().catch(console.error);
