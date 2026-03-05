import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkAllHeaders() {
  const credentials = JSON.parse(readFileSync('./service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';

  console.log('================================================================================');
  console.log('CS SHEET - ALL HEADERS (Row 2)');
  console.log('================================================================================\n');

  const csResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_CS!A2:BJ2',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const csHeaders = csResponse.data.values[0];

  for (let i = 0; i < csHeaders.length; i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    const header = csHeaders[i] || '(empty)';
    const displayHeader = header.length > 30 ? header.substring(0, 30) + '...' : header;
    console.log(`[${String(i).padStart(2)}] ${colLetter.padStart(3)}: "${displayHeader}"`);
  }

  console.log('\n\n');
  console.log('================================================================================');
  console.log('SALES SHEET - ALL HEADERS (Row 2)');
  console.log('================================================================================\n');

  const salesResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'SEA_Sales!A2:BJ2',
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const salesHeaders = salesResponse.data.values[0];

  for (let i = 0; i < salesHeaders.length; i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    const header = salesHeaders[i] || '(empty)';
    const displayHeader = header.length > 30 ? header.substring(0, 30) + '...' : header;
    console.log(`[${String(i).padStart(2)}] ${colLetter.padStart(3)}: "${displayHeader}"`);
  }

  console.log('\n\n');
  console.log('================================================================================');
  console.log('KEY DIFFERENCES - CS vs SALES');
  console.log('================================================================================\n');

  console.log('Column | CS Header              | Sales Header           | Same?');
  console.log('--------|------------------------|------------------------|-------');

  const maxLen = Math.max(csHeaders.length, salesHeaders.length);
  for (let i = 0; i < Math.min(50, maxLen); i++) {
    const csHeader = (csHeaders[i] || '(empty)').substring(0, 22);
    const salesHeader = (salesHeaders[i] || '(empty)').substring(0, 22);
    const same = csHeaders[i] === salesHeaders[i];
    const marker = same ? '✓' : '✗';

    console.log(`${String(i).padStart(6)} | ${csHeader.padEnd(22)} | ${salesHeader.padEnd(22)} | ${marker}`);
  }
}

checkAllHeaders().catch(console.error);
