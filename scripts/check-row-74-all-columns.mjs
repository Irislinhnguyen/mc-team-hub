import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkRow74() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Get columns A-AV (0-47)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A74:AV74',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values[0];

  console.log('ROW 74 - ALL COLUMNS:\n');

  const headers = [
    'A: key', 'B: classification', 'C: poc', 'D: team', 'E: ma_mi', 'F: pid',
    'G: publisher', 'H: mid', 'I: domain', 'J: zid', 'K: channel', 'L: competitors',
    'M: quarter', 'N: description', 'O: product', 'P: day_gross', 'Q: day_net_rev',
    'R: imp', 'S: ecpm', 'T: max_gross', 'U: revenue_share', 'V: action_date',
    'W: action_field1', 'X: next_action', 'Y: action_detail', 'Z: action_progress',
    'AA: update_target', 'AB: starting_date', 'AC: status', 'AD: progress_percent',
    'AE: proposal_date', 'AF: interested_date', 'AG: acceptance_date', 'AH: ready_to_deliver',
    'AI: closed_date', 'AJ: c_plus', 'AK: q_gross', 'AL: q_net_rev', 'AM: qb1',
    'AN: qb2', 'AO: qb3', 'AP: qb4', 'AQ: qb5', 'AR: qb6', 'AS: qb7', 'AT: qb8',
    'AU: qb9', 'AV: qb10'
  ];

  for (let i = 0; i < Math.min(row.length, headers.length); i++) {
    const value = row[i] !== undefined && row[i] !== '' ? row[i] : '(empty)';
    console.log(`${String(i).padStart(2, ' ')} ${headers[i].padEnd(20)} = ${value}`);
  }
}

checkRow74().catch(console.error);
