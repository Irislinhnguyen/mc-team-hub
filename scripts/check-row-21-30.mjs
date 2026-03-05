import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkRows() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';

  console.log('================================================================================');
  console.log('CHECKING ROWS 21, 28, 29, 30 IN SALES SHEET - Columns A-O (0-14)');
  console.log('================================================================================\n');

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!A21:O30',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  const checkRows = [0, 7, 8, 9]; // Row offsets: 21, 28, 29, 30 (0-indexed: 0, 7, 8, 9)

  for (const offset of checkRows) {
    const actualRow = 21 + offset;
    const row = rows[offset];
    if (!row) continue;

    console.log(`\n--- ROW ${actualRow} ---`);
    console.log(`A (0)  Key:        "${row[0] || '(empty)'}"`);
    console.log(`B (1)  Class:      "${row[1] || '(empty)'}"`);
    console.log(`C (2)  AM:         "${row[2] || '(empty)'}"`);
    console.log(`D (3)  Team:       "${row[3] || '(empty)'}"`);
    console.log(`E (4)  MA/MI:      "${row[4] || '(empty)'}"`);
    console.log(`F (5)  PID:        "${row[5] || '(empty)'}"`);
    console.log(`G (6)  Publisher:  "${row[6] || '(empty)'}"  <--- THIS IS THE PROBLEM!`);
    console.log(`H (7)  MID:        "${row[7] || '(empty)'}"`);
    console.log(`I (8)  Domain:     "${row[8] || '(empty)'}"`);
    console.log(`J (9)  ZID:        "${row[9] || '(empty)'}"`);
    console.log(`K (10) Channel:    "${row[10] || '(empty)'}"`);
    console.log(`L (11) Competitor: "${row[11] || '(empty)'}"`);
    console.log(`M (12) Pipeline Q: "${row[12] || '(empty)'}"`);
    console.log(`N (13) Detail:     "${row[13] || '(empty)'}"`);
    console.log(`O (14) Product:    "${row[14] || '(empty)'}"`);
  }
}

checkRows().catch(console.error);
