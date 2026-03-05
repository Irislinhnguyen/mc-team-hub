import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkFormulas() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching FORMULAS from ${sheetName}...\n`);

  // Use get with valueRenderOption='FORMULA' to see formulas
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!Q2:R20`,
    valueRenderOption: 'FORMULA'
  });

  const rows = response.data.values || [];

  console.log('================================================================================');
  console.log('FORMULAS IN SALES SHEET - Columns Q (day gross) & R (day net rev)');
  console.log('================================================================================\n');

  console.log('Row 2 (Headers):');
  console.log(`  Q: "${rows[0][0]}"`);
  console.log(`  R: "${rows[0][1]}"`);

  console.log('\nRow 3 Formula:');
  console.log(`  Q: ${rows[1][0]}`);
  console.log(`  R: ${rows[1][1]}`);

  console.log('\nRow 4 Formula:');
  console.log(`  Q: ${rows[2][0]}`);
  console.log(`  R: ${rows[2][1]}`);

  console.log('\nRow 5 Formula:');
  console.log(`  Q: ${rows[3][0]}`);
  console.log(`  R: ${rows[3][1]}`);

  // Also get the VALUES for comparison
  const valuesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!Q2:R20`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const values = valuesResponse.data.values || [];

  console.log('\n================================================================================');
  console.log('FORMULAS VS VALUES (First 5 data rows)');
  console.log('================================================================================\n');

  console.log('Row | Q Formula                                | Q Value  | R Formula                           | R Value');
  console.log('---|------------------------------------------|----------|-------------------------------------|---------');

  for (let i = 1; i < Math.min(6, rows.length); i++) {
    const qFormula = rows[i][0] || '(empty)';
    const qValue = values[i][0] || '(empty)';
    const rFormula = rows[i][1] || '(empty)';
    const rValue = values[i][1] || '(empty)';

    const qShort = qFormula.length > 40 ? qFormula.substring(0, 37) + '...' : qFormula;
    const rShort = rFormula.length > 40 ? rFormula.substring(0, 37) + '...' : rFormula;

    console.log(
      `${String(i + 2).padStart(3)} | ${qShort.padEnd(40)} | ${String(qValue).padEnd(8)} | ${String(rShort).padEnd(35)} | ${rValue}`
    );
  }
}

checkFormulas().catch(console.error);
