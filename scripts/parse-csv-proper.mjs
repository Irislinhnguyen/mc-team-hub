import fs from 'fs';

// Simple CSV parser that handles quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // Field separator
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  // Don't forget the last field
  result.push(current);

  return result;
}

async function parseCSVProper() {
  const csvContent = fs.readFileSync('d:\\Downloads\\[Weekly]  4Q 2025  GAP FILL SHEET_SEA - SEA_Sales.csv', 'utf-8');

  // Read the entire file and find the complete header row
  // Headers start at line 1 but continue through lines 2-7 due to quoted newlines

  console.log('Analyzing CSV file structure...\n');

  // First, let's manually extract the header row by finding where it ends
  // The header row contains all the quoted newlines
  let headerText = '';
  let headerEndIndex = 0;
  let quoteCount = 0;
  let inHeader = true;

  for (let i = 0; i < csvContent.length; i++) {
    const char = csvContent[i];

    if (inHeader) {
      headerText += char;
      if (char === '"') quoteCount++;

      // Check if we've closed all quotes and hit a newline
      if (quoteCount % 2 === 0 && char === '\n') {
        headerEndIndex = i + 1;
        inHeader = false;
      }
    }
  }

  // Parse the header
  const headers = parseCSVLine(headerText);

  console.log('================================================================================');
  console.log(`GOOGLE SHEET ROW 2 - HEADERS (${headers.length} columns)`);
  console.log('================================================================================\n');

  for (let i = 0; i < Math.min(headers.length, 60); i++) {
    let colLetter = '';
    let temp = i;
    do {
      colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
      temp = Math.floor(temp / 26) - 1;
    } while (temp >= 0);

    let header = headers[i] || '';
    header = header.replace(/\n/g, ' ').trim();
    if (header.length > 35) header = header.substring(0, 35) + '...';

    console.log(`[${String(i).padStart(2)}] ${colLetter.padStart(3)}: "${header}"`);
  }

  // Now find and parse the first data row
  const restOfFile = csvContent.substring(headerEndIndex);
  const lines = restOfFile.split('\n');

  // Find the first actual data row (contains "Febri" or "Safitri")
  let dataRow = null;
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    if (lines[i].includes('Febri') || lines[i].includes('Safitri')) {
      // Parse this line
      dataRow = parseCSVLine(lines[i]);
      break;
    }
  }

  if (dataRow) {
    console.log('\n================================================================================');
    console.log('GOOGLE SHEET ROW 3 - FIRST DATA ROW');
    console.log('================================================================================\n');

    console.log('Critical columns:\n');

    const showCols = [
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14,
      15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
      28, 29, 30, 31, 32, 33, 34, 35, 36, 37
    ];

    for (const i of showCols) {
      let colLetter = '';
      let temp = i;
      do {
        colLetter = String.fromCharCode(65 + (temp % 26)) + colLetter;
        temp = Math.floor(temp / 26) - 1;
      } while (temp >= 0);

      const header = headers[i]?.replace(/\n/g, ' ').trim().substring(0, 25) || '(empty)';
      const value = dataRow[i]?.replace(/\n/g, ' ').trim() || '(empty)';
      const displayValue = value.length > 25 ? value.substring(0, 25) + '...' : value;

      console.log(`[${String(i).padStart(2)}] ${colLetter.padStart(3)} "${header.padEnd(25)}" = ${displayValue}`);
    }

    // Verify mapping
    console.log('\n================================================================================');
    console.log('CODE MAPPING VERIFICATION (Revenue Columns):');
    console.log('================================================================================\n');

    const revenueCols = [
      { index: 15, codeMaps: 16, field: 'day_gross', expectedHeader: 'day gross' },
      { index: 16, codeMaps: 17, field: 'day_net_rev', expectedHeader: 'day net rev' },
      { index: 17, codeMaps: 18, field: 'imp', expectedHeader: 'IMP (30days)' },
      { index: 18, codeMaps: 19, field: 'ecpm', expectedHeader: 'eCPM' },
      { index: 19, codeMaps: 20, field: 'max_gross', expectedHeader: 'Max Gross' },
      { index: 20, codeMaps: 21, field: 'revenue_share', expectedHeader: 'R/S' }
    ];

    for (const col of revenueCols) {
      const header = headers[col.index]?.replace(/\n/g, ' ').trim() || '(empty)';
      const value = dataRow[col.index]?.replace(/\n/g, ' ').trim() || '(empty)';

      console.log(`Column ${col.index}:`);
      console.log(`  Header: "${header}"`);
      console.log(`  Expected: "${col.expectedHeader}"`);
      console.log(`  Data: ${value}`);
      console.log(`  Code maps: field '${col.field}' to index ${col.codeMaps}`);

      if (col.codeMaps === col.index) {
        console.log(`  ✓ CODE MAPPING CORRECT`);
      } else {
        console.log(`  ✗ CODE MAPPING WRONG! Should map to ${col.index}, not ${col.codeMaps}`);
      }
      console.log('');
    }

    console.log('================================================================================');
    console.log('CODE MAPPING VERIFICATION (Timeline Columns):');
    console.log('================================================================================\n');

    const timelineCols = [
      { index: 27, codeMaps: 31, field: 'starting_date', expectedHeader: 'Starting Date' },
      { index: 28, codeMaps: 28, field: 'status', expectedHeader: 'Status' },
      { index: 29, codeMaps: 29, field: 'progress_percent', expectedHeader: '%' },
      { index: 30, codeMaps: 30, field: 'proposal_date', expectedHeader: 'Date of first proposal' }
    ];

    for (const col of timelineCols) {
      const header = headers[col.index]?.replace(/\n/g, ' ').trim() || '(empty)';
      const value = dataRow[col.index]?.replace(/\n/g, ' ').trim() || '(empty)';

      console.log(`Column ${col.index}:`);
      console.log(`  Header: "${header}"`);
      console.log(`  Expected: "${col.expectedHeader}"`);
      console.log(`  Data: ${value}`);
      console.log(`  Code maps: field '${col.field}' to index ${col.codeMaps}`);

      if (col.codeMaps === col.index) {
        console.log(`  ✓ CODE MAPPING CORRECT`);
      } else {
        console.log(`  ✗ CODE MAPPING WRONG! Should map to ${col.index}, not ${col.codeMaps}`);
      }
      console.log('');
    }

    console.log('================================================================================');
    console.log('SUMMARY:');
    console.log('================================================================================\n');

    console.log('Revenue columns need to shift -1 (16→15, 17→16, 18→17, etc.)');
    console.log('Timeline columns:');
    console.log('  - status (28) ✓ correct');
    console.log('  - progress_percent (29) ✓ correct');
    console.log('  - proposal_date (30) ✓ correct');
    console.log('  - starting_date needs to change from 31→27');
  }
}

parseCSVProper().catch(console.error);
