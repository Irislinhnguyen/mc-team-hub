import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkColumnsSTR() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching Columns S, T, U, V from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!S2:V20`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('================================================================================');
  console.log('HEADERS (Row 2):');
  console.log('================================================================================\n');

  for (let i = 0; i < rows[0].length; i++) {
    const colLetter = String.fromCharCode(83 + i); // S=83, T=84, etc.
    console.log(`Column ${colLetter}: "${rows[0][i]}"`);
  }

  console.log('\n================================================================================');
  console.log('DATA (Rows 3-10):');
  console.log('================================================================================\n');

  console.log('Row | S (IMP?)   | T (eCPM?) | U (Max Gross?) | V (R/S?)');
  console.log('---|------------|-----------|----------------|------------');

  for (let i = 1; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    const sVal = row[0] || 'NULL';
    const tVal = row[1] || 'NULL';
    const uVal = row[2] || 'NULL';
    const vVal = row[3] || 'NULL';

    console.log(
      `${String(i + 2).padStart(3)} | ${String(sVal).padEnd(10)} | ${String(tVal).padEnd(9)} | ${String(uVal).padEnd(14)} | ${vVal}`
    );
  }

  console.log('\n================================================================================');
  console.log('ANALYSIS:');
  console.log('================================================================================\n');

  // What SHOULD these columns contain based on headers?
  console.log('Based on headers:');
  console.log('  S should be: IMP (30days)');
  console.log('  T should be: eCPM');
  console.log('  U should be: Max Gross');
  console.log('  V should be: R/S (revenue_share)');
  console.log('');

  // What do they ACTUALLY contain?
  console.log('Actually contains:');
  console.log('  S: 0.06, 0.09, 10 (looks like revenue_share %)');
  console.log('  T: 2418, 120, 2178 (looks like eCPM or Max Gross)');
  console.log('  U: 0.2, 0.2, 0.1 (looks like revenue_share %)');
  console.log('  V: empty');
}

checkColumnsSTR().catch(console.error);
