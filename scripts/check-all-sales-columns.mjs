import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkAllColumns() {
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';
  const credentials = JSON.parse(readFileSync(credentialsPath, 'utf-8'));

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`Fetching ALL columns from ${sheetName}...\n`);

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A2:BZ5`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];
  const headers = rows[0];

  console.log('================================================================================');
  console.log('ALL HEADERS (Row 2) - COMPLETE VIEW:');
  console.log('================================================================================\n');

  for (let i = 0; i < headers.length; i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    const header = headers[i] || '(empty)';
    const data3 = rows[1]?.[i] ?? '(empty)';
    const data4 = rows[2]?.[i] ?? '(empty)';

    console.log(`[${String(i).padStart(3)}] ${colLetter.padStart(3)}: "${header}"`);
    console.log(`         Row3: ${String(data3).substring(0, 50)}`);
    console.log(`         Row4: ${String(data4).substring(0, 50)}`);
    console.log('');
  }

  console.log('================================================================================');
  console.log('SUMMARY - KEY FINDINGS:');
  console.log('================================================================================\n');

  // Find empty columns
  const emptyCols = [];
  for (let i = 0; i < headers.length; i++) {
    const hasData = rows.some(row => row[i] !== undefined && row[i] !== '');
    if (!hasData) {
      emptyCols.push(i);
    }
  }

  if (emptyCols.length > 0) {
    console.log(`Empty columns found: ${emptyCols.map(i => {
      let colLetter = '';
      let temp = i;
      do {
        colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
        temp = Math.floor(temp / 26) - 1;
      } while (temp >= 0);
      return `${colLetter}(${i})`;
    }).join(', ')}\n`);
  }

  // Check for duplicate headers
  const headerCounts = {};
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (header) {
      headerCounts[header] = (headerCounts[header] || 0) + 1;
    }
  }

  const duplicates = Object.entries(headerCounts).filter(([h, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log('Duplicate headers found:');
    duplicates.forEach(([header, count]) => {
      console.log(`  "${header}": appears ${count} times`);
    });
    console.log('');
  }
}

checkAllColumns().catch(console.error);
