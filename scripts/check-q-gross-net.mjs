import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkQGrossNet() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';

  console.log('================================================================================');
  console.log('CHECKING Q GROSS & Q NET COLUMNS - Row 21');
  console.log('================================================================================\n');

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!AJ21:AL21',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values?.[0] || [];

  console.log('Headers (from earlier check):');
  console.log('  AJ (35): C+↑');
  console.log('  AK (36): GR (Q Gross)');
  console.log('  AL (37): NR (Q Net)');
  console.log('');

  console.log('Row 21 Data:');
  console.log(`  AJ (35) C+↑:        "${row[0] || '(empty)'}"`);
  console.log(`  AK (36) GR (Q G):  "${row[1] || '(empty)'}"`);
  console.log(`  AL (37) NR (Q N):  "${row[2] || '(empty)'}"`);
  console.log('');

  console.log('Array indexing (0-based from AJ):');
  console.log(`  row[0] = AJ (35)`);
  console.log(`  row[1] = AK (36) → should map to q_gross`);
  console.log(`  row[2] = AL (37) → should map to q_net_rev`);
  console.log('');

  console.log('But in code mapping:');
  console.log(`  row[36] should be AK if starting from column A`);
  console.log(`  row[37] should be AL if starting from column A`);
}

checkQGrossNet().catch(console.error);
