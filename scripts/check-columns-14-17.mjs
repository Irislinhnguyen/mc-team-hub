import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkColumns14to17() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching Columns N-S (14-18) from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!N2:S20`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('================================================================================');
  console.log('HEADERS (Row 2):');
  console.log('================================================================================\n');

  for (let i = 0; i < rows[0].length; i++) {
    const colLetter = String.fromCharCode(78 + i); // N=78
    console.log(`Column ${i + 14} (${colLetter}): "${rows[0][i]}"`);
  }

  console.log('\n================================================================================');
  console.log('DATA (Rows 3-10):');
  console.log('================================================================================\n');

  console.log('Row | 14(N)        | 15(O/P)     | 16(P/Q)    | 17(Q/R)    | 18(R/S)');
  console.log('---|--------------|-------------|------------|------------|------------');

  for (let i = 1; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    console.log(
      `${String(i + 2).padStart(3)} | ` +
      `${String(row[0] ?? 'NULL').padEnd(12)} | ` +
      `${String(row[1] ?? 'NULL').padEnd(11)} | ` +
      `${String(row[2] ?? 'NULL').padEnd(10)} | ` +
      `${String(row[3] ?? 'NULL').padEnd(10)} | ` +
      `${String(row[4] ?? 'NULL')}`
    );
  }

  console.log('\n================================================================================');
  console.log('ANALYSIS - What each column actually contains:');
  console.log('================================================================================\n');

  console.log('Column 14 (N): "Pipeline detail"');
  console.log('  Values: Video ad sticky, Video / Wipe, Banner');

  console.log('\nColumn 15 (O/P): "Product"');
  console.log('  Values: 80.6, 4, 72.6, 61.8');
  console.log('  ⚠️  This looks like day_gross, not Product!');
  console.log('  ⚠️  Header says "Product" but data is wrong!');

  console.log('\nColumn 16 (P/Q): Should be "day gross"');
  console.log('  Values: 16.12, 0.8, 14.52');
  console.log('  ⚠️  This looks like day_net_rev, not day_gross!');

  console.log('\nColumn 17 (Q/R): Should be "day net rev"');
  console.log('  Values: 40300000, 2000000, 36300000');
  console.log('  ⚠️  This looks like IMP, not day_net_rev!');

  console.log('\nColumn 18 (R/S): "IMP (30days)"');
  console.log('  Values: 0.06, 0.06, 0.09, 10');
  console.log('  ⚠️  This looks like revenue_share %, not IMP!');
}

checkColumns14to17().catch(console.error);
