import fs from 'fs';

async function parseCSVCorrect() {
  const csvContent = fs.readFileSync('d:\\Downloads\\[Weekly]  4Q 2025  GAP FILL SHEET_SEA - SEA_Sales.csv', 'utf-8');
  const lines = csvContent.split('\n');

  console.log('CSV Structure Analysis:\n');
  console.log('CSV Line 0 = Google Sheet Row 1 (Title row with merged cells)');
  console.log('CSV Line 1 = Google Sheet Row 2 (ACTUAL HEADERS) ← Parse this');
  console.log('CSV Line 7+ = Google Sheet Row 3 (First data row)\n');

  // Parse CSV Line 1 - This is Google Sheet Row 2 (HEADERS)
  const headerLine = lines[1];
  const headers = headerLine.split(',');

  console.log('================================================================================');
  console.log(`GOOGLE SHEET ROW 2 - HEADERS (${headers.length} columns found)`);
  console.log('================================================================================\n');

  for (let i = 0; i < Math.min(headers.length, 60); i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    let header = headers[i] || '';
    header = header.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim();
    if (header.length > 40) header = header.substring(0, 40) + '...';

    console.log(`[${String(i).padStart(2)}] ${colLetter.padStart(3)}: "${header}"`);
  }

  // Find data row (CSV Line 7-8 = Google Sheet Row 3)
  console.log('\n================================================================================');
  console.log('GOOGLE SHEET ROW 3 - FIRST DATA ROW');
  console.log('================================================================================\n');

  let dataLine = null;
  let dataLineIndex = 0;
  for (let i = 7; i < Math.min(15, lines.length); i++) {
    if (lines[i].includes('Febri') || lines[i].includes('Safitri')) {
      dataLine = lines[i];
      dataLineIndex = i;
      break;
    }
  }

  if (dataLine) {
    const dataCols = dataLine.split(',');

    console.log(`Found data at CSV Line ${dataLineIndex + 1}\n`);
    console.log('Key columns (first 35):\n');
    for (let i = 0; i < Math.min(35, dataCols.length); i++) {
      let colLetter = '';
      let temp = i;
      do {
        colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
        temp = Math.floor(temp / 26) - 1;
      } while (temp >= 0);

      const value = dataCols[i]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim() || '(empty)';
      const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;

      // Show header + data
      const header = headers[i]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim().substring(0, 20);
      console.log(`[${String(i).padStart(2)}] ${colLetter.padStart(3)} "${header}": ${displayValue}`);
    }

    // Verify critical columns
    console.log('\n================================================================================');
    console.log('CRITICAL COLUMNS VERIFICATION:');
    console.log('================================================================================\n');

    const critical = [
      { index: 15, name: 'day gross', codeMaps: 'day_gross at 16' },
      { index: 16, name: 'day net rev', codeMaps: 'day_net_rev at 17' },
      { index: 17, name: 'IMP (30days)', codeMaps: 'imp at 18' },
      { index: 18, name: 'eCPM', codeMaps: 'ecpm at 19' },
      { index: 27, name: 'Starting Date', codeMaps: 'starting_date at 31' },
      { index: 28, name: 'Status', codeMaps: 'status at 28' },
      { index: 30, name: 'Date of first proposal', codeMaps: 'proposal_date at 30' }
    ];

    for (const col of critical) {
      const header = headers[col.index]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim() || '(empty)';
      const value = dataCols[col.index]?.replace(/^"|"$/g, '').replace(/\\n/g, ' ').trim() || '(empty)';

      console.log(`[${col.index}] "${header}"`);
      console.log(`  Data: ${value}`);
      console.log(`  Code maps: ${col.codeMaps}`);

      // Check if code mapping matches
      const codeIndex = parseInt(col.codeMaps.split(' at ')[1]);
      if (codeIndex === col.index) {
        console.log(`  ✓ CODE MAPPING IS CORRECT`);
      } else {
        console.log(`  ✗ CODE MAPPING IS WRONG (should be ${col.index}, not ${codeIndex})`);
      }
      console.log('');
    }
  }
}

parseCSVCorrect().catch(console.error);
