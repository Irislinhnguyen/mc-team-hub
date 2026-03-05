import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkSalesAllRows() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching first 30 rows from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:AZ30`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];
  const headers = rows[0];

  console.log('================================================================================');
  console.log('HEADERS (Row 2) - Columns 15-22');
  console.log('================================================================================\n');

  for (let i = 15; i < Math.min(23, headers.length); i++) {
    const colLetter = String.fromCharCode(65 + (i % 26));
    console.log(`Column ${i} (${colLetter}): "${headers[i]}"`);
  }

  console.log('\n================================================================================');
  console.log('DATA ROWS 3-12 - Columns 15-22 (O-V)');
  console.log('================================================================================');
  console.log('Row | 15(O)    | 16(Q)    | 17(R)    | 18(S)   | 19(T)  | 20(U) | 21(V)  | 22(W)');
  console.log('---|----------|----------|----------|----------|---------|--------|---------|--------');

  for (let i = 1; i < Math.min(12, rows.length); i++) {
    const row = rows[i];
    const col15 = row[15] !== undefined ? row[15].toString() : 'NULL';
    const col16 = row[16] !== undefined ? row[16].toString() : 'NULL';
    const col17 = row[17] !== undefined ? row[17].toString() : 'NULL';
    const col18 = row[18] !== undefined ? row[18].toString() : 'NULL';
    const col19 = row[19] !== undefined ? row[19].toString() : 'NULL';
    const col20 = row[20] !== undefined ? row[20].toString() : 'NULL';
    const col21 = row[21] !== undefined ? row[21].toString() : 'NULL';
    const col22 = row[22] !== undefined ? row[22].toString() : 'NULL';

    console.log(
      `${String(i + 2).padStart(3)} | ` +
      `${col15.padEnd(8)} | ` +
      `${col16.padEnd(8)} | ` +
      `${col17.padEnd(8)} | ` +
      `${col18.padEnd(8)} | ` +
      `${col19.padEnd(7)} | ` +
      `${col20.padEnd(6)} | ` +
      `${col21.padEnd(7)} | ` +
      `${col22.padEnd(6)}`
    );
  }

  console.log('\n================================================================================');
  console.log('ANALYSIS: What do these values represent?');
  console.log('================================================================================\n');

  // Count large numbers (> 1M) - likely IMP
  let col17Large = 0, col18Large = 0, col19Large = 0;
  let col17Total = 0, col18Total = 0, col19Total = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (row[17] && typeof row[17] === 'number' && row[17] > 1000000) col17Large++;
    if (row[17] !== undefined) col17Total++;

    if (row[18] && typeof row[18] === 'number' && row[18] > 1000000) col18Large++;
    if (row[18] !== undefined) col18Total++;

    if (row[19] && typeof row[19] === 'number' && row[19] > 1000000) col19Large++;
    if (row[19] !== undefined) col19Total++;
  }

  console.log(`Column 17 (R - "${headers[17]}"): ${col17Large}/${col17Total} rows have values > 1M`);
  console.log(`Column 18 (S - "${headers[18]}"): ${col18Large}/${col18Total} rows have values > 1M`);
  console.log(`Column 19 (T - "${headers[19]}"): ${col19Large}/${col19Total} rows have values > 1M`);

  // Count decimals (0-1) - likely revenue_share
  let col17Small = 0, col18Small = 0, col20Small = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    if (row[17] && typeof row[17] === 'number' && row[17] > 0 && row[17] < 1) col17Small++;
    if (row[18] && typeof row[18] === 'number' && row[18] > 0 && row[18] < 1) col18Small++;
    if (row[20] && typeof row[20] === 'number' && row[20] > 0 && row[20] < 1) col20Small++;
  }

  console.log(`\nColumn 17 (R): ${col17Small} rows have decimals (0-1)`);
  console.log(`Column 18 (S): ${col18Small} rows have decimals (0-1)`);
  console.log(`Column 20 (U): ${col20Small} rows have decimals (0-1)`);
}

checkSalesAllRows().catch(console.error);
