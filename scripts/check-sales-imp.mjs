import { google } from 'googleapis';
import { readFileSync } from 'fs';

async function checkSalesIMP() {
  // Load service account
  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || './service-account.json';

  let credentials;
  try {
    const credentialsJson = readFileSync(credentialsPath, 'utf-8');
    credentials = JSON.parse(credentialsJson);
  } catch (err) {
    console.error(`Failed to load service account from ${credentialsPath}:`, err.message);
    process.exit(1);
  }

  console.log('Using service account:', credentials.client_email);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
  });

  const sheets = google.sheets({ version: 'v4', auth });

  const spreadsheetId = '1LGZxn4_pJwsS5LDBgkHT6BDU0E3XQmTsjMnR3ziuYSM';
  const sheetName = 'SEA_Sales';

  console.log(`\nFetching data from ${sheetName}...`);

  // Fetch first 50 rows to check Column S (IMP)
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:AZ50`,
    valueRenderOption: 'UNFORMATTED_VALUE'
  });

  const rows = response.data.values || [];

  console.log('\n========================================');
  console.log('SEA_SALES - Column S (IMP) Check');
  console.log('========================================\n');

  // Print header row to find column indices
  const header = rows[0];
  console.log('Headers (first 25 columns):');
  console.log(JSON.stringify(header.slice(0, 25)));

  // Find column indices
  const colF = header.indexOf('Publisher'); // F
  const colQ = header.indexOf('day gross'); // Q
  const colR = header.indexOf('day net rev'); // R
  const colS = header.indexOf('IMP (30days)'); // S
  const colT = header.indexOf('eCPM'); // T

  console.log('\nColumn Indices:');
  console.log(`  F (Publisher): ${colF}`);
  console.log(`  Q (day gross): ${colQ}`);
  console.log(`  R (day net rev): ${colR}`);
  console.log(`  S (IMP): ${colS}`);
  console.log(`  T (eCPM): ${colT}`);

  console.log('\n========================================');
  console.log('First 15 data rows:');
  console.log('========================================\n');
  console.log('Row | Publisher (F)  | IMP (S) | eCPM (T) | day_gross (Q)');
  console.log('---|----------------|---------|----------|---------------');

  let impPositive = 0;
  let impZero = 0;
  let impEmpty = 0;

  for (let i = 1; i < Math.min(16, rows.length); i++) {
    const row = rows[i];
    const publisher = row[colF] || 'N/A';
    const imp = row[colS];
    const ecpm = row[colT];
    const dayGross = row[colQ];

    // Count stats
    if (imp === undefined || imp === null || imp === '') {
      impEmpty++;
    } else if (parseFloat(imp) > 0) {
      impPositive++;
    } else {
      impZero++;
    }

    console.log(`${String(i + 1).padStart(3)} | ${String(publisher).padEnd(14)} | ${String(imp ?? 'NULL').padEnd(7)} | ${String(ecpm ?? 'NULL').padEnd(8)} | ${dayGross ?? 'NULL'}`);
  }

  console.log('\n========================================');
  console.log('Summary (first 15 data rows):');
  console.log('========================================');
  console.log(`IMP > 0: ${impPositive}`);
  console.log(`IMP = 0: ${impZero}`);
  console.log(`IMP empty: ${impEmpty}`);

  // Check all rows if available
  if (rows.length > 15) {
    console.log(`\n(Showing first 15 of ${rows.length - 1} total data rows)`);
  }
}

checkSalesIMP().catch(console.error);
