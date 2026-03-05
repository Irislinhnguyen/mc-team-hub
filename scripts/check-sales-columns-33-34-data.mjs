import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkSalesColumnsData() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!AH2:AI20',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values;

  console.log('Sales Sheet - Columns AH-AI (33-34) DATA:\n');
  console.log('Row 2 (Headers):');
  console.log(`  AH (33): "${rows[0][0]}"`);
  console.log(`  AI (34): "${rows[0][1]}"`);

  console.log('\nRow 3-20 (Data):');
  console.log('Row  | AH (33) - 【A】     | AI (34) - 【Z】');
  console.log('-----|---------------------|---------------------');

  for (let i = 1; i < Math.min(20, rows.length); i++) {
    const val33 = rows[i][0] !== undefined ? String(rows[i][0]) : '(empty)';
    const val34 = rows[i][1] !== undefined ? String(rows[i][1]) : '(empty)';

    // Truncate long values
    const display33 = val33.length > 20 ? val33.substring(0, 20) + '...' : val33;
    const display34 = val34.length > 20 ? val34.substring(0, 20) + '...': val34;

    console.log(`${String(i + 2).padStart(4)} | ${display33.padEnd(20)} | ${display34}`);
  }

  console.log('\n================================================================================');
  console.log('ANALYSIS:');
  console.log('================================================================================\n');

  // Check if any non-empty values
  const hasData33 = rows.slice(1).some(row => row[0] !== undefined && row[0] !== '');
  const hasData34 = rows.slice(1).some(row => row[1] !== undefined && row[1] !== '');

  console.log(`Column 33 (AH) has data: ${hasData33 ? 'YES' : 'NO (all empty)'}`);
  console.log(`Column 34 (AI) has data: ${hasData34 ? 'YES' : 'NO (all empty)'}`);

  if (!hasData33 && !hasData34) {
    console.log('\n→ Sales có columns 33-34 nhưng KHÔNG CÓ DATA');
    console.log('→ Không nên sync vào database');
  } else {
    console.log('\n→ Sales có data trong columns 33-34');
    console.log('→ Nên map vào ready_to_deliver_date, closed_date như CS');
  }
}

checkSalesColumnsData().catch(console.error);
