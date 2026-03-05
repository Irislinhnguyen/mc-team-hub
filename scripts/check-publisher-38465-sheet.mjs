import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkPublisher38465() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Row 74 = A74:AX74 (columns 0-49)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM',
    range: 'SEA_Sales!A74:AX74',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const row = response.data.values[0];

  console.log('Google Sheet SEA_Sales - Row 74 (Publisher "38465"):\n');

  // Map columns based on COLUMN_MAPPING_SALES
  const mapping = {
    0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F', 6: 'G', 7: 'H', 8: 'I', 9: 'J',
    10: 'K', 11: 'L', 12: 'M', 13: 'N', 14: 'O', 15: 'P', 16: 'Q', 17: 'R', 18: 'S', 19: 'T',
    20: 'U', 21: 'V', 22: 'W', 23: 'X', 24: 'Y', 25: 'Z', 26: 'AA', 27: 'AB', 28: 'AC', 29: 'AD',
    30: 'AE', 31: 'AF', 32: 'AG', 33: 'AH', 34: 'AI', 35: 'AJ', 36: 'AK', 37: 'AL', 38: 'AM', 39: 'AN',
    40: 'AO', 41: 'AP', 42: 'AQ', 43: 'AR', 44: 'AS', 45: 'AT', 46: 'AU', 47: 'AV', 48: 'AW', 49: 'AX'
  };

  console.log('KEY FIELDS:\n');
  console.log(`A (0):  Publisher = "${row[0]}"`);
  console.log(`E (4):  MA/MI = "${row[4]}"`);
  console.log(`F (5):  PID = "${row[5]}"`);
  console.log(`J (9):  ZID = "${row[9]}"`);
  console.log(`P (15): day gross = ${row[15]}`);
  console.log(`Q (16): day net rev = ${row[16]}`);
  console.log(`R (17): IMP (30days) = ${row[17]}`);
  console.log(`S (18): eCPM = ${row[18]}`);
  console.log(`T (19): Max Gross = ${row[19]}`);
  console.log(`U (20): R/S (revenue_share) = ${row[20]}`);
  console.log(`AB (27): Starting Date = ${row[27]}`);
  console.log(`AC (28): Status = "${row[28]}"`);
  console.log(`AD (29): % (progress_percent) = ${row[29]}`);
  console.log(`AE (30): Date of first proposal = ${row[30]}`);
  console.log(`AH (33): 【A】 (ready_to_deliver_date) = ${row[33]}`);
  console.log(`AI (34): 【Z】 (closed_date) = ${row[34]}`);
  console.log(`AJ (35): C+↑ (c_plus_upgrade) = "${row[35]}"`);
  console.log(`AK (36): GR (q_gross) = ${row[36]}`);
  console.log(`AL (37): NR (q_net_rev) = ${row[37]}`);
  console.log(`AM (38): Q粗利 初月 = ${row[38]}`);

  console.log('\n========================================');
  console.log('COMPARISON WITH DATABASE:');
  console.log('========================================\n');

  console.log('Field              | Database          | Google Sheet');
  console.log('-------------------|-------------------|---------------------');
  console.log(`day_gross          | 0.00              | ${row[15] ?? '(empty)'}`);
  console.log(`day_net_rev        | null              | ${row[16] ?? '(empty)'}`);
  console.log(`imp                | 0                 | ${row[17] ?? '(empty)'}`);
  console.log(`ecpm               | 298.2023          | ${row[18] ?? '(empty)'}`);
  console.log(`max_gross          | 0.00              | ${row[19] ?? '(empty)'}`);
  console.log(`revenue_share      | null              | ${row[20] ?? '(empty)'}`);
  console.log(`starting_date      | 2026-01-23        | ${row[27] ?? '(empty)'}`);
  console.log(`proposal_date      | null              | ${row[30] ?? '(empty)'}`);
  console.log(`q_gross            | 0.00              | ${row[36] ?? '(empty)'}`);
  console.log(`q_net_rev          | 0.00              | ${row[37] ?? '(empty)'}`);
  console.log(`ready_to_deliver_date | null          | ${row[33] ?? '(empty)'}`);
  console.log(`closed_date        | null              | ${row[34] ?? '(empty)'}`);
  console.log(`c_plus_upgrade     | null              | ${row[35] ?? '(empty)'}`);
}

checkPublisher38465().catch(console.error);
