import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkRow21() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Row 21 = A21:AX21
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A21:AX21',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values[0];

  console.log('GOOGLE SHEET ROW 21:\n');
  console.log('A (0): key =', row[0]);
  console.log('E (4): MA/MI =', row[4]);
  console.log('F (5): PID =', row[5]);
  console.log('G (6): Publisher =', row[6]);
  console.log('P (15): day_gross =', row[15]);
  console.log('Q (16): day_net_rev =', row[16]);
  console.log('R (17): imp =', row[17]);
  console.log('S (18): ecpm =', row[18]);
  console.log('T (19): max_gross =', row[19]);
  console.log('');
  console.log('DATABASE (row 21):');
  console.log('publisher: 38407');
  console.log('day_gross: 0.00');
  console.log('imp: 1');
}

checkRow21().catch(console.error);
