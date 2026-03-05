import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkCSStructure() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_CS';

  console.log(`Fetching CS sheet structure...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:AZ20`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];
  const headers = rows[0];

  console.log('================================================================================');
  console.log('CS SHEET - Columns 14-21 (N-U)');
  console.log('================================================================================\n');

  console.log('HEADERS:');
  for (let i = 14; i < Math.min(22, headers.length); i++) {
    const colLetter = String.fromCharCode(65 + (i % 26));
    console.log(`Column ${i} (${colLetter}): "${headers[i]}"`);
  }

  console.log('\nDATA ROWS 3-10:');
  console.log('Row | 14(N)   | 15(O)   | 16(P)   | 17(Q)  | 18(R) | 19(S) | 20(T)  | 21(U)');
  console.log('---|---------|---------|---------|---------|--------|--------|---------|--------');

  for (let i = 2; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    console.log(
      `${String(i + 2).padStart(3)} | ` +
      `${(row[14] ?? 'NULL').toString().padEnd(7)} | ` +
      `${(row[15] ?? 'NULL').toString().padEnd(7)} | ` +
      `${(row[16] ?? 'NULL').toString().padEnd(7)} | ` +
      `${(row[17] ?? 'NULL').toString().padEnd(7)} | ` +
      `${(row[18] ?? 'NULL').toString().padEnd(6)} | ` +
      `${(row[19] ?? 'NULL').toString().padEnd(6)} | ` +
      `${(row[20] ?? 'NULL').toString().padEnd(7)} | ` +
      `${(row[21] ?? 'NULL').toString().padEnd(7)}`
    );
  }

  console.log('\n================================================================================');
  console.log('ANALYSIS:');
  console.log('================================================================================\n');

  // Find key columns by values
  console.log('Looking for IMP (large numbers > 1M):');
  for (let i = 14; i < Math.min(22, headers.length); i++) {
    let count = 0;
    for (let r = 2; r < rows.length; r++) {
      const val = rows[r][i];
      if (val && typeof val === 'number' && val > 1000000) count++;
    }
    if (count > 0) {
      console.log(`  Column ${i}: ${count} rows > 1M (Header: "${headers[i]}")`);
    }
  }

  console.log('\nLooking for eCPM (100-10000):');
  for (let i = 14; i < Math.min(22, headers.length); i++) {
    let count = 0;
    for (let r = 2; r < rows.length; r++) {
      const val = rows[r][i];
      if (val && typeof val === 'number' && val >= 100 && val <= 10000) count++;
    }
    if (count > 0) {
      console.log(`  Column ${i}: ${count} rows in eCPM range (Header: "${headers[i]}")`);
    }
  }

  console.log('\nLooking for day_gross (1-10000):');
  for (let i = 14; i < Math.min(22, headers.length); i++) {
    let count = 0;
    let sample = 0;
    for (let r = 2; r < Math.min(7, rows.length); r++) {
      const val = rows[r][i];
      if (val && typeof val === 'number' && val > 1 && val < 10000) {
        count++;
        if (sample === 0) sample = val;
      }
    }
    if (count > 0) {
      console.log(`  Column ${i}: ${count} rows in day_gross range (Header: "${headers[i]}", Sample: ${sample})`);
    }
  }
}

checkCSStructure().catch(console.error);
