import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function compareHeaders() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';

  console.log('================================================================================');
  console.log('COMPARING CS vs SALES SHEET HEADERS');
  console.log('================================================================================\n');

  // CS Sheet: Columns 9, 33, 34
  console.log('CS SHEET - Columns that Sales does NOT have:\n');

  const csResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_CS!J2:AI2',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const csHeaders = csResponse.data.values[0];

  console.log('Column 9 (J): ZID');
  console.log(`  Header: "${csHeaders[0]}"`);

  console.log('\nColumn 33 (AH): ready_to_deliver_date');
  console.log(`  Header: "${csHeaders[24]}"`);

  console.log('\nColumn 34 (AI): closed_date');
  console.log(`  Header: "${csHeaders[25]}"`);

  // Sales Sheet: Columns 5, 11, 35
  console.log('\n================================================================================');
  console.log('SALES SHEET - Columns that CS does NOT have:\n');

  const salesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!F2:AJ2',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const salesHeaders = salesResponse.data.values[0];

  console.log('Column 5 (F): PID');
  console.log(`  Header: "${salesHeaders[0]}"`);

  console.log('\nColumn 11 (L): Region');
  console.log(`  Header: "${salesHeaders[6]}"`);

  console.log('\nColumn 35 (AJ): c_plus_upgrade');
  console.log(`  Header: "${salesHeaders[30]}"`);

  console.log('\n================================================================================');
  console.log('ALSO CHECK: Sales column 34 (AI) - what is this now?');
  console.log('================================================================================\n');

  console.log('Column 34 (AI):');
  console.log(`  Header: "${salesHeaders[29]}"`);
  console.log('  (This was ZID before, but now it\'s "【Z】")');

  console.log('\n================================================================================');
  console.log('SUMMARY: Column Differences');
  console.log('================================================================================\n');

  console.log('CS EXCLUSIVE:');
  console.log('  - Column 9 (J): ZID');
  console.log('  - Column 33 (AH): ready_to_deliver_date');
  console.log('  - Column 34 (AI): closed_date');

  console.log('\nSALES EXCLUSIVE:');
  console.log('  - Column 5 (F): PID');
  console.log('  - Column 11 (L): Region');
  console.log('  - Column 35 (AJ): C+↑ (c_plus_upgrade)');

  console.log('\nIMPORTANT: Sales column 34 (AI) changed from "ZID" to "【Z】"');
  console.log('This is why we set pipeline.zid = null for Sales now.');
}

compareHeaders().catch(console.error);
