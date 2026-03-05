import fs from 'fs';

async function parseCSV() {
  const csvContent = fs.readFileSync('d:\\Downloads\\[Weekly]  4Q 2025  GAP FILL SHEET_SEA - SEA_Sales.csv', 'utf-8');

  // Split by lines
  const lines = csvContent.split('\n');

  // Line 1-7 are headers (multiline), Line 8 is first data row
  // Parse the header line (line 1, continues to 2-7 due to quoted newlines)
  const headerLine = lines[0];
  const headers = headerLine.split(',');

  console.log('================================================================================');
  console.log('HEADERS FROM CSV (Row 2 of Google Sheet):');
  console.log('================================================================================\n');

  for (let i = 0; i < Math.min(headers.length, 50); i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    // Clean up the header name (remove quotes, newlines)
    let header = headers[i] || '';
    header = header.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim();
    if (header.length > 50) header = header.substring(0, 50) + '...';

    console.log(`[${String(i).padStart(3)}] ${colLetter.padStart(3)}: "${header}"`);
  }

  // Also parse first data row to verify
  console.log('\n================================================================================');
  console.log('FIRST DATA ROW (Line 8 of CSV = Row 3 of Google Sheet):');
  console.log('================================================================================\n');

  // Find the data row (lines 7-8 contain first data, might be wrapped)
  let dataRow = null;
  for (let i = 7; i < Math.min(10, lines.length); i++) {
    const line = lines[i];
    if (line.includes('Febri') || line.includes('Safitri')) {
      // This is a data row
      const cols = line.split(',');
      console.log(`Found data at line ${i + 1}, parsing first 30 columns:\n`);
      for (let j = 0; j < Math.min(30, cols.length); j++) {
        let colLetter = '';
        let temp = j;
        do {
          colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
          temp = Math.floor(temp / 26) - 1;
        } while (temp >= 0);

        const value = cols[j]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim() || '(empty)';
        const displayValue = value.length > 40 ? value.substring(0, 40) + '...' : value;
        console.log(`  [${String(j).padStart(2)}] ${colLetter}: ${displayValue}`);
      }
      dataRow = cols;
      break;
    }
  }

  // Key columns to verify
  if (dataRow) {
    console.log('\n================================================================================');
    console.log('KEY COLUMNS VERIFICATION:');
    console.log('================================================================================\n');

    const checks = [
      { index: 15, name: 'day gross', expected: 'number like 81' },
      { index: 16, name: 'day net rev', expected: 'number like 16' },
      { index: 17, name: 'IMP (30days)', expected: 'large number like 40300000' },
      { index: 18, name: 'eCPM', expected: 'number like 0.06' },
      { index: 19, name: 'Max Gross', expected: 'number like 2418' },
      { index: 20, name: 'R/S', expected: 'percentage like 20%' },
      { index: 27, name: 'Starting Date', expected: 'date like 01/01/2026' },
      { index: 28, name: 'Status', expected: 'status like 【Z】' },
      { index: 30, name: 'Date of first proposal', expected: 'date or empty' }
    ];

    for (const check of checks) {
      const header = headers[check.index]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim() || '(empty)';
      const value = dataRow[check.index]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim() || '(empty)';

      console.log(`Column ${check.index}:`);
      console.log(`  Header: "${header}"`);
      console.log(`  Data: "${value}"`);
      console.log(`  Expected: ${check.expected}`);

      // Simple check
      let match = false;
      if (check.name === 'day gross' && value.includes('$') && !isNaN(parseInt(value.replace(/[^0-9]/g, '')))) {
        match = true;
      } else if (check.name === 'IMP (30days)' && value.includes('000,000')) {
        match = true;
      } else if (check.name === 'eCPM' && value.includes('0.06')) {
        match = true;
      } else if (check.name === 'R/S' && value.includes('%')) {
        match = true;
      } else if (check.name === 'Status' && value.includes('【')) {
        match = true;
      } else if (check.name === 'Starting Date' && value.includes('/')) {
        match = true;
      }

      console.log(`  ${match ? '✓' : '✗'} ${match ? 'MATCH' : 'CHECK NEEDED'}\n`);
    }
  }
}

parseCSV().catch(console.error);
